import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
import connectToDatabase from "@/lib/db";
import School from "@/models/School";
import Plan from "@/models/Plan";
import { updateSubscriptionSchema } from "@/lib/validation/subscription";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ schoolId: string }> }
) {
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  const { schoolId } = await params;

  if (!mongoose.Types.ObjectId.isValid(schoolId)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_ID", message: "Invalid School ID format" },
      },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const body = await req.json();
    const validationResult = updateSubscriptionSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid subscription data provided.",
            details: validationResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const school = await School.findOne({ _id: schoolId, isDeleted: false });
    if (!school) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "School not found or archived" },
        },
        { status: 404 }
      );
    }

    const updates = validationResult.data;
    const oldPlan = school.plan;
    const oldStatus = school.subscriptionStatus;
    const oldExpiry = school.subscriptionExpiryDate;

    // If plan changed and studentLimit/modules not provided, pull defaults from Plan model
    if (updates.plan && updates.plan !== oldPlan) {
      const planDoc = await Plan.findOne({ code: updates.plan, isActive: true });
      if (planDoc) {
        if (!updates.studentLimit) {
          school.studentLimit = planDoc.maxStudents;
        }
        if (!updates.enabledModules) {
          school.enabledModules = planDoc.enabledModules;
        }
      }
      school.plan = updates.plan;
    }

    if (updates.studentLimit !== undefined) {
      school.studentLimit = updates.studentLimit;
    }

    if (updates.subscriptionStartDate) {
      school.subscriptionStartDate = updates.subscriptionStartDate;
    }

    if (updates.subscriptionExpiryDate) {
      school.subscriptionExpiryDate = updates.subscriptionExpiryDate;
    }

    if (updates.subscriptionStatus) {
      school.subscriptionStatus = updates.subscriptionStatus;
    }

    if (updates.enabledModules) {
      school.enabledModules = updates.enabledModules;
    }

    school.updatedBy = new mongoose.Types.ObjectId(auth.user.id);
    await school.save();

    // Determine audit action
    let auditAction = "SUBSCRIPTION_UPDATED";
    if (updates.plan && updates.plan !== oldPlan) {
      auditAction = "SUBSCRIPTION_PLAN_CHANGED";
    } else if (updates.subscriptionStatus && updates.subscriptionStatus !== oldStatus) {
      if (updates.subscriptionStatus === "ACTIVE") auditAction = "SUBSCRIPTION_ACTIVATED";
      else if (updates.subscriptionStatus === "SUSPENDED") auditAction = "SUBSCRIPTION_SUSPENDED";
      else if (updates.subscriptionStatus === "CANCELLED") auditAction = "SUBSCRIPTION_CANCELLED";
    } else if (
      updates.subscriptionExpiryDate &&
      new Date(updates.subscriptionExpiryDate).getTime() > new Date(oldExpiry).getTime()
    ) {
      auditAction = "SUBSCRIPTION_RENEWED";
    }

    await createAuditLog({
      userId: auth.user.id,
      userRole: auth.user.role,
      action: auditAction,
      entityType: "SUBSCRIPTION",
      entityId: school._id.toString(),
      schoolId: school._id.toString(),
      metadata: {
        schoolName: school.name,
        schoolCode: school.code,
        previousPlan: oldPlan,
        newPlan: school.plan,
        previousStatus: oldStatus,
        newStatus: school.subscriptionStatus,
        previousExpiry: oldExpiry,
        newExpiry: school.subscriptionExpiryDate,
        studentLimit: school.studentLimit,
        reason: updates.reason || "Administrative update",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Subscription updated successfully.",
      data: {
        id: school._id.toString(),
        name: school.name,
        code: school.code,
        plan: school.plan,
        studentLimit: school.studentLimit,
        subscriptionStartDate: school.subscriptionStartDate,
        subscriptionExpiryDate: school.subscriptionExpiryDate,
        subscriptionStatus: school.subscriptionStatus,
        enabledModules: school.enabledModules,
        updatedAt: school.updatedAt,
      },
    });
  } catch (error) {
    console.error("PATCH /api/system-admin/schools/[schoolId]/subscription error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "Failed to update subscription" },
      },
      { status: 500 }
    );
  }
}
