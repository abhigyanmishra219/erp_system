import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/auth/requireStudent";
import connectToDatabase from "@/lib/db";
import TimetableEntry from "@/models/TimetableEntry";
import Attendance from "@/models/Attendance";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import Exam from "@/models/Exam";
import ExamTarget from "@/models/ExamTarget";
import ExamSubject from "@/models/ExamSubject";
import ExamResult from "@/models/ExamResult";
import Notice from "@/models/Notice";
import Notification from "@/models/Notification";
import Class from "@/models/Class";
import Section from "@/models/Section";
import AcademicYear from "@/models/AcademicYear";
import Subject from "@/models/Subject";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireStudent(req);
    if (!auth.success) return auth.response;

    const { user, student, school, schoolId, classId, sectionId, academicYearId } = auth.context;

    await connectToDatabase();

    const studentId = student._id;
    const targetClassId = classId || (student.classId as any)?._id || student.classId;
    const targetSectionId = sectionId || (student.sectionId as any)?._id || student.sectionId;
    const targetAcademicYearId = academicYearId || (student.academicYearId as any)?._id || student.academicYearId;

    // 1. Resolve Academic Context Details (Class, Section, Academic Year)
    const [classDoc, sectionDoc, academicYearDoc] = await Promise.all([
      Class.findById(targetClassId).select("name code").lean(),
      Section.findById(targetSectionId).select("name capacity").lean(),
      AcademicYear.findById(targetAcademicYearId).select("name startDate endDate status").lean(),
    ]);

    const profileSummary = {
      _id: student._id.toString(),
      studentId: student.studentId || "",
      admissionNumber: student.admissionNumber,
      rollNumber: student.rollNumber || "",
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: `${student.firstName} ${student.lastName}`.trim(),
      email: student.email || user.email,
      phone: student.phone || "",
      gender: student.gender,
      dateOfBirth: student.dateOfBirth,
      bloodGroup: student.bloodGroup || "",
      avatarUrl: student.avatarUrl || "",
      status: student.status,
      class: {
        _id: targetClassId ? targetClassId.toString() : "",
        name: classDoc?.name || (student.classId as any)?.name || "N/A",
        code: classDoc?.code || (student.classId as any)?.code || "",
      },
      section: {
        _id: targetSectionId ? targetSectionId.toString() : "",
        name: sectionDoc?.name || (student.sectionId as any)?.name || "N/A",
      },
      academicYear: {
        _id: targetAcademicYearId ? targetAcademicYearId.toString() : "",
        name: academicYearDoc?.name || (student.academicYearId as any)?.name || "N/A",
      },
      school: {
        _id: school._id.toString(),
        name: school.name,
        logo: school.logo || "",
      },
    };

    // 2. Today's Timetable
    const daysMap = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;
    const todayDate = new Date();
    const todayDayOfWeek = daysMap[todayDate.getDay()];

    const timetableEntries = await TimetableEntry.find({
      schoolId,
      academicYearId: targetAcademicYearId,
      classId: targetClassId,
      sectionId: targetSectionId,
      dayOfWeek: todayDayOfWeek,
      isActive: true,
    })
      .populate("subjectId", "name code type")
      .populate("teacherId", "firstName lastName")
      .sort({ startTime: 1 })
      .lean();

    const todayTimetable = timetableEntries.map((entry: any) => ({
      _id: entry._id.toString(),
      subjectName: entry.subjectId?.name || "Subject",
      subjectCode: entry.subjectId?.code || "",
      teacherName: entry.teacherId ? `${entry.teacherId.firstName} ${entry.teacherId.lastName}`.trim() : "Faculty",
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room || "",
    }));

    // 3. Attendance Summary
    const attendanceRecords = await Attendance.find({
      schoolId,
      studentId,
      academicYearId: targetAcademicYearId,
    })
      .sort({ date: -1 })
      .lean();

    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;

    attendanceRecords.forEach((rec: any) => {
      if (rec.status === "PRESENT") presentCount++;
      else if (rec.status === "ABSENT") absentCount++;
      else if (rec.status === "LATE") lateCount++;
      else if (rec.status === "LEAVE") leaveCount++;
    });

    const totalAttendanceDays = attendanceRecords.length;
    const attendancePercentage =
      totalAttendanceDays > 0
        ? Math.round(((presentCount + lateCount) / totalAttendanceDays) * 100)
        : 0;

    const recentAttendance = attendanceRecords.slice(0, 7).map((rec: any) => ({
      _id: rec._id.toString(),
      date: rec.date,
      status: rec.status,
      remarks: rec.remarks || "",
    }));

    // 4. Active Assignments (Scoped to Class + Section)
    const activeAssignmentsDocs = await Assignment.find({
      schoolId,
      classId: targetClassId,
      sectionId: targetSectionId,
      status: "PUBLISHED",
      isActive: true,
    })
      .populate("subjectId", "name code")
      .populate("teacherId", "firstName lastName")
      .sort({ dueDate: 1 })
      .lean();

    const assignmentIds = activeAssignmentsDocs.map((a: any) => a._id);

    // Fetch submissions for this student
    const studentSubmissions = await AssignmentSubmission.find({
      schoolId,
      studentId,
      assignmentId: { $in: assignmentIds },
    }).lean();

    const submissionMap = new Map<string, any>();
    studentSubmissions.forEach((sub: any) => {
      submissionMap.set(sub.assignmentId.toString(), sub);
    });

    const assignments = activeAssignmentsDocs.map((a: any) => {
      const sub = submissionMap.get(a._id.toString());
      return {
        _id: a._id.toString(),
        title: a.title,
        description: a.description,
        subjectName: a.subjectId?.name || "Subject",
        subjectCode: a.subjectId?.code || "",
        teacherName: a.teacherId ? `${a.teacherId.firstName} ${a.teacherId.lastName}`.trim() : "Teacher",
        assignedDate: a.assignedDate,
        dueDate: a.dueDate,
        maximumMarks: a.maximumMarks ?? null,
        attachmentCount: a.attachments?.length || 0,
        submissionStatus: sub ? sub.status : "PENDING",
        submittedAt: sub?.submittedAt || null,
        marksAwarded: sub?.marks ?? null,
        feedback: sub?.feedback || null,
      };
    });

    // 5. Upcoming Exams (Scoped to Class + Section via ExamTarget)
    const examTargets = await ExamTarget.find({
      schoolId,
      classId: targetClassId,
      sectionId: targetSectionId,
      isActive: true,
    }).lean();

    const examIds = examTargets.map((t: any) => t.examId);

    const upcomingExamsDocs = await Exam.find({
      _id: { $in: examIds },
      schoolId,
      status: { $in: ["SCHEDULED", "ONGOING"] },
      isActive: true,
    })
      .sort({ startDate: 1 })
      .lean();

    // Fetch subjects for upcoming exams
    const examSubjectDocs = await ExamSubject.find({
      examId: { $in: upcomingExamsDocs.map((e: any) => e._id) },
      classId: targetClassId,
      isActive: true,
    })
      .populate("subjectId", "name code")
      .sort({ examDate: 1 })
      .lean();

    const examSubjectMap = new Map<string, any[]>();
    examSubjectDocs.forEach((es: any) => {
      const examKey = es.examId.toString();
      if (!examSubjectMap.has(examKey)) {
        examSubjectMap.set(examKey, []);
      }
      examSubjectMap.get(examKey)!.push({
        _id: es._id.toString(),
        subjectName: es.subjectId?.name || "Subject",
        subjectCode: es.subjectId?.code || "",
        examDate: es.examDate || null,
        maximumMarks: es.maximumMarks,
        passingMarks: es.passingMarks,
      });
    });

    const upcomingExams = upcomingExamsDocs.map((e: any) => ({
      _id: e._id.toString(),
      name: e.name,
      description: e.description || "",
      startDate: e.startDate,
      endDate: e.endDate,
      status: e.status,
      subjects: examSubjectMap.get(e._id.toString()) || [],
    }));

    // 6. Recent Published Results
    const publishedResultsDocs = await ExamResult.find({
      schoolId,
      studentId,
      status: "PUBLISHED",
    })
      .populate("examId", "name startDate endDate")
      .populate("subjectId", "name code")
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(10)
      .lean();

    const recentResults = publishedResultsDocs.map((r: any) => ({
      _id: r._id.toString(),
      examName: r.examId?.name || "Exam",
      subjectName: r.subjectId?.name || "Subject",
      subjectCode: r.subjectId?.code || "",
      marks: r.marks,
      grade: r.grade,
      isPassed: r.isPassed,
      remarks: r.remarks || "",
      publishedAt: r.publishedAt || r.updatedAt,
    }));

    // 7. Recent Notices
    const recentNoticesDocs = await Notice.find({
      schoolId,
      status: "PUBLISHED",
      isActive: true,
      $or: [
        { targetType: "SCHOOL" },
        { targetType: "STUDENTS" },
        { targetRoles: "STUDENT" },
        { targetType: "CLASS", targetClassId: targetClassId },
        { targetType: "SECTION", targetClassId: targetClassId, targetSectionId: targetSectionId },
      ],
    })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(5)
      .lean();

    const recentNotices = recentNoticesDocs.map((n: any) => ({
      _id: n._id.toString(),
      title: n.title,
      description: n.description,
      targetType: n.targetType,
      publishedAt: n.publishedAt || n.createdAt,
      attachmentCount: n.attachments?.length || 0,
    }));

    // 8. Important Notifications
    const [notificationDocs, unreadCount] = await Promise.all([
      Notification.find({
        schoolId,
        recipientUserId: user._id,
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Notification.countDocuments({
        schoolId,
        recipientUserId: user._id,
        isRead: false,
      }),
    ]);

    const recentNotifications = notificationDocs.map((notif: any) => ({
      _id: notif._id.toString(),
      title: notif.title,
      message: notif.message,
      type: notif.type,
      actionUrl: notif.actionUrl || null,
      isRead: notif.isRead,
      createdAt: notif.createdAt,
    }));

    return NextResponse.json({
      success: true,
      data: {
        profileSummary,
        todayTimetable,
        todayDayOfWeek,
        attendance: {
          summary: {
            totalDays: totalAttendanceDays,
            present: presentCount,
            absent: absentCount,
            late: lateCount,
            leave: leaveCount,
            percentage: attendancePercentage,
          },
          recent: recentAttendance,
        },
        assignments: {
          total: assignments.length,
          pending: assignments.filter((a) => a.submissionStatus === "PENDING").length,
          submitted: assignments.filter((a) => a.submissionStatus !== "PENDING").length,
          list: assignments,
        },
        upcomingExams,
        recentResults,
        recentNotices,
        notifications: {
          unreadCount,
          list: recentNotifications,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching student dashboard:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch student dashboard",
      },
      { status: 500 }
    );
  }
}
