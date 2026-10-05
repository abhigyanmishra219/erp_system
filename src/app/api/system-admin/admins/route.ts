import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

/**
 * GET /api/system-admin/admins
 * List all System Admin accounts.
 * Protected: Requires active authentication and SYSTEM_ADMIN role.
 */
export async function GET(req: NextRequest) {
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  if (!hasPermission(auth.user, PERMISSIONS.SYSTEM_ADMIN_VIEW)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Access denied. Insufficient permissions to view System Admins.",
        },
      },
      { status: 403 }
    );
  }

  try {
    const url = new URL(req.url);
    const search = (url.searchParams.get("search") || "").trim();
    const status = url.searchParams.get("status") || "ALL";

    await connectToDatabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      role: "SYSTEM_ADMIN",
    };

    if (status === "ACTIVE") {
      filter.isActive = true;
    } else if (status === "DISABLED") {
      filter.isActive = false;
    }

    if (search) {
      const searchRegex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      filter.$or = [{ email: searchRegex }, { name: searchRegex }];
    }

    const admins = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: admins.map((admin) => ({
        id: admin._id.toString(),
        name: admin.name || "",
        email: admin.email,
        role: admin.role,
        isActive: admin.isActive,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt,
      })),
      total: admins.length,
    });
  } catch (error: unknown) {
    console.error("Get system admins error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to retrieve System Admins";
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

/**
 * POST /api/system-admin/admins
 * Create a new System Admin account.
 * Protected: Requires active authentication and SYSTEM_ADMIN role.
 */
export async function POST(req: NextRequest) {
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  if (!hasPermission(auth.user, PERMISSIONS.SYSTEM_ADMIN_CREATE)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Access denied. Insufficient permissions to create System Admins.",
        },
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Email and password are required",
          },
        },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Please enter a valid email address",
          },
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Password must be at least 8 characters long",
          },
        },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const normalizedEmail = email.toLowerCase().trim();

    // Check if account with email already exists
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFLICT",
            message: "An account with this email address already exists",
          },
        },
        { status: 409 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Platform-level administrator: Explicitly detach from any school tenant
    const displayName = (name && name.trim()) || normalizedEmail.split("@")[0];
    const newAdmin = await User.create({
      name: displayName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "SYSTEM_ADMIN",
      schoolId: null,
      studentId: null,
      parentId: null,
      teacherId: null,
      isActive: true,
      mustChangePassword: false,
    });

    return NextResponse.json(
      {
        success: true,
        message: "System Admin account created successfully",
        data: {
          id: newAdmin._id.toString(),
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
          isActive: newAdmin.isActive,
          createdAt: newAdmin.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Create system admin error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create System Admin";
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
