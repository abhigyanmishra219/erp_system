import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import Exam from "@/models/Exam";
import ExamTarget from "@/models/ExamTarget";
import ExamSubject from "@/models/ExamSubject";
import ExamResult from "@/models/ExamResult";
import Student from "@/models/Student";
import School from "@/models/School";
import AuditLog from "@/models/AuditLog";
import { verifyTeacherAssignmentScope } from "@/lib/auth/teacherAssignmentScope";
import { enterMarksSchema } from "@/lib/validation/exam";
import { ResultCalculationService } from "@/lib/services/resultCalculationService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "EXAMS");
  if (!subCheck.allowed) return subCheck.response;

  const { schoolId, user } = auth.context;
  const { examId } = await params;
  const { searchParams } = new URL(req.url);

  const classId = searchParams.get("classId");
  const sectionId = searchParams.get("sectionId");
  const subjectId = searchParams.get("subjectId");
  const examSubjectId = searchParams.get("examSubjectId");

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid exam ID" } },
      { status: 400 }
    );
  }

  if (!classId || !sectionId || (!subjectId && !examSubjectId)) {
    return NextResponse.json(
      { success: false, error: { code: "MISSING_PARAMS", message: "classId, sectionId, and subjectId are required." } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const exam = await Exam.findOne({ _id: examId, schoolId, isActive: true }).lean();
    if (!exam) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Exam not found" } },
        { status: 404 }
      );
    }

    // Resolve Exam Subject
    const subjectQuery: Record<string, any> = { schoolId, examId, classId, isActive: true };
    if (examSubjectId && mongoose.Types.ObjectId.isValid(examSubjectId)) {
      subjectQuery._id = examSubjectId;
    } else if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      subjectQuery.subjectId = subjectId;
    }

    const examSubject = await ExamSubject.findOne(subjectQuery)
      .populate("subjectId", "name code subjectType")
      .lean();

    if (!examSubject) {
      return NextResponse.json(
        { success: false, error: { code: "SUBJECT_NOT_CONFIGURED", message: "This subject is not configured for this class in this exam." } },
        { status: 404 }
      );
    }

    const resolvedSubjectId = (examSubject.subjectId as any)?._id?.toString() || examSubject.subjectId.toString();

    // Enforce Teacher Role Scope Restriction
    if ((user.role as string) === "TEACHER") {
      const scopeCheck = await verifyTeacherAssignmentScope({
        schoolId,
        userId: user.id,
        academicYearId: exam.academicYearId.toString(),
        classId,
        sectionId,
        subjectId: resolvedSubjectId,
      });

      if (!scopeCheck.hasAccess) {
        return NextResponse.json(
          { success: false, error: { code: "TEACHER_SCOPE_DENIED", message: scopeCheck.reason || "You are not authorized to enter marks for this class, section, and subject." } },
          { status: 403 }
        );
      }
    }

    // Fetch eligible active students in this class and section
    const [students, existingResults, school] = await Promise.all([
      Student.find({
        schoolId,
        classId,
        sectionId,
        status: "ACTIVE",
      })
        .populate("userId", "name email profileImage")
        .sort({ rollNumber: 1, firstName: 1, lastName: 1 })
        .lean(),
      ExamResult.find({
        schoolId,
        examId,
        examSubjectId: examSubject._id,
        classId,
        sectionId,
      }).lean(),
      School.findById(schoolId).lean(),
    ]);

    const resultsMap = new Map<string, any>();
    for (const r of existingResults) {
      resultsMap.set(r.studentId.toString(), r);
    }

    const gradingScales = school?.gradingSettings?.scales || undefined;

    const roster = students.map((s: any) => {
      const sId = s._id.toString();
      const existing = resultsMap.get(sId);
      const studentUser = s.userId as any;
      const fullName = `${s.firstName} ${s.lastName}`.trim() || (studentUser?.name ?? "Student");

      let calculatedGrade = existing?.grade || "";
      let calculatedPassed = existing?.isPassed || false;

      if (existing && existing.marks !== null && existing.marks !== undefined) {
        const evaluated = ResultCalculationService.evaluateSubject(
          {
            subjectId: resolvedSubjectId,
            marks: existing.marks,
            maximumMarks: examSubject.maximumMarks,
            passingMarks: examSubject.passingMarks,
          },
          gradingScales
        );
        calculatedGrade = evaluated.grade;
        calculatedPassed = evaluated.isPassed;
      }

      return {
        studentId: sId,
        admissionNumber: s.admissionNumber || "",
        rollNumber: s.rollNumber || "",
        name: fullName,
        photo: s.photo || studentUser?.profileImage || "",
        gender: s.gender || "",
        marks: existing && existing.marks !== null && existing.marks !== undefined ? existing.marks : null,
        grade: calculatedGrade,
        isPassed: calculatedPassed,
        remarks: existing?.remarks || "",
        status: existing?.status || "DRAFT",
        resultId: existing?._id?.toString() || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        exam: {
          id: exam._id.toString(),
          name: exam.name,
          academicYearId: exam.academicYearId.toString(),
          status: exam.status,
        },
        examSubject: {
          id: examSubject._id.toString(),
          subjectId: resolvedSubjectId,
          subjectName: (examSubject.subjectId as any)?.name || "Subject",
          subjectCode: (examSubject.subjectId as any)?.code || "",
          maximumMarks: examSubject.maximumMarks,
          passingMarks: examSubject.passingMarks,
          examDate: examSubject.examDate,
        },
        roster,
        stats: {
          totalStudents: students.length,
          enteredCount: existingResults.filter((r) => r.marks !== null && r.marks !== undefined).length,
          unenteredCount: students.length - existingResults.filter((r) => r.marks !== null && r.marks !== undefined).length,
          isPublished: existingResults.some((r) => r.status === "PUBLISHED"),
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch marks roster" } },
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

  const subCheck = requireModule(auth.context.school, "EXAMS");
  if (!subCheck.allowed) return subCheck.response;

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
    const validated = enterMarksSchema.parse(body);

    await connectToDatabase();

    const [exam, examSubject, school] = await Promise.all([
      Exam.findOne({ _id: examId, schoolId, isActive: true }).lean(),
      ExamSubject.findOne({
        _id: validated.examSubjectId,
        examId,
        schoolId,
        isActive: true,
      }).lean(),
      School.findById(schoolId).lean(),
    ]);

    if (!exam) {
      return NextResponse.json(
        { success: false, error: { code: "EXAM_NOT_FOUND", message: "Exam not found or inactive." } },
        { status: 404 }
      );
    }
    if (!examSubject) {
      return NextResponse.json(
        { success: false, error: { code: "EXAM_SUBJECT_NOT_FOUND", message: "Exam subject configuration not found." } },
        { status: 404 }
      );
    }

    // Enforce Teacher Role Scope Restriction
    if ((user.role as string) === "TEACHER") {
      const scopeCheck = await verifyTeacherAssignmentScope({
        schoolId,
        userId: user.id,
        academicYearId: exam.academicYearId.toString(),
        classId: validated.classId,
        sectionId: validated.sectionId,
        subjectId: validated.subjectId,
      });

      if (!scopeCheck.hasAccess) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "TEACHER_SCOPE_DENIED",
              message: scopeCheck.reason || "You are not authorized to enter marks for this class, section, and subject.",
            },
          },
          { status: 403 }
        );
      }
    }

    // Check if any existing results for this subject/class/section are already PUBLISHED
    const publishedResults = await ExamResult.find({
      schoolId,
      examId,
      examSubjectId: validated.examSubjectId,
      classId: validated.classId,
      sectionId: validated.sectionId,
      status: "PUBLISHED",
    }).lean();

    if (publishedResults.length > 0 && (user.role as string) === "TEACHER") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "RESULTS_LOCKED",
            message: "Results have already been published. Unpublish before editing.",
          },
        },
        { status: 400 }
      );
    }

    const gradingScales = school?.gradingSettings?.scales || undefined;
    const bulkOperations: any[] = [];
    const maxMarks = examSubject.maximumMarks;
    const passMarks = examSubject.passingMarks;

    for (const entry of validated.entries) {
      // Validate marks range
      if (entry.marks !== null && entry.marks !== undefined) {
        if (entry.marks < 0 || entry.marks > maxMarks) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "INVALID_MARKS_RANGE",
                message: `Marks (${entry.marks}) cannot be negative or exceed the maximum marks of ${maxMarks}.`,
              },
            },
            { status: 400 }
          );
        }
      }

      const evaluated = ResultCalculationService.evaluateSubject(
        {
          subjectId: validated.subjectId,
          marks: entry.marks ?? null,
          maximumMarks: maxMarks,
          passingMarks: passMarks,
        },
        gradingScales
      );

      bulkOperations.push({
        updateOne: {
          filter: {
            schoolId,
            examId,
            examSubjectId: validated.examSubjectId,
            studentId: entry.studentId,
          },
          update: {
            $set: {
              academicYearId: exam.academicYearId,
              classId: validated.classId,
              sectionId: validated.sectionId,
              subjectId: validated.subjectId,
              marks: entry.marks ?? null,
              grade: evaluated.grade,
              isPassed: evaluated.isPassed,
              remarks: entry.remarks?.trim() || "",
              enteredBy: user.id,
              // Keep existing status if already REVIEWED/PUBLISHED and admin is editing, otherwise DRAFT
              status: publishedResults.length > 0 ? "PUBLISHED" : "DRAFT",
            },
          },
          upsert: true,
        },
      });
    }

    if (bulkOperations.length > 0) {
      await ExamResult.bulkWrite(bulkOperations);
    }

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "MARKS_ENTERED",
      entityType: "EXAM_RESULT",
      entityId: examId,
      schoolId,
      metadata: {
        examId,
        examSubjectId: validated.examSubjectId,
        classId: validated.classId,
        sectionId: validated.sectionId,
        subjectId: validated.subjectId,
        entriesCount: validated.entries.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Marks saved and calculated successfully",
      data: {
        savedCount: bulkOperations.length,
      },
    });
  } catch (error: any) {
    if (error.issues) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid marks data", details: error.issues } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to save marks" } },
      { status: 500 }
    );
  }
}
