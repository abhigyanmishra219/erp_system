import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Exam from "@/models/Exam";
import ExamTarget from "@/models/ExamTarget";
import ExamSubject from "@/models/ExamSubject";
import ExamResult from "@/models/ExamResult";
import Student from "@/models/Student";
import School from "@/models/School";
import AuditLog from "@/models/AuditLog";
import { updateResultStatusSchema } from "@/lib/validation/exam";
import { ResultCalculationService, SubjectResultInput } from "@/lib/services/resultCalculationService";

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
  const sectionId = searchParams.get("sectionId");
  const studentId = searchParams.get("studentId");
  const status = searchParams.get("status") || "ALL";
  const search = (searchParams.get("search") || "").trim();

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid exam ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const [exam, school] = await Promise.all([
      Exam.findOne({ _id: examId, schoolId, isActive: true })
        .populate("academicYearId", "name startDate endDate")
        .lean(),
      School.findById(schoolId).lean(),
    ]);

    if (!exam) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Exam not found" } },
        { status: 404 }
      );
    }

    // 1. Fetch relevant exam subjects
    const subjectQuery: Record<string, any> = { schoolId, examId, isActive: true };
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      subjectQuery.classId = classId;
    }

    const examSubjects = await ExamSubject.find(subjectQuery)
      .populate("classId", "name code")
      .populate("subjectId", "name code")
      .lean();

    // Group subjects by classId
    const subjectsByClassMap = new Map<string, any[]>();
    for (const s of examSubjects) {
      const cId = (s.classId as any)?._id?.toString() || s.classId.toString();
      if (!subjectsByClassMap.has(cId)) subjectsByClassMap.set(cId, []);
      subjectsByClassMap.get(cId)!.push(s);
    }

    // 2. Fetch relevant students
    const studentQuery: Record<string, any> = { schoolId, status: "ACTIVE" };
    if (classId && mongoose.Types.ObjectId.isValid(classId)) studentQuery.classId = classId;
    if (sectionId && mongoose.Types.ObjectId.isValid(sectionId)) studentQuery.sectionId = sectionId;
    if (studentId && mongoose.Types.ObjectId.isValid(studentId)) studentQuery._id = studentId;

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      studentQuery.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { admissionNumber: searchRegex },
        { rollNumber: searchRegex },
      ];
    }

    const students = await Student.find(studentQuery)
      .populate("userId", "name email profileImage")
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .sort({ "classId.name": 1, "sectionId.name": 1, rollNumber: 1, firstName: 1 })
      .lean();

    const studentIds = students.map((s) => s._id);

    // 3. Fetch all existing ExamResults for these students and exam
    const results = await ExamResult.find({
      schoolId,
      examId,
      studentId: { $in: studentIds },
    })
      .populate("subjectId", "name code")
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .lean();

    // Group results by studentId
    const resultsByStudentMap = new Map<string, any[]>();
    for (const r of results) {
      const sId = r.studentId.toString();
      if (!resultsByStudentMap.has(sId)) resultsByStudentMap.set(sId, []);
      resultsByStudentMap.get(sId)!.push(r);
    }

    const gradingScales = school?.gradingSettings?.scales || undefined;

    // 4. Calculate overall metrics per student
    const studentResultsList = students.map((stu: any) => {
      const sId = stu._id.toString();
      const cId = stu.classId ? stu.classId._id.toString() : "";
      const classSubjects = subjectsByClassMap.get(cId) || [];
      const stuResults = resultsByStudentMap.get(sId) || [];

      const resultsBySubIdMap = new Map<string, any>();
      for (const r of stuResults) {
        const subId = r.subjectId ? (r.subjectId as any)._id?.toString() || r.subjectId.toString() : "";
        if (subId) resultsBySubIdMap.set(subId, r);
      }

      // Determine student overall publication status
      let studentStatus: "DRAFT" | "REVIEWED" | "PUBLISHED" = "DRAFT";
      let reviewedCount = 0;
      let publishedCount = 0;
      for (const r of stuResults) {
        if (r.status === "REVIEWED") reviewedCount++;
        else if (r.status === "PUBLISHED") publishedCount++;
      }
      if (publishedCount > 0 && publishedCount === classSubjects.length) {
        studentStatus = "PUBLISHED";
      } else if (reviewedCount > 0) {
        studentStatus = "REVIEWED";
      }

      // Prepare inputs for ResultCalculationService
      const subjectInputs: SubjectResultInput[] = classSubjects.map((es: any) => {
        const subId = es.subjectId?._id?.toString() || es.subjectId?.toString() || "";
        const r = resultsBySubIdMap.get(subId);
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

      const studentUser = stu.userId as any;
      const fullName = `${stu.firstName} ${stu.lastName}`.trim() || (studentUser?.name ?? "Student");

      return {
        student: {
          id: sId,
          name: fullName,
          admissionNumber: stu.admissionNumber || "",
          rollNumber: stu.rollNumber || "",
          photo: stu.photo || studentUser?.profileImage || "",
          class: stu.classId ? { id: stu.classId._id.toString(), name: stu.classId.name, code: stu.classId.code } : null,
          section: stu.sectionId ? { id: stu.sectionId._id.toString(), name: stu.sectionId.name } : null,
        },
        totalObtainedMarks: calculated.totalObtainedMarks,
        totalMaximumMarks: calculated.totalMaximumMarks,
        percentage: calculated.percentage,
        overallGrade: calculated.overallGrade,
        isPassed: calculated.isPassed,
        statusText: calculated.statusText,
        subjectsCount: classSubjects.length,
        enteredCount: calculated.totalSubjects - calculated.unenteredSubjects,
        unenteredCount: calculated.unenteredSubjects,
        passedSubjectsCount: calculated.passedSubjects,
        failedSubjectsCount: calculated.failedSubjects,
        status: studentStatus,
        subjects: calculated.subjects,
      };
    });

    // Filter by status if requested
    const filteredList = status === "ALL"
      ? studentResultsList
      : studentResultsList.filter((item) => item.status === status);

    const totalStudents = studentResultsList.length;
    const publishedStudents = studentResultsList.filter((s) => s.status === "PUBLISHED").length;
    const reviewedStudents = studentResultsList.filter((s) => s.status === "REVIEWED").length;
    const draftStudents = studentResultsList.filter((s) => s.status === "DRAFT").length;
    const passedStudents = studentResultsList.filter((s) => s.isPassed).length;

    return NextResponse.json({
      success: true,
      data: {
        exam: {
          id: exam._id.toString(),
          name: exam.name,
          academicYear: exam.academicYearId ? {
            id: (exam.academicYearId as any)._id.toString(),
            name: (exam.academicYearId as any).name,
          } : null,
          status: exam.status,
          startDate: exam.startDate,
          endDate: exam.endDate,
        },
        results: filteredList,
        summary: {
          totalStudents,
          publishedStudents,
          reviewedStudents,
          draftStudents,
          passedStudents,
          failedStudents: totalStudents - passedStudents,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch exam results" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const validated = updateResultStatusSchema.parse(body);

    await connectToDatabase();

    const exam = await Exam.findOne({ _id: examId, schoolId, isActive: true }).lean();
    if (!exam) {
      return NextResponse.json(
        { success: false, error: { code: "EXAM_NOT_FOUND", message: "Exam not found." } },
        { status: 404 }
      );
    }

    const updateFilter: Record<string, any> = { schoolId, examId };
    if (validated.classId) updateFilter.classId = validated.classId;
    if (validated.sectionId) updateFilter.sectionId = validated.sectionId;
    if (validated.studentIds && validated.studentIds.length > 0) {
      updateFilter.studentId = { $in: validated.studentIds };
    }

    const updateFields: Record<string, any> = {
      status: validated.status,
    };

    if (validated.status === "REVIEWED") {
      updateFields.reviewedBy = user.id;
      updateFields.reviewedAt = new Date();
    } else if (validated.status === "PUBLISHED") {
      updateFields.reviewedBy = user.id;
      updateFields.reviewedAt = new Date();
      updateFields.publishedAt = new Date();
    } else if (validated.status === "DRAFT") {
      updateFields.publishedAt = null;
    }

    const resultUpdate = await ExamResult.updateMany(updateFilter, { $set: updateFields });

    // Determine audit event action
    let auditAction = "RESULT_REVIEWED";
    if (validated.status === "PUBLISHED") auditAction = "RESULT_PUBLISHED";
    else if (validated.status === "DRAFT") auditAction = "RESULT_UNPUBLISHED";

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: auditAction,
      entityType: "EXAM_RESULT",
      entityId: examId,
      schoolId,
      metadata: {
        examId,
        newStatus: validated.status,
        modifiedCount: resultUpdate.modifiedCount,
        filters: {
          classId: validated.classId,
          sectionId: validated.sectionId,
          studentIdsCount: validated.studentIds?.length || 0,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Results ${validated.status.toLowerCase()} successfully`,
      data: {
        updatedCount: resultUpdate.modifiedCount,
        status: validated.status,
      },
    });
  } catch (error: any) {
    if (error.issues) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Validation failed", details: error.issues } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to update result status" } },
      { status: 500 }
    );
  }
}
