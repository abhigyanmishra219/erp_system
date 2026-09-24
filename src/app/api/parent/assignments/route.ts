import { NextRequest, NextResponse } from "next/server";
import { requireParent } from "@/lib/auth/requireParent";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import Student from "@/models/Student";
import AcademicYear from "@/models/AcademicYear";
import Subject from "@/models/Subject";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

    const subCheck = requireModule(auth.context.school, "ASSIGNMENTS");
    if (!subCheck.allowed) return subCheck.response!;

    const { school, schoolId, linkedChildren, childIds } = auth.context;

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
    const filterSubjectId = searchParams.get("subjectId");
    const filterStatus = searchParams.get("status"); // "ALL", "PENDING", "SUBMITTED", "LATE", "REVIEWED", "OVERDUE"

    // 1. Resolve Target Student ID
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

    // 2. Fetch Selected Student Document
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

    const guardianLink = linkedChildren.find((c) => c.studentId === activeStudentId);

    const targetClassId = (studentDoc.classId as any)?._id || studentDoc.classId;
    const targetSectionId = (studentDoc.sectionId as any)?._id || studentDoc.sectionId;
    let targetYearId = (studentDoc.academicYearId as any)?._id || studentDoc.academicYearId;

    if (requestedYearId) {
      const validYear = await AcademicYear.findOne({
        _id: requestedYearId,
        schoolId,
      }).lean();
      if (validYear) targetYearId = validYear._id;
    }

    // 3. Query Assignments for this child's Class & Section
    const assignmentQuery: Record<string, any> = {
      schoolId,
      status: "PUBLISHED",
      isActive: true,
      ...(targetClassId ? { classId: targetClassId } : {}),
      ...(targetSectionId ? { sectionId: targetSectionId } : {}),
      ...(targetYearId ? { academicYearId: targetYearId } : {}),
    };

    if (filterSubjectId && filterSubjectId !== "ALL") {
      assignmentQuery.subjectId = filterSubjectId;
    }

    const assignmentsDocs = await Assignment.find(assignmentQuery)
      .populate("subjectId", "name code type")
      .populate("teacherId", "firstName lastName email")
      .populate("academicYearId", "name status")
      .sort({ dueDate: 1 })
      .lean();

    const assignmentIds = assignmentsDocs.map((a: any) => a._id);

    // 4. Query student's submissions for these assignments
    const submissionsDocs = await AssignmentSubmission.find({
      schoolId,
      studentId: activeStudentId,
      assignmentId: { $in: assignmentIds },
    }).lean();

    const submissionMap = new Map<string, any>();
    submissionsDocs.forEach((sub: any) => {
      submissionMap.set(sub.assignmentId.toString(), sub);
    });

    const now = new Date();

    // 5. Map assignments with calculated submission status
    let allMappedAssignments = assignmentsDocs.map((a: any) => {
      const sub = submissionMap.get(a._id.toString());
      const isPastDue = now > new Date(a.dueDate);

      let calculatedStatus: "PENDING" | "SUBMITTED" | "LATE" | "REVIEWED" | "OVERDUE" = "PENDING";
      if (sub) {
        calculatedStatus = sub.status === "GRADED" ? "REVIEWED" : sub.status;
      } else if (isPastDue) {
        calculatedStatus = "OVERDUE";
      }

      return {
        _id: a._id.toString(),
        title: a.title,
        description: a.description || "",
        subject: {
          _id: a.subjectId?._id?.toString() || a.subjectId?.toString() || "",
          name: a.subjectId?.name || "Subject",
          code: a.subjectId?.code || "",
          type: a.subjectId?.type || "THEORY",
        },
        teacher: a.teacherId
          ? {
              _id: a.teacherId._id?.toString() || a.teacherId.toString(),
              name: `${a.teacherId.firstName || ""} ${a.teacherId.lastName || ""}`.trim() || "Faculty",
              email: a.teacherId.email || "",
            }
          : null,
        assignedDate: a.assignedDate,
        dueDate: a.dueDate,
        maximumMarks: a.maximumMarks ?? null,
        attachments: a.attachments || [],
        attachmentCount: a.attachments?.length || 0,
        isOverdue: isPastDue && (!sub || sub.status === "PENDING"),
        submission: sub
          ? {
              _id: sub._id.toString(),
              status: sub.status,
              submittedAt: sub.submittedAt,
              content: sub.content || "",
              attachments: sub.attachments || [],
              marks: sub.marks ?? null,
              feedback: sub.feedback || "",
              reviewedAt: sub.reviewedAt || null,
            }
          : null,
        submissionStatus: calculatedStatus,
      };
    });

    // Extract available subjects for filters
    const subjectMap = new Map<string, { _id: string; name: string; code: string }>();
    allMappedAssignments.forEach((a) => {
      if (a.subject._id && !subjectMap.has(a.subject._id)) {
        subjectMap.set(a.subject._id, {
          _id: a.subject._id,
          name: a.subject.name,
          code: a.subject.code,
        });
      }
    });
    const availableSubjects = Array.from(subjectMap.values());

    // Summary metrics before filtering
    const totalCount = allMappedAssignments.length;
    const submittedCount = allMappedAssignments.filter((a) => a.submissionStatus === "SUBMITTED" || a.submissionStatus === "LATE").length;
    const reviewedCount = allMappedAssignments.filter((a) => a.submissionStatus === "REVIEWED").length;
    const overdueCount = allMappedAssignments.filter((a) => a.submissionStatus === "OVERDUE").length;
    const pendingCount = allMappedAssignments.filter((a) => a.submissionStatus === "PENDING").length;

    // Apply status filter if specified
    let filteredAssignments = allMappedAssignments;
    if (filterStatus && filterStatus !== "ALL") {
      filteredAssignments = filteredAssignments.filter((a) => a.submissionStatus === filterStatus.toUpperCase());
    }

    return NextResponse.json({
      success: true,
      hasChildren: true,
      selectedStudentId: activeStudentId,
      data: {
        student: {
          _id: studentDoc._id.toString(),
          studentId: studentDoc.studentId || "",
          admissionNumber: studentDoc.admissionNumber,
          rollNumber: studentDoc.rollNumber || "",
          firstName: studentDoc.firstName,
          lastName: studentDoc.lastName,
          fullName: `${studentDoc.firstName} ${studentDoc.lastName}`.trim(),
          avatarUrl: studentDoc.avatarUrl || "",
          gender: studentDoc.gender,
          relationship: guardianLink?.relationship || "Guardian",
          class: {
            _id: targetClassId ? targetClassId.toString() : "",
            name: (studentDoc.classId as any)?.name || "N/A",
            code: (studentDoc.classId as any)?.code || "",
          },
          section: {
            _id: targetSectionId ? targetSectionId.toString() : "",
            name: (studentDoc.sectionId as any)?.name || "N/A",
          },
        },
        summary: {
          total: totalCount,
          pending: pendingCount,
          submitted: submittedCount,
          reviewed: reviewedCount,
          overdue: overdueCount,
        },
        availableSubjects,
        assignments: filteredAssignments,
      },
    });
  } catch (error: any) {
    console.error("Error fetching parent assignments:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch parent assignments",
      },
      { status: 500 }
    );
  }
}

// Read-Only Protection
export async function POST() {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed. Assignment creation or submission is not permitted for Parent role." },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed. Assignment modifications are not permitted for Parent role." },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed. Assignment modifications are not permitted for Parent role." },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed. Assignment deletions are not permitted for Parent role." },
    { status: 405 }
  );
}
