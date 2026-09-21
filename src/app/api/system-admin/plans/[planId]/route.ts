import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
import connectToDatabase from "@/lib/db";
import Plan from "@/models/Plan";
import School from "@/models/School";
import { updatePlanSchema } from "@/lib/validation/plan";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  const { planId } = await params;

  if (!mongoose.Types.ObjectId.isValid(planId)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_ID", message: "Invalid Plan ID format" },
      },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const plan = await Plan.findById(planId)
      .populate("createdBy", "name email")
      .populate("updatedBy", "name email")
      .lean();

    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Plan not found" },
        },
        { status: 404 }
      );
    }

    // Find subscribed schools
    const subscribedSchools = await School.find({
      plan: plan.code,
      isDeleted: false,
    })
      .select("name code status subscriptionStatus studentLimit createdAt")
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        id: plan._id.toString(),
        name: plan.name,
        code: plan.code,
        description: plan.description,
        maxStudents: plan.maxStudents,
        storageLimit: plan.storageLimit,
        maxAdmins: plan.maxAdmins,
        enabledModules: plan.enabledModules,
        price: plan.price,
        currency: plan.currency,
        billingPeriod: plan.billingPeriod,
        isActive: plan.isActive,
        createdBy: plan.createdBy,
        updatedBy: plan.updatedBy,
        createdAt: plan.createdAt,
        updatedAt: plan.updatedAt,
        subscribedSchools: subscribedSchools.map((s) => ({
          id: s._id.toString(),
          name: s.name,
          code: s.code,
          status: s.status,
          subscriptionStatus: s.subscriptionStatus,
          studentLimit: s.studentLimit,
          createdAt: s.createdAt,
        })),
        subscribedSchoolsCount: subscribedSchools.length,
      },
    });
  } catch (error) {
    console.error("GET /api/system-admin/plans/[planId] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to fetch plan" },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  const { planId } = await params;

  if (!mongoose.Types.ObjectId.isValid(planId)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_ID", message: "Invalid Plan ID format" },
      },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const body = await req.json();
    const validationResult = updatePlanSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid plan update data.",
            details: validationResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Plan not found" },
        },
        { status: 404 }
      );
    }

    const updates = validationResult.data;
    const oldIsActive = plan.isActive;

    // Apply updates
    Object.assign(plan, updates);
    plan.updatedBy = new mongoose.Types.ObjectId(auth.user.id);
    await plan.save();

    // Determine specific audit action
    let auditAction = "PLAN_UPDATED";
    if (updates.isActive !== undefined && updates.isActive !== oldIsActive) {
      auditAction = updates.isActive ? "PLAN_ACTIVATED" : "PLAN_DEACTIVATED";
    }

    await createAuditLog({
      userId: auth.user.id,
      userRole: auth.user.role,
      action: auditAction,
      entityType: "PLAN",
      entityId: plan._id.toString(),
      metadata: {
        planName: plan.name,
        planCode: plan.code,
        changes: updates,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Plan updated successfully.",
      data: {
        id: plan._id.toString(),
        name: plan.name,
        code: plan.code,
        description: plan.description,
        maxStudents: plan.maxStudents,
        storageLimit: plan.storageLimit,
        maxAdmins: plan.maxAdmins,
        enabledModules: plan.enabledModules,
        price: plan.price,
        currency: plan.currency,
        billingPeriod: plan.billingPeriod,
        isActive: plan.isActive,
        updatedAt: plan.updatedAt,
      },
    });
  } catch (error) {
    console.error("PATCH /api/system-admin/plans/[planId] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to update plan" },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  const { planId } = await params;

  if (!mongoose.Types.ObjectId.isValid(planId)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_ID", message: "Invalid Plan ID format" },
      },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const plan = await Plan.findById(planId);
    if (!plan) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Plan not found" },
        },
        { status: 404 }
      );
    }

    // Check if any schools are subscribed to this plan
    const activeSchoolsCount = await School.countDocuments({
      plan: plan.code,
      isDeleted: false,
    });

    if (activeSchoolsCount > 0) {
      // Soft-deactivate to prevent breaking subscribed schools
      plan.isActive = false;
      plan.updatedBy = new mongoose.Types.ObjectId(auth.user.id);
      await plan.save();

      await createAuditLog({
        userId: auth.user.id,
        userRole: auth.user.role,
        action: "PLAN_DEACTIVATED",
        entityType: "PLAN",
        entityId: plan._id.toString(),
        metadata: {
          planName: plan.name,
          planCode: plan.code,
          reason: `Deactivated instead of deleted because ${activeSchoolsCount} schools are currently subscribed.`,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Plan has been deactivated instead of deleted because ${activeSchoolsCount} school(s) are currently subscribed.`,
        actionTaken: "DEACTIVATED",
        data: {
          id: plan._id.toString(),
          isActive: false,
        },
      });
    }

    // No schools subscribed -> safe hard delete
    await Plan.findByIdAndDelete(planId);

    await createAuditLog({
      userId: auth.user.id,
      userRole: auth.user.role,
      action: "PLAN_DELETED",
      entityType: "PLAN",
      entityId: planId,
      metadata: {
        planName: plan.name,
        planCode: plan.code,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Plan deleted successfully.",
      actionTaken: "DELETED",
    });
  } catch (error) {
    console.error("DELETE /api/system-admin/plans/[planId] error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to delete plan" },
      },
      { status: 500 }
    );
  }
}
