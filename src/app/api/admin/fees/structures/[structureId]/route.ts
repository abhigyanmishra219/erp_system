import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import { updateFeeStructureSchema } from "@/lib/validation/fee";
import FeeStructure from "@/models/FeeStructure";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ structureId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "FEES");
  if (!subCheck.allowed) return subCheck.response;

  const { schoolId } = auth.context;
  const { structureId } = await params;

  if (!mongoose.Types.ObjectId.isValid(structureId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid structure ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const structure = await FeeStructure.findOne({ _id: structureId, schoolId })
      .populate("academicYearId", "name status")
      .populate("feeCategoryId", "name code")
      .populate("classId", "name code")
      .populate("sectionId", "name code")
      .lean();

    if (!structure) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Fee structure not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        structure: {
          id: structure._id.toString(),
          name: structure.name,
          description: structure.description,
          academicYear: structure.academicYearId,
          feeCategory: structure.feeCategoryId,
          class: structure.classId,
          section: structure.sectionId,
          amount: structure.amount,
          frequency: structure.frequency,
          installments: structure.installments,
          effectiveFrom: structure.effectiveFrom,
          effectiveTo: structure.effectiveTo,
          isActive: structure.isActive,
          createdAt: structure.createdAt,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch fee structure" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ structureId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "FEES");
  if (!subCheck.allowed) return subCheck.response;

  const { user, schoolId } = auth.context;
  const { structureId } = await params;

  if (!mongoose.Types.ObjectId.isValid(structureId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid structure ID" } },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const validated = updateFeeStructureSchema.parse(body);

    await connectToDatabase();

    const structure = await FeeStructure.findOne({ _id: structureId, schoolId });
    if (!structure) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Fee structure not found" } },
        { status: 404 }
      );
    }

    if (validated.name !== undefined) structure.name = validated.name;
    if (validated.description !== undefined) structure.description = validated.description;
    if (validated.amount !== undefined) structure.amount = validated.amount;
    if (validated.frequency !== undefined) structure.frequency = validated.frequency;
    if (validated.installments !== undefined) structure.installments = validated.installments as any;
    if (validated.effectiveFrom !== undefined) structure.effectiveFrom = validated.effectiveFrom;
    if (validated.effectiveTo !== undefined) structure.effectiveTo = validated.effectiveTo;
    if (validated.isActive !== undefined) structure.isActive = validated.isActive;
    structure.updatedBy = user.id;

    await structure.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "FEE_STRUCTURE_UPDATED",
      entityType: "FEE_STRUCTURE",
      entityId: structure._id.toString(),
      schoolId,
      metadata: {
        name: structure.name,
        amount: structure.amount,
        isActive: structure.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        structure: {
          id: structure._id.toString(),
          name: structure.name,
          amount: structure.amount,
          frequency: structure.frequency,
          isActive: structure.isActive,
          updatedAt: structure.updatedAt,
        },
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
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to update fee structure" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ structureId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "FEES");
  if (!subCheck.allowed) return subCheck.response;

  const { user, schoolId } = auth.context;
  const { structureId } = await params;

  if (!mongoose.Types.ObjectId.isValid(structureId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid structure ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const structure = await FeeStructure.findOne({ _id: structureId, schoolId });
    if (!structure) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Fee structure not found" } },
        { status: 404 }
      );
    }

    structure.isActive = false;
    structure.updatedBy = user.id;
    await structure.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "FEE_STRUCTURE_DEACTIVATED",
      entityType: "FEE_STRUCTURE",
      entityId: structure._id.toString(),
      schoolId,
      metadata: {
        name: structure.name,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Fee structure deactivated successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to deactivate fee structure" } },
      { status: 500 }
    );
  }
}
