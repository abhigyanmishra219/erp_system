import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireStudent } from "@/lib/auth/requireStudent";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import Exam from "@/models/Exam";
import ExamTarget from "@/models/ExamTarget";
import ExamSubject from "@/models/ExamSubject";
import ExamResult from "@/models/ExamResult";
import School from "@/models/School";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import { ResultCalculationService, SubjectResultInput } from "@/lib/services/resultCalculationService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const auth = await requireStudent(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "RESULTS");
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
  const [exam, schoolDoc, classDoc, sectionDoc] = await Promise.all([
    Exam.findOne({ _id: examId, schoolId, isActive: true })
      .populate("academicYearId", "name startDate endDate status")
      .lean(),
    School.findById(schoolId).lean(),
    Class.findById(classId).select("name code").lean(),
    Section.findById(sectionId).select("name").lean(),
  ]);

  if (!exam) {
    return NextResponse.json(
      { success: false, error: { code: "EXAM_NOT_FOUND", message: "Examination record not found." } },
      { status: 404 }
    );
  }

  // 3. Strict Publication Rule: Query ONLY published results for this student and exam
  const publishedResults = await ExamResult.find({
    schoolId,
    examId,
    studentId: student._id,
    status: "PUBLISHED",
  })
    .populate("subjectId", "name code type")
    .populate("examSubjectId", "maximumMarks passingMarks examDate")
    .lean();

  if (publishedResults.length === 0) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "RESULTS_NOT_PUBLISHED",
          message: "Official results for this examination have not been published yet.",
        },
      },
      { status: 404 }
    );
  }

  // 4. Fetch ExamSubjects configured for this exam and class
  const classExamSubjects = await ExamSubject.find({
    schoolId,
    examId,
    classId,
    isActive: true,
  })
    .populate("subjectId", "name code type")
    .sort({ examDate: 1, createdAt: 1 })
    .lean();

  const resultMapBySubject = new Map<string, any>();
  publishedResults.forEach((r: any) => {
    const sId = r.subjectId?._id?.toString() || r.subjectId?.toString() || "";
    if (sId) resultMapBySubject.set(sId, r);
  });

  const subjectListToEvaluate = classExamSubjects.length > 0
    ? classExamSubjects
    : publishedResults.map((r: any) => ({
        subjectId: r.subjectId,
        maximumMarks: r.examSubjectId?.maximumMarks || 100,
        passingMarks: r.examSubjectId?.passingMarks || 40,
      }));

  const gradingScales = schoolDoc?.gradingSettings?.scales || undefined;

  // 5. Construct inputs and invoke ResultCalculationService
  const subjectInputs: SubjectResultInput[] = subjectListToEvaluate.map((es: any) => {
    const subId = es.subjectId?._id?.toString() || es.subjectId?.toString() || "";
    const r = resultMapBySubject.get(subId);
    return {
      subjectId: subId,
      subjectName: es.subjectId?.name || "Subject",
      subjectCode: es.subjectId?.code || "",
      marks: r && r.marks !== null && r.marks !== undefined ? r.marks : null,
      maximumMarks: es.maximumMarks,
      passingMarks: es.passingMarks,
    };
  });

  const calculated = ResultCalculationService.calculateOverallResult(
    subjectInputs,
    gradingScales
  );

  const enrichedSubjects = calculated.subjects.map((subEval) => {
    const r = resultMapBySubject.get(subEval.subjectId);
    return {
      ...subEval,
      remarks: r?.remarks || "",
      publishedAt: r?.publishedAt || null,
      isPublished: !!r,
    };
  });

  let latestPublishedAt: Date | null = null;
  publishedResults.forEach((r: any) => {
    if (r.publishedAt) {
      const pubDate = new Date(r.publishedAt);
      if (!latestPublishedAt || pubDate > latestPublishedAt) {
        latestPublishedAt = pubDate;
      }
    }
  });

  return NextResponse.json({
    success: true,
    data: {
      exam: {
        _id: exam._id.toString(),
        name: exam.name,
        description: exam.description || "",
        startDate: exam.startDate,
        endDate: exam.endDate,
        status: exam.status,
        academicYear: {
          _id: (exam.academicYearId as any)?._id?.toString() || exam.academicYearId?.toString() || "",
          name: (exam.academicYearId as any)?.name || "Academic Year",
        },
      },
      student: {
        _id: student._id.toString(),
        name: `${student.firstName} ${student.lastName}`.trim(),
        admissionNumber: student.admissionNumber,
        rollNumber: student.rollNumber || "",
        class: {
          _id: classId ? classId.toString() : "",
          name: classDoc?.name || "Class",
          code: classDoc?.code || "",
        },
        section: {
          _id: sectionId ? sectionId.toString() : "",
          name: sectionDoc?.name || "Section",
        },
      },
      publishedAt: latestPublishedAt || publishedResults[0]?.publishedAt || publishedResults[0]?.updatedAt,
      totalObtainedMarks: calculated.totalObtainedMarks,
      totalMaximumMarks: calculated.totalMaximumMarks,
      percentage: calculated.percentage,
      overallGrade: calculated.overallGrade,
      isPassed: calculated.isPassed,
      statusText: calculated.statusText,
      totalSubjects: calculated.totalSubjects,
      passedSubjects: calculated.passedSubjects,
      failedSubjects: calculated.failedSubjects,
      subjects: enrichedSubjects,
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
