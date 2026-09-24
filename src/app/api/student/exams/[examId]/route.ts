import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireStudent } from "@/lib/auth/requireStudent";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import Exam from "@/models/Exam";
import ExamTarget from "@/models/ExamTarget";
import ExamSubject from "@/models/ExamSubject";
import Class from "@/models/Class";
import Section from "@/models/Section";
import AcademicYear from "@/models/AcademicYear";
import Subject from "@/models/Subject";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const auth = await requireStudent(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "EXAMS");
  if (!subCheck.allowed) return subCheck.response;

  const { student, schoolId, classId, sectionId } = auth.context;
  const { examId } = await params;

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid examination ID" } },
      { status: 400 }
    );
  }

  await connectToDatabase();

  // 1. Verify that this exam is targeted to this student's class & section
  const target = await ExamTarget.findOne({
    schoolId,
    examId,
    classId,
    sectionId,
    isActive: true,
  }).lean();

  if (!target) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "EXAM_NOT_FOUND",
          message: "Examination not found or not applicable to your class and section.",
        },
      },
      { status: 404 }
    );
  }

  // 2. Fetch Exam record
  const exam = await Exam.findOne({
    _id: examId,
    schoolId,
    isActive: true,
  })
    .populate("academicYearId", "name startDate endDate status")
    .lean();

  if (!exam) {
    return NextResponse.json(
      { success: false, error: { code: "EXAM_NOT_FOUND", message: "Examination record not found." } },
      { status: 404 }
    );
  }

  // 3. Fetch Class, Section, and Subject Datesheets
  const [classDoc, sectionDoc, examSubjectsDocs] = await Promise.all([
    Class.findById(classId).select("name code").lean(),
    Section.findById(sectionId).select("name").lean(),
    ExamSubject.find({
      schoolId,
      examId,
      classId,
      isActive: true,
    })
      .populate("subjectId", "name code type")
      .sort({ examDate: 1, createdAt: 1 })
      .lean(),
  ]);

  const schedule = examSubjectsDocs.map((es: any) => ({
    _id: es._id.toString(),
    subject: {
      _id: es.subjectId?._id?.toString() || es.subjectId?.toString() || "",
      name: es.subjectId?.name || "Subject",
      code: es.subjectId?.code || "",
      type: es.subjectId?.type || "THEORY",
    },
    examDate: es.examDate || null,
    maximumMarks: es.maximumMarks,
    passingMarks: es.passingMarks,
  }));

  const now = new Date();
  const startDate = new Date(exam.startDate);
  const endDate = new Date(exam.endDate);

  let timelineStatus: "UPCOMING" | "ONGOING" | "COMPLETED" = "UPCOMING";
  if (now > endDate) {
    timelineStatus = "COMPLETED";
  } else if (now >= startDate && now <= endDate) {
    timelineStatus = "ONGOING";
  }

  return NextResponse.json({
    success: true,
    data: {
      _id: exam._id.toString(),
      name: exam.name,
      description: exam.description || "",
      startDate: exam.startDate,
      endDate: exam.endDate,
      status: exam.status,
      timelineStatus,
      academicYear: {
        _id: (exam.academicYearId as any)?._id?.toString() || exam.academicYearId?.toString() || "",
        name: (exam.academicYearId as any)?.name || "Academic Year",
      },
      classContext: {
        classId: classId ? classId.toString() : "",
        className: classDoc?.name || "Class",
        sectionId: sectionId ? sectionId.toString() : "",
        sectionName: sectionDoc?.name || "Section",
      },
      subjectCount: schedule.length,
      schedule,
    },
  });
}

// Read-only Security Enforcement
export async function POST() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed for students" } },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed for students" } },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed for students" } },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method not allowed for students" } },
    { status: 405 }
  );
}
