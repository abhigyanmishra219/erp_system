import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import User from "@/models/User";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
import { hasPermission, PERMISSIONS } from "@/lib/auth/permissions";

/**
 * PATCH /api/system-admin/admins/[id]
 * Updates a System Admin account:
 * - Update name
 * - Activate / Deactivate status (with self-lockout and last-admin protection)
 * - Reset credentials / password
 */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  if (!hasPermission(auth.user, PERMISSIONS.SYSTEM_ADMIN_EDIT)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Access denied. Insufficient permissions to edit System Admins.",
        },
      },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_ID", message: "Invalid System Admin ID format" },
      },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const { name, isActive, password } = body;

    await connectToDatabase();

    const targetAdmin = await User.findById(id);
    if (!targetAdmin || targetAdmin.role !== "SYSTEM_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "System Admin account not found",
          },
        },
        { status: 404 }
      );
    }

    // Protection 1: Self-deactivation prevention
    if (isActive === false && auth.user.id === targetAdmin._id.toString()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CANNOT_DEACTIVATE_SELF",
            message: "Security Protection: You cannot deactivate your own System Admin account.",
          },
        },
        { status: 400 }
      );
    }

    // Protection 2: Last active System Admin protection
    if (isActive === false && targetAdmin.isActive) {
      const activeAdminCount = await User.countDocuments({
        role: "SYSTEM_ADMIN",
        isActive: true,
      });

      if (activeAdminCount <= 1) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "LAST_ADMIN_PROTECTION",
              message: "Cannot deactivate the only remaining active System Admin account.",
            },
          },
          { status: 400 }
        );
      }
    }

    // Apply Name update
    if (typeof name === "string") {
      targetAdmin.name = name.trim();
    }

    // Apply Active status update
    if (typeof isActive === "boolean") {
      targetAdmin.isActive = isActive;
    }

    // Apply Password / Credential reset
    if (typeof password === "string" && password.length > 0) {
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
      const salt = await bcrypt.genSalt(10);
      targetAdmin.password = await bcrypt.hash(password, salt);
    }

    await targetAdmin.save();

    return NextResponse.json({
      success: true,
      message: "System Admin account updated successfully",
      data: {
        id: targetAdmin._id.toString(),
        name: targetAdmin.name,
        email: targetAdmin.email,
        role: targetAdmin.role,
        isActive: targetAdmin.isActive,
        updatedAt: targetAdmin.updatedAt,
      },
    });
  } catch (error: unknown) {
    console.error("Update system admin error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update System Admin";
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: errorMessage },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/system-admin/admins/[id]
 * Deactivates or removes a System Admin account.
 */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireSystemAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  if (!hasPermission(auth.user, PERMISSIONS.SYSTEM_ADMIN_MANAGE)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Access denied. Insufficient permissions to manage System Admins.",
        },
      },
      { status: 403 }
    );
  }

  const { id } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "INVALID_ID", message: "Invalid System Admin ID format" },
      },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const targetAdmin = await User.findById(id);
    if (!targetAdmin || targetAdmin.role !== "SYSTEM_ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "System Admin account not found",
          },
        },
        { status: 404 }
      );
    }

    // Safety rule: Cannot delete/deactivate self
    if (auth.user.id === targetAdmin._id.toString()) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CANNOT_DELETE_SELF",
            message: "Security Protection: You cannot deactivate your own System Admin account.",
          },
        },
        { status: 400 }
      );
    }

    // Safety rule: Cannot deactivate/delete last active admin
    if (targetAdmin.isActive) {
      const activeAdminCount = await User.countDocuments({
        role: "SYSTEM_ADMIN",
        isActive: true,
      });

      if (activeAdminCount <= 1) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "LAST_ADMIN_PROTECTION",
              message: "Cannot deactivate the only remaining active System Admin account.",
            },
          },
          { status: 400 }
        );
      }
    }

    // Safe deactivation
    targetAdmin.isActive = false;
    await targetAdmin.save();

    return NextResponse.json({
      success: true,
      message: "System Admin account deactivated successfully",
      data: {
        id: targetAdmin._id.toString(),
        email: targetAdmin.email,
        isActive: false,
      },
    });
  } catch (error: unknown) {
    console.error("Delete system admin error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to deactivate System Admin";
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: errorMessage },
      },
      { status: 500 }
    );
  }
}
