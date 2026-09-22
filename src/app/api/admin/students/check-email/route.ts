import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Student from "@/models/Student";
import User from "@/models/User";
import { normalizeEmail } from "@/lib/utils/email";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;

  try {
    const { searchParams } = new URL(req.url);
    const emailParam = searchParams.get("email");
    const excludeStudentId = searchParams.get("excludeStudentId");

    const normalizedEmail = normalizeEmail(emailParam);

    if (!normalizedEmail) {
      return NextResponse.json({
        success: true,
        available: true,
      });
    }

    await connectToDatabase();

    // Check if another student in the same school has this email
    const studentQuery: Record<string, unknown> = {
      schoolId,
      email: normalizedEmail,
    };

    if (excludeStudentId) {
      studentQuery._id = { $ne: excludeStudentId };
    }

    const existingStudent = await Student.findOne(studentQuery).select("_id firstName lastName admissionNumber");

    if (existingStudent) {
      return NextResponse.json({
        success: true,
        available: false,
        reason: "Email address is already used by another student in this school.",
      });
    }

    // Check if user login account exists with this email
    const existingUser = await User.findOne({ email: normalizedEmail }).select("_id role studentId schoolId");
    if (existingUser) {
      // If it is linked to the excluded student, it's allowed
      if (
        excludeStudentId &&
        existingUser.role === "STUDENT" &&
        existingUser.studentId?.toString() === excludeStudentId
      ) {
        return NextResponse.json({
          success: true,
          available: true,
        });
      }

      return NextResponse.json({
        success: true,
        available: false,
        reason: "Email is already associated with an existing user account.",
      });
    }

    return NextResponse.json({
      success: true,
      available: true,
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/students/check-email error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to validate email" },
      },
      { status: 500 }
    );
  }
}
