import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import { getTeacherScope, verifyTeacherClassSubjectScope } from "@/lib/auth/teacherScope";
import connectToDatabase from "@/lib/db";
import StudyMaterial, { StudyMaterialType } from "@/models/StudyMaterial";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Subject from "@/models/Subject";
import { createAuditLog } from "@/lib/audit";
import { createStudyMaterialSchema } from "@/lib/validation/studyMaterial";

export async function GET(req: NextRequest) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { teacher, schoolId, user } = auth.context;
  const teacherIdStr = teacher._id.toString();

  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const search = (searchParams.get("search") || "").trim();
  const classIdParam = searchParams.get("classId") || "";
  const subjectIdParam = searchParams.get("subjectId") || "";
  const topicParam = (searchParams.get("topic") || "").trim();
  const typeParam = searchParams.get("type") || "ALL";
  const myUploadsOnly = searchParams.get("myUploads") === "true";
  const academicYearIdParam = searchParams.get("academicYearId") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

  // 1. Get Teacher Scope
  const scope = await getTeacherScope({
    schoolId,
    teacherId: teacherIdStr,
    academicYearId: academicYearIdParam || undefined,
  });

  const { assignedClasses, classIds, subjectIds } = scope;

  // Build filter options strictly based on teacher scope
  const classesMap = new Map<string, { classId: string; className: string }>();
  const subjectsMap = new Map<string, { subjectId: string; subjectName: string; classId?: string }>();

  assignedClasses.forEach((ac) => {
    if (ac.classId) {
      classesMap.set(ac.classId, { classId: ac.classId, className: ac.className });
    }
    if (ac.subjectId && ac.subjectName) {
      subjectsMap.set(ac.subjectId, {
        subjectId: ac.subjectId,
        subjectName: ac.subjectName,
        classId: ac.classId,
      });
    }
  });

  const filterOptions = {
    classes: Array.from(classesMap.values()),
    subjects: Array.from(subjectsMap.values()),
    types: ["PDF", "IMAGE", "DOCUMENT", "PRESENTATION", "VIDEO", "EXTERNAL_LINK"],
  };

  // If teacher has no assigned classes, return empty
  if (classIds.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        materials: [],
        hierarchy: {},
        summary: {
          totalCount: 0,
          myUploadsCount: 0,
          topicsCount: 0,
          byType: {},
        },
        pagination: { totalCount: 0, totalPages: 0, currentPage: 1, limit },
        filterOptions,
      },
    });
  }

  // 2. Build Query Filters
  const filter: Record<string, any> = {
    schoolId,
    isActive: true,
  };

  // Scope to teacher's authorized classes and subjects
  if (classIdParam && mongoose.Types.ObjectId.isValid(classIdParam)) {
    if (!classIds.includes(classIdParam)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized class filter requested" },
        { status: 403 }
      );
    }
    filter.classId = classIdParam;
  } else {
    filter.classId = { $in: classIds };
  }

  if (subjectIdParam && mongoose.Types.ObjectId.isValid(subjectIdParam)) {
    if (!subjectIds.includes(subjectIdParam)) {
      return NextResponse.json(
        { success: false, error: "Unauthorized subject filter requested" },
        { status: 403 }
      );
    }
    filter.subjectId = subjectIdParam;
  } else if (subjectIds.length > 0) {
    filter.subjectId = { $in: subjectIds };
  }

  if (myUploadsOnly) {
    filter.teacherId = teacher._id;
  }

  if (academicYearIdParam && mongoose.Types.ObjectId.isValid(academicYearIdParam)) {
    filter.academicYearId = academicYearIdParam;
  }

  if (topicParam) {
    filter.topic = new RegExp(topicParam.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }

  if (typeParam && typeParam !== "ALL") {
    filter.type = typeParam;
  }

  if (search) {
    const searchRegex = new RegExp(
      search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );
    filter.$or = [{ title: searchRegex }, { description: searchRegex }, { topic: searchRegex }];
  }

  // 3. Query All Filtered Materials
  const totalCount = await StudyMaterial.countDocuments(filter);
  const skip = (page - 1) * limit;

  const materials = await StudyMaterial.find(filter)
    .populate("academicYearId", "name status")
    .populate("classId", "name code")
    .populate("subjectId", "name code")
    .populate("teacherId", "firstName lastName email")
    .sort({ topic: 1, createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  // 4. Build Hierarchy Tree: Class -> Subject -> Topic -> Material[]
  const hierarchy: Record<string, any> = {};
  const topicsSet = new Set<string>();
  const byTypeCount: Record<string, number> = {
    PDF: 0,
    IMAGE: 0,
    DOCUMENT: 0,
    PRESENTATION: 0,
    VIDEO: 0,
    EXTERNAL_LINK: 0,
  };
  let myUploadsCount = 0;

  const formattedMaterials = materials.map((m: any) => {
    const isOwner = m.teacherId?._id?.toString() === teacherIdStr;
    if (isOwner) myUploadsCount++;

    if (m.type && byTypeCount[m.type] !== undefined) {
      byTypeCount[m.type]++;
    }

    if (m.topic) {
      topicsSet.add(`${m.classId?._id}_${m.subjectId?._id}_${m.topic.toLowerCase()}`);
    }

    const item = {
      _id: m._id.toString(),
      title: m.title,
      description: m.description || "",
      topic: m.topic,
      type: m.type as StudyMaterialType,
      url: m.url,
      fileName: m.fileName || "",
      fileSize: m.fileSize || null,
      mimeType: m.mimeType || "",
      classId: m.classId?._id?.toString() || m.classId?.toString(),
      className: m.classId?.name || "Class",
      subjectId: m.subjectId?._id?.toString() || m.subjectId?.toString(),
      subjectName: m.subjectId?.name || "Subject",
      academicYearId: m.academicYearId?._id?.toString() || m.academicYearId?.toString(),
      academicYearName: m.academicYearId?.name || "",
      teacherId: m.teacherId?._id?.toString() || m.teacherId?.toString(),
      teacherName: m.teacherId ? `${m.teacherId.firstName} ${m.teacherId.lastName}`.trim() : "Teacher",
      isOwner,
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };

    // Grouping into hierarchy
    const cKey = item.classId;
    const sKey = item.subjectId;
    const tKey = item.topic || "General";

    if (!hierarchy[cKey]) {
      hierarchy[cKey] = {
        classId: cKey,
        className: item.className,
        subjects: {},
      };
    }

    if (!hierarchy[cKey].subjects[sKey]) {
      hierarchy[cKey].subjects[sKey] = {
        subjectId: sKey,
        subjectName: item.subjectName,
        topics: {},
      };
    }

    if (!hierarchy[cKey].subjects[sKey].topics[tKey]) {
      hierarchy[cKey].subjects[sKey].topics[tKey] = [];
    }

    hierarchy[cKey].subjects[sKey].topics[tKey].push(item);

    return item;
  });

  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    success: true,
    data: {
      materials: formattedMaterials,
      hierarchy,
      summary: {
        totalCount,
        myUploadsCount,
        topicsCount: topicsSet.size,
        byType: byTypeCount,
      },
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

  const { teacher, schoolId, user } = auth.context;
  const teacherIdStr = teacher._id.toString();

  try {
    const body = await req.json();
    const parseResult = createStudyMaterialSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    await connectToDatabase();

    // 1. Verify Scope: Teacher must have active assignment for this class & subject
    const isAuthorized = await verifyTeacherClassSubjectScope({
      schoolId,
      teacherId: teacherIdStr,
      classId: data.classId,
      subjectId: data.subjectId,
      academicYearId: data.academicYearId,
    });

    if (!isAuthorized) {
      return NextResponse.json(
        {
          success: false,
          error: "You are not authorized to publish study material for this class and subject.",
        },
        { status: 403 }
      );
    }

    // 2. Create Study Material
    const studyMaterial = await StudyMaterial.create({
      schoolId,
      academicYearId: data.academicYearId,
      classId: data.classId,
      subjectId: data.subjectId,
      topic: data.topic.trim(),
      title: data.title.trim(),
      description: data.description?.trim() || "",
      type: data.type,
      url: data.url.trim(),
      fileName: data.fileName?.trim() || "",
      fileSize: data.fileSize || null,
      mimeType: data.mimeType?.trim() || "",
      teacherId: teacher._id,
      isActive: true,
      createdBy: user._id,
      updatedBy: user._id,
    });

    // 3. Create Audit Log
    await createAuditLog({
      schoolId,
      userId: user._id.toString(),
      userRole: "TEACHER",
      action: "STUDY_MATERIAL_CREATED",
      entityType: "STUDY_MATERIAL",
      entityId: studyMaterial._id.toString(),
      metadata: {
        title: studyMaterial.title,
        topic: studyMaterial.topic,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Study material published successfully",
        data: studyMaterial,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("POST /api/teacher/study-material error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to publish study material" },
      { status: 500 }
    );
  }
}
