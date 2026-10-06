import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Student from "@/models/Student";
import StudentEnrollment from "@/models/StudentEnrollment";
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

    // 1. Check if a global student identity exists with this email
    const studentQuery: Record<string, unknown> = {
      email: normalizedEmail,
      isDeleted: false,
    };
    if (excludeStudentId) {
      studentQuery._id = { $ne: excludeStudentId };
    }

    const existingStudent = await Student.findOne(studentQuery).select(
      "_id firstName lastName phone gender dateOfBirth bloodGroup address avatarUrl"
    );

    if (existingStudent) {
      // Check if student already has an active enrollment in THIS school
      const enrollmentQuery: Record<string, unknown> = {
        schoolId,
        studentId: existingStudent._id,
        isDeleted: false,
      };
      if (excludeStudentId) {
        enrollmentQuery._id = { $ne: excludeStudentId };
      }

      const existingEnrollment = await StudentEnrollment.findOne(enrollmentQuery);

      if (existingEnrollment) {
        return NextResponse.json({
          success: true,
          available: false,
          isEnrolledInCurrentSchool: true,
          reason: "Student is already enrolled in this school.",
        });
      }

      // Found in another school: ALLOW multi-school enrollment!
      return NextResponse.json({
        success: true,
        available: true,
        existingStudent: true,
        student: {
          id: existingStudent._id.toString(),
          firstName: existingStudent.firstName,
          lastName: existingStudent.lastName,
          phone: existingStudent.phone || "",
          gender: existingStudent.gender,
          dateOfBirth: existingStudent.dateOfBirth,
          bloodGroup: existingStudent.bloodGroup || "",
          avatarUrl: existingStudent.avatarUrl || "",
        },
        message: `Existing student found: ${existingStudent.firstName} ${existingStudent.lastName}. Enrolling will link this student to your school without creating a duplicate account.`,
      });
    }

    // 2. Check if a user login account exists with this email
    const existingUser = await User.findOne({ email: normalizedEmail }).select("_id role studentId schoolId");
    if (existingUser) {
      if (existingUser.role !== "STUDENT") {
        return NextResponse.json({
          success: true,
          available: false,
          reason: `Email is already associated with an existing ${existingUser.role} account.`,
        });
      }

      if (existingUser.studentId) {
        const enrollmentQuery: Record<string, unknown> = {
          schoolId,
          studentId: existingUser.studentId,
          isDeleted: false,
        };
        if (excludeStudentId) {
          enrollmentQuery._id = { $ne: excludeStudentId };
        }
        const existingEnrollment = await StudentEnrollment.findOne(enrollmentQuery);

        if (existingEnrollment) {
          return NextResponse.json({
            success: true,
            available: false,
            isEnrolledInCurrentSchool: true,
            reason: "Student is already enrolled in this school.",
          });
        }
      }

      return NextResponse.json({
        success: true,
        available: true,
        existingStudent: true,
        message: "Existing student user account found. Enrolling will link this student to your school.",
      });
    }

    return NextResponse.json({
      success: true,
      available: true,
      existingStudent: false,
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
