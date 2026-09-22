import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Exam from "@/models/Exam";
import ExamTarget from "@/models/ExamTarget";
import Class from "@/models/Class";
import Section from "@/models/Section";
import AuditLog from "@/models/AuditLog";
import { createExamTargetSchema } from "@/lib/validation/exam";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { examId } = await params;

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid exam ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const targets = await ExamTarget.find({ schoolId, examId, isActive: true })
      .populate("classId", "name code displayOrder")
      .populate("sectionId", "name capacity")
      .sort({ "classId.displayOrder": 1, "sectionId.name": 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        targets: targets.map((t: any) => ({
          id: t._id.toString(),
          examId: t.examId.toString(),
          academicYearId: t.academicYearId.toString(),
          class: t.classId ? { id: t.classId._id.toString(), name: t.classId.name, code: t.classId.code } : null,
          section: t.sectionId ? { id: t.sectionId._id.toString(), name: t.sectionId.name } : null,
          createdAt: t.createdAt,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch targets" } },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId, user } = auth.context;
  const { examId } = await params;

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid exam ID" } },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const validated = createExamTargetSchema.parse(body);

    await connectToDatabase();

    const [exam, classDoc, sectionDoc] = await Promise.all([
      Exam.findOne({ _id: examId, schoolId, isActive: true }).lean(),
      Class.findOne({ _id: validated.classId, schoolId }).lean(),
      Section.findOne({ _id: validated.sectionId, classId: validated.classId, schoolId }).lean(),
    ]);

    if (!exam) {
      return NextResponse.json(
        { success: false, error: { code: "EXAM_NOT_FOUND", message: "Exam not found." } },
        { status: 404 }
      );
    }
    if (!classDoc) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CLASS", message: "Selected class is invalid." } },
        { status: 400 }
      );
    }
    if (!sectionDoc) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_SECTION", message: "Selected section does not belong to the selected class." } },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await ExamTarget.findOne({
      schoolId,
      examId,
      classId: validated.classId,
      sectionId: validated.sectionId,
      isActive: true,
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_TARGET", message: "This class section is already assigned to this exam." } },
        { status: 409 }
      );
    }

    const newTarget = new ExamTarget({
      schoolId,
      examId,
      academicYearId: validated.academicYearId || exam.academicYearId,
      classId: validated.classId,
      sectionId: validated.sectionId,
      isActive: true,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await newTarget.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "EXAM_TARGET_CREATED",
      entityType: "EXAM_TARGET",
      entityId: newTarget._id.toString(),
      schoolId,
      metadata: {
        examId,
        classId: validated.classId,
        sectionId: validated.sectionId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Exam target added successfully",
        data: {
          target: {
            id: newTarget._id.toString(),
            classId: validated.classId,
            sectionId: validated.sectionId,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.issues) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Validation failed", details: error.issues } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to create target" } },
      { status: 500 }
    );
  }
}
