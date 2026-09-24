import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireStudent } from "@/lib/auth/requireStudent";
import connectToDatabase from "@/lib/db";
import Exam from "@/models/Exam";
import ExamSubject from "@/models/ExamSubject";
import ExamResult from "@/models/ExamResult";
import School from "@/models/School";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import { ResultCalculationService, SubjectResultInput } from "@/lib/services/resultCalculationService";

export async function GET(req: NextRequest) {
  const auth = await requireStudent(req);
  if (!auth.success) return auth.response;

  const { student, schoolId, classId, sectionId, academicYearId } = auth.context;

  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const requestedYearId = searchParams.get("academicYearId");
  const filterExamId = searchParams.get("examId");

  // 1. Resolve Academic Year Context
  let targetYearId = academicYearId || student.academicYearId;
  if (requestedYearId && mongoose.Types.ObjectId.isValid(requestedYearId)) {
    const validYear = await AcademicYear.findOne({
      _id: requestedYearId,
      schoolId,
    }).lean();
    if (validYear) targetYearId = validYear._id;
  }

  // 2. Fetch School info for custom grading scales
  const [schoolDoc, classDoc, sectionDoc, academicYearDoc] = await Promise.all([
    School.findById(schoolId).lean(),
    Class.findById(classId).select("name code").lean(),
    Section.findById(sectionId).select("name").lean(),
    AcademicYear.findById(targetYearId).select("name status").lean(),
  ]);

  const gradingScales = schoolDoc?.gradingSettings?.scales || undefined;

  // 3. Query ONLY PUBLISHED exam results for this student
  // Strict Publication Rule: Teacher entering marks (DRAFT/REVIEWED) does NOT make them visible to student.
  const resultQuery: Record<string, any> = {
    schoolId,
    studentId: student._id,
    status: "PUBLISHED",
  };

  if (filterExamId && mongoose.Types.ObjectId.isValid(filterExamId)) {
    resultQuery.examId = filterExamId;
  }

  const publishedResultsDocs = await ExamResult.find(resultQuery)
    .populate("examId", "name startDate endDate status description academicYearId")
    .populate("examSubjectId", "maximumMarks passingMarks examDate")
    .populate("subjectId", "name code type")
    .sort({ publishedAt: -1, createdAt: -1 })
    .lean();

  if (publishedResultsDocs.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        academicContext: {
          student: {
            _id: student._id.toString(),
            name: `${student.firstName} ${student.lastName}`.trim(),
            rollNumber: student.rollNumber || "",
            admissionNumber: student.admissionNumber,
          },
          class: {
            _id: classId ? classId.toString() : "",
            name: classDoc?.name || "Class",
            code: classDoc?.code || "",
          },
          section: {
            _id: sectionId ? sectionId.toString() : "",
            name: sectionDoc?.name || "Section",
          },
          academicYear: {
            _id: targetYearId?.toString() || "",
            name: academicYearDoc?.name || "Academic Year",
          },
        },
        summary: {
          totalPublishedExams: 0,
          totalEvaluatedSubjects: 0,
          passedExams: 0,
          failedExams: 0,
          overallAveragePercentage: 0,
        },
        examResults: [],
      },
    });
  }

  // 4. Group published results by Exam
  const resultsByExamMap = new Map<string, any[]>();
  const examMap = new Map<string, any>();

  for (const res of publishedResultsDocs) {
    const examDoc = res.examId as any;
    if (!examDoc) continue;
    const examIdStr = examDoc._id ? examDoc._id.toString() : examDoc.toString();

    if (!resultsByExamMap.has(examIdStr)) {
      resultsByExamMap.set(examIdStr, []);
      examMap.set(examIdStr, examDoc);
    }
    resultsByExamMap.get(examIdStr)!.push(res);
  }

  // 5. Query all exam subjects configured for these exams and student's class to know complete subject list
  const examIds = Array.from(examMap.keys());
  const allExamSubjects = await ExamSubject.find({
    schoolId,
    examId: { $in: examIds },
    classId,
    isActive: true,
  })
    .populate("subjectId", "name code type")
    .lean();

  const examSubjectsByExam = new Map<string, any[]>();
  for (const es of allExamSubjects) {
    const eId = es.examId.toString();
    if (!examSubjectsByExam.has(eId)) examSubjectsByExam.set(eId, []);
    examSubjectsByExam.get(eId)!.push(es);
  }

  // 6. Process each exam's results using ResultCalculationService
  let totalExamsPassed = 0;
  let totalExamsFailed = 0;
  let aggregatePercentagesSum = 0;
  let totalEvaluatedSubjectsCount = 0;

  const examResultsList = examIds.map((examIdStr) => {
    const exam = examMap.get(examIdStr);
    const stuResults = resultsByExamMap.get(examIdStr) || [];
    const classExamSubjects = examSubjectsByExam.get(examIdStr) || [];

    // Map published results by subject ID
    const resultMapBySubject = new Map<string, any>();
    stuResults.forEach((r: any) => {
      const sId = r.subjectId?._id?.toString() || r.subjectId?.toString() || "";
      if (sId) resultMapBySubject.set(sId, r);
    });

    // If there are configured ExamSubjects for this class, evaluate against them;
    // Otherwise fallback to the subjects present in published results.
    const subjectListToEvaluate = classExamSubjects.length > 0
      ? classExamSubjects
      : stuResults.map((r: any) => ({
          subjectId: r.subjectId,
          maximumMarks: r.examSubjectId?.maximumMarks || 100,
          passingMarks: r.examSubjectId?.passingMarks || 40,
        }));

    // Construct inputs for ResultCalculationService
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

    // Run official ResultCalculationService
    const calculated = ResultCalculationService.calculateOverallResult(
      subjectInputs,
      gradingScales
    );

    // Merge detailed remarks and publishedAt timestamps into evaluated subject list
    const enrichedSubjects = calculated.subjects.map((subEval) => {
      const r = resultMapBySubject.get(subEval.subjectId);
      return {
        ...subEval,
        remarks: r?.remarks || "",
        publishedAt: r?.publishedAt || null,
        isPublished: !!r,
      };
    });

    if (calculated.isPassed) {
      totalExamsPassed++;
    } else {
      totalExamsFailed++;
    }

    aggregatePercentagesSum += calculated.percentage;
    totalEvaluatedSubjectsCount += calculated.totalSubjects - calculated.unenteredSubjects;

    // Determine earliest/latest publishedAt date for this exam
    let latestPublishedAt: Date | null = null;
    stuResults.forEach((r: any) => {
      if (r.publishedAt) {
        const pubDate = new Date(r.publishedAt);
        if (!latestPublishedAt || pubDate > latestPublishedAt) {
          latestPublishedAt = pubDate;
        }
      }
    });

    return {
      exam: {
        _id: examIdStr,
        name: exam?.name || "Exam",
        description: exam?.description || "",
        startDate: exam?.startDate,
        endDate: exam?.endDate,
        status: exam?.status,
      },
      publishedAt: latestPublishedAt || stuResults[0]?.publishedAt || stuResults[0]?.updatedAt,
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
    };
  });

  const overallAveragePercentage =
    examResultsList.length > 0
      ? Math.round((aggregatePercentagesSum / examResultsList.length) * 100) / 100
      : 0;

  return NextResponse.json({
    success: true,
    data: {
      academicContext: {
        student: {
          _id: student._id.toString(),
          name: `${student.firstName} ${student.lastName}`.trim(),
          rollNumber: student.rollNumber || "",
          admissionNumber: student.admissionNumber,
        },
        class: {
          _id: classId ? classId.toString() : "",
          name: classDoc?.name || "Class",
          code: classDoc?.code || "",
        },
        section: {
          _id: sectionId ? sectionId.toString() : "",
          name: sectionDoc?.name || "Section",
        },
        academicYear: {
          _id: targetYearId?.toString() || "",
          name: academicYearDoc?.name || "Academic Year",
        },
      },
      summary: {
        totalPublishedExams: examResultsList.length,
        totalEvaluatedSubjects: totalEvaluatedSubjectsCount,
        passedExams: totalExamsPassed,
        failedExams: totalExamsFailed,
        overallAveragePercentage,
      },
      examResults: examResultsList,
    },
  });
}

// Strictly enforce read-only security on Student results endpoint
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Students cannot enter marks or create exam results.",
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
        message: "Students cannot update exam results.",
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
        message: "Students cannot publish, unpublish, or modify exam results or grades.",
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
        message: "Students cannot delete exam results.",
      },
    },
    { status: 405 }
  );
}
