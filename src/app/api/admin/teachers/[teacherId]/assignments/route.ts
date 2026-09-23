import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Teacher from "@/models/Teacher";
import Assignment from "@/models/Assignment";
import StudyMaterial from "@/models/StudyMaterial";
import AssignmentSubmission from "@/models/AssignmentSubmission";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { teacherId } = await params;

  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid teacher ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const teacher = await Teacher.findOne({ _id: teacherId, schoolId }).lean();
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: { code: "TEACHER_NOT_FOUND", message: "Teacher not found." } },
        { status: 404 }
      );
    }

    const [assignments, materials, totalAssignmentsCreated, totalStudyMaterialsCreated, allTeacherAssignments] = await Promise.all([
      Assignment.find({ schoolId, teacherId: teacher._id, isActive: true })
        .populate("classId", "name code")
        .populate("sectionId", "name")
        .populate("subjectId", "name code")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      StudyMaterial.find({ schoolId, teacherId: teacher._id, isActive: true })
        .populate("classId", "name code")
        .populate("subjectId", "name code")
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
      Assignment.countDocuments({ schoolId, teacherId: teacher._id, isActive: true }),
      StudyMaterial.countDocuments({ schoolId, teacherId: teacher._id, isActive: true }),
      Assignment.find({ schoolId, teacherId: teacher._id }, { _id: 1 }).lean(),
    ]);

    const teacherAssignmentIds = allTeacherAssignments.map((a: any) => a._id);

    // Calculate submission counts for this teacher's assignments
    let totalSubmissionsReceived = 0;
    let totalReviewedSubmissions = 0;
    let pendingReviewCount = 0;
    const submissionCountByAssignment = new Map<string, number>();

    if (teacherAssignmentIds.length > 0) {
      const [submissionAggregate, perAssignmentCounts] = await Promise.all([
        AssignmentSubmission.aggregate([
          {
            $match: {
              schoolId: new mongoose.Types.ObjectId(schoolId.toString()),
              assignmentId: { $in: teacherAssignmentIds },
            },
          },
          {
            $group: {
              _id: null,
              totalSubmissionsReceived: { $sum: 1 },
              totalReviewedSubmissions: {
                $sum: { $cond: [{ $eq: ["$status", "REVIEWED"] }, 1, 0] },
              },
              pendingReviewCount: {
                $sum: { $cond: [{ $in: ["$status", ["SUBMITTED", "LATE", "PENDING"]] }, 1, 0] },
              },
            },
          },
        ]),
        AssignmentSubmission.aggregate([
          {
            $match: {
              schoolId: new mongoose.Types.ObjectId(schoolId.toString()),
              assignmentId: { $in: assignments.map((a: any) => a._id) },
            },
          },
          {
            $group: {
              _id: "$assignmentId",
              count: { $sum: 1 },
            },
          },
        ]),
      ]);

      if (submissionAggregate.length > 0) {
        totalSubmissionsReceived = submissionAggregate[0].totalSubmissionsReceived || 0;
        totalReviewedSubmissions = submissionAggregate[0].totalReviewedSubmissions || 0;
        pendingReviewCount = submissionAggregate[0].pendingReviewCount || 0;
      }

      perAssignmentCounts.forEach((c: any) => {
        submissionCountByAssignment.set(c._id.toString(), c.count || 0);
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        teacher: {
          id: teacher._id.toString(),
          name: `${teacher.firstName} ${teacher.lastName}`,
        },
        summary: {
          totalAssignmentsCreated: totalAssignmentsCreated || 0,
          totalSubmissionsReceived,
          totalReviewedSubmissions,
          pendingReviewCount,
          totalStudyMaterialsCreated: totalStudyMaterialsCreated || 0,
        },
        assignments: assignments.map((a: any) => ({
          _id: a._id.toString(),
          id: a._id.toString(),
          title: a.title,
          classId: a.classId ? { _id: a.classId._id?.toString(), name: a.classId.name, code: a.classId.code } : null,
          class: a.classId ? { name: a.classId.name } : null,
          sectionId: a.sectionId ? { _id: a.sectionId._id?.toString(), name: a.sectionId.name } : null,
          section: a.sectionId ? { name: a.sectionId.name } : null,
          subjectId: a.subjectId ? { _id: a.subjectId._id?.toString(), name: a.subjectId.name, code: a.subjectId.code } : null,
          subject: a.subjectId ? { name: a.subjectId.name } : null,
          dueDate: a.dueDate,
          status: a.status,
          submissionCount: submissionCountByAssignment.get(a._id.toString()) || 0,
          createdAt: a.createdAt,
        })),
        studyMaterials: materials.map((m: any) => ({
          _id: m._id.toString(),
          id: m._id.toString(),
          title: m.title,
          topic: m.topic || "General",
          type: m.type,
          fileType: m.type,
          url: m.url,
          fileUrl: m.url,
          classId: m.classId ? { _id: m.classId._id?.toString(), name: m.classId.name, code: m.classId.code } : null,
          class: m.classId ? { name: m.classId.name } : null,
          subjectId: m.subjectId ? { _id: m.subjectId._id?.toString(), name: m.subjectId.name, code: m.subjectId.code } : null,
          subject: m.subjectId ? { name: m.subjectId.name } : null,
          createdAt: m.createdAt,
        })),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch teacher materials" } },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId, user } = auth.context;
  const { teacherId } = await params;

  if (!mongoose.Types.ObjectId.isValid(teacherId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid teacher ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const teacher = await Teacher.findOne({ _id: teacherId, schoolId });
    if (!teacher) {
      return NextResponse.json(
        { success: false, error: { code: "TEACHER_NOT_FOUND", message: "Teacher not found in this school" } },
        { status: 404 }
      );
    }

    if (teacher.status !== "ACTIVE") {
      return NextResponse.json(
        { success: false, error: { code: "TEACHER_INACTIVE", message: "Cannot assign an inactive teacher" } },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { academicYearId, classId, sectionId, subjectId, isClassTeacher, assignmentType } = body;

    if (!academicYearId || !classId || !sectionId) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_FIELDS", message: "Academic Year, Class, and Section are required" } },
        { status: 400 }
      );
    }

    // Dynamic import to avoid circular dependency
    const TeacherAssignment = (await import("@/models/TeacherAssignment")).default;
    const AuditLog = (await import("@/models/AuditLog")).default;

    const isCT = Boolean(isClassTeacher);

    // Strict Class Teacher Rules
    if (isCT) {
      // 1. One teacher cannot be Class Teacher for more than one class in an academic year
      const existingTeacherCT = await TeacherAssignment.findOne({
        schoolId,
        teacherId: teacher._id,
        academicYearId,
        isClassTeacher: true,
        isActive: true,
      }).populate("classId", "name").populate("sectionId", "name");

      if (existingTeacherCT) {
        const clsName = (existingTeacherCT.classId as any)?.name || "another class";
        const secName = (existingTeacherCT.sectionId as any)?.name || "another section";
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "TEACHER_ALREADY_CLASS_TEACHER",
              message: `${teacher.firstName} ${teacher.lastName} is already assigned as Class Teacher of ${clsName} - Section ${secName} for this academic year. A teacher can be Class Teacher for only one section per academic year.`,
            },
          },
          { status: 409 }
        );
      }

      // 2. A section can have only one active Class Teacher
      const existingSectionCT = await TeacherAssignment.findOne({
        schoolId,
        academicYearId,
        classId,
        sectionId,
        isClassTeacher: true,
        isActive: true,
      }).populate("teacherId", "firstName lastName");

      if (existingSectionCT) {
        const otherTeacher = (existingSectionCT.teacherId as any);
        const otherName = otherTeacher ? `${otherTeacher.firstName} ${otherTeacher.lastName}` : "another teacher";
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "SECTION_ALREADY_HAS_CLASS_TEACHER",
              message: `This section already has an assigned Class Teacher (${otherName}) for this academic year.`,
            },
          },
          { status: 409 }
        );
      }
    }

    // Check duplicate active assignment
    const duplicateQuery: any = {
      schoolId,
      teacherId: teacher._id,
      academicYearId,
      classId,
      sectionId,
      isActive: true,
    };
    if (subjectId) {
      duplicateQuery.subjectId = subjectId;
    } else {
      duplicateQuery.subjectId = null;
    }

    const duplicate = await TeacherAssignment.findOne(duplicateQuery);
    if (duplicate) {
      // If duplicate exists, update its isClassTeacher if needed
      if (isCT && !duplicate.isClassTeacher) {
        duplicate.isClassTeacher = true;
        duplicate.assignmentType = duplicate.subjectId ? "BOTH" : "CLASS_TEACHER";
        duplicate.updatedBy = user.id;
        await duplicate.save();

        return NextResponse.json({
          success: true,
          message: "Teacher assignment updated as Class Teacher successfully",
          data: { assignment: duplicate },
        });
      }

      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE_ASSIGNMENT", message: "This academic assignment already exists for this teacher." } },
        { status: 409 }
      );
    }

    const determinedType = isCT && subjectId
      ? "BOTH"
      : isCT
      ? "CLASS_TEACHER"
      : "SUBJECT_TEACHER";

    const assignment = await TeacherAssignment.create({
      schoolId,
      teacherId: teacher._id,
      academicYearId,
      classId,
      sectionId,
      subjectId: subjectId || null,
      assignmentType: assignmentType || determinedType,
      isClassTeacher: isCT,
      isActive: true,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "TEACHER_ASSIGNMENT_CREATED",
      entityType: "TEACHER_ASSIGNMENT",
      entityId: assignment._id.toString(),
      schoolId,
      metadata: {
        teacherId: teacher._id.toString(),
        academicYearId,
        classId,
        sectionId,
        subjectId: subjectId || null,
        isClassTeacher: isCT,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Teacher assignment created successfully",
        data: { assignment },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to create teacher assignment" } },
      { status: 500 }
    );
  }
}
