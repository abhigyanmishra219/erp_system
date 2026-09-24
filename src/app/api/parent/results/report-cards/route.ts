import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireParent } from "@/lib/auth/requireParent";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import ExamResult from "@/models/ExamResult";
import Class from "@/models/Class";
import Section from "@/models/Section";
import AcademicYear from "@/models/AcademicYear";
import Student from "@/models/Student";
import { ReportCardService } from "@/lib/services/reportCardService";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

    const subCheck = requireModule(auth.context.school, "RESULTS");
    if (!subCheck.allowed) return subCheck.response;

    const { schoolId, childIds } = auth.context;

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

    // 1. Authorize requested child
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

    // 2. Fetch Student details
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

    // 4. Fetch context docs
    const [classDoc, sectionDoc, academicYearDoc] = await Promise.all([
      Class.findById(classId).select("name code").lean(),
      Section.findById(sectionId).select("name").lean(),
      AcademicYear.findById(targetYearId).select("name status").lean(),
    ]);

    // 5. Strict Publication Rule: Find all exams where this student has PUBLISHED results
    const publishedResults = await ExamResult.find({
      schoolId,
      studentId: student._id,
      status: "PUBLISHED",
    }).lean();

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

    if (publishedResults.length === 0) {
      return NextResponse.json({
        success: true,
        hasChildren: true,
        data: {
          academicContext,
          summary: {
            totalPublishedReportCards: 0,
            passedReportCards: 0,
            failedReportCards: 0,
            averagePercentage: 0,
          },
          reportCards: [],
        },
      });
    }

    // 6. Distinct published exam IDs
    const distinctExamIds = Array.from(
      new Set(publishedResults.map((r: any) => r.examId.toString()))
    );

    // 7. Generate full report card data for each published exam using existing ReportCardService
    const reportCardList = [];
    let totalPassed = 0;
    let totalFailed = 0;
    let aggregatePctSum = 0;

    for (const examId of distinctExamIds) {
      const rc = await ReportCardService.generateReportCard({
        schoolId,
        examId,
        studentId: student._id,
      });

      if (rc && rc.resultStatus === "PUBLISHED") {
        if (rc.academic.isPassed) totalPassed++;
        else totalFailed++;
        aggregatePctSum += rc.academic.percentage;

        reportCardList.push({
          examId: rc.exam.id,
          examName: rc.exam.name,
          academicYear: rc.exam.academicYear,
          startDate: rc.exam.startDate,
          endDate: rc.exam.endDate,
          publishedAt: rc.generatedAt,
          totalObtainedMarks: rc.academic.totalObtainedMarks,
          totalMaximumMarks: rc.academic.totalMaximumMarks,
          percentage: rc.academic.percentage,
          overallGrade: rc.academic.overallGrade,
          isPassed: rc.academic.isPassed,
          statusText: rc.academic.statusText,
          totalSubjects: rc.academic.subjects.length,
          attendancePercentage: rc.attendance.attendancePercentage,
          resultStatus: rc.resultStatus,
        });
      }
    }

    const averagePercentage =
      reportCardList.length > 0
        ? Math.round((aggregatePctSum / reportCardList.length) * 100) / 100
        : 0;

    return NextResponse.json({
      success: true,
      hasChildren: true,
      data: {
        academicContext,
        summary: {
          totalPublishedReportCards: reportCardList.length,
          passedReportCards: totalPassed,
          failedReportCards: totalFailed,
          averagePercentage,
        },
        reportCards: reportCardList,
      },
    });
  } catch (error: any) {
    console.error("Error in parent report cards list API:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch student report cards",
        },
      },
      { status: 500 }
    );
  }
}

// Read-only Security Enforcement
export async function POST() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot create report cards" } },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot update report cards" } },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot modify report cards" } },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot delete report cards" } },
    { status: 405 }
  );
}
