import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { createSectionSchema } from "@/lib/validation/adminSetup";
import Section from "@/models/Section";
import Class from "@/models/Class";
import AcademicYear from "@/models/AcademicYear";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  const academicYearId = searchParams.get("academicYearId");

  await connectToDatabase();

  const filter: any = { schoolId, isActive: true };
  if (classId && mongoose.Types.ObjectId.isValid(classId)) {
    filter.classId = classId;
  }
  if (academicYearId && mongoose.Types.ObjectId.isValid(academicYearId)) {
    filter.academicYearId = academicYearId;
  }

  const sections = await Section.find(filter)
    .populate("classId", "name code")
    .populate("academicYearId", "name")
    .sort({ name: 1 })
    .lean();

  return NextResponse.json({
    success: true,
    data: {
      sections: sections.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        code: s.code || "",
        capacity: s.capacity,
        classId: (s.classId as any)?._id?.toString() || s.classId.toString(),
        className: (s.classId as any)?.name || "Unknown Class",
        academicYearId: (s.academicYearId as any)?._id?.toString() || s.academicYearId.toString(),
        academicYearName: (s.academicYearId as any)?.name || "Unknown Year",
        isActive: s.isActive,
        createdAt: s.createdAt,
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
    const validatedData = createSectionSchema.parse(body);

    await connectToDatabase();

    // Verify class and academic year belong to tenant
    const classDoc = await Class.findOne({
      _id: validatedData.classId,
      schoolId,
    });

    if (!classDoc) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CLASS",
            message: "Class does not exist or belong to your school.",
          },
        },
        { status: 400 }
      );
    }

    const academicYear = await AcademicYear.findOne({
      _id: validatedData.academicYearId,
      schoolId,
    });

    if (!academicYear) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_ACADEMIC_YEAR",
            message: "Academic year does not exist or belong to your school.",
          },
        },
        { status: 400 }
      );
    }

    // Check duplicate section under same class & academic year
    const existing = await Section.findOne({
      schoolId,
      academicYearId: validatedData.academicYearId,
      classId: validatedData.classId,
      name: { $regex: new RegExp(`^${validatedData.name}$`, "i") },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_SECTION",
            message: `Section '${validatedData.name}' already exists in ${classDoc.name}.`,
          },
        },
        { status: 409 }
      );
    }

    const section = await Section.create({
      schoolId,
      academicYearId: validatedData.academicYearId,
      classId: validatedData.classId,
      name: validatedData.name,
      code: validatedData.code || "",
      capacity: validatedData.capacity || 40,
      isActive: true,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "SECTION_CREATED",
      entityType: "SECTION",
      entityId: section._id.toString(),
      schoolId,
      metadata: {
        name: section.name,
        className: classDoc.name,
        capacity: section.capacity,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Section created successfully",
        data: {
          id: section._id.toString(),
          name: section.name,
          code: section.code,
          capacity: section.capacity,
          classId: section.classId.toString(),
          academicYearId: section.academicYearId.toString(),
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
            message: "A section with this name already exists in the selected class.",
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
          message: error instanceof Error ? error.message : "Failed to create section",
        },
      },
      { status: 500 }
    );
  }
}
