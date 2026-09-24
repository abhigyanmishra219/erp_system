import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireParent } from "@/lib/auth/requireParent";
import connectToDatabase from "@/lib/db";
import StudentFeeAccount from "@/models/StudentFeeAccount";
import FeePayment from "@/models/FeePayment";
import StudentFeeAssignment from "@/models/StudentFeeAssignment";
import AcademicYear from "@/models/AcademicYear";
import Student from "@/models/Student";
import { FeeAccountCalculationService } from "@/lib/services/feeAccountCalculationService";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

    const { school, schoolId, linkedChildren, childIds } = auth.context;

    // 1. Check if parent has linked children
    if (!childIds || childIds.length === 0) {
      return NextResponse.json({
        success: true,
        hasChildren: false,
        isEnabled: true,
        message: "No linked children found for this parent account.",
        data: null,
      });
    }

    // 2. Feature Flag Check: Ensure School has 'FEES' module enabled
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

    const { searchParams } = new URL(req.url);
    const requestedStudentId = searchParams.get("studentId");
    const requestedYearId = searchParams.get("academicYearId");

    // 3. Resolve Target Child and enforce Parent-Child Security
    let activeStudentId = childIds[0];
    if (requestedStudentId) {
      if (!childIds.includes(requestedStudentId)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN_CHILD_ACCESS",
              message: "Access denied. The requested student is not linked to your parent account.",
            },
          },
          { status: 403 }
        );
      }
      activeStudentId = requestedStudentId;
    }

    // 4. Fetch Student Document to ensure school and active status
    const studentDoc = await Student.findOne({
      _id: activeStudentId,
      schoolId,
    })
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .lean();

    if (!studentDoc) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "STUDENT_NOT_FOUND",
            message: "Student record could not be found.",
          },
        },
        { status: 404 }
      );
    }

    // 5. Determine target Academic Year
    let targetAcademicYearId: any = requestedYearId || studentDoc.academicYearId;
    if (!targetAcademicYearId) {
      const activeAY = await AcademicYear.findOne({ schoolId, status: "ACTIVE" }).lean();
      if (activeAY) {
        targetAcademicYearId = activeAY._id;
      }
    }

    // 6. Recalculate fee account to guarantee fresh, up-to-date figures
    if (targetAcademicYearId) {
      try {
        await FeeAccountCalculationService.recalculateStudentFeeAccount(
          schoolId,
          targetAcademicYearId.toString(),
          activeStudentId
        );
      } catch (calcErr) {
        console.warn("Parent Fee account recalculation warning:", calcErr);
      }
    }

    // 7. Fetch Fee Account Summary
    let feeAccount = null;
    if (targetAcademicYearId) {
      feeAccount = await StudentFeeAccount.findOne({
        schoolId,
        studentId: activeStudentId,
        academicYearId: targetAcademicYearId,
      }).lean();
    }

    if (!feeAccount) {
      feeAccount = await StudentFeeAccount.findOne({
        schoolId,
        studentId: activeStudentId,
      })
        .sort({ updatedAt: -1 })
        .lean();
    }

    // 8. Fetch Student Payments (Only ACTIVE payments for this child)
    const paymentDocs = await FeePayment.find({
      schoolId,
      studentId: activeStudentId,
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

    // 9. Fetch Fee Assignments & Installment Due Schedule
    const assignmentDocs = await StudentFeeAssignment.find({
      schoolId,
      studentId: activeStudentId,
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

    // 10. Academic Year Metadata
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
      hasChildren: true,
      data: {
        student: {
          _id: studentDoc._id.toString(),
          name: `${studentDoc.firstName} ${studentDoc.lastName}`.trim(),
          admissionNumber: studentDoc.admissionNumber,
          rollNumber: studentDoc.rollNumber || "",
          class: (studentDoc.classId as any)?.name || "Class",
          section: (studentDoc.sectionId as any)?.name || "Section",
        },
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
    console.error("Error fetching parent fee overview:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch student fee overview",
        },
      },
      { status: 500 }
    );
  }
}

// Strictly enforce read-only security on Parent fee endpoint
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Parents cannot create fee payments or modify fee structures.",
      },
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Parents cannot update fee records or accounts.",
      },
    },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Parents cannot modify discounts, late fees, or concessions.",
      },
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Parents cannot delete fee records or transactions.",
      },
    },
    { status: 405 }
  );
}
