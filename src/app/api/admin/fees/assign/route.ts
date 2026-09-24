import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import { assignFeeSchema } from "@/lib/validation/fee";
import FeeStructure from "@/models/FeeStructure";
import Student from "@/models/Student";
import StudentFeeAssignment from "@/models/StudentFeeAssignment";
import AuditLog from "@/models/AuditLog";
import { FeeCalculationService } from "@/lib/services/feeCalculationService";
import { FeeAccountCalculationService } from "@/lib/services/feeAccountCalculationService";
import connectToDatabase from "@/lib/db";

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "FEES");
  if (!subCheck.allowed) return subCheck.response;

  const { user, schoolId } = auth.context;

  try {
    const body = await req.json();
    const validated = assignFeeSchema.parse(body);

    await connectToDatabase();

    // 1. Verify fee structure exists and belongs to this school and academic year
    const structure = await FeeStructure.findOne({
      _id: validated.feeStructureId,
      schoolId,
      academicYearId: validated.academicYearId,
      isActive: true,
    });

    if (!structure) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Active fee structure not found for this academic year" } },
        { status: 404 }
      );
    }

    // 2. Validate students belong to school and eligible class/section
    const studentQuery: Record<string, any> = {
      _id: { $in: validated.studentIds },
      schoolId,
      status: "ACTIVE",
    };

    const eligibleStudents = await Student.find(studentQuery).lean();
    if (eligibleStudents.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NO_STUDENTS", message: "No eligible active students found" } },
        { status: 400 }
      );
    }

    // 3. Check for existing assignments to prevent duplicates
    const existingAssignments = await StudentFeeAssignment.find({
      schoolId,
      academicYearId: validated.academicYearId,
      feeStructureId: validated.feeStructureId,
      studentId: { $in: eligibleStudents.map((s) => s._id) },
      status: "ACTIVE",
    }).lean();

    const existingStudentIdSet = new Set(existingAssignments.map((ea) => ea.studentId.toString()));

    const newAssignmentsToCreate: any[] = [];
    const assignedStudentIds: string[] = [];
    const skippedStudentIds: string[] = [];

    // Map overrides for easy lookup
    const overrideMap = new Map<string, any>();
    (validated.overrides || []).forEach((ov) => {
      overrideMap.set(ov.studentId, ov);
    });

    for (const student of eligibleStudents) {
      const stuIdStr = student._id.toString();
      if (existingStudentIdSet.has(stuIdStr)) {
        skippedStudentIds.push(stuIdStr);
        continue;
      }

      const override = overrideMap.get(stuIdStr);
      const discountType = override?.discountType || "NONE";
      const discountValue = override?.discountValue || 0;
      const concessionType = override?.concessionType || "NONE";
      const concessionValue = override?.concessionValue || 0;
      const concessionReason = override?.concessionReason || "";

      const calcResult = FeeCalculationService.calculateAssignment(
        structure,
        discountType,
        discountValue,
        concessionType,
        concessionValue
      );

      newAssignmentsToCreate.push({
        schoolId,
        academicYearId: validated.academicYearId,
        studentId: student._id,
        feeStructureId: structure._id,
        baseAmount: calcResult.baseAmount,
        discountType,
        discountValue,
        discountAmount: calcResult.discountAmount,
        concessionReason,
        concessionType,
        concessionValue,
        concessionAmount: calcResult.concessionAmount,
        netAmount: calcResult.netAmount,
        dueSchedule: calcResult.dueSchedule,
        status: "ACTIVE",
        createdBy: user.id,
        updatedBy: user.id,
      });

      assignedStudentIds.push(stuIdStr);
    }

    if (newAssignmentsToCreate.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "ALL_ALREADY_ASSIGNED",
            message: "All selected students already have this fee structure assigned.",
          },
        },
        { status: 409 }
      );
    }

    // 4. Insert assignments
    await StudentFeeAssignment.insertMany(newAssignmentsToCreate);

    // 5. Recalculate StudentFeeAccount for each assigned student
    await Promise.all(
      assignedStudentIds.map((sId) =>
        FeeAccountCalculationService.recalculateStudentFeeAccount(
          schoolId,
          validated.academicYearId,
          sId
        )
      )
    );

    // 6. Audit Log
    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "STUDENT_FEE_ASSIGNED",
      entityType: "FEE_STRUCTURE",
      entityId: structure._id.toString(),
      schoolId,
      metadata: {
        structureName: structure.name,
        assignedCount: assignedStudentIds.length,
        skippedCount: skippedStudentIds.length,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        assignedCount: assignedStudentIds.length,
        skippedCount: skippedStudentIds.length,
        message: `Successfully assigned '${structure.name}' to ${assignedStudentIds.length} student(s).${
          skippedStudentIds.length > 0 ? ` (${skippedStudentIds.length} student(s) skipped as already assigned)` : ""
        }`,
      },
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: error.errors[0]?.message || "Validation failed" } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to assign fees" } },
      { status: 500 }
    );
  }
}
