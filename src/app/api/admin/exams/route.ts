import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Exam from "@/models/Exam";
import ExamTarget from "@/models/ExamTarget";
import ExamSubject from "@/models/ExamSubject";
import ExamResult from "@/models/ExamResult";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import ClassSubject from "@/models/ClassSubject";
import AuditLog from "@/models/AuditLog";
import { createExamSchema } from "@/lib/validation/exam";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;

  try {
    const url = new URL(req.url);
    const academicYearId = url.searchParams.get("academicYearId") || "";
    const status = url.searchParams.get("status") || "ALL";
    const search = (url.searchParams.get("search") || "").trim();
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "20", 10)));

    await connectToDatabase();

    const filter: Record<string, any> = {
      schoolId,
      isActive: true,
    };

    if (academicYearId && mongoose.Types.ObjectId.isValid(academicYearId)) {
      filter.academicYearId = academicYearId;
    }

    if (status !== "ALL") {
      filter.status = status;
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ name: searchRegex }, { description: searchRegex }];
    }

    const skip = (page - 1) * limit;

    const [total, exams] = await Promise.all([
      Exam.countDocuments(filter),
      Exam.find(filter)
        .populate("academicYearId", "name status startDate endDate")
        .sort({ startDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const examIds = exams.map((e) => e._id);

    // Efficiently aggregate targets, subjects, and results counts for each exam
    const [targets, subjects, results] = await Promise.all([
      ExamTarget.find({ schoolId, examId: { $in: examIds }, isActive: true })
        .populate("classId", "name code")
        .populate("sectionId", "name")
        .lean(),
      ExamSubject.find({ schoolId, examId: { $in: examIds }, isActive: true })
        .populate("classId", "name code")
        .populate("subjectId", "name code")
        .lean(),
      ExamResult.find({ schoolId, examId: { $in: examIds } }).lean(),
    ]);

    const targetsMap = new Map<string, any[]>();
    for (const t of targets) {
      const eId = t.examId.toString();
      if (!targetsMap.has(eId)) targetsMap.set(eId, []);
      targetsMap.get(eId)!.push(t);
    }

    const subjectsMap = new Map<string, any[]>();
    for (const s of subjects) {
      const eId = s.examId.toString();
      if (!subjectsMap.has(eId)) subjectsMap.set(eId, []);
      subjectsMap.get(eId)!.push(s);
    }

    const resultsStatsMap = new Map<string, { total: number; draft: number; reviewed: number; published: number }>();
    for (const r of results) {
      const eId = r.examId.toString();
      if (!resultsStatsMap.has(eId)) {
        resultsStatsMap.set(eId, { total: 0, draft: 0, reviewed: 0, published: 0 });
      }
      const stats = resultsStatsMap.get(eId)!;
      stats.total++;
      if (r.status === "DRAFT") stats.draft++;
      else if (r.status === "REVIEWED") stats.reviewed++;
      else if (r.status === "PUBLISHED") stats.published++;
    }

    const formattedExams = exams.map((e: any) => {
      const eId = e._id.toString();
      const examTargets = targetsMap.get(eId) || [];
      const examSubjects = subjectsMap.get(eId) || [];
      const resultStats = resultsStatsMap.get(eId) || { total: 0, draft: 0, reviewed: 0, published: 0 };

      // Distinct classes participating
      const distinctClassIds = new Set<string>();
      const distinctClasses: Array<{ id: string; name: string }> = [];
      for (const t of examTargets) {
        if (t.classId && !distinctClassIds.has(t.classId._id.toString())) {
          distinctClassIds.add(t.classId._id.toString());
          distinctClasses.push({ id: t.classId._id.toString(), name: t.classId.name });
        }
      }

      return {
        id: eId,
        name: e.name,
        description: e.description,
        academicYear: e.academicYearId ? { id: e.academicYearId._id?.toString(), name: e.academicYearId.name } : null,
        startDate: e.startDate,
        endDate: e.endDate,
        status: e.status,
        classes: distinctClasses,
        targetsCount: examTargets.length,
        subjectsCount: examSubjects.length,
        resultStats,
        createdAt: e.createdAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        exams: formattedExams,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch exams" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId, user } = auth.context;

  try {
    const body = await req.json();
    const validated = createExamSchema.parse(body);

    await connectToDatabase();

    // 1. Verify Academic Year
    const academicYear = await AcademicYear.findOne({
      _id: validated.academicYearId,
      schoolId,
    }).lean();

    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ACADEMIC_YEAR", message: "Selected academic year is invalid or not in your school." } },
        { status: 400 }
      );
    }

    // 2. Validate Targets (Classes and Sections)
    if (validated.targets && validated.targets.length > 0) {
      for (const target of validated.targets) {
        const classDoc = await Class.findOne({ _id: target.classId, schoolId }).lean();
        if (!classDoc) {
          return NextResponse.json(
            { success: false, error: { code: "INVALID_CLASS", message: "One or more selected classes are invalid." } },
            { status: 400 }
          );
        }

        const sections = await Section.find({
          _id: { $in: target.sectionIds },
          classId: target.classId,
          schoolId,
        }).lean();

        if (sections.length !== target.sectionIds.length) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "INVALID_SECTION_MAPPING",
                message: `One or more sections do not belong to the selected class (${classDoc.name}).`,
              },
            },
            { status: 400 }
          );
        }
      }
    }

    // 3. Validate Subjects against ClassSubject mapping
    if (validated.subjects && validated.subjects.length > 0) {
      for (const sub of validated.subjects) {
        const [classDoc, subjectDoc, classSubject] = await Promise.all([
          Class.findOne({ _id: sub.classId, schoolId }).lean(),
          Subject.findOne({ _id: sub.subjectId, schoolId }).lean(),
          ClassSubject.findOne({
            schoolId,
            classId: sub.classId,
            subjectId: sub.subjectId,
            isActive: true,
          }).lean(),
        ]);

        if (!classDoc || !subjectDoc) {
          return NextResponse.json(
            { success: false, error: { code: "INVALID_SUBJECT_OR_CLASS", message: "Invalid subject or class reference." } },
            { status: 400 }
          );
        }

        if (!classSubject) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "SUBJECT_NOT_ASSIGNED_TO_CLASS",
                message: `Subject '${subjectDoc.name}' is not assigned to class '${classDoc.name}' in your curriculum.`,
              },
            },
            { status: 400 }
          );
        }
      }
    }

    // 4. Create Exam
    const newExam = new Exam({
      schoolId,
      academicYearId: validated.academicYearId,
      name: validated.name.trim(),
      description: validated.description?.trim() || "",
      startDate: new Date(validated.startDate),
      endDate: new Date(validated.endDate),
      status: validated.status || "SCHEDULED",
      isActive: true,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await newExam.save();

    // 5. Create Exam Targets
    if (validated.targets && validated.targets.length > 0) {
      const targetDocs: any[] = [];
      for (const t of validated.targets) {
        for (const secId of t.sectionIds) {
          targetDocs.push({
            schoolId,
            examId: newExam._id,
            academicYearId: validated.academicYearId,
            classId: t.classId,
            sectionId: secId,
            isActive: true,
            createdBy: user.id,
            updatedBy: user.id,
          });
        }
      }
      if (targetDocs.length > 0) {
        await ExamTarget.insertMany(targetDocs);
      }
    }

    // 6. Create Exam Subjects
    if (validated.subjects && validated.subjects.length > 0) {
      const subjectDocs = validated.subjects.map((s) => ({
        schoolId,
        examId: newExam._id,
        academicYearId: validated.academicYearId,
        classId: s.classId,
        subjectId: s.subjectId,
        examDate: s.examDate ? new Date(s.examDate) : null,
        maximumMarks: s.maximumMarks,
        passingMarks: s.passingMarks,
        isActive: true,
        createdBy: user.id,
        updatedBy: user.id,
      }));
      await ExamSubject.insertMany(subjectDocs);
    }

    // 7. Audit Log
    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "EXAM_CREATED",
      entityType: "EXAM",
      entityId: newExam._id.toString(),
      schoolId,
      metadata: {
        examId: newExam._id.toString(),
        name: newExam.name,
        academicYearId: validated.academicYearId,
        targetsCount: validated.targets?.length || 0,
        subjectsCount: validated.subjects?.length || 0,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Exam created successfully",
        data: {
          exam: {
            id: newExam._id.toString(),
            name: newExam.name,
            status: newExam.status,
            startDate: newExam.startDate,
            endDate: newExam.endDate,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.issues) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid exam input data", details: error.issues } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to create exam" } },
      { status: 500 }
    );
  }
}
