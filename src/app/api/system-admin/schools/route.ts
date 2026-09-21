import { NextRequest, NextResponse } from "next/server";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
import connectToDatabase from "@/lib/db";
import School from "@/models/School";
import {
  createSchoolSchema,
  schoolQuerySchema,
} from "@/lib/validation/school";
import { generateUniqueSchoolCode } from "@/lib/schoolCode";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const url = new URL(req.url);
    const queryResult = schoolQuerySchema.safeParse({
      page: url.searchParams.get("page") || 1,
      limit: url.searchParams.get("limit") || 10,
      search: url.searchParams.get("search") || "",
      status: url.searchParams.get("status") || "ALL",
      plan: url.searchParams.get("plan") || "ALL",
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

    const { page, limit, search, status, plan, sortBy, sortOrder } =
      queryResult.data;

    await connectToDatabase();

    // 1. Build MongoDB filter query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { isDeleted: false };

    if (status !== "ALL") {
      filter.status = status;
    }

    if (plan !== "ALL") {
      filter.plan = plan;
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { name: searchRegex },
        { code: searchRegex },
        { city: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    // 2. Query count and paginated records
    const skip = (page - 1) * limit;
    const sortField = sortBy;
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    const [total, schools] = await Promise.all([
      School.countDocuments(filter),
      School.find(filter)
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      data: schools.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        code: s.code,
        address: s.address,
        city: s.city,
        state: s.state,
        country: s.country,
        phone: s.phone,
        email: s.email,
        logo: s.logo,
        website: s.website,
        plan: s.plan,
        studentLimit: s.studentLimit,
        subscriptionStartDate: s.subscriptionStartDate,
        subscriptionExpiryDate: s.subscriptionExpiryDate,
        subscriptionStatus: s.subscriptionStatus,
        status: s.status,
        enabledModules: s.enabledModules,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: unknown) {
    console.error("Fetch schools error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to retrieve schools";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: errorMessage,
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
    const body = await req.json();
    const parseResult = createSchoolSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed for school data",
            details: parseResult.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const validatedData = parseResult.data;

    await connectToDatabase();

    // Auto-generate or ensure unique school code
    let finalCode = validatedData.code;
    if (!finalCode || !finalCode.trim()) {
      finalCode = await generateUniqueSchoolCode(validatedData.name);
    } else {
      const existingSchool = await School.findOne({ code: finalCode });
      if (existingSchool) {
        if (existingSchool.isDeleted) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "CODE_CONFLICT",
                message: `School code '${finalCode}' is reserved by an archived school. Please choose a different code or leave blank to auto-generate.`,
              },
            },
            { status: 409 }
          );
        }

        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_CODE",
              message: `A school with code '${finalCode}' already exists. Please choose a unique school code or leave blank to auto-generate.`,
            },
          },
          { status: 409 }
        );
      }
    }

    // Create the new school document
    const newSchool = await School.create({
      ...validatedData,
      code: finalCode,
      isDeleted: false,
      deletedAt: null,
      createdBy: auth.user.id,
      updatedBy: auth.user.id,
    });

    // Record audit log entry
    await createAuditLog({
      userId: auth.user.id,
      userRole: auth.user.role,
      action: "SCHOOL_CREATED",
      entityType: "SCHOOL",
      entityId: newSchool._id.toString(),
      schoolId: newSchool._id.toString(),
      metadata: {
        name: newSchool.name,
        code: newSchool.code,
        plan: newSchool.plan,
        studentLimit: newSchool.studentLimit,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "School created successfully",
        data: {
          id: newSchool._id.toString(),
          name: newSchool.name,
          code: newSchool.code,
          plan: newSchool.plan,
          status: newSchool.status,
          subscriptionStatus: newSchool.subscriptionStatus,
          studentLimit: newSchool.studentLimit,
          enabledModules: newSchool.enabledModules,
          createdAt: newSchool.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Create school error:", error);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_KEY",
            message: "Duplicate key error: School code must be unique.",
          },
        },
        { status: 409 }
      );
    }

    const errorMessage =
      error instanceof Error ? error.message : "Failed to create school";
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: errorMessage,
        },
      },
      { status: 500 }
    );
  }
}
