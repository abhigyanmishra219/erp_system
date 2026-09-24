import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/auth/requireStudent";
import connectToDatabase from "@/lib/db";
import StudentFeeAccount from "@/models/StudentFeeAccount";
import FeePayment from "@/models/FeePayment";
import StudentFeeAssignment from "@/models/StudentFeeAssignment";
import AcademicYear from "@/models/AcademicYear";
import { FeeAccountCalculationService } from "@/lib/services/feeAccountCalculationService";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireStudent(req);
    if (!auth.success) return auth.response;

    const { school, schoolId, studentId, academicYearId } = auth.context;

    // 1. Feature Flag Check: Ensure School has 'FEES' module enabled
    const isFeeEnabled = Array.isArray(school.enabledModules) && school.enabledModules.includes("FEES");

    if (!isFeeEnabled) {
      return NextResponse.json({
        success: true,
        isEnabled: false,
        message: "Fees module is not enabled for your school institution.",
        data: null,
      });
    }

    await connectToDatabase();

    // 2. Determine target Academic Year
    let targetAcademicYearId = academicYearId;
    if (!targetAcademicYearId) {
      const activeAY = await AcademicYear.findOne({ schoolId, status: "ACTIVE" }).lean();
      targetAcademicYearId = activeAY?._id?.toString();
    }

    // 3. Recalculate fee account to guarantee fresh, up-to-date figures
    if (targetAcademicYearId) {
      try {
        await FeeAccountCalculationService.recalculateStudentFeeAccount(
          schoolId,
          targetAcademicYearId,
          studentId
        );
      } catch (calcErr) {
        console.warn("Fee account recalculation warning:", calcErr);
      }
    }

    // 4. Fetch Fee Account Summary
    let feeAccount = null;
    if (targetAcademicYearId) {
      feeAccount = await StudentFeeAccount.findOne({
        schoolId,
        studentId,
        academicYearId: targetAcademicYearId,
      }).lean();
    }

    if (!feeAccount) {
      // Fallback to most recent fee account if academic year wasn't set
      feeAccount = await StudentFeeAccount.findOne({
        schoolId,
        studentId,
      })
        .sort({ updatedAt: -1 })
        .lean();
    }

    // 5. Fetch Student Payments (Only ACTIVE & for this student)
    const paymentDocs = await FeePayment.find({
      schoolId,
      studentId,
      status: "ACTIVE",
    })
      .sort({ paymentDate: -1, createdAt: -1 })
      .lean();

    const payments = paymentDocs.map((p: any) => ({
      _id: p._id.toString(),
      receiptNumber: p.receiptNumber,
      amount: p.amount,
      paymentDate: p.paymentDate,
      paymentMethod: p.paymentMethod,
      transactionId: p.transactionId || "",
      remarks: p.remarks || "",
      status: p.status,
      createdAt: p.createdAt,
    }));

    // 6. Fetch Student Fee Assignments & Breakdown
    const assignmentDocs = await StudentFeeAssignment.find({
      schoolId,
      studentId,
      status: "ACTIVE",
    })
      .populate("feeStructureId", "name code category description")
      .sort({ createdAt: -1 })
      .lean();

    const assignments = assignmentDocs.map((a: any) => ({
      _id: a._id.toString(),
      feeStructureName: (a.feeStructureId as any)?.name || "Fee Structure",
      feeStructureCode: (a.feeStructureId as any)?.code || "",
      category: (a.feeStructureId as any)?.category || "GENERAL",
      baseAmount: a.baseAmount,
      discountType: a.discountType,
      discountValue: a.discountValue,
      discountAmount: a.discountAmount,
      concessionReason: a.concessionReason || "",
      concessionType: a.concessionType,
      concessionValue: a.concessionValue,
      concessionAmount: a.concessionAmount,
      netAmount: a.netAmount,
      dueSchedule: (a.dueSchedule || []).map((inst: any) => ({
        name: inst.name,
        amount: inst.amount,
        dueDate: inst.dueDate,
        sequence: inst.sequence,
        paidAmount: inst.paidAmount,
        status: inst.status,
      })),
    }));

    // 7. Academic Year Metadata
    let academicYearName = "";
    if (feeAccount?.academicYearId) {
      const ay = await AcademicYear.findById(feeAccount.academicYearId).select("name").lean();
      academicYearName = ay?.name || "";
    }

    const summary = {
      totalFee: feeAccount?.totalFee ?? 0,
      discountAmount: feeAccount?.discountAmount ?? 0,
      concessionAmount: feeAccount?.concessionAmount ?? 0,
      netFee: feeAccount?.netFee ?? 0,
      paidAmount: feeAccount?.paidAmount ?? 0,
      pendingAmount: feeAccount?.pendingAmount ?? 0,
      lateFeeAmount: feeAccount?.lateFeeAmount ?? 0,
      nextDueAmount: feeAccount?.nextDueAmount ?? 0,
      nextDueDate: feeAccount?.nextDueDate ?? null,
      status: feeAccount?.status ?? "PENDING",
      academicYearName,
    };

    return NextResponse.json({
      success: true,
      isEnabled: true,
      data: {
        summary,
        payments,
        assignments,
        school: {
          name: school.name,
          currency: "INR",
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching student fee overview:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch student fee overview",
      },
      { status: 500 }
    );
  }
}

// Enforce Read-Only Immutability: Students cannot create, edit, or delete fees/payments
export async function POST() {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed. Fee operations are strictly managed by School Administration." },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed. Fee operations are strictly managed by School Administration." },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed. Fee operations are strictly managed by School Administration." },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed. Fee operations are strictly managed by School Administration." },
    { status: 405 }
  );
}
