import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Parent from "@/models/Parent";
import StudentParent from "@/models/StudentParent";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import { createParentSchema } from "@/lib/validation/studentParent";
import { generateTemporaryPassword } from "@/lib/tempPassword";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "10", 10)));
    const search = (url.searchParams.get("search") || "").trim();
    const status = url.searchParams.get("status") || "ALL";
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") === "asc" ? 1 : -1;

    await connectToDatabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { schoolId };

    if (status !== "ALL") {
      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { occupation: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, parents] = await Promise.all([
      Parent.countDocuments(filter),
      Parent.find(filter)
        .populate("userId", "email isActive")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Count children for each parent
    const parentIds = parents.map((p) => p._id);
    const childCounts = await StudentParent.aggregate([
      { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), parentId: { $in: parentIds } } },
      { $group: { _id: "$parentId", count: { $sum: 1 } } },
    ]);

    const countMap = new Map(childCounts.map((c) => [c._id.toString(), c.count]));

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      data: {
        parents: parents.map((p) => ({
          id: p._id.toString(),
          firstName: p.firstName,
          lastName: p.lastName,
          fullName: `${p.firstName} ${p.lastName}`.trim(),
          email: p.email,
          phone: p.phone,
          relationship: p.relationship,
          occupation: p.occupation,
          status: p.status,
          hasLoginAccount: !!p.userId,
          user: p.userId,
          childrenCount: countMap.get(p._id.toString()) || 0,
          createdAt: p.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/parents error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to fetch parents" },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;

  try {
    const body = await req.json();
    const validatedData = createParentSchema.parse(body);

    await connectToDatabase();

    const normalizedEmail = validatedData.email.toLowerCase().trim();

    // Check duplicate parent email within school
    const existing = await Parent.findOne({
      schoolId,
      email: normalizedEmail,
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_EMAIL",
            message: `Parent with email '${validatedData.email}' already exists in your school.`,
          },
        },
        { status: 409 }
      );
    }

    const newParent = new Parent({
      schoolId,
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: normalizedEmail,
      phone: validatedData.phone,
      relationship: validatedData.relationship,
      occupation: validatedData.occupation || "",
      address: validatedData.address,
      status: validatedData.status || "ACTIVE",
      createdBy: user.id,
      updatedBy: user.id,
    });

    await newParent.save();

    let parentCredentials = null;

    if (validatedData.createLoginAccount) {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        if (!existingUser.parentId) {
          existingUser.parentId = newParent._id;
          await existingUser.save();
          newParent.userId = existingUser._id;
          await newParent.save();
        }
      } else {
        const rawPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const parentUser = new User({
          name: `${validatedData.firstName} ${validatedData.lastName}`.trim(),
          email: normalizedEmail,
          password: hashedPassword,
          role: "PARENT",
          schoolId,
          parentId: newParent._id,
          mustChangePassword: true,
          isActive: true,
        });

        await parentUser.save();
        newParent.userId = parentUser._id;
        await newParent.save();

        parentCredentials = {
          email: parentUser.email,
          temporaryPassword: rawPassword,
          role: "PARENT",
          name: parentUser.name,
        };

        await AuditLog.create({
          userId: user.id,
          userRole: user.role,
          action: "PARENT_ACCOUNT_CREATED",
          entityType: "USER",
          entityId: parentUser._id.toString(),
          schoolId,
          metadata: {
            parentId: newParent._id.toString(),
            userId: parentUser._id.toString(),
            email: parentUser.email,
          },
        });
      }
    }

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "PARENT_CREATED",
      entityType: "PARENT",
      entityId: newParent._id.toString(),
      schoolId,
      metadata: {
        parentId: newParent._id.toString(),
        email: newParent.email,
        name: `${newParent.firstName} ${newParent.lastName}`,
        phone: newParent.phone,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          parent: {
            id: newParent._id.toString(),
            firstName: newParent.firstName,
            lastName: newParent.lastName,
            email: newParent.email,
            phone: newParent.phone,
            relationship: newParent.relationship,
            status: newParent.status,
          },
          credentials: parentCredentials,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/admin/parents error:", err);
    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: (err as { issues: unknown[] }).issues,
          },
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to create parent" },
      },
      { status: 500 }
    );
  }
}
