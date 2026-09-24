import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { verifyToken, UserJWTPayload } from "@/lib/jwt";
import connectToDatabase from "@/lib/db";
import User, { IUser } from "@/models/User";
import Parent, { IParent } from "@/models/Parent";
import Student, { IStudent } from "@/models/Student";
import StudentParent, { IStudentParent } from "@/models/StudentParent";
import School, { ISchool } from "@/models/School";

export interface AuthenticatedParentUser {
  id: string;
  _id: string;
  email: string;
  name?: string;
  role: "PARENT";
  isActive: boolean;
  schoolId: string;
  mustChangePassword: boolean;
}

export interface LinkedChildInfo {
  studentId: string;
  student: IStudent;
  relationship: string;
  isPrimaryGuardian: boolean;
  isEmergencyContact: boolean;
  canPickup: boolean;
  notes?: string;
}

export interface ParentAuthContext {
  user: AuthenticatedParentUser;
  parent: IParent;
  parentId: string;
  school: ISchool;
  schoolId: string;
  linkedChildren: LinkedChildInfo[];
  childIds: string[];
}

export type ParentAuthResult =
  | { success: true; context: ParentAuthContext }
  | { success: false; response: NextResponse };

/**
 * Reusable server-side guard for Parent (role === 'PARENT') APIs and Server Actions.
 * Enforces strict multi-tenant isolation, identity authenticity, and validates parent-student relationships.
 *
 * NEVER trusts parentId or schoolId from request body or query parameters.
 */
export async function requireParent(req?: NextRequest): Promise<ParentAuthResult> {
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
            message: "Authentication required. Please sign in to access the Parent portal.",
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
            message: "Your parent account has been deactivated. Please contact your school administration.",
          },
        },
        { status: 403 }
      ),
    };
  }

  // 5. Verify PARENT role strictly (Reject ADMIN, SYSTEM_ADMIN, TEACHER, STUDENT)
  if (user.role !== "PARENT") {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Access denied. Only registered Parents/Guardians can access this area.",
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
            message: "This parent account is not linked to an active school tenant.",
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

  // 9. Fetch Parent Profile corresponding to this User and School
  let parentDoc: IParent | null = await Parent.findOne({
    schoolId: schoolIdStr,
    userId: user._id,
  }).lean();

  if (!parentDoc && user.email) {
    parentDoc = await Parent.findOne({
      schoolId: schoolIdStr,
      email: user.email.toLowerCase(),
    }).lean();
  }

  if (!parentDoc) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "PARENT_PROFILE_NOT_FOUND",
            message: "Parent profile record not found for this user account.",
          },
        },
        { status: 404 }
      ),
    };
  }

  if (parentDoc.status === "INACTIVE") {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "PARENT_INACTIVE",
            message: "Your parent profile is marked inactive. Please contact school administration.",
          },
        },
        { status: 403 }
      ),
    };
  }

  const parentIdStr = parentDoc._id.toString();

  // 10. Fetch Linked Children using StudentParent relationship
  const studentParentLinks = await StudentParent.find({
    schoolId: schoolIdStr,
    parentId: parentDoc._id,
  })
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  const studentIds = studentParentLinks.map((link) => link.studentId);

  let linkedChildren: LinkedChildInfo[] = [];

  if (studentIds.length > 0) {
    const studentDocs = await Student.find({
      schoolId: schoolIdStr,
      _id: { $in: studentIds },
      status: "ACTIVE",
    })
      .populate("academicYearId", "name status")
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .lean();

    const studentMap = new Map<string, any>();
    for (const stu of studentDocs) {
      studentMap.set(stu._id.toString(), stu);
    }

    for (const link of studentParentLinks) {
      const sId = link.studentId.toString();
      const studentData = studentMap.get(sId);
      if (studentData) {
        linkedChildren.push({
          studentId: sId,
          student: studentData,
          relationship: link.relationship,
          isPrimaryGuardian: link.isPrimaryGuardian ?? false,
          isEmergencyContact: link.isEmergencyContact ?? false,
          canPickup: link.canPickup ?? true,
          notes: link.notes || "",
        });
      }
    }
  }

  const childIds = linkedChildren.map((c) => c.studentId);

  return {
    success: true,
    context: {
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        email: user.email,
        name: user.name || `${parentDoc.firstName} ${parentDoc.lastName}`.trim(),
        role: "PARENT",
        isActive: user.isActive,
        schoolId: schoolIdStr,
        mustChangePassword: user.mustChangePassword ?? false,
      },
      parent: parentDoc,
      parentId: parentIdStr,
      school,
      schoolId: schoolIdStr,
      linkedChildren,
      childIds,
    },
  };
}
