import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { updateFeeCategorySchema } from "@/lib/validation/fee";
import FeeCategory from "@/models/FeeCategory";
import FeeStructure from "@/models/FeeStructure";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { categoryId } = await params;

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid category ID" } },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const validated = updateFeeCategorySchema.parse(body);

    await connectToDatabase();

    const category = await FeeCategory.findOne({ _id: categoryId, schoolId });
    if (!category) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Fee category not found" } },
        { status: 404 }
      );
    }

    if (validated.code && validated.code !== category.code) {
      const duplicate = await FeeCategory.findOne({
        schoolId,
        code: validated.code,
        _id: { $ne: categoryId },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_CODE",
              message: `Fee category with code '${validated.code}' already exists.`,
            },
          },
          { status: 409 }
        );
      }
      category.code = validated.code;
    }

    if (validated.name !== undefined) category.name = validated.name;
    if (validated.description !== undefined) category.description = validated.description;
    if (validated.isActive !== undefined) category.isActive = validated.isActive;
    category.updatedBy = user.id;

    await category.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "FEE_CATEGORY_UPDATED",
      entityType: "FEE_CATEGORY",
      entityId: category._id.toString(),
      schoolId,
      metadata: {
        name: category.name,
        code: category.code,
        isActive: category.isActive,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        category: {
          id: category._id.toString(),
          name: category.name,
          code: category.code,
          description: category.description,
          isActive: category.isActive,
          updatedAt: category.updatedAt,
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
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to update fee category" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ categoryId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { categoryId } = await params;

  if (!mongoose.Types.ObjectId.isValid(categoryId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid category ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const category = await FeeCategory.findOne({ _id: categoryId, schoolId });
    if (!category) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Fee category not found" } },
        { status: 404 }
      );
    }

    // Soft deactivate instead of hard delete to preserve historical integrity
    category.isActive = false;
    category.updatedBy = user.id;
    await category.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "FEE_CATEGORY_DEACTIVATED",
      entityType: "FEE_CATEGORY",
      entityId: category._id.toString(),
      schoolId,
      metadata: {
        name: category.name,
        code: category.code,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Fee category deactivated successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to deactivate fee category" } },
      { status: 500 }
    );
  }
}
