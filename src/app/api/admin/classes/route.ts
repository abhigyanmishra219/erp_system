import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { createClassSchema } from "@/lib/validation/adminSetup";
import Class from "@/models/Class";
import Section from "@/models/Section";
import ClassSubject from "@/models/ClassSubject";
import AcademicYear from "@/models/AcademicYear";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { searchParams } = new URL(req.url);
  const academicYearId = searchParams.get("academicYearId");

  await connectToDatabase();

  const filter: any = { schoolId, isActive: true };

  if (academicYearId) {
    if (mongoose.Types.ObjectId.isValid(academicYearId)) {
      filter.academicYearId = academicYearId;
    }
  }

  const classes = await Class.find(filter)
    .sort({ displayOrder: 1, name: 1 })
    .populate("academicYearId", "name status")
    .lean();

  const classIds = classes.map((c) => c._id);

  // Query all active sections for these classes
  const allSections = await Section.find({
    schoolId: new mongoose.Types.ObjectId(schoolId),
    classId: { $in: classIds },
    isActive: true,
  })
    .sort({ name: 1 })
    .lean();

  const sectionsByClassMap: Record<string, { id: string; name: string; code?: string; capacity?: number }[]> = {};
  allSections.forEach((s) => {
    const cId = s.classId.toString();
    if (!sectionsByClassMap[cId]) {
      sectionsByClassMap[cId] = [];
    }
    sectionsByClassMap[cId].push({
      id: s._id.toString(),
      name: s.name,
      code: s.code || "",
      capacity: s.capacity,
    });
  });

  // Aggregate subjects count per class
  const subjectCounts = await ClassSubject.aggregate([
    { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), classId: { $in: classIds }, isActive: true } },
    { $group: { _id: "$classId", count: { $sum: 1 } } },
  ]);
  const subjectCountMap: Record<string, number> = {};
  subjectCounts.forEach((sc) => {
    subjectCountMap[sc._id.toString()] = sc.count;
  });

  return NextResponse.json({
    success: true,
    data: {
      classes: classes.map((c) => ({
        id: c._id.toString(),
        name: c.name,
        code: c.code || "",
        displayOrder: c.displayOrder,
        academicYearId: (c.academicYearId as any)?._id?.toString() || c.academicYearId?.toString(),
        academicYearName: (c.academicYearId as any)?.name || "Unknown Year",
        sections: sectionsByClassMap[c._id.toString()] || [],
        sectionsCount: (sectionsByClassMap[c._id.toString()] || []).length,
        subjectsCount: subjectCountMap[c._id.toString()] || 0,
        isActive: c.isActive,
        createdAt: c.createdAt,
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
    const validatedData = createClassSchema.parse(body);

    await connectToDatabase();

    // Verify academic year belongs to this school
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

    // Check duplicate class name under this academic year
    const existing = await Class.findOne({
      schoolId,
      academicYearId: validatedData.academicYearId,
      name: { $regex: new RegExp(`^${validatedData.name}$`, "i") },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_CLASS",
            message: `Class '${validatedData.name}' already exists in ${academicYear.name}.`,
          },
        },
        { status: 409 }
      );
    }

    const newClass = await Class.create({
      schoolId,
      academicYearId: validatedData.academicYearId,
      name: validatedData.name,
      code: validatedData.code || "",
      displayOrder: validatedData.displayOrder || 0,
      isActive: true,
      createdBy: user.id,
      updatedBy: user.id,
    });

    // Record audit log
    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "CLASS_CREATED",
      entityType: "CLASS",
      entityId: newClass._id.toString(),
      schoolId,
      metadata: {
        name: newClass.name,
        academicYearId: validatedData.academicYearId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Class created successfully",
        data: {
          id: newClass._id.toString(),
          name: newClass.name,
          code: newClass.code,
          displayOrder: newClass.displayOrder,
          academicYearId: newClass.academicYearId.toString(),
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
            message: "A class with this name already exists in the selected academic year.",
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
          message: error instanceof Error ? error.message : "Failed to create class",
        },
      },
      { status: 500 }
    );
  }
}
