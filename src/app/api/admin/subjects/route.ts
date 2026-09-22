import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { createSubjectSchema } from "@/lib/validation/adminSetup";
import Subject from "@/models/Subject";
import ClassSubject from "@/models/ClassSubject";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;

  await connectToDatabase();

  const subjects = await Subject.find({ schoolId, isActive: true })
    .sort({ name: 1 })
    .lean();

  const subjectIds = subjects.map((s) => s._id);

  // Aggregate assigned classes count
  const classCounts = await ClassSubject.aggregate([
    { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), subjectId: { $in: subjectIds }, isActive: true } },
    { $group: { _id: "$subjectId", count: { $sum: 1 } } },
  ]);
  const classCountMap: Record<string, number> = {};
  classCounts.forEach((cc) => {
    classCountMap[cc._id.toString()] = cc.count;
  });

  return NextResponse.json({
    success: true,
    data: {
      subjects: subjects.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        code: s.code,
        description: s.description || "",
        subjectType: s.subjectType,
        assignedClassesCount: classCountMap[s._id.toString()] || 0,
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
    const validatedData = createSubjectSchema.parse(body);

    await connectToDatabase();

    // Check duplicate code in school
    const existing = await Subject.findOne({
      schoolId,
      code: validatedData.code,
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_SUBJECT_CODE",
            message: `Subject with code '${validatedData.code}' already exists in your school catalog.`,
          },
        },
        { status: 409 }
      );
    }

    const subject = await Subject.create({
      schoolId,
      name: validatedData.name,
      code: validatedData.code,
      description: validatedData.description || "",
      subjectType: validatedData.subjectType || "CORE",
      isActive: true,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "SUBJECT_CREATED",
      entityType: "SUBJECT",
      entityId: subject._id.toString(),
      schoolId,
      metadata: {
        name: subject.name,
        code: subject.code,
        subjectType: subject.subjectType,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Subject created successfully",
        data: {
          id: subject._id.toString(),
          name: subject.name,
          code: subject.code,
          description: subject.description,
          subjectType: subject.subjectType,
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
            message: "A subject with this code already exists in your school.",
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
          message: error instanceof Error ? error.message : "Failed to create subject",
        },
      },
      { status: 500 }
    );
  }
}
