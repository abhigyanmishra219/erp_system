import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { recordPaymentSchema } from "@/lib/validation/fee";
import FeePayment from "@/models/FeePayment";
import StudentFeeAccount from "@/models/StudentFeeAccount";
import Student from "@/models/Student";
import AcademicYear from "@/models/AcademicYear";
import AuditLog from "@/models/AuditLog";
import { ReceiptNumberService } from "@/lib/services/receiptNumberService";
import { FeeAccountCalculationService } from "@/lib/services/feeAccountCalculationService";
import connectToDatabase from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { searchParams } = new URL(req.url);

  const academicYearId = searchParams.get("academicYearId");
  const studentId = searchParams.get("studentId");
  const paymentMethod = searchParams.get("paymentMethod");
  const status = searchParams.get("status") || "ALL";
  const search = (searchParams.get("search") || "").trim();
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") || "20", 10)));

  try {
    await connectToDatabase();

    const filter: Record<string, any> = { schoolId };

    if (academicYearId && mongoose.Types.ObjectId.isValid(academicYearId)) {
      filter.academicYearId = academicYearId;
    }
    if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
      filter.studentId = studentId;
    }
    if (paymentMethod) {
      filter.paymentMethod = paymentMethod;
    }
    if (status !== "ALL") {
      filter.status = status;
    }
    if (search) {
      filter.receiptNumber = { $regex: new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") };
    }

    const total = await FeePayment.countDocuments(filter);
    const skip = (page - 1) * limit;

    const payments = await FeePayment.find(filter)
      .populate({
        path: "studentId",
        select: "firstName lastName admissionNumber rollNumber classId sectionId",
        populate: [
          { path: "classId", select: "name code" },
          { path: "sectionId", select: "name" },
        ],
      })
      .populate("recordedBy", "name email")
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const formatted = payments.map((p: any) => {
      const stu = p.studentId;
      const studentName = stu ? `${stu.firstName} ${stu.lastName}`.trim() : "Unknown";

      return {
        id: p._id.toString(),
        receiptNumber: p.receiptNumber,
        amount: p.amount,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        transactionId: p.transactionId || "",
        remarks: p.remarks || "",
        status: p.status,
        student: stu
          ? {
              id: stu._id.toString(),
              name: studentName,
              admissionNumber: stu.admissionNumber || "",
              rollNumber: stu.rollNumber || "",
              class: stu.classId ? { id: stu.classId._id.toString(), name: stu.classId.name } : null,
              section: stu.sectionId ? { id: stu.sectionId._id.toString(), name: stu.sectionId.name } : null,
            }
          : null,
        recordedBy: p.recordedBy ? { name: p.recordedBy.name, email: p.recordedBy.email } : null,
        createdAt: p.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        payments: formatted,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch payments" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;

  try {
    const body = await req.json();
    const validated = recordPaymentSchema.parse(body);

    await connectToDatabase();

    // 1. Verify student and fee account belong to authenticated school
    const [student, feeAccount, academicYear] = await Promise.all([
      Student.findOne({ _id: validated.studentId, schoolId }),
      StudentFeeAccount.findOne({
        _id: validated.feeAccountId,
        schoolId,
        studentId: validated.studentId,
        academicYearId: validated.academicYearId,
      }),
      AcademicYear.findOne({ _id: validated.academicYearId, schoolId }),
    ]);

    if (!student) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Student not found for your school" } },
        { status: 404 }
      );
    }

    if (!feeAccount) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Student fee account not found for this academic year" } },
        { status: 404 }
      );
    }

    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Academic year not found for your school" } },
        { status: 404 }
      );
    }

    // 2. Validate payment amount does not exceed outstanding pending balance
    const outstanding = Math.round(feeAccount.pendingAmount * 100) / 100;
    if (validated.amount > outstanding) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EXCEEDS_PENDING",
            message: `Payment amount (₹${validated.amount}) cannot exceed outstanding pending amount (₹${outstanding}).`,
          },
        },
        { status: 400 }
      );
    }

    // 3. Generate concurrency-safe unique receipt number
    const receiptNumber = await ReceiptNumberService.generateReceiptNumber(
      schoolId,
      validated.academicYearId
    );

    // 4. Create FeePayment record
    const payment = await FeePayment.create({
      schoolId,
      academicYearId: validated.academicYearId,
      studentId: validated.studentId,
      feeAccountId: validated.feeAccountId,
      amount: validated.amount,
      paymentDate: validated.paymentDate,
      paymentMethod: validated.paymentMethod,
      transactionId: validated.transactionId || "",
      receiptNumber,
      remarks: validated.remarks || "",
      status: "ACTIVE",
      recordedBy: user.id,
    });

    // 5. Recalculate StudentFeeAccount
    const updatedAccount = await FeeAccountCalculationService.recalculateStudentFeeAccount(
      schoolId,
      validated.academicYearId,
      validated.studentId
    );

    // 6. Audit Log
    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "FEE_PAYMENT_RECORDED",
      entityType: "FEE_PAYMENT",
      entityId: payment._id.toString(),
      schoolId,
      metadata: {
        receiptNumber,
        amount: payment.amount,
        studentId: validated.studentId,
        feeAccountId: validated.feeAccountId,
        paymentMethod: payment.paymentMethod,
        transactionId: payment.transactionId,
      },
    });

    const studentFullName = `${student.firstName} ${student.lastName}`.trim();

    return NextResponse.json(
      {
        success: true,
        data: {
          payment: {
            id: payment._id.toString(),
            receiptNumber: payment.receiptNumber,
            amount: payment.amount,
            paymentDate: payment.paymentDate,
            paymentMethod: payment.paymentMethod,
            transactionId: payment.transactionId,
            status: payment.status,
            studentName: studentFullName,
          },
          account: {
            id: updatedAccount._id.toString(),
            paidAmount: updatedAccount.paidAmount,
            pendingAmount: updatedAccount.pendingAmount,
            nextDueAmount: updatedAccount.nextDueAmount,
            nextDueDate: updatedAccount.nextDueDate,
            status: updatedAccount.status,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Validation failed" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to record payment" } },
      { status: 500 }
    );
  }
}
