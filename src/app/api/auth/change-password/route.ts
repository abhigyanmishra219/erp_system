import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { verifyToken } from "@/lib/jwt";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import { changePasswordSchema } from "@/lib/validation/auth";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(req: NextRequest) {
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
        { success: false, error: "Unauthorized: Please log in to change password." },
        { status: 401 }
      );
    }

    const payload = verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized: Invalid or expired token session." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parseResult = changePasswordSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parseResult.data;

    await connectToDatabase();

    // Fetch user with password field
    const user = await User.findById(payload.userId).select("+password");

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, error: "User account not found." },
        { status: 404 }
      );
    }

    if (user.isActive === false) {
      return NextResponse.json(
        { success: false, error: "Account is disabled. Please contact administrator." },
        { status: 403 }
      );
    }

    // Verify current temporary/existing password
    const isCurrentMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentMatch) {
      return NextResponse.json(
        {
          success: false,
          error: "Current password is incorrect. Please verify your temporary password.",
        },
        { status: 400 }
      );
    }

    // Verify new password is not identical to current
    const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
    if (isSameAsCurrent) {
      return NextResponse.json(
        {
          success: false,
          error: "New password must be different from your current temporary password.",
        },
        { status: 400 }
      );
    }

    // Hash new password and reset mustChangePassword flag
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    user.mustChangePassword = false;
    await user.save();

    // Audit log (sanitizes metadata without sensitive info)
    await createAuditLog({
      userId: user._id.toString(),
      userRole: user.role,
      action: "USER_UPDATED",
      entityType: "USER",
      entityId: user._id.toString(),
      schoolId: user.schoolId ? user.schoolId.toString() : null,
      metadata: {
        actionDetail: "PASSWORD_CHANGED",
        mustChangePasswordReset: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Password updated successfully. You now have full access.",
        user: {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          schoolId: user.schoolId ? user.schoolId.toString() : null,
          mustChangePassword: false,
        },
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Change password error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to change password";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
