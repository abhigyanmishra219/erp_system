import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import Student from "@/models/Student";
import Parent from "@/models/Parent";
import Teacher from "@/models/Teacher";
import Attendance from "@/models/Attendance";
import Assignment from "@/models/Assignment";
import StudyMaterial from "@/models/StudyMaterial";
import StudentFeeAccount from "@/models/StudentFeeAccount";
import FeePayment from "@/models/FeePayment";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import { normalizeAttendanceDate } from "@/lib/utils/date";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  const { user, school, schoolId } = auth.context;

  await connectToDatabase();

  const today = normalizeAttendanceDate(new Date());

  // Query real academic foundation, teachers, students, parent statistics, attendance, assignments, study material, and fee statistics
  const [
    activeAcademicYear,
    totalAcademicYears,
    totalClasses,
    totalSections,
    totalSubjects,
    totalStudents,
    activeStudents,
    inactiveStudents,
    transferredStudents,
    graduatedStudents,
    totalParents,
    activeParents,
    totalTeachers,
    activeTeachers,
    inactiveTeachers,
    todayAttendanceRecords,
    totalAssignments,
    publishedAssignments,
    totalStudyMaterials,
    feeStats,
    feeCollected,
  ] = await Promise.all([
    AcademicYear.findOne({ schoolId, status: "ACTIVE" }).lean(),
    AcademicYear.countDocuments({ schoolId }),
    Class.countDocuments({ schoolId, isActive: true }),
    Section.countDocuments({ schoolId, isActive: true }),
    Subject.countDocuments({ schoolId, isActive: true }),
    Student.countDocuments({ schoolId }),
    Student.countDocuments({ schoolId, status: "ACTIVE" }),
    Student.countDocuments({ schoolId, status: "INACTIVE" }),
    Student.countDocuments({ schoolId, status: "TRANSFERRED" }),
    Student.countDocuments({ schoolId, status: "GRADUATED" }),
    Parent.countDocuments({ schoolId }),
    Parent.countDocuments({ schoolId, status: "ACTIVE" }),
    Teacher.countDocuments({ schoolId }),
    Teacher.countDocuments({ schoolId, status: "ACTIVE" }),
    Teacher.countDocuments({ schoolId, status: "INACTIVE" }),
    Attendance.find({ schoolId, date: today }).lean(),
    Assignment.countDocuments({ schoolId, isActive: true }),
    Assignment.countDocuments({ schoolId, isActive: true, status: "PUBLISHED" }),
    StudyMaterial.countDocuments({ schoolId, isActive: true }),
    StudentFeeAccount.aggregate([
      { $match: { schoolId: new mongoose.Types.ObjectId(schoolId) } },
      {
        $group: {
          _id: null,
          totalAssigned: { $sum: "$totalFee" },
          totalPending: { $sum: "$pendingAmount" },
          totalPaid: { $sum: "$paidAmount" },
          totalAccounts: { $sum: 1 },
          paidCount: { $sum: { $cond: [{ $eq: ["$status", "PAID"] }, 1, 0] } },
          partialCount: { $sum: { $cond: [{ $eq: ["$status", "PARTIALLY_PAID"] }, 1, 0] } },
          unpaidCount: {
            $sum: {
              $cond: [
                { $or: [{ $eq: ["$status", "PENDING"] }, { $eq: ["$status", "OVERDUE"] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]),
    FeePayment.aggregate([
      { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), status: "ACTIVE" } },
      {
        $group: {
          _id: null,
          totalCollected: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  let presentToday = 0;
  let absentToday = 0;
  let lateToday = 0;
  let leaveToday = 0;

  for (const rec of todayAttendanceRecords) {
    if (rec.status === "PRESENT") presentToday++;
    else if (rec.status === "ABSENT") absentToday++;
    else if (rec.status === "LATE") lateToday++;
    else if (rec.status === "LEAVE") leaveToday++;
  }

  const totalMarkedToday = presentToday + absentToday + lateToday + leaveToday;
  const attendedToday = presentToday + lateToday;
  const attendanceRateToday =
    totalMarkedToday > 0 ? Number(((attendedToday / totalMarkedToday) * 100).toFixed(1)) : 0;

  // Compute real setup checklist
  const hasSchoolInfo = !!(school.name && (school.phone || school.email || school.address));
  const hasBranding = !!(school.branding?.logo || school.branding?.primaryColor || school.logo);
  const hasAcademicYear = !!(activeAcademicYear || totalAcademicYears > 0);
  const hasClasses = totalClasses > 0;
  const hasSections = totalSections > 0;
  const hasSubjects = totalSubjects > 0;
  const hasTeachers = totalTeachers > 0;
  const hasStudents = totalStudents > 0;
  const hasGrading = !!(school.gradingSettings?.scales && school.gradingSettings.scales.length > 0);
  const hasAttendance = !!(
    school.attendanceSettings?.workingDays && school.attendanceSettings.workingDays.length > 0
  );
  const hasFees = !!(school.feeSettings?.categories && school.feeSettings.categories.length > 0);

  const setupItems = [
    { key: "schoolInfo", label: "School Information", completed: hasSchoolInfo, href: "/admin/settings" },
    { key: "branding", label: "Branding", completed: hasBranding, href: "/admin/settings" },
    { key: "academicYear", label: "Academic Year", completed: hasAcademicYear, href: "/admin/academics/academic-years" },
    { key: "classes", label: "Classes", completed: hasClasses, href: "/admin/academics/classes" },
    { key: "sections", label: "Sections", completed: hasSections, href: "/admin/academics/classes" },
    { key: "subjects", label: "Subjects", completed: hasSubjects, href: "/admin/academics/subjects" },
    { key: "teachers", label: "Add Teachers & Staff", completed: hasTeachers, href: "/admin/teachers" },
    { key: "students", label: "Enroll Students", completed: hasStudents, href: "/admin/students" },
    { key: "grading", label: "Grading System", completed: hasGrading, href: "/admin/settings" },
    { key: "attendance", label: "Attendance Settings", completed: hasAttendance, href: "/admin/settings" },
    { key: "fees", label: "Fee Settings", completed: hasFees, href: "/admin/settings" },
  ];

  const completedSteps = setupItems.filter((item) => item.completed).length;
  const totalSteps = setupItems.length;

  const dashboardPayload = {
    school: {
      id: schoolId,
      name: school.name,
      code: school.code, // Internal only, hidden on frontend
      logo: school.logo || school.branding?.logo || "",
      address: school.address || "",
      city: school.city || "",
      state: school.state || "",
      country: school.country || "India",
      email: school.email || "",
      phone: school.phone || "",
      website: school.website || "",
      plan: school.plan,
      status: school.status,
      subscriptionStatus: school.subscriptionStatus,
      subscriptionStartDate: school.subscriptionStartDate,
      subscriptionExpiryDate: school.subscriptionExpiryDate,
      enabledModules: school.enabledModules || [],
      studentLimit: school.studentLimit || 200,
      createdAt: school.createdAt,
    },
    user: {
      id: user.id,
      name: user.name || "School Administrator",
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
    academics: {
      activeAcademicYear: activeAcademicYear
        ? {
            id: activeAcademicYear._id.toString(),
            name: activeAcademicYear.name,
            startDate: activeAcademicYear.startDate,
            endDate: activeAcademicYear.endDate,
            status: activeAcademicYear.status,
          }
        : null,
      totalAcademicYears,
      totalClasses,
      totalSections,
      totalSubjects,
    },
    teachers: {
      total: totalTeachers,
      active: activeTeachers,
      inactive: inactiveTeachers,
    },
    students: {
      total: totalStudents,
      active: activeStudents,
      inactive: inactiveStudents,
      transferred: transferredStudents,
      graduated: graduatedStudents,
    },
    parents: {
      total: totalParents,
      active: activeParents,
    },
    attendance: {
      presentToday,
      absentToday,
      lateToday,
      leaveToday,
      totalMarkedToday,
      attendanceRateToday,
    },
    assignments: {
      total: totalAssignments,
      published: publishedAssignments,
    },
    studyMaterial: {
      total: totalStudyMaterials,
    },
    fees: {
      totalAssigned: feeStats[0]?.totalAssigned || 0,
      totalCollected: feeCollected[0]?.totalCollected || feeStats[0]?.totalPaid || 0,
      totalRevenue: feeCollected[0]?.totalCollected || feeStats[0]?.totalPaid || 0,
      totalPending: feeStats[0]?.totalPending || 0,
      paidCount: feeStats[0]?.paidCount || 0,
      partialCount: feeStats[0]?.partialCount || 0,
      unpaidCount: feeStats[0]?.unpaidCount || 0,
      totalAccounts: feeStats[0]?.totalAccounts || 0,
    },
    setup: {
      items: setupItems,
      completedSteps,
      totalSteps,
      percentage: Math.round((completedSteps / totalSteps) * 100),
      isFullyConfigured: completedSteps === totalSteps,
    },
    capabilities: {
      academics: hasAcademicYear && hasClasses,
      students: true,
      teachers: true,
      parents: true,
      attendance: true,
      assignments: true,
      studyMaterial: true,
      exams: true,
      fees: true,
      timetable: false,
      leave: false,
      notices: false,
      reports: false,
    },
    permissions: DEFAULT_ROLE_PERMISSIONS.ADMIN,
  };

  return NextResponse.json({
    success: true,
    data: dashboardPayload,
  });
}
