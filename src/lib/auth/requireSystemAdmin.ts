import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, UserJWTPayload } from "@/lib/jwt";
import connectToDatabase from "@/lib/db";
import User, { IUser, UserRole } from "@/models/User";

export interface AuthenticatedAdminUser {
  id: string;
  _id: string;
  email: string;
  name?: string;
  role: UserRole;
  isActive: boolean;
}

export type AuthResult =
  | { success: true; user: AuthenticatedAdminUser }
  | { success: false; response: NextResponse };

/**
 * Reusable server-side guard for System Admin API routes and Server Actions
 * Verifies cookie or Bearer header, checks DB user record, and validates role === 'SYSTEM_ADMIN'
 */
export async function requireSystemAdmin(req?: NextRequest): Promise<AuthResult> {
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
            message: "Authentication required. Please sign in as System Admin.",
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
            message: "Your account is inactive. Please contact support.",
          },
        },
        { status: 403 }
      ),
    };
  }

  // 5. Verify SYSTEM_ADMIN role
  if (user.role !== "SYSTEM_ADMIN") {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Access denied. Only System Administrators can access this resource.",
          },
        },
        { status: 403 }
      ),
    };
  }

  return {
    success: true,
    user: {
      id: user._id.toString(),
      _id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    },
  };
}
