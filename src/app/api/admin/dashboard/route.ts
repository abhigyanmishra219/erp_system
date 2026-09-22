import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/auth/permissions";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import Subject from "@/models/Subject";
import connectToDatabase from "@/lib/db";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) {
    return auth.response;
  }

  const { user, school, schoolId } = auth.context;

  await connectToDatabase();

  // Query real academic foundation statistics
  const [activeAcademicYear, totalAcademicYears, totalClasses, totalSections, totalSubjects] =
    await Promise.all([
      AcademicYear.findOne({ schoolId, status: "ACTIVE" }).lean(),
      AcademicYear.countDocuments({ schoolId }),
      Class.countDocuments({ schoolId, isActive: true }),
      Section.countDocuments({ schoolId, isActive: true }),
      Subject.countDocuments({ schoolId, isActive: true }),
    ]);

  // Compute real setup checklist
  const hasSchoolInfo = !!(school.name && (school.phone || school.email || school.address));
  const hasBranding = !!(school.branding?.logo || school.branding?.primaryColor || school.logo);
  const hasAcademicYear = !!(activeAcademicYear || totalAcademicYears > 0);
  const hasClasses = totalClasses > 0;
  const hasSections = totalSections > 0;
  const hasSubjects = totalSubjects > 0;
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
    setup: {
      items: setupItems,
      completedSteps,
      totalSteps,
      percentage: Math.round((completedSteps / totalSteps) * 100),
      isFullyConfigured: completedSteps === totalSteps,
    },
    capabilities: {
      academics: hasAcademicYear && hasClasses,
      students: false,
      teachers: false,
      parents: false,
      attendance: false,
      assignments: false,
      studyMaterial: false,
      exams: false,
      fees: false,
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
