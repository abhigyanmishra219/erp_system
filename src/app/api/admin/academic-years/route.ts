import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { createAcademicYearSchema } from "@/lib/validation/adminSetup";
import AcademicYear from "@/models/AcademicYear";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;

  await connectToDatabase();

  const academicYears = await AcademicYear.find({ schoolId })
    .sort({ startDate: -1 })
    .lean();

  return NextResponse.json({
    success: true,
    data: {
      academicYears: academicYears.map((ay) => ({
        id: ay._id.toString(),
        name: ay.name,
        startDate: ay.startDate,
        endDate: ay.endDate,
        status: ay.status,
        createdAt: ay.createdAt,
      })),
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;

  try {
    const body = await req.json();
    const validatedData = createAcademicYearSchema.parse(body);

    await connectToDatabase();

    // Check for duplicate academic year name within the same school
    const existing = await AcademicYear.findOne({
      schoolId,
      name: { $regex: new RegExp(`^${validatedData.name}$`, "i") },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_NAME",
            message: `Academic year '${validatedData.name}' already exists for your school.`,
          },
        },
        { status: 409 }
      );
    }

    // If marked active, deactivate any existing active academic years
    if (validatedData.status === "ACTIVE") {
      await AcademicYear.updateMany(
        { schoolId, status: "ACTIVE" },
        { $set: { status: "INACTIVE", updatedBy: user.id } }
      );
    }

    const academicYear = await AcademicYear.create({
      schoolId,
      name: validatedData.name,
      startDate: validatedData.startDate,
      endDate: validatedData.endDate,
      status: validatedData.status || "INACTIVE",
      createdBy: user.id,
      updatedBy: user.id,
    });

    // Record audit log
    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "ACADEMIC_YEAR_CREATED",
      entityType: "ACADEMIC_YEAR",
      entityId: academicYear._id.toString(),
      schoolId,
      metadata: {
        name: academicYear.name,
        status: academicYear.status,
        startDate: academicYear.startDate,
        endDate: academicYear.endDate,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Academic year created successfully",
        data: {
          id: academicYear._id.toString(),
          name: academicYear.name,
          startDate: academicYear.startDate,
          endDate: academicYear.endDate,
          status: academicYear.status,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if ((error as any).name === "ZodError") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: (error as any).errors,
          },
        },
        { status: 400 }
      );
    }

    if ((error as any).code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_KEY",
            message: "An academic year with this name already exists.",
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to create academic year",
        },
      },
      { status: 500 }
    );
  }
}
