import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import PasswordResetRequest from "@/models/PasswordResetRequest";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { normalizeEmail } from "@/lib/utils/email";
import { createAuditLog } from "@/lib/audit";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = resetPasswordSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parseResult.error.issues[0]?.message ||
            "Please check the password requirements and try again.",
        },
        { status: 400 }
      );
    }

    const { newPassword, resetToken } = parseResult.data;
    const normalizedEmail = normalizeEmail(parseResult.data.email);

    await connectToDatabase();

    // Hash the incoming reset token with SHA-256 to compare with stored hash
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken.trim())
      .digest("hex");

    const resetRequest = await PasswordResetRequest.findOne({
      email: normalizedEmail,
      resetTokenHash,
      usedAt: null,
      verifiedAt: { $ne: null },
    });

    if (!resetRequest) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid or expired password reset authorization. Please start over.",
        },
        { status: 400 }
      );
    }

    // Check token expiration
    if (
      !resetRequest.resetTokenExpiresAt ||
      resetRequest.resetTokenExpiresAt.getTime() < Date.now()
    ) {
      resetRequest.usedAt = new Date();
      await resetRequest.save();
      return NextResponse.json(
        {
          success: false,
          error:
            "Password reset authorization has expired. Please request a new code.",
        },
        { status: 400 }
      );
    }

    // Fetch user
    const user = await User.findById(resetRequest.userId).select("+password");

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User account not found.",
        },
        { status: 404 }
      );
    }

    if (user.isActive === false) {
      return NextResponse.json(
        {
          success: false,
          error: "Account is disabled. Please contact administrator.",
        },
        { status: 403 }
      );
    }

    // Hash the new password using bcrypt (same work factor as existing auth system)
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.mustChangePassword = false;
    await user.save();

    // Invalidate reset authorization token (single use)
    resetRequest.usedAt = new Date();
    resetRequest.resetTokenHash = null;
    await resetRequest.save();

    // Invalidate all pending reset requests for this email
    await PasswordResetRequest.updateMany(
      { email: normalizedEmail, usedAt: null },
      { $set: { usedAt: new Date() } }
    );

    // Audit log
    await createAuditLog({
      userId: user._id.toString(),
      userRole: user.role,
      action: "USER_UPDATED",
      entityType: "USER",
      entityId: user._id.toString(),
      schoolId: user.schoolId ? user.schoolId.toString() : null,
      metadata: {
        actionDetail: "PASSWORD_RESET_SUCCESS",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Your password has been updated. You can now sign in with your new password.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("reset-password error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to reset password. Please try again.",
      },
      { status: 500 }
    );
  }
}
