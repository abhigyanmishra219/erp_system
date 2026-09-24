import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireParent } from "@/lib/auth/requireParent";
import connectToDatabase from "@/lib/db";
import Exam from "@/models/Exam";
import ExamSubject from "@/models/ExamSubject";
import ExamResult from "@/models/ExamResult";
import School from "@/models/School";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import Student from "@/models/Student";
import { ResultCalculationService, SubjectResultInput } from "@/lib/services/resultCalculationService";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

    const { schoolId, linkedChildren, childIds } = auth.context;

    if (!childIds || childIds.length === 0) {
      return NextResponse.json({
        success: true,
        hasChildren: false,
        message: "No linked children found for this parent account.",
        data: null,
      });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const requestedStudentId = searchParams.get("studentId");
    const requestedYearId = searchParams.get("academicYearId");
    const filterExamId = searchParams.get("examId");

    // 1. Resolve Target Child and enforce parent-child link authorization
    let activeStudentId = childIds[0];
    if (requestedStudentId) {
      if (!childIds.includes(requestedStudentId)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN_CHILD_ACCESS",
              message: "Access denied. The requested student is not linked to your parent account.",
            },
          },
          { status: 403 }
        );
      }
      activeStudentId = requestedStudentId;
    }

    // 2. Fetch Selected Student Details
    const student = await Student.findOne({
      _id: activeStudentId,
      schoolId,
    }).lean();

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "STUDENT_NOT_FOUND",
            message: "Student record could not be found.",
          },
        },
        { status: 404 }
      );
    }

    const classId = student.classId;
    const sectionId = student.sectionId;

    // 3. Resolve Academic Year Context
    let targetYearId = student.academicYearId;
    if (requestedYearId && mongoose.Types.ObjectId.isValid(requestedYearId)) {
      const validYear = await AcademicYear.findOne({
        _id: requestedYearId,
        schoolId,
      }).lean();
      if (validYear) targetYearId = validYear._id;
    }

    // 4. Fetch School, Class, Section, and Academic Year docs
    const [schoolDoc, classDoc, sectionDoc, academicYearDoc] = await Promise.all([
      School.findById(schoolId).lean(),
      Class.findById(classId).select("name code").lean(),
      Section.findById(sectionId).select("name").lean(),
      AcademicYear.findById(targetYearId).select("name status").lean(),
    ]);

    const gradingScales = schoolDoc?.gradingSettings?.scales || undefined;

    // 5. Query ONLY PUBLISHED exam results for this student
    // Strict Publication Rule: Unpublished / Draft / In-Review results must NOT be visible to parents
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

    const academicContext = {
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
    };

    if (publishedResultsDocs.length === 0) {
      return NextResponse.json({
        success: true,
        hasChildren: true,
        data: {
          academicContext,
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

    // 6. Group published results by Exam
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

    // 7. Query ExamSubjects configured for these exams and student's class
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

    // 8. Process each exam's results using ResultCalculationService
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

      const subjectListToEvaluate = classExamSubjects.length > 0
        ? classExamSubjects
        : stuResults.map((r: any) => ({
            subjectId: r.subjectId,
            maximumMarks: r.examSubjectId?.maximumMarks || 100,
            passingMarks: r.examSubjectId?.passingMarks || 40,
          }));

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

      if (calculated.isPassed) {
        totalExamsPassed++;
      } else {
        totalExamsFailed++;
      }

      aggregatePercentagesSum += calculated.percentage;
      totalEvaluatedSubjectsCount += calculated.totalSubjects - calculated.unenteredSubjects;

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
      hasChildren: true,
      data: {
        academicContext,
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
  } catch (error: any) {
    console.error("Error in parent results API:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch student results",
        },
      },
      { status: 500 }
    );
  }
}

// Strictly enforce read-only security on Parent results endpoint
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Parents cannot enter marks or create exam results.",
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
        message: "Parents cannot update exam results.",
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
        message: "Parents cannot publish, unpublish, or modify exam results or grades.",
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
        message: "Parents cannot delete exam results.",
      },
    },
    { status: 405 }
  );
}
