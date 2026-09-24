import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireParent } from "@/lib/auth/requireParent";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import TimetableEntry from "@/models/TimetableEntry";
import Student from "@/models/Student";
import Class from "@/models/Class";
import Section from "@/models/Section";
import AcademicYear from "@/models/AcademicYear";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

    const subCheck = requireModule(auth.context.school, "TIMETABLE");
    if (!subCheck.allowed) return subCheck.response;

    const { schoolId, childIds } = auth.context;

    if (!childIds || childIds.length === 0) {
      return NextResponse.json({
        success: true,
        hasChildren: false,
        message: "No linked children found for this parent account.",
        data: null,
      });
    }

    const { searchParams } = new URL(req.url);
    const requestedStudentId = searchParams.get("studentId");
    const requestedYearId = searchParams.get("academicYearId");

    // 1. Authorize requested child
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

    await connectToDatabase();

    // 2. Fetch selected Student Details
    const studentDoc = await Student.findOne({
      _id: activeStudentId,
      schoolId,
    })
      .populate("classId", "name code")
      .populate("sectionId", "name")
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

    const classId = (studentDoc.classId as any)?._id || studentDoc.classId;
    const sectionId = (studentDoc.sectionId as any)?._id || studentDoc.sectionId;
    let targetYearId: any = requestedYearId || studentDoc.academicYearId;

    if (!targetYearId) {
      const activeAY = await AcademicYear.findOne({ schoolId, status: "ACTIVE" }).lean();
      if (activeAY) targetYearId = activeAY._id;
    }

    if (!classId || !sectionId) {
      return NextResponse.json({
        success: true,
        hasChildren: true,
        data: {
          student: {
            _id: studentDoc._id.toString(),
            name: `${studentDoc.firstName} ${studentDoc.lastName}`.trim(),
            rollNumber: studentDoc.rollNumber || "",
            admissionNumber: studentDoc.admissionNumber,
          },
          class: null,
          section: null,
          academicYear: null,
          entries: [],
        },
      });
    }

    // 3. Fetch Timetable Entries and Context Docs
    const [entries, classDoc, sectionDoc, academicYearDoc] = await Promise.all([
      TimetableEntry.find({
        schoolId,
        academicYearId: targetYearId,
        classId,
        sectionId,
        isActive: true,
      })
        .populate("subjectId", "name code type")
        .populate("teacherId", "firstName lastName email")
        .sort({ startTime: 1 })
        .lean(),
      Class.findById(classId).select("name code").lean(),
      Section.findById(sectionId).select("name capacity").lean(),
      AcademicYear.findById(targetYearId).select("name status").lean(),
    ]);

    const formattedEntries = entries.map((entry: any) => ({
      _id: entry._id.toString(),
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      room: entry.room || "",
      subject: {
        _id: entry.subjectId?._id?.toString() || "",
        name: entry.subjectId?.name || "Subject",
        code: entry.subjectId?.code || "",
        type: entry.subjectId?.type || "CORE",
      },
      teacher: {
        _id: entry.teacherId?._id?.toString() || "",
        name: entry.teacherId
          ? `${entry.teacherId.firstName} ${entry.teacherId.lastName}`.trim()
          : "Faculty",
      },
    }));

    return NextResponse.json({
      success: true,
      hasChildren: true,
      data: {
        student: {
          _id: studentDoc._id.toString(),
          name: `${studentDoc.firstName} ${studentDoc.lastName}`.trim(),
          rollNumber: studentDoc.rollNumber || "",
          admissionNumber: studentDoc.admissionNumber,
        },
        class: classDoc
          ? { _id: classDoc._id.toString(), name: classDoc.name, code: classDoc.code }
          : null,
        section: sectionDoc
          ? { _id: sectionDoc._id.toString(), name: sectionDoc.name }
          : null,
        academicYear: academicYearDoc
          ? { _id: academicYearDoc._id.toString(), name: academicYearDoc.name }
          : null,
        entries: formattedEntries,
      },
    });
  } catch (error: any) {
    console.error("Error fetching parent timetable:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch student timetable",
        },
      },
      { status: 500 }
    );
  }
}

// Strictly enforce read-only security on Parent Timetable endpoint
export async function POST() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot create timetable entries." } },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot update timetable entries." } },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot modify timetable entries." } },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Parents cannot delete timetable entries." } },
    { status: 405 }
  );
}
