import { cookies } from "next/headers";
import { verifyToken } from "@/lib/jwt";
import connectToDatabase from "@/lib/db";
import User, { UserRole } from "@/models/User";

export interface AuthenticatedUserDoc {
  _id?: string;
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  schoolId?: string | null;
  mustChangePassword?: boolean;
  isActive: boolean;
}

/**
 * Server-side helper to read and verify user credentials from HTTP cookies
 * Used in server layouts and server components for protected routes
 */
export async function getUserFromCookies(): Promise<AuthenticatedUserDoc | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("erp_auth_token")?.value;

    if (!token) {
      return null;
    }

    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return null;
    }

    await connectToDatabase();
    const userDoc = await User.findById(payload.userId).lean();

    if (!userDoc || userDoc.isActive === false) {
      return null;
    }

    return {
      _id: userDoc._id.toString(),
      id: userDoc._id.toString(),
      email: userDoc.email,
      name: userDoc.name,
      role: userDoc.role as UserRole,
      schoolId: userDoc.schoolId ? userDoc.schoolId.toString() : null,
      mustChangePassword: !!userDoc.mustChangePassword,
      isActive: userDoc.isActive,
    };
  } catch (error: unknown) {
    // Re-throw Next.js dynamic server usage bailouts during build/prerender
    if ((error as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE") {
      throw error;
    }
    console.error("Error retrieving user from cookies:", error);
    return null;
  }
}
