import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, UserJWTPayload } from "@/lib/jwt";
import connectToDatabase from "@/lib/db";
import User, { IUser } from "@/models/User";
import { getSubscriptionDetails } from "@/lib/subscription-guard";

export async function GET(req: NextRequest) {
  let token: string | undefined;

  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  if (!token) {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("erp_auth_token")?.value || cookieStore.get("token")?.value;
    } catch {
      // ignore
    }
  }

  if (!token) {
    return NextResponse.json(
      { success: false, error: "UNAUTHENTICATED", message: "Authentication required." },
      { status: 401 }
    );
  }

  const payload: (UserJWTPayload & { userId?: string }) | null = verifyToken(token);
  if (!payload || !payload.userId) {
    return NextResponse.json(
      { success: false, error: "INVALID_TOKEN", message: "Invalid session." },
      { status: 401 }
    );
  }

  try {
    await connectToDatabase();
    const user: IUser | null = await User.findById(payload.userId).lean();
    if (!user || user.isActive === false) {
      return NextResponse.json(
        { success: false, error: "ACCOUNT_DISABLED", message: "Account is disabled." },
        { status: 403 }
      );
    }

    if (!user.schoolId) {
      // System admin or platform user without specific school
      return NextResponse.json({
        success: true,
        subscription: null,
        isSystemAdmin: user.role === "SYSTEM_ADMIN",
      });
    }

    const details = await getSubscriptionDetails(user.schoolId.toString());
    if (!details) {
      return NextResponse.json(
        { success: false, error: "SCHOOL_NOT_FOUND", message: "School not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      subscription: details,
    });
  } catch (err: any) {
    console.error("GET /api/subscription error:", err);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR", message: "Failed to fetch subscription data." },
      { status: 500 }
    );
  }
}
