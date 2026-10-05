import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/db";
import User, { USER_ROLES } from "@/models/User";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

/**
 * Account Registration Endpoint
 * 
 * SECURITY NOTICE:
 * Public/unauthenticated registration of SYSTEM_ADMIN accounts is strictly forbidden.
 * This endpoint requires active authentication and SYSTEM_ADMIN role privileges.
 */
export async function POST(req: NextRequest) {
  // 1. Enforce Server-Side System Admin Authentication Guard
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  // 2. Enforce System Admin Creation Permission
  if (!hasPermission(auth.user, PERMISSIONS.SYSTEM_ADMIN_CREATE)) {
    return NextResponse.json(
      {
        success: false,
        error: "Forbidden: You lack permission to create platform administrator accounts.",
      },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { email, password, name, role = "SYSTEM_ADMIN" } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Role validation: Only valid roles permitted
    if (role && !USER_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: `Invalid role specified. Permitted: ${USER_ROLES.join(", ")}` },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user already exists
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Tenant Separation: SYSTEM_ADMIN has null schoolId and null domain IDs
    const displayName = (name && name.trim()) || normalizedEmail.split("@")[0];
    const newUser = await User.create({
      email: normalizedEmail,
      name: displayName,
      password: hashedPassword,
      role: role || "SYSTEM_ADMIN",
      schoolId: null,
      studentId: null,
      parentId: null,
      teacherId: null,
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: "System Admin account created successfully",
        user: {
          id: newUser._id.toString(),
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          isActive: newUser.isActive,
          createdAt: newUser.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Register error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create account";
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}
