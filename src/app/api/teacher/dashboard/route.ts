import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import { getTeacherScope } from "@/lib/auth/teacherScope";
import connectToDatabase from "@/lib/db";
import AcademicYear from "@/models/AcademicYear";
import TimetableEntry from "@/models/TimetableEntry";
import Attendance from "@/models/Attendance";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import Exam from "@/models/Exam";
import ExamSubject from "@/models/ExamSubject";
import ExamTarget from "@/models/ExamTarget";
import Notice from "@/models/Notice";
import { normalizeAttendanceDate } from "@/lib/utils/date";

export async function GET(req: NextRequest) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { teacher, schoolId } = auth.context;
  const teacherIdStr = teacher._id.toString();

  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const requestedYearId = searchParams.get("academicYearId");

  // Resolve active academic year if not explicitly requested
  let activeYear = null;
  if (requestedYearId) {
    activeYear = await AcademicYear.findOne({
      _id: requestedYearId,
      schoolId,
    }).lean();
  }
  if (!activeYear) {
    activeYear = await AcademicYear.findOne({
      schoolId,
      status: "ACTIVE",
    }).lean();
  }

  const academicYearId = activeYear?._id?.toString();

  // 1. Resolve strict Teacher Scope
  const scope = await getTeacherScope({
    schoolId,
    teacherId: teacherIdStr,
    academicYearId,
  });

  const { classIds, sectionIds, subjectIds, assignedClasses } = scope;

  // 2. Resolve Today's Day of the Week & Timetable
  const daysMap = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;
  const todayDate = new Date();
  const todayDayOfWeek = daysMap[todayDate.getDay()];

  const timetableQuery: Record<string, any> = {
    schoolId,
    teacherId: teacher._id,
    dayOfWeek: todayDayOfWeek,
    isActive: true,
  };

  if (academicYearId) {
    timetableQuery.academicYearId = academicYearId;
  }

  const todayEntries = await TimetableEntry.find(timetableQuery)
    .populate("classId", "name code")
    .populate("sectionId", "name")
    .populate("subjectId", "name code")
    .sort({ startTime: 1 })
    .lean();

  const todayClasses = todayEntries.map((entry: any) => ({
    _id: entry._id.toString(),
    classId: entry.classId?._id?.toString() || entry.classId?.toString(),
    className: entry.classId?.name || "Class",
    sectionId: entry.sectionId?._id?.toString() || entry.sectionId?.toString(),
    sectionName: entry.sectionId?.name || "Section",
    subjectId: entry.subjectId?._id?.toString() || entry.subjectId?.toString(),
    subjectName: entry.subjectId?.name || "Subject",
    subjectCode: entry.subjectId?.code || "",
    startTime: entry.startTime,
    endTime: entry.endTime,
    room: entry.room || "",
  }));

  // 3. Resolve Assigned Subjects (Distinct)
  const assignedSubjectsMap = new Map<string, { subjectId: string; name: string; code?: string }>();
  assignedClasses.forEach((a) => {
    if (a.subjectId && a.subjectName) {
      if (!assignedSubjectsMap.has(a.subjectId)) {
        assignedSubjectsMap.set(a.subjectId, {
          subjectId: a.subjectId,
          name: a.subjectName,
        });
      }
    }
  });
  const assignedSubjects = Array.from(assignedSubjectsMap.values());

  // 4. Resolve Attendance Pending for Today
  const todayNormalized = normalizeAttendanceDate(todayDate);
  const distinctSectionsAssigned = new Map<string, { classId: string; className: string; sectionId: string; sectionName: string; isClassTeacher: boolean }>();

  assignedClasses.forEach((ac) => {
    if (ac.sectionId) {
      const existing = distinctSectionsAssigned.get(ac.sectionId);
      if (!existing || (!existing.isClassTeacher && ac.isClassTeacher)) {
        distinctSectionsAssigned.set(ac.sectionId, {
          classId: ac.classId,
          className: ac.className,
          sectionId: ac.sectionId,
          sectionName: ac.sectionName,
          isClassTeacher: ac.isClassTeacher,
        });
      }
    }
  });

  // Query sections where attendance was already submitted today
  const attendanceSectionsToday = await Attendance.distinct("sectionId", {
    schoolId,
    sectionId: { $in: Array.from(distinctSectionsAssigned.keys()) },
    date: todayNormalized,
  });

  const submittedSectionIds = new Set(attendanceSectionsToday.map((id) => id.toString()));

  const pendingAttendance: Array<{
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
    isClassTeacher: boolean;
  }> = [];

  distinctSectionsAssigned.forEach((sec, sId) => {
    if (!submittedSectionIds.has(sId)) {
      pendingAttendance.push(sec);
    }
  });

  // 5. Resolve Active Assignments & Submissions
  const assignmentQuery: Record<string, any> = {
    schoolId,
    teacherId: teacher._id,
    isActive: true,
  };

  if (academicYearId) {
    assignmentQuery.academicYearId = academicYearId;
  }

  const assignmentsList = await Assignment.find(assignmentQuery)
    .populate("classId", "name code")
    .populate("sectionId", "name")
    .populate("subjectId", "name code")
    .sort({ dueDate: 1 })
    .lean();

  const activeAssignmentsData = await Promise.all(
    assignmentsList.map(async (asgn: any) => {
      const asgnId = asgn._id.toString();
      const [totalSubmissions, pendingReviewSubmissions] = await Promise.all([
        AssignmentSubmission.countDocuments({ schoolId, assignmentId: asgnId }),
        AssignmentSubmission.countDocuments({
          schoolId,
          assignmentId: asgnId,
          status: { $in: ["SUBMITTED", "PENDING", "LATE"] },
        }),
      ]);

      return {
        _id: asgnId,
        title: asgn.title,
        description: asgn.description,
        classId: asgn.classId?._id?.toString() || asgn.classId?.toString(),
        className: asgn.classId?.name || "Class",
        sectionId: asgn.sectionId?._id?.toString() || asgn.sectionId?.toString(),
        sectionName: asgn.sectionId?.name || "Section",
        subjectId: asgn.subjectId?._id?.toString() || asgn.subjectId?.toString(),
        subjectName: asgn.subjectId?.name || "Subject",
        assignedDate: asgn.assignedDate,
        dueDate: asgn.dueDate,
        maximumMarks: asgn.maximumMarks,
        status: asgn.status,
        totalSubmissions,
        pendingReviewSubmissions,
      };
    })
  );

  const publishedAssignments = activeAssignmentsData.filter((a) => a.status === "PUBLISHED");
  const totalPendingSubmissions = activeAssignmentsData.reduce((acc, curr) => acc + curr.pendingReviewSubmissions, 0);

  // 6. Resolve Upcoming Exams for this Teacher's scope
  let upcomingExamsData: any[] = [];
  if (classIds.length > 0) {
    const examTargetQuery: Record<string, any> = {
      schoolId,
      classId: { $in: classIds },
      isActive: true,
    };
    if (academicYearId) {
      examTargetQuery.academicYearId = academicYearId;
    }

    const targetedExams = await ExamTarget.find(examTargetQuery).distinct("examId");

    if (targetedExams.length > 0) {
      const activeExams = await Exam.find({
        _id: { $in: targetedExams },
        schoolId,
        isActive: true,
        status: { $in: ["SCHEDULED", "ONGOING", "PUBLISHED"] },
        endDate: { $gte: todayNormalized },
      })
        .sort({ startDate: 1 })
        .lean();

      const activeExamIds = activeExams.map((e) => e._id);

      // Query exam subjects scoped to teacher's classes and subjects
      const examSubjectQuery: Record<string, any> = {
        schoolId,
        examId: { $in: activeExamIds },
        classId: { $in: classIds },
        isActive: true,
      };

      if (subjectIds.length > 0) {
        examSubjectQuery.subjectId = { $in: subjectIds };
      }

      const examSubjects = await ExamSubject.find(examSubjectQuery)
        .populate("examId", "name description startDate endDate status")
        .populate("classId", "name code")
        .populate("subjectId", "name code")
        .sort({ examDate: 1, startDate: 1 })
        .lean();

      upcomingExamsData = examSubjects.map((es: any) => ({
        _id: es._id.toString(),
        examId: es.examId?._id?.toString() || es.examId?.toString(),
        examName: es.examId?.name || "Exam",
        classId: es.classId?._id?.toString() || es.classId?.toString(),
        className: es.classId?.name || "Class",
        subjectId: es.subjectId?._id?.toString() || es.subjectId?.toString(),
        subjectName: es.subjectId?.name || "Subject",
        examDate: es.examDate || es.examId?.startDate,
        maximumMarks: es.maximumMarks,
        passingMarks: es.passingMarks,
        examStatus: es.examId?.status || "SCHEDULED",
      }));
    }
  }

  // 7. Resolve Scoped Notices
  const noticeConditions: any[] = [
    { targetType: "SCHOOL" },
    { targetType: "TEACHERS" },
    { targetRoles: "TEACHER" },
  ];

  if (classIds.length > 0) {
    noticeConditions.push({
      targetType: "CLASS",
      targetClassId: { $in: classIds },
    });
  }

  if (sectionIds.length > 0) {
    noticeConditions.push({
      targetType: "SECTION",
      targetSectionId: { $in: sectionIds },
    });
  }

  const notices = await Notice.find({
    schoolId,
    isActive: true,
    status: "PUBLISHED",
    $or: noticeConditions,
  })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(6)
    .lean();

  const recentNotices = notices.map((n: any) => ({
    _id: n._id.toString(),
    title: n.title,
    description: n.description,
    targetType: n.targetType,
    publishedAt: n.publishedAt || n.createdAt,
    attachmentsCount: n.attachments?.length || 0,
  }));

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        assignedClassesCount: Array.from(new Set(assignedClasses.map((c) => c.classId))).length,
        assignedSectionsCount: distinctSectionsAssigned.size,
        assignedSubjectsCount: assignedSubjects.length,
        todayClassesCount: todayClasses.length,
        pendingAttendanceCount: pendingAttendance.length,
        activeAssignmentsCount: publishedAssignments.length,
        pendingSubmissionsCount: totalPendingSubmissions,
        upcomingExamsCount: upcomingExamsData.length,
      },
      academicYear: activeYear
        ? {
            _id: activeYear._id.toString(),
            name: activeYear.name,
            status: activeYear.status,
          }
        : null,
      todayDayOfWeek,
      todayClasses,
      assignedClasses,
      assignedSubjects,
      pendingAttendance,
      activeAssignments: publishedAssignments.slice(0, 6),
      upcomingExams: upcomingExamsData.slice(0, 6),
      recentNotices,
    },
  });
}
