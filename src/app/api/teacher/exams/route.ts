import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import { getTeacherScope } from "@/lib/auth/teacherScope";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import Exam from "@/models/Exam";
import ExamTarget from "@/models/ExamTarget";
import ExamSubject from "@/models/ExamSubject";
import ExamResult from "@/models/ExamResult";
import Student from "@/models/Student";

export async function GET(req: NextRequest) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const subCheck = requireModule(auth.context.school, "EXAMS");
  if (!subCheck.allowed) return subCheck.response;

  const { teacher, schoolId } = auth.context;
  const teacherIdStr = teacher._id.toString();

  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim();
  const classIdParam = searchParams.get("classId") || "";
  const sectionIdParam = searchParams.get("sectionId") || "";
  const subjectIdParam = searchParams.get("subjectId") || "";
  const statusParam = searchParams.get("status") || "ALL";
  const academicYearIdParam = searchParams.get("academicYearId") || "";

  // 1. Get Teacher Scope
  const scope = await getTeacherScope({
    schoolId,
    teacherId: teacherIdStr,
    academicYearId: academicYearIdParam || undefined,
  });

  const { assignedClasses, classIds, sectionIds, subjectIds } = scope;

  // Build filter options
  const classesMap = new Map<string, { classId: string; className: string }>();
  const sectionsMap = new Map<string, { sectionId: string; sectionName: string; classId: string }>();
  const subjectsMap = new Map<string, { subjectId: string; subjectName: string; classId?: string; sectionId?: string }>();

  assignedClasses.forEach((ac) => {
    if (ac.classId) {
      classesMap.set(ac.classId, { classId: ac.classId, className: ac.className });
    }
    if (ac.sectionId) {
      sectionsMap.set(ac.sectionId, {
        sectionId: ac.sectionId,
        sectionName: ac.sectionName,
        classId: ac.classId,
      });
    }
    if (ac.subjectId && ac.subjectName) {
      subjectsMap.set(ac.subjectId, {
        subjectId: ac.subjectId,
        subjectName: ac.subjectName,
        classId: ac.classId,
        sectionId: ac.sectionId,
      });
    }
  });

  const filterOptions = {
    classes: Array.from(classesMap.values()),
    sections: Array.from(sectionsMap.values()),
    subjects: Array.from(subjectsMap.values()),
    statuses: ["ALL", "PENDING", "COMPLETED", "PUBLISHED"],
  };

  if (classIds.length === 0 || sectionIds.length === 0 || subjectIds.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        exams: [],
        summary: {
          totalSchedules: 0,
          pendingEntry: 0,
          completedEntry: 0,
          publishedResults: 0,
        },
        filterOptions,
      },
    });
  }

  // 2. Query Active ExamTargets for Teacher's Assigned Classes and Sections
  const targetFilter: Record<string, any> = {
    schoolId,
    isActive: true,
    classId: classIdParam ? classIdParam : { $in: classIds },
    sectionId: sectionIdParam ? sectionIdParam : { $in: sectionIds },
  };

  if (academicYearIdParam && mongoose.Types.ObjectId.isValid(academicYearIdParam)) {
    targetFilter.academicYearId = academicYearIdParam;
  }

  const targets = await ExamTarget.find(targetFilter).lean();
  if (targets.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        exams: [],
        summary: {
          totalSchedules: 0,
          pendingEntry: 0,
          completedEntry: 0,
          publishedResults: 0,
        },
        filterOptions,
      },
    });
  }

  const targetExamIds = Array.from(new Set(targets.map((t: any) => t.examId.toString())));

  // 3. Query Active ExamSubjects for Teacher's Assigned Classes and Subjects
  const subjectFilter: Record<string, any> = {
    schoolId,
    isActive: true,
    examId: { $in: targetExamIds },
    classId: classIdParam ? classIdParam : { $in: classIds },
    subjectId: subjectIdParam ? subjectIdParam : { $in: subjectIds },
  };

  const examSubjects = await ExamSubject.find(subjectFilter)
    .populate("subjectId", "name code subjectType")
    .populate("classId", "name code")
    .lean();

  if (examSubjects.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        exams: [],
        summary: {
          totalSchedules: 0,
          pendingEntry: 0,
          completedEntry: 0,
          publishedResults: 0,
        },
        filterOptions,
      },
    });
  }

  // 4. Query Corresponding Exams
  const matchedExamIds = Array.from(new Set(examSubjects.map((es: any) => es.examId.toString())));
  const examFilter: Record<string, any> = {
    _id: { $in: matchedExamIds },
    schoolId,
    isActive: true,
  };

  if (search) {
    const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    examFilter.$or = [{ name: searchRegex }, { description: searchRegex }];
  }

  const exams = await Exam.find(examFilter)
    .populate("academicYearId", "name status")
    .sort({ startDate: -1 })
    .lean();

  const examMap = new Map<string, any>();
  exams.forEach((e: any) => examMap.set(e._id.toString(), e));

  // 5. Query Student Counts per (classId, sectionId)
  const studentCountMap = new Map<string, number>();
  const studentCounts = await Student.aggregate([
    {
      $match: {
        schoolId: new mongoose.Types.ObjectId(schoolId),
        classId: { $in: classIds.map((id) => new mongoose.Types.ObjectId(id)) },
        sectionId: { $in: sectionIds.map((id) => new mongoose.Types.ObjectId(id)) },
        status: "ACTIVE",
      },
    },
    {
      $group: {
        _id: { classId: "$classId", sectionId: "$sectionId" },
        count: { $sum: 1 },
      },
    },
  ]);

  studentCounts.forEach((sc: any) => {
    studentCountMap.set(`${sc._id.classId.toString()}_${sc._id.sectionId.toString()}`, sc.count);
  });

  // 6. Query Marks Entry Statistics from ExamResult
  const resultsAggregation = await ExamResult.aggregate([
    {
      $match: {
        schoolId: new mongoose.Types.ObjectId(schoolId),
        examId: { $in: matchedExamIds.map((id) => new mongoose.Types.ObjectId(id)) },
        classId: { $in: classIds.map((id) => new mongoose.Types.ObjectId(id)) },
        sectionId: { $in: sectionIds.map((id) => new mongoose.Types.ObjectId(id)) },
        subjectId: { $in: subjectIds.map((id) => new mongoose.Types.ObjectId(id)) },
      },
    },
    {
      $group: {
        _id: {
          examId: "$examId",
          examSubjectId: "$examSubjectId",
          classId: "$classId",
          sectionId: "$sectionId",
          subjectId: "$subjectId",
        },
        enteredCount: {
          $sum: { $cond: [{ $ne: ["$marks", null] }, 1, 0] },
        },
        publishedCount: {
          $sum: { $cond: [{ $eq: ["$status", "PUBLISHED"] }, 1, 0] },
        },
        totalResults: { $sum: 1 },
      },
    },
  ]);

  const statsMap = new Map<string, { enteredCount: number; publishedCount: number; totalResults: number }>();
  resultsAggregation.forEach((ra: any) => {
    const key = `${ra._id.examId}_${ra._id.classId}_${ra._id.sectionId}_${ra._id.subjectId}`;
    statsMap.set(key, {
      enteredCount: ra.enteredCount,
      publishedCount: ra.publishedCount,
      totalResults: ra.totalResults,
    });
  });

  // 7. Combine into Teacher Exam Schedules List
  // An exam schedule item is a tuple: (Exam, ExamSubject, Class, Section)
  const scheduleItems: any[] = [];
  let pendingCount = 0;
  let completedCount = 0;
  let publishedCountTotal = 0;

  for (const es of examSubjects) {
    const eId = es.examId.toString();
    const examDoc = examMap.get(eId);
    if (!examDoc) continue;

    const cId = (es.classId as any)?._id?.toString() || es.classId.toString();
    const subId = (es.subjectId as any)?._id?.toString() || es.subjectId.toString();

    // Find applicable sections for this exam and class from targets
    const classTargets = targets.filter(
      (t: any) => t.examId.toString() === eId && t.classId.toString() === cId
    );

    for (const target of classTargets) {
      const sId = target.sectionId.toString();

      // Check if teacher is assigned to teach this (cId, sId, subId)
      const hasAssignment = assignedClasses.some(
        (ac) =>
          ac.classId === cId &&
          ac.sectionId === sId &&
          (ac.subjectId === subId || ac.isClassTeacher)
      );

      if (!hasAssignment) continue;

      const totalStudents = studentCountMap.get(`${cId}_${sId}`) || 0;
      const statsKey = `${eId}_${cId}_${sId}_${subId}`;
      const stats = statsMap.get(statsKey) || { enteredCount: 0, publishedCount: 0, totalResults: 0 };

      const isExamPublished = examDoc.status === "PUBLISHED";
      const isResultsPublished = stats.publishedCount > 0 && stats.publishedCount >= totalStudents;
      const isLocked = isExamPublished || isResultsPublished;

      let marksStatus: "PENDING" | "COMPLETED" | "PUBLISHED" = "PENDING";
      if (isLocked) {
        marksStatus = "PUBLISHED";
        publishedCountTotal++;
      } else if (stats.enteredCount > 0 && stats.enteredCount >= totalStudents) {
        marksStatus = "COMPLETED";
        completedCount++;
      } else {
        marksStatus = "PENDING";
        pendingCount++;
      }

      // Filter by status if specified
      if (statusParam !== "ALL" && marksStatus !== statusParam) {
        continue;
      }

      const sectionInfo = sectionsMap.get(sId);

      scheduleItems.push({
        examScheduleId: `${eId}_${es._id}_${cId}_${sId}`,
        examId: eId,
        examName: examDoc.name,
        examDescription: examDoc.description || "",
        examStatus: examDoc.status,
        startDate: examDoc.startDate,
        endDate: examDoc.endDate,
        academicYearId: (examDoc.academicYearId as any)?._id?.toString() || examDoc.academicYearId?.toString(),
        academicYearName: (examDoc.academicYearId as any)?.name || "",
        examSubjectId: es._id.toString(),
        classId: cId,
        className: (es.classId as any)?.name || "Class",
        sectionId: sId,
        sectionName: sectionInfo?.sectionName || "Section",
        subjectId: subId,
        subjectName: (es.subjectId as any)?.name || "Subject",
        subjectCode: (es.subjectId as any)?.code || "",
        examDate: es.examDate || null,
        maximumMarks: es.maximumMarks,
        passingMarks: es.passingMarks,
        totalStudents,
        enteredCount: stats.enteredCount,
        marksStatus,
        isLocked,
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      exams: scheduleItems,
      summary: {
        totalSchedules: scheduleItems.length,
        pendingEntry: pendingCount,
        completedEntry: completedCount,
        publishedResults: publishedCountTotal,
      },
      filterOptions,
    },
  });
}
