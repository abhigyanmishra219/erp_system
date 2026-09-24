import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireStudent } from "@/lib/auth/requireStudent";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import Exam from "@/models/Exam";
import ExamTarget from "@/models/ExamTarget";
import ExamSubject from "@/models/ExamSubject";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import Subject from "@/models/Subject";

export async function GET(req: NextRequest) {
  const auth = await requireStudent(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "EXAMS");
  if (!subCheck.allowed) return subCheck.response;

  const { student, schoolId, classId, sectionId, academicYearId } = auth.context;

  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const requestedYearId = searchParams.get("academicYearId");
  const filterStatus = searchParams.get("status"); // "ALL" | "UPCOMING" | "ONGOING" | "COMPLETED" | "SCHEDULED"
  const searchQuery = (searchParams.get("search") || "").trim();

  // 1. Resolve Academic Year Context
  let targetYearId = academicYearId || student.academicYearId;
  if (requestedYearId && mongoose.Types.ObjectId.isValid(requestedYearId)) {
    const validYear = await AcademicYear.findOne({
      _id: requestedYearId,
      schoolId,
    }).lean();
    if (validYear) targetYearId = validYear._id;
  }

  // 2. Fetch student's class and section context details
  const [classDoc, sectionDoc, academicYearDoc] = await Promise.all([
    Class.findById(classId).select("name code").lean(),
    Section.findById(sectionId).select("name").lean(),
    AcademicYear.findById(targetYearId).select("name startDate endDate status").lean(),
  ]);

  // 3. Find all Exam Targets for this student's school, academic year, class, and section
  const examTargets = await ExamTarget.find({
    schoolId,
    academicYearId: targetYearId,
    classId,
    sectionId,
    isActive: true,
  }).lean();

  const targetExamIds = examTargets.map((t: any) => t.examId);

  if (targetExamIds.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        academicContext: {
          class: {
            _id: classId ? classId.toString() : "",
            name: classDoc?.name || "N/A",
            code: classDoc?.code || "",
          },
          section: {
            _id: sectionId ? sectionId.toString() : "",
            name: sectionDoc?.name || "N/A",
          },
          academicYear: {
            _id: targetYearId?.toString() || "",
            name: academicYearDoc?.name || "N/A",
          },
        },
        summary: {
          total: 0,
          upcoming: 0,
          ongoing: 0,
          completed: 0,
          totalSubjectsScheduled: 0,
        },
        exams: [],
      },
    });
  }

  // 4. Query Exams scoped to school and targetExamIds
  const examQuery: Record<string, any> = {
    _id: { $in: targetExamIds },
    schoolId,
    academicYearId: targetYearId,
    isActive: true,
  };

  if (searchQuery) {
    const regex = new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    examQuery.name = regex;
  }

  const examsDocs = await Exam.find(examQuery)
    .populate("academicYearId", "name startDate endDate status")
    .sort({ startDate: 1, createdAt: -1 })
    .lean();

  const examIds = examsDocs.map((e: any) => e._id);

  // 5. Query Exam Subjects (Datesheet) for these exams and student's class
  const examSubjectsDocs = await ExamSubject.find({
    schoolId,
    examId: { $in: examIds },
    classId,
    isActive: true,
  })
    .populate("subjectId", "name code type")
    .sort({ examDate: 1, createdAt: 1 })
    .lean();

  const subjectsByExamMap = new Map<string, any[]>();
  examSubjectsDocs.forEach((es: any) => {
    const key = es.examId.toString();
    if (!subjectsByExamMap.has(key)) {
      subjectsByExamMap.set(key, []);
    }
    subjectsByExamMap.get(key)!.push({
      _id: es._id.toString(),
      subjectId: es.subjectId?._id?.toString() || es.subjectId?.toString() || "",
      subjectName: es.subjectId?.name || "Subject",
      subjectCode: es.subjectId?.code || "",
      subjectType: es.subjectId?.type || "THEORY",
      examDate: es.examDate || null,
      maximumMarks: es.maximumMarks,
      passingMarks: es.passingMarks,
    });
  });

  const now = new Date();

  // 6. Format Exams with Schedule Datesheet and Dynamic Timeline Status
  let formattedExams = examsDocs.map((exam: any) => {
    const examIdStr = exam._id.toString();
    const subjects = subjectsByExamMap.get(examIdStr) || [];
    const startDate = new Date(exam.startDate);
    const endDate = new Date(exam.endDate);

    // Compute active timeline status
    let timelineStatus: "UPCOMING" | "ONGOING" | "COMPLETED" = "UPCOMING";
    if (now > endDate) {
      timelineStatus = "COMPLETED";
    } else if (now >= startDate && now <= endDate) {
      timelineStatus = "ONGOING";
    }

    return {
      _id: examIdStr,
      name: exam.name,
      description: exam.description || "",
      startDate: exam.startDate,
      endDate: exam.endDate,
      status: exam.status, // Model status (e.g. SCHEDULED, ONGOING, COMPLETED, PUBLISHED)
      timelineStatus,
      academicYear: {
        _id: exam.academicYearId?._id?.toString() || targetYearId.toString(),
        name: exam.academicYearId?.name || academicYearDoc?.name || "Academic Year",
      },
      classContext: {
        classId: classId ? classId.toString() : "",
        className: classDoc?.name || "Class",
        sectionId: sectionId ? sectionId.toString() : "",
        sectionName: sectionDoc?.name || "Section",
      },
      subjectCount: subjects.length,
      schedule: subjects,
    };
  });

  // Apply status filter if provided
  if (filterStatus && filterStatus !== "ALL") {
    formattedExams = formattedExams.filter((e) => {
      if (filterStatus === "UPCOMING") return e.timelineStatus === "UPCOMING" || e.status === "SCHEDULED";
      if (filterStatus === "ONGOING") return e.timelineStatus === "ONGOING" || e.status === "ONGOING";
      if (filterStatus === "COMPLETED") return e.timelineStatus === "COMPLETED" || e.status === "COMPLETED" || e.status === "PUBLISHED";
      return e.status === filterStatus;
    });
  }

  // Summary counts
  const totalCount = examsDocs.length;
  const upcomingCount = examsDocs.filter((e: any) => {
    const start = new Date(e.startDate);
    return now < start;
  }).length;
  const ongoingCount = examsDocs.filter((e: any) => {
    const start = new Date(e.startDate);
    const end = new Date(e.endDate);
    return now >= start && now <= end;
  }).length;
  const completedCount = examsDocs.filter((e: any) => {
    const end = new Date(e.endDate);
    return now > end;
  }).length;

  return NextResponse.json({
    success: true,
    data: {
      academicContext: {
        class: {
          _id: classId ? classId.toString() : "",
          name: classDoc?.name || "N/A",
          code: classDoc?.code || "",
        },
        section: {
          _id: sectionId ? sectionId.toString() : "",
          name: sectionDoc?.name || "N/A",
        },
        academicYear: {
          _id: targetYearId?.toString() || "",
          name: academicYearDoc?.name || "N/A",
        },
      },
      summary: {
        total: totalCount,
        upcoming: upcomingCount,
        ongoing: ongoingCount,
        completed: completedCount,
        totalSubjectsScheduled: examSubjectsDocs.length,
      },
      exams: formattedExams,
    },
  });
}

// 7. Strictly enforce read-only security on Student exams endpoint
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Students cannot create or schedule examinations.",
      },
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Students cannot update examinations.",
      },
    },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Students cannot modify examination schedules or metadata.",
      },
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Students cannot delete examinations.",
      },
    },
    { status: 405 }
  );
}
