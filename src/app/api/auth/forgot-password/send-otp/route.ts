import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import PasswordResetRequest from "@/models/PasswordResetRequest";
import { forgotPasswordEmailSchema } from "@/lib/validation/auth";
import { normalizeEmail } from "@/lib/utils/email";
import { sendPasswordResetOtpEmail } from "@/lib/services/emailService";
import { createAuditLog } from "@/lib/audit";

const RESEND_COOLDOWN_SECONDS = 60;
const MAX_HOURLY_REQUESTS = 5;
const GENERIC_RESPONSE_MESSAGE =
  "If an account exists for this email address, a verification code has been sent.";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = forgotPasswordEmailSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            parseResult.error.issues[0]?.message ||
            "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(parseResult.data.email);
    if (!normalizedEmail) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check 60-second cooldown for this email
    const oneMinuteAgo = new Date(Date.now() - RESEND_COOLDOWN_SECONDS * 1000);
    const recentRequest = await PasswordResetRequest.findOne({
      email: normalizedEmail,
      createdAt: { $gte: oneMinuteAgo },
    }).sort({ createdAt: -1 });

    if (recentRequest) {
      const elapsedSeconds = Math.floor(
        (Date.now() - recentRequest.createdAt.getTime()) / 1000
      );
      const remainingSeconds = Math.max(
        1,
        RESEND_COOLDOWN_SECONDS - elapsedSeconds
      );
      return NextResponse.json(
        {
          success: false,
          error: `Please wait ${remainingSeconds} second${
            remainingSeconds === 1 ? "" : "s"
          } before requesting another verification code.`,
        },
        { status: 429 }
      );
    }

    // Rate limiting: max 5 requests per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const hourlyRequestCount = await PasswordResetRequest.countDocuments({
      email: normalizedEmail,
      createdAt: { $gte: oneHourAgo },
    });

    if (hourlyRequestCount >= MAX_HOURLY_REQUESTS) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many verification requests. Please try again in an hour.",
        },
        { status: 429 }
      );
    }

    // Check if account exists
    const user = await User.findOne({ email: normalizedEmail });

    // Anti-enumeration protection: return identical generic message if user doesn't exist or is disabled
    if (!user || user.isActive === false) {
      return NextResponse.json(
        {
          success: true,
          message: GENERIC_RESPONSE_MESSAGE,
        },
        { status: 200 }
      );
    }

    // Invalidate any existing unused reset requests for this email
    await PasswordResetRequest.updateMany(
      { email: normalizedEmail, usedAt: null },
      { $set: { usedAt: new Date() } }
    );

    // Generate cryptographically secure 6-digit OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(rawOtp, 10);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Save reset request record
    await PasswordResetRequest.create({
      userId: user._id,
      email: normalizedEmail,
      otpHash,
      expiresAt,
      attempts: 0,
      createdAt: new Date(),
    });

    // Send OTP to registered email
    try {
      await sendPasswordResetOtpEmail(user.email, rawOtp);
    } catch (emailErr) {
      console.error(
        "Email delivery failed in forgot-password:",
        emailErr instanceof Error ? emailErr.message : "Unknown error"
      );
      return NextResponse.json(
        {
          success: false,
          error:
            "Failed to deliver verification code to the email address. Please try again later.",
        },
        { status: 500 }
      );
    }

    // Audit log
    await createAuditLog({
      userId: user._id.toString(),
      userRole: user.role,
      action: "USER_UPDATED",
      entityType: "USER",
      entityId: user._id.toString(),
      schoolId: user.schoolId ? user.schoolId.toString() : null,
      metadata: {
        actionDetail: "FORGOT_PASSWORD_OTP_REQUESTED",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: GENERIC_RESPONSE_MESSAGE,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    console.error("send-otp error:", err);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to process password reset request. Please try again.",
      },
      { status: 500 }
    );
  }
}
