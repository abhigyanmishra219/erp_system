import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/jwt";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    let token: string | undefined;

    // 1. Check Bearer Authorization Header
    const authHeader = req.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }

    // 2. Fallback to HTTP-only cookie
    if (!token) {
      token = req.cookies.get("erp_auth_token")?.value;
    }

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized: No token provided" },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or expired token" },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const user = await User.findById(payload.userId).select("-password");

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Authentication error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
