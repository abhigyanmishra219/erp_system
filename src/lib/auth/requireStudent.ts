import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { verifyToken, UserJWTPayload } from "@/lib/jwt";
import connectToDatabase from "@/lib/db";
import User, { IUser } from "@/models/User";
import Student, { IStudent } from "@/models/Student";
import School, { ISchool } from "@/models/School";

export interface AuthenticatedStudentUser {
  id: string;
  _id: string;
  email: string;
  name?: string;
  role: "STUDENT";
  isActive: boolean;
  schoolId: string;
  mustChangePassword: boolean;
}

export interface StudentAuthContext {
  user: AuthenticatedStudentUser;
  student: IStudent;
  studentId: string;
  school: ISchool;
  schoolId: string;
  classId?: string;
  sectionId?: string;
  academicYearId?: string;
}

export type StudentAuthResult =
  | { success: true; context: StudentAuthContext }
  | { success: false; response: NextResponse };

/**
 * Reusable server-side guard for Student (role === 'STUDENT') APIs and Server Actions.
 * Guarantees strict multi-tenant isolation and identity authenticity by anchoring all operations
 * to the authenticated student's schoolId and linked student profile.
 *
 * NEVER trusts studentId or schoolId from request body or query parameters.
 */
export async function requireStudent(req?: NextRequest): Promise<StudentAuthResult> {
  let token: string | undefined;

  // 1. Check Bearer Authorization header if request object is passed
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
    if (!token) {
      token = req.cookies.get("erp_auth_token")?.value || req.cookies.get("token")?.value;
    }
  }

  // 2. Fallback to HTTP-only cookie store
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("erp_auth_token")?.value || cookieStore.get("token")?.value;
    } catch {
      // ignore error if called outside request context
    }
  }

  if (!token) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHENTICATED",
            message: "Authentication required. Please sign in to access the Student portal.",
          },
        },
        { status: 401 }
      ),
    };
  }

  // 3. Verify JWT signature & expiration
  const payload: (UserJWTPayload & { userId?: string }) | null = verifyToken(token);
  if (!payload || !payload.userId) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_TOKEN",
            message: "Invalid or expired session. Please sign in again.",
          },
        },
        { status: 401 }
      ),
    };
  }

  // 4. Query MongoDB database user record as the single source of truth
  await connectToDatabase();
  const user: IUser | null = await User.findById(payload.userId).lean();

  if (!user) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_NOT_FOUND",
            message: "User account does not exist.",
          },
        },
        { status: 404 }
      ),
    };
  }

  if (user.isActive === false) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "ACCOUNT_DISABLED",
            message: "Your student account has been deactivated. Please contact your school administration.",
          },
        },
        { status: 403 }
      ),
    };
  }

  // 5. Verify STUDENT role strictly (Reject ADMIN, SYSTEM_ADMIN, TEACHER, PARENT)
  if (user.role !== "STUDENT") {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Access denied. Only registered Students can access this area.",
          },
        },
        { status: 403 }
      ),
    };
  }

  // 6. Verify valid schoolId association
  if (!user.schoolId || !mongoose.Types.ObjectId.isValid(user.schoolId.toString())) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_TENANT_ASSOCIATION",
            message: "This student account is not linked to an active school tenant.",
          },
        },
        { status: 403 }
      ),
    };
  }

  const schoolIdStr = user.schoolId.toString();

  // 7. Fetch tenant School record
  const school: ISchool | null = await School.findById(schoolIdStr).lean();

  if (!school || school.isDeleted) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "SCHOOL_NOT_FOUND",
            message: "The associated school institution record could not be found or has been archived.",
          },
        },
        { status: 404 }
      ),
    };
  }

  // 8. Verify school active lifecycle
  if (school.status === "SUSPENDED") {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "SCHOOL_SUSPENDED",
            message: "Access to this school ERP instance has been suspended. Please contact platform support.",
          },
        },
        { status: 403 }
      ),
    };
  }

  if (school.status === "INACTIVE") {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "SCHOOL_INACTIVE",
            message: "This school institution is currently inactive.",
          },
        },
        { status: 403 }
      ),
    };
  }

  // 9. Fetch Student Profile corresponding to this User and School
  let studentDoc: IStudent | null = await Student.findOne({
    schoolId: schoolIdStr,
    userId: user._id,
  })
    .populate("academicYearId", "name status")
    .populate("classId", "name code")
    .populate("sectionId", "name")
    .lean();

  if (!studentDoc && user.email) {
    studentDoc = await Student.findOne({
      schoolId: schoolIdStr,
      email: user.email.toLowerCase(),
    })
      .populate("academicYearId", "name status")
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .lean();
  }

  if (!studentDoc) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "STUDENT_PROFILE_NOT_FOUND",
            message: "Student profile record not found for this user account.",
          },
        },
        { status: 404 }
      ),
    };
  }

  if (studentDoc.status === "INACTIVE") {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "STUDENT_INACTIVE",
            message: "Your student profile is marked inactive. Please contact school administration.",
          },
        },
        { status: 403 }
      ),
    };
  }

  const studentIdStr = studentDoc._id.toString();
  const classIdStr = (studentDoc.classId as any)?._id?.toString() || studentDoc.classId?.toString();
  const sectionIdStr = (studentDoc.sectionId as any)?._id?.toString() || studentDoc.sectionId?.toString();
  const academicYearIdStr = (studentDoc.academicYearId as any)?._id?.toString() || studentDoc.academicYearId?.toString();

  return {
    success: true,
    context: {
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        email: user.email,
        name: user.name || `${studentDoc.firstName} ${studentDoc.lastName}`.trim(),
        role: "STUDENT",
        isActive: user.isActive,
        schoolId: schoolIdStr,
        mustChangePassword: user.mustChangePassword ?? false,
      },
      student: studentDoc,
      studentId: studentIdStr,
      school,
      schoolId: schoolIdStr,
      classId: classIdStr,
      sectionId: sectionIdStr,
      academicYearId: academicYearIdStr,
    },
  };
}
