import { NextRequest, NextResponse } from "next/server";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
import connectToDatabase from "@/lib/db";
import User, { USER_ROLES } from "@/models/User";

export async function GET(req: NextRequest) {
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));
    const search = (url.searchParams.get("search") || "").trim();
    const role = url.searchParams.get("role") || "ALL";

    await connectToDatabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (role !== "ALL" && USER_ROLES.includes(role as (typeof USER_ROLES)[number])) {
      filter.role = role;
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ email: searchRegex }, { name: searchRegex }];
    }

    const skip = (page - 1) * limit;

    const [total, users] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      data: users.map((u) => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error: unknown) {
    console.error("Get platform users error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to retrieve platform users";
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
