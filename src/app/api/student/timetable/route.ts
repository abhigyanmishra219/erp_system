import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/auth/requireStudent";
import connectToDatabase from "@/lib/db";
import TimetableEntry from "@/models/TimetableEntry";
import Class from "@/models/Class";
import Section from "@/models/Section";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireStudent(req);
    if (!auth.success) return auth.response;

    const { schoolId, classId, sectionId, academicYearId } = auth.context;

    if (!classId || !sectionId) {
      return NextResponse.json({
        success: true,
        data: {
          entries: [],
          class: null,
          section: null,
        },
      });
    }

    await connectToDatabase();

    const [entries, classDoc, sectionDoc] = await Promise.all([
      TimetableEntry.find({
        schoolId,
        academicYearId,
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
      data: {
        entries: formattedEntries,
        class: classDoc ? { _id: classDoc._id.toString(), name: classDoc.name, code: classDoc.code } : null,
        section: sectionDoc ? { _id: sectionDoc._id.toString(), name: sectionDoc.name } : null,
      },
    });
  } catch (error: any) {
    console.error("Error fetching student timetable:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch timetable" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
}
export async function PUT() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
}
export async function PATCH() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
}
export async function DELETE() {
  return NextResponse.json({ success: false, message: "Method Not Allowed" }, { status: 405 });
}
