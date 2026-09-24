import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import { createFeeCategorySchema } from "@/lib/validation/fee";
import FeeCategory from "@/models/FeeCategory";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "FEES");
  if (!subCheck.allowed) return subCheck.response;

  const { schoolId } = auth.context;

  try {
    await connectToDatabase();

    const categories = await FeeCategory.find({ schoolId })
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        categories: categories.map((c) => ({
          id: c._id.toString(),
          name: c.name,
          code: c.code,
          description: c.description || "",
          isActive: c.isActive,
          createdAt: c.createdAt,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch fee categories" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "FEES");
  if (!subCheck.allowed) return subCheck.response;

  const { user, schoolId } = auth.context;

  try {
    const body = await req.json();
    const validated = createFeeCategorySchema.parse(body);

    await connectToDatabase();

    // Check for duplicate code within tenant
    const existing = await FeeCategory.findOne({
      schoolId,
      code: validated.code,
    });

    if (existing) {
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

    const category = await FeeCategory.create({
      schoolId,
      name: validated.name,
      code: validated.code,
      description: validated.description || "",
      isActive: validated.isActive ?? true,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "FEE_CATEGORY_CREATED",
      entityType: "FEE_CATEGORY",
      entityId: category._id.toString(),
      schoolId,
      metadata: {
        name: category.name,
        code: category.code,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          category: {
            id: category._id.toString(),
            name: category.name,
            code: category.code,
            description: category.description,
            isActive: category.isActive,
            createdAt: category.createdAt,
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
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to create fee category" } },
      { status: 500 }
    );
  }
}
