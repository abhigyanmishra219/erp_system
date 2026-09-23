import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { createFeeStructureSchema } from "@/lib/validation/fee";
import FeeStructure from "@/models/FeeStructure";
import FeeCategory from "@/models/FeeCategory";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import StudentFeeAssignment from "@/models/StudentFeeAssignment";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { searchParams } = new URL(req.url);

  const academicYearId = searchParams.get("academicYearId");
  const classId = searchParams.get("classId");
  const feeCategoryId = searchParams.get("feeCategoryId");
  const isActive = searchParams.get("isActive");

  try {
    await connectToDatabase();

    const filter: Record<string, any> = { schoolId };

    if (academicYearId && mongoose.Types.ObjectId.isValid(academicYearId)) {
      filter.academicYearId = academicYearId;
    }
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      filter.classId = classId;
    }
    if (feeCategoryId && mongoose.Types.ObjectId.isValid(feeCategoryId)) {
      filter.feeCategoryId = feeCategoryId;
    }
    if (isActive !== null && isActive !== undefined && isActive !== "") {
      filter.isActive = isActive === "true";
    }

    const structures = await FeeStructure.find(filter)
      .populate("academicYearId", "name status")
      .populate("feeCategoryId", "name code")
      .populate("classId", "name code")
      .populate("sectionId", "name code")
      .sort({ createdAt: -1 })
      .lean();

    // Query assigned students count per structure
    const structureIds = structures.map((s) => s._id);
    const assignmentCounts = await StudentFeeAssignment.aggregate([
      { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), feeStructureId: { $in: structureIds }, status: "ACTIVE" } },
      { $group: { _id: "$feeStructureId", count: { $sum: 1 } } },
    ]);

    const countMap = new Map<string, number>();
    assignmentCounts.forEach((ac) => {
      countMap.set(ac._id.toString(), ac.count);
    });

    const formatted = structures.map((s: any) => ({
      id: s._id.toString(),
      name: s.name,
      description: s.description || "",
      academicYear: s.academicYearId ? { id: s.academicYearId._id?.toString(), name: s.academicYearId.name } : null,
      feeCategory: s.feeCategoryId ? { id: s.feeCategoryId._id?.toString(), name: s.feeCategoryId.name, code: s.feeCategoryId.code } : null,
      class: s.classId ? { id: s.classId._id?.toString(), name: s.classId.name, code: s.classId.code } : null,
      section: s.sectionId ? { id: s.sectionId._id?.toString(), name: s.sectionId.name } : null,
      amount: s.amount,
      frequency: s.frequency,
      installments: (s.installments || []).map((inst: any) => ({
        name: inst.name,
        amount: inst.amount,
        dueDate: inst.dueDate,
        sequence: inst.sequence,
      })),
      effectiveFrom: s.effectiveFrom,
      effectiveTo: s.effectiveTo,
      assignedStudentsCount: countMap.get(s._id.toString()) || 0,
      isActive: s.isActive,
      createdAt: s.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        structures: formatted,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch fee structures" } },
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
    const validated = createFeeStructureSchema.parse(body);

    await connectToDatabase();

    // Validate relationships belong to same school
    const [academicYear, category, classDoc, sectionDoc] = await Promise.all([
      AcademicYear.findOne({ _id: validated.academicYearId, schoolId }),
      FeeCategory.findOne({ _id: validated.feeCategoryId, schoolId }),
      Class.findOne({ _id: validated.classId, schoolId }),
      validated.sectionId ? Section.findOne({ _id: validated.sectionId, schoolId }) : null,
    ]);

    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Academic Year not found for your school" } },
        { status: 404 }
      );
    }
    if (!category) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Fee Category not found for your school" } },
        { status: 404 }
      );
    }
    if (!classDoc) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Class not found for your school" } },
        { status: 404 }
      );
    }
    if (validated.sectionId && !sectionDoc) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Section not found for your school" } },
        { status: 404 }
      );
    }
    if (sectionDoc && sectionDoc.classId.toString() !== validated.classId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_SECTION", message: "Selected section does not belong to selected class" } },
        { status: 400 }
      );
    }

    const structure = await FeeStructure.create({
      schoolId,
      academicYearId: validated.academicYearId,
      feeCategoryId: validated.feeCategoryId,
      name: validated.name,
      description: validated.description || "",
      classId: validated.classId,
      sectionId: validated.sectionId || null,
      amount: validated.amount,
      frequency: validated.frequency,
      installments: validated.installments || [],
      effectiveFrom: validated.effectiveFrom,
      effectiveTo: validated.effectiveTo,
      isActive: validated.isActive ?? true,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "FEE_STRUCTURE_CREATED",
      entityType: "FEE_STRUCTURE",
      entityId: structure._id.toString(),
      schoolId,
      metadata: {
        name: structure.name,
        amount: structure.amount,
        frequency: structure.frequency,
        classId: validated.classId,
        sectionId: validated.sectionId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          structure: {
            id: structure._id.toString(),
            name: structure.name,
            amount: structure.amount,
            frequency: structure.frequency,
            isActive: structure.isActive,
            createdAt: structure.createdAt,
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
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to create fee structure" } },
      { status: 500 }
    );
  }
}
