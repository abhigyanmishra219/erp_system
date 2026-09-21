import { NextRequest, NextResponse } from "next/server";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
import connectToDatabase from "@/lib/db";
import Plan from "@/models/Plan";
import School from "@/models/School";
import { createPlanSchema, planQuerySchema } from "@/lib/validation/plan";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const queryResult = planQuerySchema.safeParse({
      page: url.searchParams.get("page") || 1,
      limit: url.searchParams.get("limit") || 20,
      search: url.searchParams.get("search") || "",
      status: url.searchParams.get("status") || "ALL",
      sortBy: url.searchParams.get("sortBy") || "createdAt",
      sortOrder: url.searchParams.get("sortOrder") || "desc",
    });

    if (!queryResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: queryResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { page, limit, search, status, sortBy, sortOrder } = queryResult.data;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (status === "ACTIVE") filter.isActive = true;
    if (status === "INACTIVE") filter.isActive = false;

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const sortOption: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    const skip = (page - 1) * limit;

    const [plans, totalPlans] = await Promise.all([
      Plan.find(filter)
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .lean(),
      Plan.countDocuments(filter),
    ]);

    // Aggregate subscriber school count for each plan code
    const subscriberCounts = await School.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$plan", count: { $sum: 1 } } },
    ]);

    const subscriberMap: Record<string, number> = {};
    subscriberCounts.forEach((item) => {
      if (item._id) subscriberMap[item._id] = item.count;
    });

    const transformedPlans = plans.map((plan) => ({
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
      subscribedSchoolsCount: subscriberMap[plan.code] || 0,
      createdBy: plan.createdBy,
      updatedBy: plan.updatedBy,
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        plans: transformedPlans,
        pagination: {
          total: totalPlans,
          page,
          limit,
          totalPages: Math.ceil(totalPlans / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("GET /api/system-admin/plans error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve plans.",
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  try {
    await connectToDatabase();

    const body = await req.json();
    const validationResult = createPlanSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid plan data provided.",
            details: validationResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const validatedData = validationResult.data;

    // Check duplicate code
    const existingPlan = await Plan.findOne({ code: validatedData.code });
    if (existingPlan) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_CODE",
            message: `A plan with code '${validatedData.code}' already exists. Please choose a unique code.`,
          },
        },
        { status: 409 }
      );
    }

    const newPlan = await Plan.create({
      ...validatedData,
      createdBy: auth.user.id,
      updatedBy: auth.user.id,
    });

    // Record audit log
    await createAuditLog({
      userId: auth.user.id,
      userRole: auth.user.role,
      action: "PLAN_CREATED",
      entityType: "PLAN",
      entityId: newPlan._id.toString(),
      metadata: {
        planName: newPlan.name,
        planCode: newPlan.code,
        price: newPlan.price,
        currency: newPlan.currency,
        maxStudents: newPlan.maxStudents,
        billingPeriod: newPlan.billingPeriod,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Plan created successfully.",
        data: {
          id: newPlan._id.toString(),
          name: newPlan.name,
          code: newPlan.code,
          description: newPlan.description,
          maxStudents: newPlan.maxStudents,
          storageLimit: newPlan.storageLimit,
          maxAdmins: newPlan.maxAdmins,
          enabledModules: newPlan.enabledModules,
          price: newPlan.price,
          currency: newPlan.currency,
          billingPeriod: newPlan.billingPeriod,
          isActive: newPlan.isActive,
          createdAt: newPlan.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/system-admin/plans error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create plan.",
        },
      },
      { status: 500 }
    );
  }
}
