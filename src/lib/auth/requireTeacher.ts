import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { verifyToken, UserJWTPayload } from "@/lib/jwt";
import connectToDatabase from "@/lib/db";
import User, { IUser } from "@/models/User";
import Teacher, { ITeacher } from "@/models/Teacher";
import School, { ISchool } from "@/models/School";

export interface AuthenticatedTeacherUser {
  id: string;
  _id: string;
  email: string;
  name?: string;
  role: "TEACHER";
  isActive: boolean;
  schoolId: string;
  mustChangePassword: boolean;
}

export interface TeacherAuthContext {
  user: AuthenticatedTeacherUser;
  teacher: ITeacher;
  teacherId: string;
  school: ISchool;
  schoolId: string;
}

export type TeacherAuthResult =
  | { success: true; context: TeacherAuthContext }
  | { success: false; response: NextResponse };

/**
 * Reusable server-side guard for Teacher (role === 'TEACHER') APIs and Server Actions.
 * Guarantees strict multi-tenant isolation and identity authenticity by anchoring all operations
 * to the authenticated teacher's schoolId and teacher profile.
 *
 * NEVER trusts teacherId or schoolId from request body or query parameters.
 */
export async function requireTeacher(req?: NextRequest): Promise<TeacherAuthResult> {
  let token: string | undefined;

  // 1. Check Bearer Authorization header if request object is passed
  if (req) {
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  // 2. Fallback to HTTP-only cookie
  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("erp_auth_token")?.value;
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
            message: "Authentication required. Please sign in to access the Teacher portal.",
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
            message: "Your teacher account has been deactivated. Please contact your school administration.",
          },
        },
        { status: 403 }
      ),
    };
  }

  // 5. Verify TEACHER role strictly (Reject ADMIN, SYSTEM_ADMIN, STUDENT, PARENT)
  if (user.role !== "TEACHER") {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Access denied. Only registered Teachers can access this area.",
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
            message: "This teacher account is not linked to an active school tenant.",
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

  // 9. Fetch Teacher Profile corresponding to this User and School
  let teacherDoc: ITeacher | null = await Teacher.findOne({
    schoolId: schoolIdStr,
    userId: user._id,
  }).lean();

  if (!teacherDoc && user.email) {
    teacherDoc = await Teacher.findOne({
      schoolId: schoolIdStr,
      email: user.email.toLowerCase(),
    }).lean();
  }

  if (!teacherDoc) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "TEACHER_PROFILE_NOT_FOUND",
            message: "Teacher profile record not found for this user account.",
          },
        },
        { status: 404 }
      ),
    };
  }

  if (teacherDoc.status === "INACTIVE") {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "TEACHER_INACTIVE",
            message: "Your teacher profile is marked inactive. Please contact school administration.",
          },
        },
        { status: 403 }
      ),
    };
  }

  const teacherIdStr = teacherDoc._id.toString();

  return {
    success: true,
    context: {
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        email: user.email,
        name: user.name || `${teacherDoc.firstName} ${teacherDoc.lastName}`.trim(),
        role: "TEACHER",
        isActive: user.isActive,
        schoolId: schoolIdStr,
        mustChangePassword: user.mustChangePassword ?? false,
      },
      teacher: teacherDoc,
      teacherId: teacherIdStr,
      school,
      schoolId: schoolIdStr,
    },
  };
}
