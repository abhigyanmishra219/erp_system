import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { requireSystemAdmin } from "@/lib/auth/requireSystemAdmin";
import connectToDatabase from "@/lib/db";
import School from "@/models/School";
import User from "@/models/User";
import {
  createSchoolSchema,
  schoolQuerySchema,
} from "@/lib/validation/school";
import { generateUniqueSchoolCode } from "@/lib/schoolCode";
import { generateTemporaryPassword } from "@/lib/tempPassword";
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
      const searchRegex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
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
    const normalizedAdminEmail = validatedData.schoolAdminEmail.trim().toLowerCase();

    await connectToDatabase();

    // 1. Check whether School Admin email already exists in User collection
    const existingUser = await User.findOne({ email: normalizedAdminEmail });
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_EMAIL",
            message: `An account with email '${normalizedAdminEmail}' already exists. Please choose a different school admin email address.`,
          },
        },
        { status: 409 }
      );
    }

    // 2. Auto-generate or ensure unique school code
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

    // 3. Generate cryptographic temporary password and hash it
    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Extract school fields (excluding schoolAdminEmail)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { schoolAdminEmail: _, ...schoolFields } = validatedData;

    // 4. Atomic Execution: Attempt transaction with fallback rollback strategy
    let createdSchoolId: mongoose.Types.ObjectId | null = null;
    let createdUserId: mongoose.Types.ObjectId | null = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let newSchoolDoc: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let newAdminDoc: any = null;

    const useTransaction = mongoose.connection.readyState === 1 && typeof mongoose.connection.startSession === "function";
    let session: mongoose.ClientSession | null = null;

    try {
      if (useTransaction) {
        try {
          session = await mongoose.startSession();
          session.startTransaction();
        } catch {
          session = null;
        }
      }

      const sessionOpts = session ? { session } : {};

      // A. Create the School document
      const schoolDocs = await School.create(
        [
          {
            ...schoolFields,
            code: finalCode,
            isDeleted: false,
            deletedAt: null,
            createdBy: auth.user.id,
            updatedBy: auth.user.id,
          },
        ],
        sessionOpts
      );
      newSchoolDoc = schoolDocs[0];
      createdSchoolId = newSchoolDoc._id;

      // B. Create the School Admin User document with STRICT server-controlled properties
      const adminDocs = await User.create(
        [
          {
            name: `${validatedData.name} Administrator`,
            email: normalizedAdminEmail,
            password: hashedPassword,
            role: "ADMIN", // STRICT HARDCODED SERVER ENFORCEMENT
            schoolId: newSchoolDoc._id,
            isActive: true,
            mustChangePassword: true,
          },
        ],
        sessionOpts
      );
      newAdminDoc = adminDocs[0];
      createdUserId = newAdminDoc._id;

      // C. Post-Creation Security Verification
      const roleIsAdmin = String(newAdminDoc.role) === "ADMIN";
      const hasSchoolId = Boolean(newAdminDoc.schoolId);
      const schoolIdMatches =
        hasSchoolId && String(newAdminDoc.schoolId) === String(newSchoolDoc._id);

      if (!roleIsAdmin || !hasSchoolId || !schoolIdMatches) {
        // Safe diagnostic logging (NO PASSWORDS, SECRETS, OR HASHES)
        console.error("School onboarding security verification failed:", {
          adminUserId: newAdminDoc._id?.toString(),
          adminRole: newAdminDoc.role,
          adminSchoolId: newAdminDoc.schoolId?.toString(),
          createdSchoolId: newSchoolDoc._id?.toString(),
          roleIsAdmin,
          hasSchoolId,
          schoolIdMatches,
        });

        throw new Error(
          "Security constraint violation: School Admin role must be 'ADMIN' and associated with created school."
        );
      }

      // D. Commit transaction if active
      if (session) {
        await session.commitTransaction();
      }
    } catch (creationError) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch {
          // session abort ignore
        }
      } else {
        // Fallback standalone rollback: clean up partially created resources
        if (createdSchoolId) {
          try {
            await School.findByIdAndDelete(createdSchoolId);
          } catch (cleanupErr) {
            console.error("Rollback error deleting school:", cleanupErr);
          }
        }
        if (createdUserId) {
          try {
            await User.findByIdAndDelete(createdUserId);
          } catch (cleanupErr) {
            console.error("Rollback error deleting user:", cleanupErr);
          }
        }
      }
      throw creationError;
    } finally {
      if (session) {
        await session.endSession();
      }
    }

    // 5. Record audit logs (non-blocking, sanitizes metadata without sensitive info)
    await createAuditLog({
      userId: auth.user.id,
      userRole: auth.user.role,
      action: "SCHOOL_CREATED",
      entityType: "SCHOOL",
      entityId: newSchoolDoc._id.toString(),
      schoolId: newSchoolDoc._id.toString(),
      metadata: {
        name: newSchoolDoc.name,
        code: newSchoolDoc.code,
        plan: newSchoolDoc.plan,
        studentLimit: newSchoolDoc.studentLimit,
      },
    });

    await createAuditLog({
      userId: auth.user.id,
      userRole: auth.user.role,
      action: "USER_CREATED",
      entityType: "USER",
      entityId: newAdminDoc._id.toString(),
      schoolId: newSchoolDoc._id.toString(),
      metadata: {
        email: newAdminDoc.email,
        role: newAdminDoc.role,
        assignedSchoolId: newSchoolDoc._id.toString(),
      },
    });

    // 6. Return response containing temporary credentials ONLY to the authenticated SYSTEM_ADMIN
    return NextResponse.json(
      {
        success: true,
        message: "School and School Administrator created successfully",
        data: {
          school: {
            id: newSchoolDoc._id.toString(),
            name: newSchoolDoc.name,
            code: newSchoolDoc.code,
            plan: newSchoolDoc.plan,
            status: newSchoolDoc.status,
            subscriptionStatus: newSchoolDoc.subscriptionStatus,
            studentLimit: newSchoolDoc.studentLimit,
            enabledModules: newSchoolDoc.enabledModules,
            createdAt: newSchoolDoc.createdAt,
          },
          schoolAdmin: {
            id: newAdminDoc._id.toString(),
            email: newAdminDoc.email,
            role: "ADMIN",
          },
          temporaryPassword,
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
            message: "A unique constraint violation occurred (duplicate email or code).",
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
