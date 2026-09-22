import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Exam from "@/models/Exam";
import ExamSubject from "@/models/ExamSubject";
import Class from "@/models/Class";
import Subject from "@/models/Subject";
import ClassSubject from "@/models/ClassSubject";
import AuditLog from "@/models/AuditLog";
import { createExamSubjectSchema } from "@/lib/validation/exam";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { examId } = await params;
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid exam ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const query: Record<string, any> = { schoolId, examId, isActive: true };
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      query.classId = classId;
    }

    const subjects = await ExamSubject.find(query)
      .populate("classId", "name code")
      .populate("subjectId", "name code subjectType")
      .sort({ "classId.name": 1, "subjectId.name": 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        subjects: subjects.map((s: any) => ({
          id: s._id.toString(),
          examId: s.examId.toString(),
          academicYearId: s.academicYearId.toString(),
          class: s.classId ? { id: s.classId._id.toString(), name: s.classId.name, code: s.classId.code } : null,
          subject: s.subjectId ? { id: s.subjectId._id.toString(), name: s.subjectId.name, code: s.subjectId.code, type: s.subjectId.subjectType } : null,
          examDate: s.examDate,
          maximumMarks: s.maximumMarks,
          passingMarks: s.passingMarks,
          createdAt: s.createdAt,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch exam subjects" } },
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
    const validated = createExamSubjectSchema.parse(body);

    await connectToDatabase();

    const [exam, classDoc, subjectDoc, classSubject] = await Promise.all([
      Exam.findOne({ _id: examId, schoolId, isActive: true }).lean(),
      Class.findOne({ _id: validated.classId, schoolId }).lean(),
      Subject.findOne({ _id: validated.subjectId, schoolId }).lean(),
      ClassSubject.findOne({
        schoolId,
        classId: validated.classId,
        subjectId: validated.subjectId,
        isActive: true,
      }).lean(),
    ]);

    if (!exam) {
      return NextResponse.json(
        { success: false, error: { code: "EXAM_NOT_FOUND", message: "Exam not found." } },
        { status: 404 }
      );
    }
    if (!classDoc || !subjectDoc) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CLASS_OR_SUBJECT", message: "Invalid class or subject reference." } },
        { status: 400 }
      );
    }
    if (!classSubject) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SUBJECT_NOT_ASSIGNED_TO_CLASS",
            message: `Subject '${subjectDoc.name}' is not mapped to Class '${classDoc.name}' in your curriculum.`,
          },
        },
        { status: 400 }
      );
    }

    // Check duplicate
    const existing = await ExamSubject.findOne({
      schoolId,
      examId,
      classId: validated.classId,
      subjectId: validated.subjectId,
      isActive: true,
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_EXAM_SUBJECT", message: "This subject is already configured for this class in this exam." } },
        { status: 409 }
      );
    }

    const newExamSubject = new ExamSubject({
      schoolId,
      examId,
      academicYearId: validated.academicYearId || exam.academicYearId,
      classId: validated.classId,
      subjectId: validated.subjectId,
      examDate: validated.examDate ? new Date(validated.examDate) : null,
      maximumMarks: validated.maximumMarks,
      passingMarks: validated.passingMarks,
      isActive: true,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await newExamSubject.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "EXAM_SUBJECT_CREATED",
      entityType: "EXAM_SUBJECT",
      entityId: newExamSubject._id.toString(),
      schoolId,
      metadata: {
        examId,
        classId: validated.classId,
        subjectId: validated.subjectId,
        maximumMarks: validated.maximumMarks,
        passingMarks: validated.passingMarks,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Exam subject configured successfully",
        data: {
          subject: {
            id: newExamSubject._id.toString(),
            classId: validated.classId,
            subjectId: validated.subjectId,
            maximumMarks: newExamSubject.maximumMarks,
            passingMarks: newExamSubject.passingMarks,
            examDate: newExamSubject.examDate,
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
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to configure exam subject" } },
      { status: 500 }
    );
  }
}
