import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import StudyMaterial from "@/models/StudyMaterial";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Subject from "@/models/Subject";
import Teacher from "@/models/Teacher";
import AuditLog from "@/models/AuditLog";
import { createStudyMaterialSchema } from "@/lib/validation/studyMaterial";
import { verifyTeacherAssignmentScope, verifyClassSubjectMapping } from "@/lib/auth/teacherAssignmentScope";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;

  try {
    const url = new URL(req.url);
    const academicYearId = url.searchParams.get("academicYearId") || "";
    const classId = url.searchParams.get("classId") || "";
    const subjectId = url.searchParams.get("subjectId") || "";
    const topic = (url.searchParams.get("topic") || "").trim();
    const type = url.searchParams.get("type") || "ALL";
    const search = (url.searchParams.get("search") || "").trim();

    await connectToDatabase();

    const filter: Record<string, any> = {
      schoolId,
      isActive: true,
    };

    if (academicYearId && mongoose.Types.ObjectId.isValid(academicYearId)) {
      filter.academicYearId = academicYearId;
    }
    if (classId && mongoose.Types.ObjectId.isValid(classId)) {
      filter.classId = classId;
    }
    if (subjectId && mongoose.Types.ObjectId.isValid(subjectId)) {
      filter.subjectId = subjectId;
    }
    if (topic) {
      filter.topic = new RegExp(topic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    }
    if (type !== "ALL") {
      filter.type = type;
    }

    if (search) {
      const searchRegex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      filter.$or = [{ title: searchRegex }, { description: searchRegex }, { topic: searchRegex }];
    }

    const materials = await StudyMaterial.find(filter)
      .populate("academicYearId", "name status")
      .populate("classId", "name code")
      .populate("subjectId", "name code")
      .populate("teacherId", "firstName lastName")
      .sort({ topic: 1, createdAt: -1 })
      .lean();

    // Group materials hierarchically: Class -> Subject -> Topic -> Material
    const hierarchicalGroups: Record<string, any> = {};

    for (const mat of materials) {
      const classKey = (mat.classId as any)?._id?.toString() || "unassigned_class";
      const className = (mat.classId as any)?.name || "Unassigned Class";
      const subjectKey = (mat.subjectId as any)?._id?.toString() || "unassigned_subject";
      const subjectName = (mat.subjectId as any)?.name || "General";
      const topicName = mat.topic || "General";

      if (!hierarchicalGroups[classKey]) {
        hierarchicalGroups[classKey] = {
          classId: classKey,
          className,
          subjects: {},
        };
      }

      if (!hierarchicalGroups[classKey].subjects[subjectKey]) {
        hierarchicalGroups[classKey].subjects[subjectKey] = {
          subjectId: subjectKey,
          subjectName,
          topics: {},
        };
      }

      if (!hierarchicalGroups[classKey].subjects[subjectKey].topics[topicName]) {
        hierarchicalGroups[classKey].subjects[subjectKey].topics[topicName] = [];
      }

      hierarchicalGroups[classKey].subjects[subjectKey].topics[topicName].push({
        id: mat._id.toString(),
        title: mat.title,
        description: mat.description,
        type: mat.type,
        url: mat.url,
        fileName: mat.fileName,
        fileSize: mat.fileSize,
        mimeType: mat.mimeType,
        teacher: mat.teacherId ? { name: `${(mat.teacherId as any).firstName} ${(mat.teacherId as any).lastName}` } : null,
        createdAt: mat.createdAt,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        total: materials.length,
        materials: materials.map((m: any) => ({
          id: m._id.toString(),
          academicYear: m.academicYearId ? { id: m.academicYearId._id?.toString(), name: m.academicYearId.name } : null,
          class: m.classId ? { id: m.classId._id?.toString(), name: m.classId.name } : null,
          subject: m.subjectId ? { id: m.subjectId._id?.toString(), name: m.subjectId.name } : null,
          topic: m.topic,
          title: m.title,
          description: m.description,
          type: m.type,
          url: m.url,
          fileName: m.fileName,
          fileSize: m.fileSize,
          teacher: m.teacherId ? { name: `${m.teacherId.firstName} ${m.teacherId.lastName}` } : null,
          createdAt: m.createdAt,
        })),
        hierarchy: hierarchicalGroups,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch study materials" } },
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
    const validated = createStudyMaterialSchema.parse(body);

    await connectToDatabase();

    // 1. Verify Academic Year, Class, Subject
    const [academicYear, classDoc, subjectDoc] = await Promise.all([
      AcademicYear.findOne({ _id: validated.academicYearId, schoolId }).lean(),
      Class.findOne({ _id: validated.classId, schoolId }).lean(),
      Subject.findOne({ _id: validated.subjectId, schoolId }).lean(),
    ]);

    if (!academicYear) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ACADEMIC_YEAR", message: "Academic Year not found in your school." } },
        { status: 400 }
      );
    }
    if (!classDoc) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CLASS", message: "Class not found in your school." } },
        { status: 400 }
      );
    }
    if (!subjectDoc) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_SUBJECT", message: "Subject not found in your school." } },
        { status: 400 }
      );
    }

    // 2. Verify Subject is mapped to Class
    const isSubjectMapped = await verifyClassSubjectMapping({
      schoolId,
      academicYearId: validated.academicYearId,
      classId: validated.classId,
      subjectId: validated.subjectId,
    });

    if (!isSubjectMapped) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "SUBJECT_NOT_ASSIGNED_TO_CLASS",
            message: `Subject '${subjectDoc.name}' is not assigned to '${classDoc.name}' in the ${academicYear.name} session.`,
          },
        },
        { status: 400 }
      );
    }

    // 3. Resolve Teacher
    let effectiveTeacherId = validated.teacherId;

    if ((user.role as string) === "TEACHER") {
      const teacherProfile = await Teacher.findOne({ schoolId, userId: user.id, status: "ACTIVE" }).lean();
      if (!teacherProfile) {
        return NextResponse.json(
          { success: false, error: { code: "TEACHER_NOT_FOUND", message: "Active teacher profile not found." } },
          { status: 403 }
        );
      }
      effectiveTeacherId = teacherProfile._id.toString();

      // Verify scope
      const scopeCheck = await verifyTeacherAssignmentScope({
        schoolId,
        userId: user.id,
        academicYearId: validated.academicYearId,
        classId: validated.classId,
        subjectId: validated.subjectId,
      });

      if (!scopeCheck.hasAccess) {
        return NextResponse.json(
          { success: false, error: { code: "TEACHER_SCOPE_DENIED", message: scopeCheck.reason || "You are not authorized to upload material for this class and subject." } },
          { status: 403 }
        );
      }
    } else {
      if (!effectiveTeacherId) {
        const fallbackTeacher = await Teacher.findOne({ schoolId, status: "ACTIVE" }).lean();
        if (!fallbackTeacher) {
          return NextResponse.json(
            { success: false, error: { code: "NO_TEACHER_AVAILABLE", message: "Please register at least one teacher before adding study material." } },
            { status: 400 }
          );
        }
        effectiveTeacherId = fallbackTeacher._id.toString();
      } else {
        const teacherDoc = await Teacher.findOne({ _id: effectiveTeacherId, schoolId, status: "ACTIVE" }).lean();
        if (!teacherDoc) {
          return NextResponse.json(
            { success: false, error: { code: "INVALID_TEACHER", message: "Selected Teacher not found." } },
            { status: 400 }
          );
        }
      }
    }

    // 4. Create Study Material
    const newMaterial = new StudyMaterial({
      schoolId,
      academicYearId: validated.academicYearId,
      classId: validated.classId,
      subjectId: validated.subjectId,
      topic: validated.topic.trim(),
      title: validated.title.trim(),
      description: validated.description || "",
      type: validated.type,
      url: validated.url.trim(),
      fileName: validated.fileName || "",
      fileSize: validated.fileSize ?? null,
      mimeType: validated.mimeType || "",
      teacherId: effectiveTeacherId,
      isActive: true,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await newMaterial.save();

    // 5. Audit Log
    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "STUDY_MATERIAL_CREATED",
      entityType: "STUDY_MATERIAL",
      entityId: newMaterial._id.toString(),
      schoolId,
      metadata: {
        materialId: newMaterial._id.toString(),
        title: newMaterial.title,
        topic: newMaterial.topic,
        type: newMaterial.type,
        classId: validated.classId,
        subjectId: validated.subjectId,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Study material added successfully",
        data: {
          material: {
            id: newMaterial._id.toString(),
            title: newMaterial.title,
            topic: newMaterial.topic,
            type: newMaterial.type,
            url: newMaterial.url,
          },
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.issues) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid study material data", details: error.issues } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to create study material" } },
      { status: 500 }
    );
  }
}
