import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { createClassSubjectSchema } from "@/lib/validation/adminSetup";
import ClassSubject from "@/models/ClassSubject";
import Class from "@/models/Class";
import Subject from "@/models/Subject";
import AcademicYear from "@/models/AcademicYear";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { classId } = await params;

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid class ID" } },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const classSubjects = await ClassSubject.find({
    schoolId,
    classId,
    isActive: true,
  })
    .populate("subjectId", "name code description subjectType")
    .populate("academicYearId", "name")
    .lean();

  return NextResponse.json({
    success: true,
    data: {
      subjects: classSubjects.map((cs) => ({
        id: cs._id.toString(),
        subjectId: (cs.subjectId as any)?._id?.toString() || cs.subjectId.toString(),
        name: (cs.subjectId as any)?.name || "Unknown Subject",
        code: (cs.subjectId as any)?.code || "",
        description: (cs.subjectId as any)?.description || "",
        subjectType: (cs.subjectId as any)?.subjectType || "CORE",
        maximumMarks: cs.maximumMarks,
        passingMarks: cs.passingMarks,
        academicYearName: (cs.academicYearId as any)?.name || "Unknown Year",
        isActive: cs.isActive,
      })),
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { classId } = await params;

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid class ID" } },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const validatedData = createClassSubjectSchema.parse(body);

    await connectToDatabase();

    // Verify class belongs to this school
    const classDoc = await Class.findOne({ _id: classId, schoolId });
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

    // Verify subject belongs to this school
    const subjectDoc = await Subject.findOne({
      _id: validatedData.subjectId,
      schoolId,
    });
    if (!subjectDoc) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_SUBJECT",
            message: "Subject does not exist or belong to your school.",
          },
        },
        { status: 400 }
      );
    }

    // Verify academic year belongs to this school
    const academicYearDoc = await AcademicYear.findOne({
      _id: validatedData.academicYearId,
      schoolId,
    });
    if (!academicYearDoc) {
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

    // Check if already mapped
    const existing = await ClassSubject.findOne({
      schoolId,
      academicYearId: validatedData.academicYearId,
      classId,
      subjectId: validatedData.subjectId,
    });

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "ALREADY_ASSIGNED",
              message: `Subject '${subjectDoc.name}' is already assigned to ${classDoc.name}.`,
            },
          },
          { status: 409 }
        );
      } else {
        // Reactivate with new marks
        existing.isActive = true;
        existing.maximumMarks = validatedData.maximumMarks;
        existing.passingMarks = validatedData.passingMarks;
        existing.updatedBy = user.id;
        await existing.save();

        return NextResponse.json({
          success: true,
          message: "Subject assignment reactivated successfully",
          data: {
            id: existing._id.toString(),
            classId,
            subjectId: validatedData.subjectId,
            maximumMarks: existing.maximumMarks,
            passingMarks: existing.passingMarks,
          },
        });
      }
    }

    const classSubject = await ClassSubject.create({
      schoolId,
      academicYearId: validatedData.academicYearId,
      classId,
      subjectId: validatedData.subjectId,
      maximumMarks: validatedData.maximumMarks,
      passingMarks: validatedData.passingMarks,
      isActive: true,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "CLASS_SUBJECT_CREATED",
      entityType: "CLASS_SUBJECT",
      entityId: classSubject._id.toString(),
      schoolId,
      metadata: {
        className: classDoc.name,
        subjectName: subjectDoc.name,
        maximumMarks: classSubject.maximumMarks,
        passingMarks: classSubject.passingMarks,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Subject assigned to class successfully",
        data: {
          id: classSubject._id.toString(),
          classId,
          subjectId: validatedData.subjectId,
          maximumMarks: classSubject.maximumMarks,
          passingMarks: classSubject.passingMarks,
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

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to assign subject",
        },
      },
      { status: 500 }
    );
  }
}
