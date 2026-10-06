import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { verifyToken, UserJWTPayload } from "@/lib/jwt";
import connectToDatabase from "@/lib/db";
import User, { IUser } from "@/models/User";
import Student, { IStudent } from "@/models/Student";
import StudentEnrollment from "@/models/StudentEnrollment";
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

  // 6. Find global student profile for this user
  let studentGlobal = await Student.findOne({
    $or: [
      { userId: user._id },
      ...(user.email ? [{ email: user.email.toLowerCase() }] : []),
    ],
    isDeleted: false,
  });

  // 7. Resolve Active School Context
  let targetSchoolId: string | null = null;

  // Check explicit tenant requested in header or cookie
  if (req) {
    const headerSchoolId = req.headers.get("x-school-id");
    const cookieSchoolId = req.cookies.get("active_school_id")?.value;
    if (headerSchoolId && mongoose.Types.ObjectId.isValid(headerSchoolId)) {
      targetSchoolId = headerSchoolId;
    } else if (cookieSchoolId && mongoose.Types.ObjectId.isValid(cookieSchoolId)) {
      targetSchoolId = cookieSchoolId;
    }
  }

  // Fallback to user.schoolId
  if (!targetSchoolId && user.schoolId && mongoose.Types.ObjectId.isValid(user.schoolId.toString())) {
    targetSchoolId = user.schoolId.toString();
  }

  // 8. Find active enrollment in target school
  let enrollment = null;
  if (studentGlobal && targetSchoolId) {
    enrollment = await StudentEnrollment.findOne({
      studentId: studentGlobal._id,
      schoolId: new mongoose.Types.ObjectId(targetSchoolId),
      isDeleted: false,
    })
      .populate("academicYearId", "name status")
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .lean();
  }

  // If no enrollment found for targetSchoolId, check if student has any active enrollment in any school
  if (!enrollment && studentGlobal) {
    enrollment = await StudentEnrollment.findOne({
      studentId: studentGlobal._id,
      isDeleted: false,
    })
      .populate("academicYearId", "name status")
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .sort({ createdAt: -1 })
      .lean();

    if (enrollment) {
      targetSchoolId = enrollment.schoolId.toString();
    }
  }

  // Backward compatibility: If no StudentEnrollment exists yet, check legacy Student.schoolId
  let legacyStudentDoc: IStudent | null = null;
  if (!enrollment) {
    if (targetSchoolId) {
      legacyStudentDoc = await Student.findOne({
        schoolId: targetSchoolId,
        $or: [
          { userId: user._id },
          ...(user.email ? [{ email: user.email.toLowerCase() }] : []),
        ],
        isDeleted: false,
      })
        .populate("academicYearId", "name status")
        .populate("classId", "name code")
        .populate("sectionId", "name")
        .lean();
    }

    if (!legacyStudentDoc && user.schoolId) {
      targetSchoolId = user.schoolId.toString();
      legacyStudentDoc = await Student.findOne({
        schoolId: targetSchoolId,
        $or: [
          { userId: user._id },
          ...(user.email ? [{ email: user.email.toLowerCase() }] : []),
        ],
        isDeleted: false,
      })
        .populate("academicYearId", "name status")
        .populate("classId", "name code")
        .populate("sectionId", "name")
        .lean();
    }
  }

  if (!enrollment && !legacyStudentDoc) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_ACTIVE_ENROLLMENT",
            message: "No active school enrollment found for your student account.",
          },
        },
        { status: 403 }
      ),
    };
  }

  const activeSchoolIdStr = enrollment
    ? enrollment.schoolId.toString()
    : legacyStudentDoc!.schoolId!.toString();

  // 9. Fetch active tenant School record
  const school: ISchool | null = await School.findById(activeSchoolIdStr).lean();

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

  // 10. Verify school active lifecycle
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

  // Check enrollment active status
  const activeStatus = enrollment ? enrollment.status : legacyStudentDoc!.status;
  if (activeStatus === "INACTIVE") {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "STUDENT_INACTIVE",
            message: "Your enrollment at this school is marked inactive. Please contact school administration.",
          },
        },
        { status: 403 }
      ),
    };
  }

  // Construct combined student profile for active school context
  const s = studentGlobal || legacyStudentDoc!;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const effectiveClass = enrollment ? (enrollment.classId as any) : (legacyStudentDoc as any)?.classId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const effectiveSection = enrollment ? (enrollment.sectionId as any) : (legacyStudentDoc as any)?.sectionId;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const effectiveYear = enrollment ? (enrollment.academicYearId as any) : (legacyStudentDoc as any)?.academicYearId;

  const studentDoc = {
    ...s.toObject ? s.toObject() : s,
    admissionNumber: enrollment ? enrollment.admissionNumber : legacyStudentDoc!.admissionNumber,
    rollNumber: enrollment ? enrollment.rollNumber : legacyStudentDoc!.rollNumber,
    classId: effectiveClass,
    sectionId: effectiveSection,
    academicYearId: effectiveYear,
    schoolId: activeSchoolIdStr,
    status: activeStatus,
  } as unknown as IStudent;

  const studentIdStr = s._id.toString();
  const classIdStr = effectiveClass?._id?.toString() || effectiveClass?.toString();
  const sectionIdStr = effectiveSection?._id?.toString() || effectiveSection?.toString();
  const academicYearIdStr = effectiveYear?._id?.toString() || effectiveYear?.toString();

  return {
    success: true,
    context: {
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        email: user.email,
        name: user.name || `${s.firstName} ${s.lastName}`.trim(),
        role: "STUDENT",
        isActive: user.isActive,
        schoolId: activeSchoolIdStr,
        mustChangePassword: user.mustChangePassword ?? false,
      },
      student: studentDoc,
      studentId: studentIdStr,
      school,
      schoolId: activeSchoolIdStr,
      classId: classIdStr,
      sectionId: sectionIdStr,
      academicYearId: academicYearIdStr,
    },
  };
}
