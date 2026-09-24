import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import Student from "@/models/Student";
import StudentFeeAccount from "@/models/StudentFeeAccount";
import StudentFeeAssignment from "@/models/StudentFeeAssignment";
import FeePayment from "@/models/FeePayment";
import AcademicYear from "@/models/AcademicYear";
import { FeeAccountCalculationService } from "@/lib/services/feeAccountCalculationService";
import connectToDatabase from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "FEES");
  if (!subCheck.allowed) return subCheck.response;

  const { schoolId } = auth.context;
  const { studentId } = await params;
  const { searchParams } = new URL(req.url);

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid student ID" } },
      { status: 400 }
    );
  }

  const academicYearId = searchParams.get("academicYearId");

  try {
    await connectToDatabase();

    // 1. Verify student belongs to this school
    const student = await Student.findOne({ _id: studentId, schoolId })
      .populate("classId", "name code")
      .populate("sectionId", "name code")
      .populate("academicYearId", "name status")
      .lean();

    if (!student) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Student not found" } },
        { status: 404 }
      );
    }

    // 2. Resolve Academic Year
    let targetYearId = academicYearId;
    if (!targetYearId || !mongoose.Types.ObjectId.isValid(targetYearId)) {
      targetYearId = (student.academicYearId as any)?._id?.toString() || student.academicYearId?.toString();
    }
    if (!targetYearId) {
      const activeYear = await AcademicYear.findOne({ schoolId, status: "ACTIVE" }).lean();
      if (activeYear) targetYearId = activeYear._id.toString();
    }

    if (!targetYearId) {
      return NextResponse.json(
        { success: false, error: { code: "NO_ACADEMIC_YEAR", message: "No academic year found" } },
        { status: 400 }
      );
    }

    // 3. Recalculate and ensure latest fee account state
    const account = await FeeAccountCalculationService.recalculateStudentFeeAccount(
      schoolId,
      targetYearId,
      studentId
    );

    // 4. Fetch assignments and payments
    const [assignments, payments, targetYear] = await Promise.all([
      StudentFeeAssignment.find({
        schoolId,
        academicYearId: targetYearId,
        studentId,
        status: "ACTIVE",
      })
        .populate({
          path: "feeStructureId",
          populate: { path: "feeCategoryId", select: "name code" },
        })
        .sort({ createdAt: 1 })
        .lean(),
      FeePayment.find({
        schoolId,
        academicYearId: targetYearId,
        studentId,
      })
        .populate("recordedBy", "name email")
        .sort({ paymentDate: -1, createdAt: -1 })
        .lean(),
      AcademicYear.findById(targetYearId).lean(),
    ]);

    const fullName = `${student.firstName} ${student.lastName}`.trim();

    const formattedAssignments = assignments.map((assign: any) => {
      const fs = assign.feeStructureId;
      return {
        id: assign._id.toString(),
        structureName: fs?.name || "Custom Fee",
        categoryName: fs?.feeCategoryId?.name || "General",
        categoryCode: fs?.feeCategoryId?.code || "GEN",
        frequency: fs?.frequency || "ANNUAL",
        baseAmount: assign.baseAmount,
        discountType: assign.discountType,
        discountValue: assign.discountValue,
        discountAmount: assign.discountAmount,
        concessionReason: assign.concessionReason || "",
        concessionType: assign.concessionType,
        concessionValue: assign.concessionValue,
        concessionAmount: assign.concessionAmount,
        netAmount: assign.netAmount,
        dueSchedule: (assign.dueSchedule || []).map((ds: any) => ({
          name: ds.name,
          amount: ds.amount,
          dueDate: ds.dueDate,
          sequence: ds.sequence,
          paidAmount: ds.paidAmount || 0,
          status: ds.status || "UNPAID",
        })),
        createdAt: assign.createdAt,
      };
    });

    const formattedPayments = payments.map((p: any) => ({
      id: p._id.toString(),
      receiptNumber: p.receiptNumber,
      amount: p.amount,
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      transactionId: p.transactionId || "",
      remarks: p.remarks || "",
      status: p.status,
      recordedBy: p.recordedBy ? { name: p.recordedBy.name, email: p.recordedBy.email } : null,
      createdAt: p.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student._id.toString(),
          name: fullName,
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber || "",
          class: student.classId ? { id: (student.classId as any)._id?.toString(), name: (student.classId as any).name } : null,
          section: student.sectionId ? { id: (student.sectionId as any)._id?.toString(), name: (student.sectionId as any).name } : null,
          photo: student.avatarUrl || null,
        },
        academicYear: targetYear ? { id: targetYear._id.toString(), name: targetYear.name } : null,
        account: {
          id: account._id.toString(),
          totalFee: account.totalFee,
          discountAmount: account.discountAmount,
          concessionAmount: account.concessionAmount,
          netFee: account.netFee,
          paidAmount: account.paidAmount,
          pendingAmount: account.pendingAmount,
          lateFeeAmount: account.lateFeeAmount || 0,
          nextDueAmount: account.nextDueAmount,
          nextDueDate: account.nextDueDate,
          status: account.status,
          updatedAt: account.updatedAt,
        },
        assignments: formattedAssignments,
        payments: formattedPayments,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch student fee detail" } },
      { status: 500 }
    );
  }
}
