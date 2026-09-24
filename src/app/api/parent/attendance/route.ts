import { NextRequest, NextResponse } from "next/server";
import { requireParent } from "@/lib/auth/requireParent";
import connectToDatabase from "@/lib/db";
import Attendance from "@/models/Attendance";
import Student from "@/models/Student";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import { calculateAttendanceSummary } from "@/lib/utils/attendance";
import { getDayOfWeek } from "@/lib/utils/date";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

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
    const filterMonth = searchParams.get("month"); // e.g. "2026-09" or "9"
    const filterStatus = searchParams.get("status"); // e.g. "PRESENT", "ABSENT"

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
      .populate("academicYearId", "name status startDate endDate")
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

    // 3. Resolve Academic Year Context
    let targetYearId = (studentDoc.academicYearId as any)?._id || studentDoc.academicYearId;

    if (requestedYearId) {
      const validYear = await AcademicYear.findOne({
        _id: requestedYearId,
        schoolId,
      }).lean();

      if (validYear) {
        targetYearId = validYear._id;
      }
    }

    // Fetch Academic Context Details
    const [currentYearDoc, allSchoolYears] = await Promise.all([
      targetYearId ? AcademicYear.findById(targetYearId).select("name startDate endDate status").lean() : null,
      AcademicYear.find({ schoolId }).select("name startDate endDate status").sort({ startDate: -1 }).lean(),
    ]);

    // 4. Query Attendance records strictly scoped to School & Student
    const attendanceQuery: Record<string, any> = {
      schoolId,
      studentId: activeStudentId,
      ...(targetYearId ? { academicYearId: targetYearId } : {}),
    };

    const rawRecords = await Attendance.find(attendanceQuery)
      .sort({ date: -1 })
      .lean();

    // 5. Calculate Overall Attendance Summary
    const overallSummary = calculateAttendanceSummary(
      rawRecords.map((r: any) => ({
        date: r.date,
        status: r.status,
        remarks: r.remarks,
      })),
      {
        admissionDate: studentDoc.admissionDate ? new Date(studentDoc.admissionDate) : undefined,
      }
    );

    // 6. Monthly Breakdown Aggregation
    const monthlyGroups = new Map<string, any[]>();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    rawRecords.forEach((r: any) => {
      const d = new Date(r.date);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const monthKey = `${yyyy}-${mm}`;

      if (!monthlyGroups.has(monthKey)) {
        monthlyGroups.set(monthKey, []);
      }
      monthlyGroups.get(monthKey)!.push(r);
    });

    const monthlyBreakdown: Array<{
      monthKey: string;
      monthName: string;
      year: number;
      month: number;
      totalMarked: number;
      presentCount: number;
      absentCount: number;
      lateCount: number;
      leaveCount: number;
      attendedCount: number;
      percentage: number;
    }> = [];

    monthlyGroups.forEach((records, monthKey) => {
      const [yearStr, monthStr] = monthKey.split("-");
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const monthName = `${monthNames[month - 1]} ${year}`;

      const summary = calculateAttendanceSummary(
        records.map((r: any) => ({
          date: r.date,
          status: r.status,
          remarks: r.remarks,
        }))
      );

      monthlyBreakdown.push({
        monthKey,
        monthName,
        year,
        month,
        totalMarked: summary.totalMarked,
        presentCount: summary.presentCount,
        absentCount: summary.absentCount,
        lateCount: summary.lateCount,
        leaveCount: summary.leaveCount,
        attendedCount: summary.attendedCount,
        percentage: summary.percentage,
      });
    });

    monthlyBreakdown.sort((a, b) => b.monthKey.localeCompare(a.monthKey));

    // 7. Filtered Attendance History
    let filteredRecords = rawRecords;

    if (filterMonth && filterMonth !== "ALL") {
      filteredRecords = filteredRecords.filter((r: any) => {
        const d = new Date(r.date);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const monthKey = `${yyyy}-${mm}`;
        return monthKey === filterMonth || String(d.getMonth() + 1) === filterMonth;
      });
    }

    if (filterStatus && filterStatus !== "ALL") {
      filteredRecords = filteredRecords.filter((r: any) => r.status === filterStatus.toUpperCase());
    }

    const history = filteredRecords.map((r: any) => ({
      _id: r._id.toString(),
      date: r.date,
      dayOfWeek: getDayOfWeek(new Date(r.date)),
      status: r.status,
      remarks: r.remarks || "",
    }));

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
          isPrimaryGuardian: guardianLink?.isPrimaryGuardian ?? false,
          class: {
            _id: (studentDoc.classId as any)?._id?.toString() || "",
            name: (studentDoc.classId as any)?.name || "N/A",
            code: (studentDoc.classId as any)?.code || "",
          },
          section: {
            _id: (studentDoc.sectionId as any)?._id?.toString() || "",
            name: (studentDoc.sectionId as any)?.name || "N/A",
          },
        },
        academicContext: {
          academicYear: {
            _id: targetYearId ? targetYearId.toString() : "",
            name: currentYearDoc?.name || "N/A",
            status: currentYearDoc?.status || "ACTIVE",
          },
          availableAcademicYears: allSchoolYears.map((y: any) => ({
            _id: y._id.toString(),
            name: y.name,
            status: y.status,
            isCurrent: y._id.toString() === targetYearId?.toString(),
          })),
        },
        summary: overallSummary,
        monthlyBreakdown,
        history,
      },
    });
  } catch (error: any) {
    console.error("Error fetching parent attendance data:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch parent attendance data",
      },
      { status: 500 }
    );
  }
}

// Read-Only Enforcement
export async function POST() {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed. Attendance records are read-only for guardians." },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed. Attendance records are read-only for guardians." },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed. Attendance records are read-only for guardians." },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed. Attendance records are read-only for guardians." },
    { status: 405 }
  );
}
