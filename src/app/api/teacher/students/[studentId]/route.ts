import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import { getTeacherScope } from "@/lib/auth/teacherScope";
import connectToDatabase from "@/lib/db";
import Student from "@/models/Student";
import StudentParent from "@/models/StudentParent";
import Parent from "@/models/Parent";
import Attendance from "@/models/Attendance";
import mongoose from "mongoose";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ studentId: string }> }
) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { teacher, schoolId } = auth.context;
  const { studentId } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    return NextResponse.json(
      { success: false, error: "Invalid student identifier provided." },
      { status: 400 }
    );
  }

  await connectToDatabase();

  // 1. Fetch Student from MongoDB
  const student = await Student.findOne({
    _id: studentId,
    schoolId,
  })
    .populate("classId", "name code")
    .populate("sectionId", "name")
    .populate("academicYearId", "name")
    .lean();

  if (!student) {
    return NextResponse.json(
      { success: false, error: "Student record not found in this school institution." },
      { status: 404 }
    );
  }

  // 2. Resolve Teacher Scope & Verify Authorization
  const scope = await getTeacherScope({
    schoolId,
    teacherId: teacher._id.toString(),
  });

  const studentClassId = (student.classId as any)?._id?.toString() || (student.classId as any)?.toString();
  const studentSectionId = (student.sectionId as any)?._id?.toString() || (student.sectionId as any)?.toString();

  const isAuthorized =
    scope.classIds.includes(studentClassId) &&
    scope.sectionIds.includes(studentSectionId);

  if (!isAuthorized) {
    return NextResponse.json(
      {
        success: false,
        error: "Access Denied: You do not have permission to view students outside your assigned classes and sections.",
      },
      { status: 403 }
    );
  }

  // 3. Fetch Linked Guardians / Parents
  const studentParents = await StudentParent.find({
    schoolId,
    studentId: student._id,
  })
    .populate("parentId", "firstName lastName phone email occupation relationship")
    .lean();

  const guardians = studentParents.map((sp: any) => ({
    relationship: sp.relationship,
    isPrimaryGuardian: sp.isPrimaryGuardian,
    isEmergencyContact: sp.isEmergencyContact,
    canPickup: sp.canPickup,
    parentName: sp.parentId ? `${sp.parentId.firstName} ${sp.parentId.lastName || ""}`.trim() : "Guardian",
    phone: sp.parentId?.phone || "—",
    email: sp.parentId?.email || "—",
    occupation: sp.parentId?.occupation || "",
  }));

  // 4. Fetch Student Attendance Statistics
  const attendanceRecords = await Attendance.find({
    schoolId,
    studentId: student._id,
  }).lean();

  const totalDays = attendanceRecords.length;
  const presentDays = attendanceRecords.filter((a) => a.status === "PRESENT").length;
  const absentDays = attendanceRecords.filter((a) => a.status === "ABSENT").length;
  const lateDays = attendanceRecords.filter((a) => a.status === "LATE").length;
  const leaveDays = attendanceRecords.filter((a) => a.status === "LEAVE").length;
  const attendancePercentage = totalDays > 0 ? Math.round(((presentDays + lateDays) / totalDays) * 100) : 100;

  return NextResponse.json({
    success: true,
    data: {
      student: {
        _id: student._id.toString(),
        admissionNumber: student.admissionNumber,
        studentId: student.studentId || "",
        rollNumber: student.rollNumber || "—",
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.firstName} ${student.lastName}`.trim(),
        gender: student.gender,
        dateOfBirth: student.dateOfBirth,
        bloodGroup: student.bloodGroup || "—",
        avatarUrl: student.avatarUrl || "",
        status: student.status,
        admissionDate: student.admissionDate,
        classId: studentClassId,
        className: (student.classId as any)?.name || "Class",
        sectionId: studentSectionId,
        sectionName: (student.sectionId as any)?.name || "Section",
        academicYearName: (student.academicYearId as any)?.name || "",
        email: student.email || "",
        phone: student.phone || "",
        address: student.address || null,
        emergencyContact: student.emergencyContact || null,
        medicalInfo: student.medicalInfo || null,
      },
      guardians,
      attendanceStats: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        leaveDays,
        attendancePercentage,
      },
    },
  });
}

// Reject mutating operations
export async function PUT() {
  return NextResponse.json(
    { success: false, error: "Method Not Allowed. Teachers cannot edit student records." },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: "Method Not Allowed. Teachers cannot update student records." },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: "Method Not Allowed. Teachers cannot delete student records." },
    { status: 405 }
  );
}
