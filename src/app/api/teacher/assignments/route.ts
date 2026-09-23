import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import { getTeacherScope, verifyTeacherSubjectScope } from "@/lib/auth/teacherScope";
import connectToDatabase from "@/lib/db";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import { createAuditLog } from "@/lib/audit";
import { createAssignmentSchema } from "@/lib/validation/assignment";

export async function GET(req: NextRequest) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { teacher, schoolId } = auth.context;
  const teacherIdStr = teacher._id.toString();

  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const classIdParam = searchParams.get("classId") || "";
  const sectionIdParam = searchParams.get("sectionId") || "";
  const subjectIdParam = searchParams.get("subjectId") || "";
  const statusParam = searchParams.get("status") || "ALL";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

  // 1. Get Teacher Scope
  const scope = await getTeacherScope({
    schoolId,
    teacherId: teacherIdStr,
  });

  const { assignedClasses } = scope;

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
    assignedAllocations: assignedClasses,
  };

  // 2. Build Query
  const query: Record<string, any> = {
    schoolId,
    teacherId: teacher._id,
    isActive: true,
  };

  if (classIdParam) query.classId = classIdParam;
  if (sectionIdParam) query.sectionId = sectionIdParam;
  if (subjectIdParam) query.subjectId = subjectIdParam;
  if (statusParam && statusParam !== "ALL") query.status = statusParam;

  if (search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [{ title: regex }, { description: regex }];
  }

  // 3. Execute Query with pagination
  const [totalCount, assignments] = await Promise.all([
    Assignment.countDocuments(query),
    Assignment.find(query)
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .populate("subjectId", "name code")
      .populate("academicYearId", "name")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  // 4. Fetch live submission statistics for each assignment
  const assignmentIds = assignments.map((a) => a._id);
  const submissions = await AssignmentSubmission.find({
    schoolId,
    assignmentId: { $in: assignmentIds },
  }).lean();

  const submissionStatsMap = new Map<string, { total: number; reviewed: number; pending: number; late: number }>();
  submissions.forEach((sub: any) => {
    const asgnId = sub.assignmentId.toString();
    if (!submissionStatsMap.has(asgnId)) {
      submissionStatsMap.set(asgnId, { total: 0, reviewed: 0, pending: 0, late: 0 });
    }
    const stat = submissionStatsMap.get(asgnId)!;
    stat.total++;
    if (sub.status === "REVIEWED") stat.reviewed++;
    else if (sub.status === "LATE") stat.late++;
    else stat.pending++;
  });

  const formattedAssignments = assignments.map((a: any) => {
    const aId = a._id.toString();
    const stats = submissionStatsMap.get(aId) || { total: 0, reviewed: 0, pending: 0, late: 0 };

    return {
      _id: aId,
      title: a.title,
      description: a.description,
      classId: a.classId?._id?.toString() || a.classId?.toString(),
      className: a.classId?.name || "Class",
      sectionId: a.sectionId?._id?.toString() || a.sectionId?.toString(),
      sectionName: a.sectionId?.name || "Section",
      subjectId: a.subjectId?._id?.toString() || a.subjectId?.toString(),
      subjectName: a.subjectId?.name || "Subject",
      academicYearId: a.academicYearId?._id?.toString() || a.academicYearId?.toString(),
      academicYearName: a.academicYearId?.name || "",
      assignedDate: a.assignedDate,
      dueDate: a.dueDate,
      maximumMarks: a.maximumMarks,
      attachments: a.attachments || [],
      status: a.status,
      submissionsSummary: stats,
      createdAt: a.createdAt,
    };
  });

  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    success: true,
    data: {
      assignments: formattedAssignments,
      pagination: {
        totalCount,
        totalPages,
        currentPage: page,
        limit,
      },
      filterOptions,
    },
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { user, teacher, schoolId } = auth.context;
  const teacherIdStr = teacher._id.toString();

  try {
    const body = await req.json();
    const validatedData = createAssignmentSchema.parse(body);

    await connectToDatabase();

    // 1. Strictly Validate Teacher Assignment Scope for Class + Section + Subject
    const isAuthorized = await verifyTeacherSubjectScope({
      schoolId,
      teacherId: teacherIdStr,
      classId: validatedData.classId,
      sectionId: validatedData.sectionId,
      subjectId: validatedData.subjectId,
      academicYearId: validatedData.academicYearId,
    });

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: "Access Denied: You are not assigned to teach this subject in this class and section.",
        },
        { status: 403 }
      );
    }

    // 2. Validate Class, Section, Subject exist in School
    const [targetClass, targetSection, targetSubject] = await Promise.all([
      Class.findOne({ _id: validatedData.classId, schoolId }).lean(),
      Section.findOne({ _id: validatedData.sectionId, schoolId }).lean(),
      Subject.findOne({ _id: validatedData.subjectId, schoolId }).lean(),
    ]);

    if (!targetClass || !targetSection || !targetSubject) {
      return NextResponse.json(
        { success: false, error: "Invalid class, section, or subject selected." },
        { status: 400 }
      );
    }

    // 3. Create Assignment
    const newAssignment = await Assignment.create({
      schoolId,
      academicYearId: validatedData.academicYearId,
      classId: validatedData.classId,
      sectionId: validatedData.sectionId,
      subjectId: validatedData.subjectId,
      teacherId: teacher._id,
      title: validatedData.title,
      description: validatedData.description,
      assignedDate: new Date(validatedData.assignedDate),
      dueDate: new Date(validatedData.dueDate),
      maximumMarks: validatedData.maximumMarks ?? null,
      attachments: validatedData.attachments || [],
      status: validatedData.status || "PUBLISHED",
      isActive: true,
      createdBy: user.id,
      updatedBy: user.id,
    });

    // 4. Create Audit Log
    await createAuditLog({
      userId: user.id,
      userRole: "TEACHER",
      action: "ASSIGNMENT_CREATED",
      entityType: "ASSIGNMENT",
      entityId: newAssignment._id.toString(),
      schoolId,
      metadata: {
        title: newAssignment.title,
        classId: validatedData.classId,
        sectionId: validatedData.sectionId,
        subjectId: validatedData.subjectId,
        dueDate: validatedData.dueDate,
        maximumMarks: validatedData.maximumMarks,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Assignment created successfully.",
        data: newAssignment,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Create assignment error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Validation failed on assignment payload.", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create assignment." },
      { status: 500 }
    );
  }
}
