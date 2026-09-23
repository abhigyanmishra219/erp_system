import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireStudent } from "@/lib/auth/requireStudent";
import connectToDatabase from "@/lib/db";
import StudyMaterial, { StudyMaterialType } from "@/models/StudyMaterial";
import AcademicYear from "@/models/AcademicYear";
import Subject from "@/models/Subject";
import Class from "@/models/Class";

export async function GET(req: NextRequest) {
  const auth = await requireStudent(req);
  if (!auth.success) return auth.response;

  const { student, schoolId } = auth.context;

  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const requestedYearId = searchParams.get("academicYearId");
  const subjectIdParam = searchParams.get("subjectId") || "";
  const topicParam = (searchParams.get("topic") || "").trim();
  const typeParam = searchParams.get("type") || "ALL";
  const searchParam = (searchParams.get("search") || "").trim();

  // 1. Resolve Academic Year Context
  let targetYearId = student.academicYearId;
  if (requestedYearId && mongoose.Types.ObjectId.isValid(requestedYearId)) {
    const validYear = await AcademicYear.findOne({
      _id: requestedYearId,
      schoolId,
    }).lean();
    if (validYear) targetYearId = validYear._id;
  }

  // 2. Build Query strictly scoped to Student's School, Class, and Active status
  const filter: Record<string, any> = {
    schoolId,
    classId: student.classId,
    isActive: true,
  };

  if (targetYearId) {
    filter.academicYearId = targetYearId;
  }

  if (subjectIdParam && mongoose.Types.ObjectId.isValid(subjectIdParam)) {
    filter.subjectId = subjectIdParam;
  }

  if (topicParam) {
    filter.topic = new RegExp(topicParam.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  }

  if (typeParam && typeParam !== "ALL") {
    filter.type = typeParam;
  }

  if (searchParam) {
    const searchRegex = new RegExp(
      searchParam.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i"
    );
    filter.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { topic: searchRegex },
      { fileName: searchRegex },
    ];
  }

  // 3. Fetch materials
  const materialsDocs = await StudyMaterial.find(filter)
    .populate("academicYearId", "name status")
    .populate("classId", "name code")
    .populate("subjectId", "name code type")
    .populate("teacherId", "firstName lastName email")
    .sort({ topic: 1, createdAt: -1 })
    .lean();

  // 4. Also fetch all materials for this student's class to build comprehensive filter options
  const allClassMaterials = await StudyMaterial.find({
    schoolId,
    classId: student.classId,
    isActive: true,
    ...(targetYearId ? { academicYearId: targetYearId } : {}),
  })
    .populate("subjectId", "name code")
    .select("subjectId topic type")
    .lean();

  const subjectsMap = new Map<string, { _id: string; name: string; code?: string }>();
  const topicsSet = new Set<string>();
  const byTypeCount: Record<string, number> = {
    PDF: 0,
    IMAGE: 0,
    DOCUMENT: 0,
    PRESENTATION: 0,
    VIDEO: 0,
    EXTERNAL_LINK: 0,
  };

  allClassMaterials.forEach((m: any) => {
    if (m.subjectId) {
      const sId = m.subjectId._id?.toString() || m.subjectId.toString();
      const sName = m.subjectId.name || "Subject";
      const sCode = m.subjectId.code || "";
      if (!subjectsMap.has(sId)) {
        subjectsMap.set(sId, { _id: sId, name: sName, code: sCode });
      }
    }
    if (m.topic) {
      topicsSet.add(m.topic);
    }
    if (m.type && byTypeCount[m.type] !== undefined) {
      byTypeCount[m.type]++;
    }
  });

  // 5. Structure Hierarchy: Class -> Subject -> Topic -> Material[]
  const hierarchy: Record<string, any> = {};

  const materials = materialsDocs.map((m: any) => {
    const item = {
      _id: m._id.toString(),
      title: m.title,
      description: m.description || "",
      topic: m.topic || "General",
      type: m.type as StudyMaterialType,
      url: m.url,
      fileName: m.fileName || "",
      fileSize: m.fileSize || null,
      mimeType: m.mimeType || "",
      class: {
        _id: m.classId?._id?.toString() || m.classId?.toString() || "",
        name: m.classId?.name || "Class",
        code: m.classId?.code || "",
      },
      subject: {
        _id: m.subjectId?._id?.toString() || m.subjectId?.toString() || "",
        name: m.subjectId?.name || "Subject",
        code: m.subjectId?.code || "",
        type: m.subjectId?.type || "THEORY",
      },
      teacher: m.teacherId
        ? {
            _id: m.teacherId._id?.toString() || m.teacherId.toString(),
            name: `${m.teacherId.firstName || ""} ${m.teacherId.lastName || ""}`.trim() || "Faculty",
            email: m.teacherId.email || "",
          }
        : null,
      academicYear: {
        _id: m.academicYearId?._id?.toString() || m.academicYearId?.toString() || "",
        name: m.academicYearId?.name || "Academic Year",
      },
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    };

    // Build hierarchy
    const cId = item.class._id;
    const sId = item.subject._id;
    const tName = item.topic;

    if (!hierarchy[cId]) {
      hierarchy[cId] = {
        classId: cId,
        className: item.class.name,
        subjects: {},
      };
    }

    if (!hierarchy[cId].subjects[sId]) {
      hierarchy[cId].subjects[sId] = {
        subjectId: sId,
        subjectName: item.subject.name,
        subjectCode: item.subject.code,
        topics: {},
      };
    }

    if (!hierarchy[cId].subjects[sId].topics[tName]) {
      hierarchy[cId].subjects[sId].topics[tName] = [];
    }

    hierarchy[cId].subjects[sId].topics[tName].push(item);

    return item;
  });

  return NextResponse.json({
    success: true,
    data: {
      materials,
      hierarchy,
      summary: {
        totalCount: allClassMaterials.length,
        filteredCount: materials.length,
        topicsCount: topicsSet.size,
        subjectsCount: subjectsMap.size,
        byType: byTypeCount,
      },
      filterOptions: {
        subjects: Array.from(subjectsMap.values()),
        topics: Array.from(topicsSet).sort(),
        types: ["PDF", "IMAGE", "DOCUMENT", "PRESENTATION", "VIDEO", "EXTERNAL_LINK"],
      },
    },
  });
}

// Student cannot create, edit, or delete study materials
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed. Students have read-only access to study materials.",
    },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed. Students have read-only access to study materials.",
    },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed. Students have read-only access to study materials.",
    },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    {
      success: false,
      error: "Method not allowed. Students have read-only access to study materials.",
    },
    { status: 405 }
  );
}
