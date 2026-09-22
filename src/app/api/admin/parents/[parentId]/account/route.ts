import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Parent from "@/models/Parent";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import { createAccountSchema } from "@/lib/validation/studentParent";
import { generateTemporaryPassword } from "@/lib/tempPassword";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ parentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { parentId } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const validatedData = createAccountSchema.parse(body);

    await connectToDatabase();

    const parent = await Parent.findOne({ _id: parentId, schoolId });

    if (!parent) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Parent not found" },
        },
        { status: 404 }
      );
    }

    const email = (validatedData.email || parent.email || "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMAIL_REQUIRED",
            message: "Parent email is required to create a login account.",
          },
        },
        { status: 400 }
      );
    }

    let existingUser = null;
    if (parent.userId) {
      existingUser = await User.findOne({ _id: parent.userId });
    } else {
      existingUser = await User.findOne({ email });
    }

    const rawPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    if (existingUser) {
      existingUser.password = hashedPassword;
      existingUser.mustChangePassword = true;
      existingUser.isActive = parent.status === "ACTIVE";
      existingUser.parentId = parent._id;
      existingUser.schoolId = schoolId;
      await existingUser.save();

      parent.userId = existingUser._id;
      parent.email = email;
      await parent.save();

      await AuditLog.create({
        userId: user.id,
        userRole: user.role,
        action: "PASSWORD_CHANGED",
        entityType: "USER",
        entityId: existingUser._id.toString(),
        schoolId,
        metadata: {
          parentId: parent._id.toString(),
          userId: existingUser._id.toString(),
          email: existingUser.email,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          credentials: {
            email: existingUser.email,
            temporaryPassword: rawPassword,
            role: "PARENT",
            name: `${parent.firstName} ${parent.lastName}`.trim(),
            isReset: true,
          },
        },
      });
    }

    // Create new user
    const newUser = new User({
      name: `${parent.firstName} ${parent.lastName}`.trim(),
      email,
      password: hashedPassword,
      role: "PARENT",
      schoolId,
      parentId: parent._id,
      mustChangePassword: true,
      isActive: parent.status === "ACTIVE",
    });

    await newUser.save();

    parent.userId = newUser._id;
    parent.email = email;
    await parent.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "PARENT_ACCOUNT_CREATED",
      entityType: "USER",
      entityId: newUser._id.toString(),
      schoolId,
      metadata: {
        parentId: parent._id.toString(),
        userId: newUser._id.toString(),
        email: newUser.email,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          credentials: {
            email: newUser.email,
            temporaryPassword: rawPassword,
            role: "PARENT",
            name: newUser.name,
            isReset: false,
          },
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/admin/parents/[parentId]/account error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to create/reset parent login account" },
      },
      { status: 500 }
    );
  }
}
