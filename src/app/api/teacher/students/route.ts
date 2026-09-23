import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import { getTeacherScope } from "@/lib/auth/teacherScope";
import connectToDatabase from "@/lib/db";
import Student from "@/models/Student";
import Class from "@/models/Class";
import Section from "@/models/Section";

export async function GET(req: NextRequest) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { teacher, schoolId } = auth.context;

  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search") || "";
  const classIdParam = searchParams.get("classId") || "";
  const sectionIdParam = searchParams.get("sectionId") || "";
  const statusParam = searchParams.get("status") || "ACTIVE";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

  // 1. Resolve active Teacher Scope
  const scope = await getTeacherScope({
    schoolId,
    teacherId: teacher._id.toString(),
  });

  const { classIds, sectionIds, assignedClasses } = scope;

  // Build filter options scoped to this teacher
  const filterClassesMap = new Map<string, { classId: string; className: string }>();
  const filterSectionsMap = new Map<string, { sectionId: string; sectionName: string; classId: string }>();

  assignedClasses.forEach((ac) => {
    if (ac.classId) {
      filterClassesMap.set(ac.classId, { classId: ac.classId, className: ac.className });
    }
    if (ac.sectionId) {
      filterSectionsMap.set(ac.sectionId, {
        sectionId: ac.sectionId,
        sectionName: ac.sectionName,
        classId: ac.classId,
      });
    }
  });

  const filterOptions = {
    classes: Array.from(filterClassesMap.values()),
    sections: Array.from(filterSectionsMap.values()),
  };

  // If teacher has NO assigned classes/sections, return empty roster
  if (classIds.length === 0 || sectionIds.length === 0) {
    return NextResponse.json({
      success: true,
      data: {
        students: [],
        pagination: {
          totalCount: 0,
          totalPages: 0,
          currentPage: page,
          limit,
        },
        filterOptions,
      },
    });
  }

  // 2. Validate requested classId/sectionId against teacher's scope
  let effectiveClassIds = classIds;
  if (classIdParam) {
    if (!classIds.includes(classIdParam)) {
      // Requested class is outside teacher's authorization scope
      return NextResponse.json({
        success: true,
        data: {
          students: [],
          pagination: {
            totalCount: 0,
            totalPages: 0,
            currentPage: page,
            limit,
          },
          filterOptions,
        },
      });
    }
    effectiveClassIds = [classIdParam];
  }

  let effectiveSectionIds = sectionIds;
  if (sectionIdParam) {
    if (!sectionIds.includes(sectionIdParam)) {
      // Requested section is outside teacher's authorization scope
      return NextResponse.json({
        success: true,
        data: {
          students: [],
          pagination: {
            totalCount: 0,
            totalPages: 0,
            currentPage: page,
            limit,
          },
          filterOptions,
        },
      });
    }
    effectiveSectionIds = [sectionIdParam];
  }

  // 3. Construct MongoDB Query strictly bounded by tenant + teacher scope
  const query: Record<string, any> = {
    schoolId,
    classId: { $in: effectiveClassIds },
    sectionId: { $in: effectiveSectionIds },
  };

  if (statusParam && statusParam !== "ALL") {
    query.status = statusParam;
  }

  if (search.trim()) {
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { firstName: regex },
      { lastName: regex },
      { admissionNumber: regex },
      { rollNumber: regex },
      { email: regex },
    ];
  }

  // 4. Query student records with pagination
  const [totalCount, studentDocs] = await Promise.all([
    Student.countDocuments(query),
    Student.find(query)
      .populate("classId", "name code")
      .populate("sectionId", "name")
      .populate("academicYearId", "name")
      .sort({ rollNumber: 1, firstName: 1, lastName: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
  ]);

  const students = studentDocs.map((s: any) => ({
    _id: s._id.toString(),
    admissionNumber: s.admissionNumber,
    studentId: s.studentId || "",
    rollNumber: s.rollNumber || "—",
    firstName: s.firstName,
    lastName: s.lastName,
    fullName: `${s.firstName} ${s.lastName}`.trim(),
    gender: s.gender,
    dateOfBirth: s.dateOfBirth,
    avatarUrl: s.avatarUrl || "",
    status: s.status,
    classId: s.classId?._id?.toString() || s.classId?.toString(),
    className: s.classId?.name || "Class",
    sectionId: s.sectionId?._id?.toString() || s.sectionId?.toString(),
    sectionName: s.sectionId?.name || "Section",
    academicYearName: s.academicYearId?.name || "",
    email: s.email || "",
    phone: s.phone || "",
    emergencyContact: s.emergencyContact || null,
  }));

  const totalPages = Math.ceil(totalCount / limit);

  return NextResponse.json({
    success: true,
    data: {
      students,
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

// Reject all mutating HTTP methods (Read-Only)
export async function POST() {
  return NextResponse.json(
    { success: false, error: "Method Not Allowed. Teachers cannot create student records." },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: "Method Not Allowed. Teachers cannot modify student master data." },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: "Method Not Allowed. Teachers cannot update student master data." },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: "Method Not Allowed. Teachers cannot delete student records." },
    { status: 405 }
  );
}
