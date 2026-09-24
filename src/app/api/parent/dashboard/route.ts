import { NextRequest, NextResponse } from "next/server";
import { requireParent } from "@/lib/auth/requireParent";
import connectToDatabase from "@/lib/db";
import Student from "@/models/Student";
import Class from "@/models/Class";
import Section from "@/models/Section";
import AcademicYear from "@/models/AcademicYear";
import TimetableEntry from "@/models/TimetableEntry";
import Attendance from "@/models/Attendance";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import Exam from "@/models/Exam";
import ExamTarget from "@/models/ExamTarget";
import ExamSubject from "@/models/ExamSubject";
import ExamResult from "@/models/ExamResult";
import StudentFeeAccount from "@/models/StudentFeeAccount";
import StudentFeeAssignment from "@/models/StudentFeeAssignment";
import Notice from "@/models/Notice";
import Notification from "@/models/Notification";
import { FeeAccountCalculationService } from "@/lib/services/feeAccountCalculationService";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

    const { user, school, schoolId, linkedChildren, childIds } = auth.context;

    // Handle case where parent has 0 linked children
    if (!childIds || childIds.length === 0) {
      return NextResponse.json({
        success: true,
        hasChildren: false,
        message: "No linked children found for this parent account.",
        data: null,
      });
    }

    await connectToDatabase();

    // 1. Resolve Target Student ID
    const requestedStudentId = req.nextUrl.searchParams.get("studentId");
    let activeStudentId = childIds[0];

    if (requestedStudentId) {
      // Strict Security Check: Verify requested studentId is in parent's linked children list
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

    // 2. Fetch Selected Student Record
    const studentDoc = await Student.findOne({
      _id: activeStudentId,
      schoolId,
    })
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .populate("academicYearId", "name status")
      .lean();

    if (!studentDoc) {
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

    const targetClassId = (studentDoc.classId as any)?._id || studentDoc.classId;
    const targetSectionId = (studentDoc.sectionId as any)?._id || studentDoc.sectionId;
    const targetAcademicYearId = (studentDoc.academicYearId as any)?._id || studentDoc.academicYearId;

    const guardianLink = linkedChildren.find((c) => c.studentId === activeStudentId);

    // Profile summary
    const profileSummary = {
      _id: studentDoc._id.toString(),
      studentId: studentDoc.studentId || "",
      admissionNumber: studentDoc.admissionNumber,
      rollNumber: studentDoc.rollNumber || "",
      firstName: studentDoc.firstName,
      lastName: studentDoc.lastName,
      fullName: `${studentDoc.firstName} ${studentDoc.lastName}`.trim(),
      email: studentDoc.email || "",
      phone: studentDoc.phone || "",
      gender: studentDoc.gender,
      dateOfBirth: studentDoc.dateOfBirth,
      bloodGroup: studentDoc.bloodGroup || "",
      avatarUrl: studentDoc.avatarUrl || "",
      status: studentDoc.status,
      class: {
        _id: targetClassId ? targetClassId.toString() : "",
        name: (studentDoc.classId as any)?.name || "N/A",
        code: (studentDoc.classId as any)?.code || "",
      },
      section: {
        _id: targetSectionId ? targetSectionId.toString() : "",
        name: (studentDoc.sectionId as any)?.name || "N/A",
      },
      academicYear: {
        _id: targetAcademicYearId ? targetAcademicYearId.toString() : "",
        name: (studentDoc.academicYearId as any)?.name || "N/A",
      },
      guardianRelation: {
        relationship: guardianLink?.relationship || "Guardian",
        isPrimaryGuardian: guardianLink?.isPrimaryGuardian ?? false,
        isEmergencyContact: guardianLink?.isEmergencyContact ?? false,
        canPickup: guardianLink?.canPickup ?? true,
      },
      school: {
        _id: school._id.toString(),
        name: school.name,
        logo: school.logo || "",
      },
    };

    // 3. Attendance Summary
    const attendanceRecords = await Attendance.find({
      schoolId,
      studentId: activeStudentId,
      ...(targetAcademicYearId ? { academicYearId: targetAcademicYearId } : {}),
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

    // 4. Assignments for this student's class & section
    const activeAssignmentsDocs = targetClassId
      ? await Assignment.find({
          schoolId,
          classId: targetClassId,
          sectionId: targetSectionId,
          status: "PUBLISHED",
          isActive: true,
        })
          .populate("subjectId", "name code")
          .populate("teacherId", "firstName lastName")
          .sort({ dueDate: 1 })
          .limit(10)
          .lean()
      : [];

    const assignmentIds = activeAssignmentsDocs.map((a: any) => a._id);

    const studentSubmissions = await AssignmentSubmission.find({
      schoolId,
      studentId: activeStudentId,
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
        teacherName: a.teacherId
          ? `${a.teacherId.firstName} ${a.teacherId.lastName}`.trim()
          : "Faculty",
        assignedDate: a.assignedDate,
        dueDate: a.dueDate,
        maximumMarks: a.maximumMarks ?? null,
        submissionStatus: sub ? sub.status : "PENDING",
        submittedAt: sub?.submittedAt || null,
        marksAwarded: sub?.marks ?? null,
      };
    });

    // 5. Upcoming Examinations
    let upcomingExams: any[] = [];
    if (targetClassId) {
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
        .limit(5)
        .lean();

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

      upcomingExams = upcomingExamsDocs.map((e: any) => ({
        _id: e._id.toString(),
        name: e.name,
        description: e.description || "",
        startDate: e.startDate,
        endDate: e.endDate,
        status: e.status,
        subjects: examSubjectMap.get(e._id.toString()) || [],
      }));
    }

    // 6. Recent Published Results
    const publishedResultsDocs = await ExamResult.find({
      schoolId,
      studentId: activeStudentId,
      status: "PUBLISHED",
    })
      .populate("examId", "name startDate endDate")
      .populate("subjectId", "name code")
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(6)
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

    // 7. Fee Summary (with School feature check)
    const isFeeEnabled = Array.isArray(school.enabledModules) && school.enabledModules.includes("FEES");
    let feeSummary = null;

    if (isFeeEnabled) {
      if (targetAcademicYearId) {
        try {
          const hasAssignments = await StudentFeeAssignment.exists({
            schoolId,
            studentId: activeStudentId,
            status: "ACTIVE",
          });
          if (hasAssignments) {
            await FeeAccountCalculationService.recalculateStudentFeeAccount(
              schoolId,
              targetAcademicYearId.toString(),
              activeStudentId
            );
          }
        } catch (calcErr) {
          console.warn("Fee account recalculation warning:", calcErr);
        }
      }

      let feeAccount = null;
      if (targetAcademicYearId) {
        feeAccount = await StudentFeeAccount.findOne({
          schoolId,
          studentId: activeStudentId,
          academicYearId: targetAcademicYearId,
        }).lean();
      }

      if (!feeAccount) {
        feeAccount = await StudentFeeAccount.findOne({
          schoolId,
          studentId: activeStudentId,
        })
          .sort({ updatedAt: -1 })
          .lean();
      }

      feeSummary = {
        isEnabled: true,
        totalFee: feeAccount?.totalFee ?? 0,
        paidAmount: feeAccount?.paidAmount ?? 0,
        pendingAmount: feeAccount?.pendingAmount ?? 0,
        nextDueAmount: feeAccount?.nextDueAmount ?? 0,
        nextDueDate: feeAccount?.nextDueDate ?? null,
        status: feeAccount?.status ?? "PAID",
      };
    } else {
      feeSummary = {
        isEnabled: false,
        totalFee: 0,
        paidAmount: 0,
        pendingAmount: 0,
        nextDueAmount: 0,
        nextDueDate: null,
        status: "N/A",
      };
    }

    // 8. Today's Timetable
    const daysMap = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;
    const todayDate = new Date();
    const todayDayOfWeek = daysMap[todayDate.getDay()];

    const timetableEntries = targetClassId
      ? await TimetableEntry.find({
          schoolId,
          classId: targetClassId,
          sectionId: targetSectionId,
          dayOfWeek: todayDayOfWeek,
          isActive: true,
        })
          .populate("subjectId", "name code type")
          .populate("teacherId", "firstName lastName")
          .sort({ startTime: 1 })
          .lean()
      : [];

    const todayTimetable = timetableEntries.map((entry: any) => ({
      _id: entry._id.toString(),
      subjectName: entry.subjectId?.name || "Subject",
      subjectCode: entry.subjectId?.code || "",
      teacherName: entry.teacherId
        ? `${entry.teacherId.firstName} ${entry.teacherId.lastName}`.trim()
        : "Faculty",
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room || "",
    }));

    // 9. Recent Notices (School-wide or targeted to Parents/Class)
    const noticeFilter: any = {
      schoolId,
      status: "PUBLISHED",
      isActive: true,
      $or: [
        { targetType: "SCHOOL" },
        { targetType: "PARENTS" },
        { targetRoles: "PARENT" },
        ...(targetClassId ? [{ targetType: "CLASS", targetClassId }] : []),
        ...(targetClassId && targetSectionId
          ? [{ targetType: "SECTION", targetClassId, targetSectionId }]
          : []),
      ],
    };

    const recentNoticesDocs = await Notice.find(noticeFilter)
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

    // 10. Important Notifications
    const [notificationDocs, unreadCount] = await Promise.all([
      Notification.find({
        schoolId,
        recipientUserId: user.id,
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
      Notification.countDocuments({
        schoolId,
        recipientUserId: user.id,
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
      hasChildren: true,
      selectedStudentId: activeStudentId,
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
        feeSummary,
        recentNotices,
        notifications: {
          unreadCount,
          list: recentNotifications,
        },
      },
    });
  } catch (error: any) {
    console.error("Error fetching parent dashboard data:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch parent dashboard data",
      },
      { status: 500 }
    );
  }
}
