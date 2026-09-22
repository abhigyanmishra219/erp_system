import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Student from "@/models/Student";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import { studentStatusSchema } from "@/lib/validation/studentParent";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { studentId } = await params;

  try {
    const body = await req.json();
    const validatedData = studentStatusSchema.parse(body);

    await connectToDatabase();

    const student = await Student.findOne({ _id: studentId, schoolId });

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Student not found" },
        },
        { status: 404 }
      );
    }

    const previousStatus = student.status;
    student.status = validatedData.status;

    if (validatedData.status === "TRANSFERRED" && validatedData.transferDetails) {
      student.transferDetails = {
        reason: validatedData.transferDetails.reason || "",
        targetSchool: validatedData.transferDetails.targetSchool || "",
        transferCertificateNumber: validatedData.transferDetails.transferCertificateNumber || "",
        transferDate: validatedData.transferDetails.transferDate
          ? new Date(validatedData.transferDetails.transferDate)
          : new Date(),
        notes: validatedData.transferDetails.notes || "",
      };
    }

    // If student user login account exists, sync active status
    if (student.userId) {
      const studentUser = await User.findOne({ _id: student.userId, schoolId });
      if (studentUser) {
        studentUser.isActive = validatedData.status === "ACTIVE";
        await studentUser.save();
      }
    }

    student.updatedBy = user.id;
    await student.save();

    const action =
      validatedData.status === "TRANSFERRED"
        ? "STUDENT_TRANSFERRED"
        : "STUDENT_STATUS_CHANGED";

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action,
      entityType: "STUDENT",
      entityId: student._id.toString(),
      schoolId,
      metadata: {
        studentId: student._id.toString(),
        admissionNumber: student.admissionNumber,
        previousStatus,
        newStatus: validatedData.status,
        transferDetails: validatedData.transferDetails,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: student._id.toString(),
        status: student.status,
        transferDetails: student.transferDetails,
      },
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/students/[studentId]/status error:", err);
    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: (err as { issues: unknown[] }).issues,
          },
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to update student status" },
      },
      { status: 500 }
    );
  }
}
