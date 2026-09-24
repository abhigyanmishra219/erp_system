import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import { verifyTeacherSubjectScope } from "@/lib/auth/teacherScope";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import Exam from "@/models/Exam";
import ExamSubject from "@/models/ExamSubject";
import ExamResult from "@/models/ExamResult";
import Student from "@/models/Student";
import School from "@/models/School";
import { createAuditLog } from "@/lib/audit";
import { enterMarksSchema } from "@/lib/validation/exam";
import { ResultCalculationService } from "@/lib/services/resultCalculationService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "EXAMS");
  if (!subCheck.allowed) return subCheck.response;

  const { teacher, schoolId } = auth.context;
  const teacherIdStr = teacher._id.toString();
  const { examId } = await params;

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return NextResponse.json(
      { success: false, error: "Invalid exam ID format" },
      { status: 400 }
    );
  }

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");
  const sectionId = searchParams.get("sectionId");
  const subjectId = searchParams.get("subjectId");
  const examSubjectId = searchParams.get("examSubjectId");

  if (!classId || !sectionId || (!subjectId && !examSubjectId)) {
    return NextResponse.json(
      { success: false, error: "classId, sectionId, and subjectId parameters are required" },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const exam = await Exam.findOne({ _id: examId, schoolId, isActive: true })
    .populate("academicYearId", "name")
    .lean();

  if (!exam) {
    return NextResponse.json(
      { success: false, error: "Exam not found or inactive" },
      { status: 404 }
    );
  }

  // Find ExamSubject
  const subjectQuery: Record<string, any> = { schoolId, examId, classId, isActive: true };
  if (examSubjectId && mongoose.Types.ObjectId.isValid(examSubjectId)) {
    subjectQuery._id = examSubjectId;
  } else if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
    subjectQuery.subjectId = subjectId;
  }

  const examSubject = await ExamSubject.findOne(subjectQuery)
    .populate("subjectId", "name code subjectType")
    .populate("classId", "name code")
    .lean();

  if (!examSubject) {
    return NextResponse.json(
      { success: false, error: "Subject is not configured for this class in this exam" },
      { status: 404 }
    );
  }

  const resolvedSubjectId = (examSubject.subjectId as any)?._id?.toString() || examSubject.subjectId.toString();

  // 1. Verify Teacher Scope
  const isAuthorized = await verifyTeacherSubjectScope({
    schoolId,
    teacherId: teacherIdStr,
    classId,
    sectionId,
    subjectId: resolvedSubjectId,
    academicYearId: exam.academicYearId ? (exam.academicYearId as any)?._id?.toString() || exam.academicYearId?.toString() : undefined,
  });

  if (!isAuthorized) {
    return NextResponse.json(
      { success: false, error: "You are not authorized to access marks for this class, section, and subject" },
      { status: 403 }
    );
  }

  // 2. Fetch Students and Existing Exam Results
  const [students, existingResults, schoolDoc] = await Promise.all([
    Student.find({
      schoolId,
      classId,
      sectionId,
      status: "ACTIVE",
    })
      .sort({ rollNumber: 1, firstName: 1 })
      .lean(),
    ExamResult.find({
      schoolId,
      examId,
      examSubjectId: examSubject._id,
      classId,
      sectionId,
      subjectId: resolvedSubjectId,
    }).lean(),
    School.findById(schoolId).select("gradingScales").lean(),
  ]);

  const gradingScales = (schoolDoc as any)?.gradingScales || undefined;
  const resultMap = new Map<string, any>();
  existingResults.forEach((r: any) => {
    resultMap.set(r.studentId.toString(), r);
  });

  // Check publication lock
  const isExamPublished = exam.status === "PUBLISHED";
  const hasPublishedResults = existingResults.some((r: any) => r.status === "PUBLISHED");
  const isLocked = isExamPublished || hasPublishedResults;

  // 3. Build Student Marks Roster
  const studentRoster = students.map((st: any) => {
    const sId = st._id.toString();
    const existing = resultMap.get(sId);

    const marks = existing && existing.marks !== null && existing.marks !== undefined ? existing.marks : null;
    const evaluation = ResultCalculationService.evaluateSubject(
      {
        subjectId: resolvedSubjectId,
        marks,
        maximumMarks: examSubject.maximumMarks,
        passingMarks: examSubject.passingMarks,
      },
      gradingScales
    );

    return {
      studentId: sId,
      admissionNumber: st.admissionNumber,
      rollNumber: st.rollNumber || "—",
      fullName: `${st.firstName} ${st.lastName}`.trim(),
      gender: st.gender,
      marks,
      percentage: evaluation.percentage,
      grade: evaluation.grade,
      isPassed: evaluation.isPassed,
      remarks: existing?.remarks || "",
      status: existing?.status || "DRAFT",
      updatedAt: existing?.updatedAt || null,
    };
  });

  return NextResponse.json({
    success: true,
    data: {
      exam: {
        _id: exam._id.toString(),
        name: exam.name,
        description: exam.description || "",
        status: exam.status,
        academicYearName: (exam.academicYearId as any)?.name || "",
      },
      examSubject: {
        _id: examSubject._id.toString(),
        className: (examSubject.classId as any)?.name || "Class",
        subjectName: (examSubject.subjectId as any)?.name || "Subject",
        subjectCode: (examSubject.subjectId as any)?.code || "",
        maximumMarks: examSubject.maximumMarks,
        passingMarks: examSubject.passingMarks,
        examDate: examSubject.examDate || null,
      },
      classId,
      sectionId,
      subjectId: resolvedSubjectId,
      isLocked,
      students: studentRoster,
    },
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "EXAMS");
  if (!subCheck.allowed) return subCheck.response;

  const { teacher, schoolId, user } = auth.context;
  const teacherIdStr = teacher._id.toString();
  const { examId } = await params;

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return NextResponse.json(
      { success: false, error: "Invalid exam ID format" },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const parseResult = enterMarksSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { examSubjectId, classId, sectionId, subjectId, entries } = parseResult.data;

    await connectToDatabase();

    // 1. Verify Scope: Teacher must have active assignment for this class, section & subject
    const isAuthorized = await verifyTeacherSubjectScope({
      schoolId,
      teacherId: teacherIdStr,
      classId,
      sectionId,
      subjectId,
    });

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: "You are not authorized to enter marks for this class, section, and subject.",
        },
        { status: 403 }
      );
    }

    // 2. Fetch Exam and ExamSubject
    const [exam, examSubject, schoolDoc] = await Promise.all([
      Exam.findOne({ _id: examId, schoolId, isActive: true }),
      ExamSubject.findOne({ _id: examSubjectId, schoolId, examId, classId, subjectId, isActive: true }),
      School.findById(schoolId).select("gradingScales").lean(),
    ]);

    if (!exam) {
      return NextResponse.json(
        { success: false, error: "Exam not found or inactive." },
        { status: 404 }
      );
    }

    if (!examSubject) {
      return NextResponse.json(
        { success: false, error: "Exam subject schedule not found." },
        { status: 404 }
      );
    }

    // 3. Strict Publication Lock: Rejects modifications if results are published
    if (exam.status === "PUBLISHED") {
      return NextResponse.json(
        {
          success: false,
          error: "Results for this exam have already been published by school administration and cannot be modified.",
        },
        { status: 403 }
      );
    }

    const publishedResultsCount = await ExamResult.countDocuments({
      schoolId,
      examId,
      examSubjectId,
      classId,
      sectionId,
      status: "PUBLISHED",
    });

    if (publishedResultsCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Results for this section have already been published and cannot be modified.",
        },
        { status: 403 }
      );
    }

    // 4. Validate Mark Bounds & Auto-Calculate Grades
    const gradingScales = (schoolDoc as any)?.gradingScales || undefined;
    const maxMarks = examSubject.maximumMarks;
    const passMarks = examSubject.passingMarks;

    let hasExisting = false;

    const operations = [];

    for (const entry of entries) {
      const marksVal = entry.marks !== undefined ? entry.marks : null;

      if (marksVal !== null) {
        if (typeof marksVal !== "number" || isNaN(marksVal)) {
          return NextResponse.json(
            { success: false, error: "Marks must be numeric" },
            { status: 400 }
          );
        }
        if (marksVal < 0) {
          return NextResponse.json(
            { success: false, error: "Marks cannot be negative" },
            { status: 400 }
          );
        }
        if (marksVal > maxMarks) {
          return NextResponse.json(
            {
              success: false,
              error: `Marks for student cannot exceed maximum marks (${maxMarks}). Received: ${marksVal}`,
            },
            { status: 400 }
          );
        }
      }

      const evalResult = ResultCalculationService.evaluateSubject(
        {
          subjectId,
          marks: marksVal,
          maximumMarks: maxMarks,
          passingMarks: passMarks,
        },
        gradingScales
      );

      operations.push({
        updateOne: {
          filter: {
            schoolId: new mongoose.Types.ObjectId(schoolId),
            examId: new mongoose.Types.ObjectId(examId),
            examSubjectId: new mongoose.Types.ObjectId(examSubjectId),
            studentId: new mongoose.Types.ObjectId(entry.studentId),
          },
          update: {
            $set: {
              academicYearId: exam.academicYearId,
              classId: new mongoose.Types.ObjectId(classId),
              sectionId: new mongoose.Types.ObjectId(sectionId),
              subjectId: new mongoose.Types.ObjectId(subjectId),
              marks: marksVal,
              grade: evalResult.grade,
              isPassed: evalResult.isPassed,
              remarks: entry.remarks?.trim() || "",
              status: "DRAFT" as const,
              enteredBy: new mongoose.Types.ObjectId(user._id),
            },
          },
          upsert: true,
        },
      });
    }

    // Check if any results previously existed to choose audit action
    const existingCount = await ExamResult.countDocuments({
      schoolId,
      examId,
      examSubjectId,
      classId,
      sectionId,
    });
    hasExisting = existingCount > 0;

    if (operations.length > 0) {
      await ExamResult.bulkWrite(operations as any);
    }

    // 5. Audit Logging
    const auditAction = hasExisting ? "MARKS_UPDATED" : "MARKS_ENTERED";
    await createAuditLog({
      schoolId,
      userId: user._id.toString(),
      userRole: "TEACHER",
      action: auditAction,
      entityType: "EXAM_RESULT",
      entityId: examId,
      metadata: {
        examId,
        examSubjectId,
        classId,
        sectionId,
        subjectId,
        studentsCount: entries.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Marks successfully recorded for ${entries.length} students.`,
      data: {
        examId,
        examSubjectId,
        classId,
        sectionId,
        subjectId,
        evaluatedCount: entries.length,
      },
    });
  } catch (err: any) {
    console.error("POST /api/teacher/exams/[examId]/marks error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to record exam marks" },
      { status: 500 }
    );
  }
}
