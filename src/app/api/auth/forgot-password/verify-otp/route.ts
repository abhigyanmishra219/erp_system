import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/db";
import PasswordResetRequest from "@/models/PasswordResetRequest";
import { verifyOtpSchema } from "@/lib/validation/auth";
import { normalizeEmail } from "@/lib/utils/email";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = verifyOtpSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parseResult.error.issues[0]?.message ||
            "Please provide a valid email and 6-digit verification code.",
        },
        { status: 400 }
      );
    }

    const { otp } = parseResult.data;
    const normalizedEmail = normalizeEmail(parseResult.data.email);

    await connectToDatabase();

    // Look for active, unverified, and unused request
    const resetRequest = await PasswordResetRequest.findOne({
      email: normalizedEmail,
      usedAt: null,
      verifiedAt: null,
    }).sort({ createdAt: -1 });

    if (!resetRequest) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Verification code has expired or is invalid. Please request a new code.",
        },
        { status: 400 }
      );
    }

    // Check expiration
    if (resetRequest.expiresAt.getTime() < Date.now()) {
      resetRequest.usedAt = new Date();
      await resetRequest.save();
      return NextResponse.json(
        {
          success: false,
          error: "Verification code has expired. Please request a new code.",
        },
        { status: 400 }
      );
    }

    // Check if attempts exceeded prior to this check
    if (resetRequest.attempts >= 5) {
      resetRequest.usedAt = new Date();
      await resetRequest.save();
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many incorrect attempts. This verification code has been invalidated. Please request a new code.",
        },
        { status: 400 }
      );
    }

    // Compare OTP
    const isMatch = await bcrypt.compare(otp.trim(), resetRequest.otpHash);

    if (!isMatch) {
      resetRequest.attempts += 1;
      if (resetRequest.attempts >= 5) {
        resetRequest.usedAt = new Date();
        await resetRequest.save();
        return NextResponse.json(
          {
            success: false,
            error:
              "Too many incorrect attempts. This verification code has been invalidated. Please request a new code.",
          },
          { status: 400 }
        );
      }

      await resetRequest.save();
      const remaining = 5 - resetRequest.attempts;
      return NextResponse.json(
        {
          success: false,
          error: `Invalid verification code. ${remaining} attempt${
            remaining === 1 ? "" : "s"
          } remaining.`,
        },
        { status: 400 }
      );
    }

    // Generate single-use reset authorization token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    resetRequest.verifiedAt = new Date();
    resetRequest.resetTokenHash = resetTokenHash;
    resetRequest.resetTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity
    await resetRequest.save();

    return NextResponse.json(
      {
        success: true,
        message: "Code verified successfully.",
        resetToken,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("verify-otp error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify code. Please try again.",
      },
      { status: 500 }
    );
  }
}
