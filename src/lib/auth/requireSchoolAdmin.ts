import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { verifyToken, UserJWTPayload } from "@/lib/jwt";
import connectToDatabase from "@/lib/db";
import User, { IUser } from "@/models/User";
import School, { ISchool } from "@/models/School";

export interface AuthenticatedSchoolAdminUser {
  id: string;
  _id: string;
  email: string;
  name?: string;
  role: "ADMIN";
  isActive: boolean;
  schoolId: string;
  mustChangePassword: boolean;
}

export interface SchoolAdminAuthContext {
  user: AuthenticatedSchoolAdminUser;
  school: ISchool;
  schoolId: string;
}

export type SchoolAdminAuthResult =
  | { success: true; context: SchoolAdminAuthContext }
  | { success: false; response: NextResponse };

/**
 * Reusable server-side guard for School Admin (role === 'ADMIN') APIs and Server Actions.
 * Guarantees strict multi-tenant isolation by anchoring all operations to the authenticated user's schoolId.
 */
export async function requireSchoolAdmin(req?: NextRequest): Promise<SchoolAdminAuthResult> {
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
            message: "Authentication required. Please sign in to access the School Admin portal.",
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
            message: "Your administrator account has been deactivated. Please contact your institution manager.",
          },
        },
        { status: 403 }
      ),
    };
  }

  // 5. Verify ADMIN role strictly (School Admin)
  if (user.role !== "ADMIN") {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Access denied. Only School Administrators can access this area.",
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
            message: "This administrator account is not linked to an active school tenant.",
          },
        },
        { status: 403 }
      ),
    };
  }

  // 7. Fetch tenant School record
  const school: ISchool | null = await School.findById(user.schoolId.toString()).lean();

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

  const schoolIdStr = school._id.toString();

  return {
    success: true,
    context: {
      user: {
        id: user._id.toString(),
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: "ADMIN",
        isActive: user.isActive,
        schoolId: schoolIdStr,
        mustChangePassword: user.mustChangePassword ?? false,
      },
      school,
      schoolId: schoolIdStr,
    },
  };
}
