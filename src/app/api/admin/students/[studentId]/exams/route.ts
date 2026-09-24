import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import Student from "@/models/Student";
import Exam from "@/models/Exam";
import ExamSubject from "@/models/ExamSubject";
import ExamResult from "@/models/ExamResult";
import School from "@/models/School";
import { ResultCalculationService, SubjectResultInput } from "@/lib/services/resultCalculationService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "EXAMS");
  if (!subCheck.allowed) return subCheck.response;

  const { schoolId } = auth.context;
  const { studentId } = await params;

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid student ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const [student, school] = await Promise.all([
      Student.findOne({ _id: studentId, schoolId }).lean(),
      School.findById(schoolId).lean(),
    ]);

    if (!student) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Student not found" } },
        { status: 404 }
      );
    }

    // Find all results for this student
    const studentResults = await ExamResult.find({
      schoolId,
      studentId,
    })
      .populate("examId", "name startDate endDate status academicYearId")
      .populate("subjectId", "name code")
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .sort({ createdAt: -1 })
      .lean();

    // Group results by examId
    const resultsByExamMap = new Map<string, any[]>();
    for (const r of studentResults) {
      if (!r.examId) continue;
      const eId = (r.examId as any)._id?.toString() || r.examId.toString();
      if (!resultsByExamMap.has(eId)) resultsByExamMap.set(eId, []);
      resultsByExamMap.get(eId)!.push(r);
    }

    const gradingScales = school?.gradingSettings?.scales || undefined;
    const examCards: any[] = [];

    for (const [eId, rList] of resultsByExamMap.entries()) {
      const examDoc = rList[0].examId;
      const historicalClass = rList[0].classId;
      const historicalSection = rList[0].sectionId;

      const subjectInputs: SubjectResultInput[] = rList.map((r) => ({
        subjectId: (r.subjectId as any)?._id?.toString() || r.subjectId?.toString() || "",
        subjectName: (r.subjectId as any)?.name || "Subject",
        subjectCode: (r.subjectId as any)?.code || "",
        marks: r.marks,
        maximumMarks: 100, // or default
        passingMarks: 33,
      }));

      // Find real maxMarks from ExamSubject
      const examSubjectIds = rList.map((r) => r.examSubjectId);
      const examSubjects = await ExamSubject.find({ _id: { $in: examSubjectIds } }).lean();
      const esMap = new Map(examSubjects.map((es) => [es._id.toString(), es]));

      for (let i = 0; i < rList.length; i++) {
        const es = esMap.get(rList[i].examSubjectId?.toString());
        if (es) {
          subjectInputs[i].maximumMarks = es.maximumMarks;
          subjectInputs[i].passingMarks = es.passingMarks;
        }
      }

      const calculated = ResultCalculationService.calculateOverallResult(subjectInputs, gradingScales);

      let status: "DRAFT" | "REVIEWED" | "PUBLISHED" = "DRAFT";
      if (rList.every((r) => r.status === "PUBLISHED")) status = "PUBLISHED";
      else if (rList.some((r) => r.status === "REVIEWED")) status = "REVIEWED";

      examCards.push({
        examId: eId,
        examName: examDoc.name,
        status,
        class: historicalClass ? { name: historicalClass.name, code: historicalClass.code } : null,
        section: historicalSection ? { name: historicalSection.name } : null,
        startDate: examDoc.startDate,
        endDate: examDoc.endDate,
        totalObtainedMarks: calculated.totalObtainedMarks,
        totalMaximumMarks: calculated.totalMaximumMarks,
        percentage: calculated.percentage,
        overallGrade: calculated.overallGrade,
        isPassed: calculated.isPassed,
        statusText: calculated.statusText,
        subjects: calculated.subjects,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        exams: examCards,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch student exams" } },
      { status: 500 }
    );
  }
}
