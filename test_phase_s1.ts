import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, "utf-8");
    envConfig.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...values] = trimmed.split("=");
        if (key && values.length > 0) {
          process.env[key.trim()] = values.join("=").trim().replace(/^["']|["']$/g, "");
        }
      }
    });
  }
} catch {
  // ignore
}



function makeRequest(url: string, token: string, method: string = "GET", body?: any) {
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    cookie: `erp_auth_token=${token}; token=${token}`,
  };
  if (body) {
    headers["content-type"] = "application/json";
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function runS1TestSuite() {
  console.log("============================================================");
  console.log("🧪 STARTING S1: STUDENT DASHBOARD & PROFILE TEST SUITE");
  console.log("============================================================\n");

  const mongoose: any = (await import("mongoose")).default;
  const connectToDatabase: any = (await import("./src/lib/db")).default;
  const User: any = (await import("./src/models/User")).default;
  const School: any = (await import("./src/models/School")).default;
  const AcademicYear: any = (await import("./src/models/AcademicYear")).default;
  const Class: any = (await import("./src/models/Class")).default;
  const Section: any = (await import("./src/models/Section")).default;
  const Subject: any = (await import("./src/models/Subject")).default;
  const Student: any = (await import("./src/models/Student")).default;
  const Teacher: any = (await import("./src/models/Teacher")).default;
  const Parent: any = (await import("./src/models/Parent")).default;
  const StudentParent: any = (await import("./src/models/StudentParent")).default;
  const TimetableEntry: any = (await import("./src/models/TimetableEntry")).default;
  const Attendance: any = (await import("./src/models/Attendance")).default;
  const Assignment: any = (await import("./src/models/Assignment")).default;
  const AssignmentSubmission: any = (await import("./src/models/AssignmentSubmission")).default;
  const Exam: any = (await import("./src/models/Exam")).default;
  const ExamTarget: any = (await import("./src/models/ExamTarget")).default;
  const ExamSubject: any = (await import("./src/models/ExamSubject")).default;
  const ExamResult: any = (await import("./src/models/ExamResult")).default;
  const Notice: any = (await import("./src/models/Notice")).default;
  const Notification: any = (await import("./src/models/Notification")).default;
  const AuditLog: any = (await import("./src/models/AuditLog")).default;

  const { createToken } = await import("./src/lib/jwt");
  const { GET: getStudentDashboard } = (await import("./src/app/api/student/dashboard/route")) as any;
  const { GET: getStudentProfile, PATCH: patchStudentProfile } = (await import("./src/app/api/student/profile/route")) as any;

  await connectToDatabase();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ""}`);
      failed++;
    }
  }

  const timestamp = Date.now().toString().slice(-6);
  const adminId = new mongoose.Types.ObjectId();

  try {
    // 1. Setup School & Academic Year
    const school = await School.create({
      name: `S1 Test Academy ${timestamp}`,
      code: `S1_${timestamp}`,
      status: "ACTIVE",
      address: "100 Academic Road",
      city: "Bangalore",
      state: "Karnataka",
      country: "India",
      phone: "1234567890",
      email: `s1_school_${timestamp}@example.com`,
      plan: "STANDARD",
      studentLimit: 500,
      subscriptionStartDate: new Date(),
      subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
      subscriptionStatus: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    const academicYear = await AcademicYear.create({
      schoolId: school._id,
      name: `2026-2027 ${timestamp}`,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: new mongoose.Types.ObjectId(),
      updatedBy: new mongoose.Types.ObjectId(),
    });

    // 2. Setup Classes & Sections
    // Class A (Grade 10)
    const classA = await Class.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      name: `Class 10-${timestamp}`,
      code: `C10-${timestamp}`.slice(0, 10),
      grade: "10",
      createdBy: adminId,
      updatedBy: adminId,
    });

    const sectionA = await Section.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: classA._id,
      name: "A",
      capacity: 35,
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Class B (Grade 9)
    const classB = await Class.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      name: `Class 9-${timestamp}`,
      code: `C9-${timestamp}`.slice(0, 10),
      grade: "9",
      createdBy: adminId,
      updatedBy: adminId,
    });

    const sectionB = await Section.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: classB._id,
      name: "B",
      capacity: 30,
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Subjects
    const subjectMath = await Subject.create({
      schoolId: school._id,
      name: `Advanced Mathematics ${timestamp}`,
      code: `MATH-${timestamp}`.slice(0, 10),
      type: "THEORY",
      createdBy: new mongoose.Types.ObjectId(),
      updatedBy: new mongoose.Types.ObjectId(),
    });

    const subjectScience = await Subject.create({
      schoolId: school._id,
      name: `Physics & Chemistry ${timestamp}`,
      code: `SCI-${timestamp}`.slice(0, 10),
      type: "BOTH",
      createdBy: new mongoose.Types.ObjectId(),
      updatedBy: new mongoose.Types.ObjectId(),
    });

    // Admin & Teacher Users
    const adminUser = await User.create({
      email: `s1_admin_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "ADMIN",
      schoolId: school._id,
      status: "ACTIVE",
    });

    const teacherUser = await User.create({
      email: `s1_teacher_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "TEACHER",
      schoolId: school._id,
      status: "ACTIVE",
    });

    const teacherDoc = await Teacher.create({
      schoolId: school._id,
      userId: teacherUser._id,
      teacherId: `TCH-${timestamp}`,
      firstName: "Albert",
      lastName: "Einstein",
      gender: "MALE",
      joiningDate: new Date(),
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });

    // 3. Setup Student A (Class 10-A)
    const userA = await User.create({
      email: `studentA_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "STUDENT",
      schoolId: school._id,
      status: "ACTIVE",
    });

    const studentA = await Student.create({
      schoolId: school._id,
      userId: userA._id,
      admissionNumber: `ADM-A-${timestamp}`.slice(0, 15),
      studentId: `STU-A-${timestamp}`.slice(0, 15),
      rollNumber: "101",
      firstName: "Alice",
      lastName: "Wonderland",
      dateOfBirth: new Date("2010-05-15"),
      gender: "FEMALE",
      bloodGroup: "O+",
      academicYearId: academicYear._id,
      classId: classA._id,
      sectionId: sectionA._id,
      admissionDate: new Date("2024-04-01"),
      status: "ACTIVE",
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });

    // 4. Setup Student B (Class 9-B)
    const userB = await User.create({
      email: `studentB_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "STUDENT",
      schoolId: school._id,
      status: "ACTIVE",
    });

    const studentB = await Student.create({
      schoolId: school._id,
      userId: userB._id,
      admissionNumber: `ADM-B-${timestamp}`.slice(0, 15),
      studentId: `STU-B-${timestamp}`.slice(0, 15),
      rollNumber: "202",
      firstName: "Bob",
      lastName: "Marley",
      dateOfBirth: new Date("2011-02-20"),
      gender: "MALE",
      bloodGroup: "A+",
      academicYearId: academicYear._id,
      classId: classB._id,
      sectionId: sectionB._id,
      admissionDate: new Date("2024-04-01"),
      status: "ACTIVE",
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });

    // Linked Parent for Student A
    const parentUser = await User.create({
      email: `parentA_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "PARENT",
      schoolId: school._id,
      status: "ACTIVE",
    });

    const parentDoc = await Parent.create({
      schoolId: school._id,
      userId: parentUser._id,
      firstName: "Charles",
      lastName: "Wonderland",
      gender: "MALE",
      email: parentUser.email,
      phone: "9876543210",
      occupation: "Engineer",
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });

    await StudentParent.create({
      schoolId: school._id,
      studentId: studentA._id,
      parentId: parentDoc._id,
      relationship: "FATHER",
      isPrimaryGuardian: true,
      isEmergencyContact: true,
      canPickup: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });

    // 5. Create Academic Data for Student A (Class 10-A)
    const daysMap = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;
    const todayDayOfWeek = daysMap[new Date().getDay()];

    // Timetable entry for today in Class 10-A
    await TimetableEntry.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: classA._id,
      sectionId: sectionA._id,
      subjectId: subjectMath._id,
      teacherId: teacherDoc._id,
      dayOfWeek: todayDayOfWeek,
      startTime: "09:00",
      endTime: "10:00",
      room: "Room 101",
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });

    // Attendance for Student A (3 days: 2 Present, 1 Late)
    await Attendance.create([
      {
        schoolId: school._id,
        academicYearId: academicYear._id,
        classId: classA._id,
        sectionId: sectionA._id,
        studentId: studentA._id,
        date: new Date("2026-09-20"),
        status: "PRESENT",
        markedBy: teacherUser._id,
        markedByRole: "TEACHER",
        isLocked: false,
      },
      {
        schoolId: school._id,
        academicYearId: academicYear._id,
        classId: classA._id,
        sectionId: sectionA._id,
        studentId: studentA._id,
        date: new Date("2026-09-21"),
        status: "PRESENT",
        markedBy: teacherUser._id,
        markedByRole: "TEACHER",
        isLocked: false,
      },
      {
        schoolId: school._id,
        academicYearId: academicYear._id,
        classId: classA._id,
        sectionId: sectionA._id,
        studentId: studentA._id,
        date: new Date("2026-09-22"),
        status: "LATE",
        markedBy: teacherUser._id,
        markedByRole: "TEACHER",
        isLocked: false,
      },
    ]);

    // Attendance for Student B (1 day: ABSENT)
    await Attendance.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: classB._id,
      sectionId: sectionB._id,
      studentId: studentB._id,
      date: new Date("2026-09-22"),
      status: "ABSENT",
      markedBy: teacherUser._id,
      markedByRole: "TEACHER",
      isLocked: false,
    });

    // Assignment for Class 10-A
    const assignmentA = await Assignment.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: classA._id,
      sectionId: sectionA._id,
      subjectId: subjectMath._id,
      teacherId: teacherDoc._id,
      title: "Trigonometry Problems Chapter 5",
      description: "Solve problems 1 to 20 from textbook.",
      assignedDate: new Date(),
      dueDate: new Date(Date.now() + 86400000 * 5),
      maximumMarks: 20,
      status: "PUBLISHED",
      isActive: true,
      createdBy: teacherUser._id,
      updatedBy: teacherUser._id,
    });

    // Student A submits assignment
    await AssignmentSubmission.create({
      schoolId: school._id,
      assignmentId: assignmentA._id,
      studentId: studentA._id,
      academicYearId: academicYear._id,
      classId: classA._id,
      sectionId: sectionA._id,
      submittedAt: new Date(),
      status: "SUBMITTED",
      content: "Solutions attached for all 20 problems.",
      attachments: [],
    });

    // Exam for Class 10-A
    const examA = await Exam.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      name: "Mid-Term Examination 2026",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-10"),
      status: "SCHEDULED",
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });

    await ExamTarget.create({
      schoolId: school._id,
      examId: examA._id,
      academicYearId: academicYear._id,
      classId: classA._id,
      sectionId: sectionA._id,
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });

    const examSubA = await ExamSubject.create({
      schoolId: school._id,
      examId: examA._id,
      academicYearId: academicYear._id,
      classId: classA._id,
      subjectId: subjectMath._id,
      examDate: new Date("2026-10-02"),
      maximumMarks: 100,
      passingMarks: 40,
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });

    // Published Result for Student A
    await ExamResult.create({
      schoolId: school._id,
      examId: examA._id,
      examSubjectId: examSubA._id,
      academicYearId: academicYear._id,
      studentId: studentA._id,
      classId: classA._id,
      sectionId: sectionA._id,
      subjectId: subjectMath._id,
      marks: 95,
      grade: "A+",
      isPassed: true,
      status: "PUBLISHED",
      enteredBy: teacherUser._id,
      publishedAt: new Date(),
    });

    // Notice for Students
    await Notice.create({
      schoolId: school._id,
      title: "Annual Science Exhibition",
      description: "Registration is now open for the annual science project exhibition.",
      targetType: "STUDENTS",
      targetRoles: ["STUDENT"],
      status: "PUBLISHED",
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });

    // Notification for Student A
    await Notification.create({
      schoolId: school._id,
      recipientUserId: userA._id,
      type: "ASSIGNMENT",
      title: "New Assignment Posted",
      message: "Trigonometry Problems Chapter 5 is now assigned.",
      referenceType: "ASSIGNMENT",
      referenceId: assignmentA._id.toString(),
      isRead: false,
    });

    const tokenA = createToken({
      userId: userA._id.toString(),
      email: userA.email,
      role: "STUDENT",
    });

    const tokenB = createToken({
      userId: userB._id.toString(),
      email: userB.email,
      role: "STUDENT",
    });

    console.log("--- 1. Testing Student A Dashboard (/api/student/dashboard) ---");
    const dashResA = await getStudentDashboard(makeRequest("/api/student/dashboard", tokenA));
    const dashDataA = await dashResA.json();

    assert(dashResA.status === 200, "Student A dashboard returns HTTP 200");
    assert(dashDataA.success === true, "Dashboard response success is true");
    assert(dashDataA.data.profileSummary.admissionNumber === studentA.admissionNumber, "Student A profile summary has correct admission number");
    assert(dashDataA.data.profileSummary.class.name.includes("Class 10"), "Student A class is Class 10");
    assert(dashDataA.data.attendance.summary.totalDays === 3, "Student A total attendance days is 3");
    assert(dashDataA.data.attendance.summary.present === 2, "Student A present days is 2");
    assert(dashDataA.data.attendance.summary.percentage === 100, "Student A attendance percentage is 100% (Present + Late)");
    assert(dashDataA.data.todayTimetable.length >= 1, "Student A has today's timetable entry");
    assert(dashDataA.data.todayTimetable[0].subjectName.includes("Mathematics"), "Student A today subject is Mathematics");
    assert(dashDataA.data.assignments.total === 1, "Student A has 1 active assignment");
    assert(dashDataA.data.assignments.list[0].submissionStatus === "SUBMITTED", "Student A assignment submission status is SUBMITTED");
    assert(dashDataA.data.upcomingExams.length === 1, "Student A has 1 upcoming exam");
    assert(dashDataA.data.recentResults.length === 1, "Student A has 1 published result");
    assert(dashDataA.data.recentResults[0].marks === 95, "Student A published result marks is 95");
    assert(dashDataA.data.recentResults[0].grade === "A+", "Student A published result grade is A+");
    assert(dashDataA.data.recentNotices.length >= 1, "Student A receives active notices");
    assert(dashDataA.data.notifications.unreadCount === 1, "Student A has 1 unread notification");

    console.log("\n--- 2. Testing Student B Isolation (Zero Cross-Student Leaks) ---");
    const dashResB = await getStudentDashboard(makeRequest("/api/student/dashboard", tokenB));
    const dashDataB = await dashResB.json();

    assert(dashResB.status === 200, "Student B dashboard returns HTTP 200");
    assert(dashDataB.data.profileSummary.admissionNumber === studentB.admissionNumber, "Student B sees own admission number");
    assert(dashDataB.data.profileSummary.class.name.includes("Class 9"), "Student B class is Class 9");
    assert(dashDataB.data.attendance.summary.totalDays === 1, "Student B total attendance days is 1");
    assert(dashDataB.data.attendance.summary.absent === 1, "Student B absent days is 1 (doesn't see Student A's attendance)");
    assert(dashDataB.data.assignments.total === 0, "Student B has 0 assignments (Class 10 assignment isolated)");
    assert(dashDataB.data.upcomingExams.length === 0, "Student B has 0 upcoming exams (Class 10 exam isolated)");
    assert(dashDataB.data.recentResults.length === 0, "Student B has 0 published results (Student A's result isolated)");
    assert(dashDataB.data.notifications.unreadCount === 0, "Student B has 0 notifications (Student A's notification isolated)");

    console.log("\n--- 3. Testing Student Profile GET & Linked Parents (/api/student/profile) ---");
    const profResA = await getStudentProfile(makeRequest("/api/student/profile", tokenA));
    const profDataA = await profResA.json();

    assert(profResA.status === 200, "Student Profile GET returns HTTP 200");
    assert(profDataA.data.student.fullName === "Alice Wonderland", "Profile has student full name");
    assert(profDataA.data.parents.length === 1, "Profile contains linked parent record");
    assert(profDataA.data.parents[0].relationship === "FATHER", "Parent relationship is FATHER");
    assert(profDataA.data.parents[0].parent.fullName === "Charles Wonderland", "Parent full name matches");
    assert(profDataA.data.school.name === school.name, "School branding is returned");

    console.log("\n--- 4. Testing Student Profile PATCH (Allowed Fields) ---");
    const patchAllowedRes = await patchStudentProfile(
      makeRequest("/api/student/profile", tokenA, "PATCH", {
        phone: "555-0199",
        bloodGroup: "AB+",
        address: {
          street: "456 New Castle Ave",
          city: "Metropolis",
          state: "NY",
          postalCode: "10001",
          country: "USA",
        },
        emergencyContact: {
          name: "Charles Wonderland",
          relationship: "Father",
          phone: "9876543210",
        },
        medicalInfo: {
          allergies: ["Peanuts", "Dust"],
          conditions: ["Mild Asthma"],
          medications: ["Inhaler as needed"],
          notes: "Carry inhaler to sports activities.",
        },
      })
    );
    const patchAllowedData = await patchAllowedRes.json();

    assert(patchAllowedRes.status === 200, "Profile update of allowed fields returns HTTP 200");
    assert(patchAllowedData.success === true, "Profile update success is true");

    // Verify in database
    const updatedStudentA = await Student.findById(studentA._id);
    assert(updatedStudentA?.phone === "555-0199", "Student phone updated in DB");
    assert(updatedStudentA?.bloodGroup === "AB+", "Student bloodGroup updated in DB");
    assert(updatedStudentA?.address?.city === "Metropolis", "Student address city updated in DB");
    assert(updatedStudentA?.medicalInfo?.allergies?.includes("Peanuts") === true, "Student medical allergies updated in DB");

    // Verify Audit Log
    const auditLog = await AuditLog.findOne({
      schoolId: school._id.toString(),
      userId: userA._id.toString(),
      action: "UPDATE",
      entityType: "STUDENT",
      entityId: studentA._id.toString(),
    });
    assert(auditLog !== null, "AuditLog recorded for student profile update");

    console.log("\n--- 5. Testing Student Profile PATCH (Forbidden Fields Protection) ---");
    // Attempt to modify admissionNumber
    const patchForbiddenRes1 = await patchStudentProfile(
      makeRequest("/api/student/profile", tokenA, "PATCH", {
        admissionNumber: "HACKED-ADM-999",
      })
    );
    assert(patchForbiddenRes1.status === 403, "Attempt to modify admissionNumber returns HTTP 403 Forbidden");

    // Attempt to modify classId
    const patchForbiddenRes2 = await patchStudentProfile(
      makeRequest("/api/student/profile", tokenA, "PATCH", {
        classId: classB._id.toString(),
      })
    );
    assert(patchForbiddenRes2.status === 403, "Attempt to modify classId returns HTTP 403 Forbidden");

    // Attempt to modify status
    const patchForbiddenRes3 = await patchStudentProfile(
      makeRequest("/api/student/profile", tokenA, "PATCH", {
        status: "GRADUATED",
      })
    );
    assert(patchForbiddenRes3.status === 403, "Attempt to modify status returns HTTP 403 Forbidden");

    // Attempt to modify rollNumber
    const patchForbiddenRes4 = await patchStudentProfile(
      makeRequest("/api/student/profile", tokenA, "PATCH", {
        rollNumber: "999",
      })
    );
    assert(patchForbiddenRes4.status === 403, "Attempt to modify rollNumber returns HTTP 403 Forbidden");

    // Clean up test data
    await Promise.all([
      School.findByIdAndDelete(school._id),
      AcademicYear.findByIdAndDelete(academicYear._id),
      Class.deleteMany({ schoolId: school._id }),
      Section.deleteMany({ schoolId: school._id }),
      Subject.deleteMany({ schoolId: school._id }),
      User.deleteMany({ schoolId: school._id }),
      Student.deleteMany({ schoolId: school._id }),
      Teacher.deleteMany({ schoolId: school._id }),
      Parent.deleteMany({ schoolId: school._id }),
      StudentParent.deleteMany({ schoolId: school._id }),
      TimetableEntry.deleteMany({ schoolId: school._id }),
      Attendance.deleteMany({ schoolId: school._id }),
      Assignment.deleteMany({ schoolId: school._id }),
      AssignmentSubmission.deleteMany({ schoolId: school._id }),
      Exam.deleteMany({ schoolId: school._id }),
      ExamTarget.deleteMany({ schoolId: school._id }),
      ExamSubject.deleteMany({ schoolId: school._id }),
      ExamResult.deleteMany({ schoolId: school._id }),
      Notice.deleteMany({ schoolId: school._id }),
      Notification.deleteMany({ schoolId: school._id }),
      AuditLog.deleteMany({ schoolId: school._id }),
    ]);

    console.log("\n============================================================");
    console.log(`📊 S1 TEST SUITE COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log("============================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error("❌ Fatal Error in S1 test suite:", err);
    process.exit(1);
  }
}

runS1TestSuite();
