import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Teacher from "@/models/Teacher";
import User from "@/models/User";
import { normalizeEmail } from "@/lib/utils/email";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;

  try {
    const { searchParams } = new URL(req.url);
    const emailParam = searchParams.get("email");
    const excludeTeacherId = searchParams.get("excludeTeacherId");

    const normalizedEmail = normalizeEmail(emailParam);

    if (!normalizedEmail) {
      return NextResponse.json({
        success: true,
        available: true,
      });
    }

    await connectToDatabase();

    // Check if another teacher in the same school has this email
    const teacherQuery: Record<string, unknown> = {
      schoolId,
      email: normalizedEmail,
    };

    if (excludeTeacherId) {
      teacherQuery._id = { $ne: excludeTeacherId };
    }

    const existingTeacher = await Teacher.findOne(teacherQuery).select("_id firstName lastName teacherId");

    if (existingTeacher) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: "Email address is already used by another teacher in this school.",
      });
    }

    // Check if user login account exists with this email
    const existingUser = await User.findOne({ email: normalizedEmail }).select("_id role teacherId schoolId");
    if (existingUser) {
      // If it is linked to the excluded teacher, it's allowed
      if (
        excludeTeacherId &&
        existingUser.role === "TEACHER" &&
        existingUser.teacherId?.toString() === excludeTeacherId
      ) {
        return NextResponse.json({
          success: true,
          available: true,
        });
      }

      return NextResponse.json({
        success: true,
        available: false,
        reason: "Email is already associated with an existing user portal account.",
      });
    }

    return NextResponse.json({
      success: true,
      available: true,
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/teachers/check-email error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to validate email" } },
      { status: 500 }
    );
  }
}
