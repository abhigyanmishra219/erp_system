import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import Exam from "@/models/Exam";
import ExamTarget from "@/models/ExamTarget";
import ExamSubject from "@/models/ExamSubject";
import ExamResult from "@/models/ExamResult";
import AuditLog from "@/models/AuditLog";
import { updateExamSchema } from "@/lib/validation/exam";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "EXAMS");
  if (!subCheck.allowed) return subCheck.response;

  const { schoolId } = auth.context;
  const { examId } = await params;

  if (!mongoose.Types.ObjectId.isValid(examId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid exam ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const exam = await Exam.findOne({ _id: examId, schoolId, isActive: true })
      .populate("academicYearId", "name status startDate endDate")
      .lean();

    if (!exam) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Exam not found" } },
        { status: 404 }
      );
    }

    const [targets, subjects, results] = await Promise.all([
      ExamTarget.find({ schoolId, examId, isActive: true })
        .populate("classId", "name code displayOrder")
        .populate("sectionId", "name capacity")
        .sort({ "classId.displayOrder": 1, "sectionId.name": 1 })
        .lean(),
      ExamSubject.find({ schoolId, examId, isActive: true })
        .populate("classId", "name code")
        .populate("subjectId", "name code subjectType")
        .sort({ "classId.name": 1, "subjectId.name": 1 })
        .lean(),
      ExamResult.find({ schoolId, examId }).lean(),
    ]);

    // Group targets by class
    const targetsByClassMap = new Map<string, { class: any; sections: any[] }>();
    for (const t of targets) {
      const cls = t.classId as any;
      if (!cls || !cls._id) continue;
      const cId = cls._id.toString();
      if (!targetsByClassMap.has(cId)) {
        targetsByClassMap.set(cId, { class: cls, sections: [] });
      }
      targetsByClassMap.get(cId)!.sections.push({
        targetId: t._id.toString(),
        section: t.sectionId,
      });
    }

    // Group subjects by class
    const subjectsByClassMap = new Map<string, { class: any; subjects: any[] }>();
    for (const s of subjects) {
      const cls = s.classId as any;
      if (!cls || !cls._id) continue;
      const cId = cls._id.toString();
      if (!subjectsByClassMap.has(cId)) {
        subjectsByClassMap.set(cId, { class: cls, subjects: [] });
      }
      subjectsByClassMap.get(cId)!.subjects.push({
        examSubjectId: s._id.toString(),
        subject: s.subjectId,
        examDate: s.examDate,
        maximumMarks: s.maximumMarks,
        passingMarks: s.passingMarks,
      });
    }

    // Results stats
    let draftCount = 0;
    let reviewedCount = 0;
    let publishedCount = 0;
    for (const r of results) {
      if (r.status === "DRAFT") draftCount++;
      else if (r.status === "REVIEWED") reviewedCount++;
      else if (r.status === "PUBLISHED") publishedCount++;
    }

    return NextResponse.json({
      success: true,
      data: {
        exam: {
          id: exam._id.toString(),
          name: exam.name,
          description: exam.description,
          startDate: exam.startDate,
          endDate: exam.endDate,
          status: exam.status,
          academicYear: exam.academicYearId ? {
            id: (exam.academicYearId as any)._id.toString(),
            name: (exam.academicYearId as any).name,
          } : null,
          targets: Array.from(targetsByClassMap.values()),
          subjects: Array.from(subjectsByClassMap.values()),
          rawTargets: targets.map((t: any) => ({
            id: t._id.toString(),
            classId: t.classId?._id?.toString(),
            className: t.classId?.name,
            sectionId: t.sectionId?._id?.toString(),
            sectionName: t.sectionId?.name,
          })),
          rawSubjects: subjects.map((s: any) => ({
            id: s._id.toString(),
            classId: s.classId?._id?.toString(),
            className: s.classId?.name,
            subjectId: s.subjectId?._id?.toString(),
            subjectName: s.subjectId?.name,
            subjectCode: s.subjectId?.code,
            maximumMarks: s.maximumMarks,
            passingMarks: s.passingMarks,
            examDate: s.examDate,
          })),
          stats: {
            targetsCount: targets.length,
            subjectsCount: subjects.length,
            totalResults: results.length,
            draftResults: draftCount,
            reviewedResults: reviewedCount,
            publishedResults: publishedCount,
          },
          createdAt: exam.createdAt,
          updatedAt: exam.updatedAt,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch exam details" } },
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
    const validated = updateExamSchema.parse(body);

    await connectToDatabase();

    const exam = await Exam.findOne({ _id: examId, schoolId, isActive: true });
    if (!exam) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Exam not found" } },
        { status: 404 }
      );
    }

    if (validated.name !== undefined) exam.name = validated.name.trim();
    if (validated.description !== undefined) exam.description = validated.description.trim();
    if (validated.startDate !== undefined) exam.startDate = new Date(validated.startDate);
    if (validated.endDate !== undefined) exam.endDate = new Date(validated.endDate);
    if (validated.status !== undefined) exam.status = validated.status;
    exam.updatedBy = new mongoose.Types.ObjectId(user.id);

    await exam.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "EXAM_UPDATED",
      entityType: "EXAM",
      entityId: exam._id.toString(),
      schoolId,
      metadata: {
        examId: exam._id.toString(),
        updates: validated,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Exam updated successfully",
      data: {
        exam: {
          id: exam._id.toString(),
          name: exam.name,
          status: exam.status,
          startDate: exam.startDate,
          endDate: exam.endDate,
        },
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
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to update exam" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
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
    await connectToDatabase();

    const exam = await Exam.findOne({ _id: examId, schoolId, isActive: true });
    if (!exam) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Exam not found" } },
        { status: 404 }
      );
    }

    exam.isActive = false;
    exam.updatedBy = new mongoose.Types.ObjectId(user.id);
    await exam.save();

    // Deactivate targets and subjects
    await Promise.all([
      ExamTarget.updateMany({ examId, schoolId }, { $set: { isActive: false, updatedBy: new mongoose.Types.ObjectId(user.id) } }),
      ExamSubject.updateMany({ examId, schoolId }, { $set: { isActive: false, updatedBy: new mongoose.Types.ObjectId(user.id) } }),
    ]);

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "EXAM_DELETED",
      entityType: "EXAM",
      entityId: exam._id.toString(),
      schoolId,
      metadata: { examId: exam._id.toString(), name: exam.name },
    });

    return NextResponse.json({
      success: true,
      message: "Exam removed successfully",
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to delete exam" } },
      { status: 500 }
    );
  }
}
