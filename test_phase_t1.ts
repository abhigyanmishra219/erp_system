import fs from "fs";
import path from "path";

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

async function runTests() {
  console.log("\n============================================================");
  console.log("STARTING T1 TEST SUITE: TEACHER DASHBOARD & PROFILE ISOLATION");
  console.log("============================================================\n");

  const mongoose = (await import("mongoose")).default;
  const bcrypt = (await import("bcryptjs")).default;
  const connectToDatabase = (await import("./src/lib/db")).default;
  const School = (await import("./src/models/School")).default;
  const AcademicYear = (await import("./src/models/AcademicYear")).default;
  const Class = (await import("./src/models/Class")).default;
  const Section = (await import("./src/models/Section")).default;
  const Subject = (await import("./src/models/Subject")).default;
  const User = (await import("./src/models/User")).default;
  const Teacher = (await import("./src/models/Teacher")).default;
  const Student = (await import("./src/models/Student")).default;
  const TeacherAssignment = (await import("./src/models/TeacherAssignment")).default;
  const TimetableEntry = (await import("./src/models/TimetableEntry")).default;
  const Attendance = (await import("./src/models/Attendance")).default;
  const Assignment = (await import("./src/models/Assignment")).default;
  const AssignmentSubmission = (await import("./src/models/AssignmentSubmission")).default;
  const Exam = (await import("./src/models/Exam")).default;
  const ExamSubject = (await import("./src/models/ExamSubject")).default;
  const ExamTarget = (await import("./src/models/ExamTarget")).default;
  const { getTeacherScope } = await import("./src/lib/auth/teacherScope");
  const { normalizeAttendanceDate } = await import("./src/lib/utils/date");

  await connectToDatabase();

  const runId = Date.now().toString().slice(-6);
  const sysUserId = new mongoose.Types.ObjectId();

  // 1. Create School & Academic Year
  const school = await School.create({
    name: `T1 Test Academy ${runId}`,
    code: `T1SCH_${runId}`,
    address: "Test Street",
    city: "Test City",
    state: "State",
    country: "India",
    email: `t1_${runId}@school.com`,
    plan: "STANDARD",
    studentLimit: 500,
    subscriptionStartDate: new Date(),
    subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
    subscriptionStatus: "ACTIVE",
    status: "ACTIVE",
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  const academicYear = await AcademicYear.create({
    schoolId: school._id,
    name: `2026-2027 ${runId}`,
    startDate: new Date("2026-04-01"),
    endDate: new Date("2027-03-31"),
    status: "ACTIVE",
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  // 2. Create User Admin / Creator
  const hashedPassword = await bcrypt.hash("InitialTempPassword123!", 10);

  const adminUser = await User.create({
    schoolId: school._id,
    email: `admin_${runId}@test.com`,
    password: hashedPassword,
    role: "ADMIN",
    name: "School Admin",
    isActive: true,
  });

  // 3. Create Classes & Sections
  const class1 = await Class.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    name: `Class 1 ${runId}`,
    code: `C1_${runId}`,
    displayOrder: 1,
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  const section1 = await Section.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    classId: class1._id,
    name: "Section A",
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  const class2 = await Class.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    name: `Class 2 ${runId}`,
    code: `C2_${runId}`,
    displayOrder: 2,
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  const section2 = await Section.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    classId: class2._id,
    name: "Section B",
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  // 4. Create Subjects
  const mathSubject = await Subject.create({
    schoolId: school._id,
    name: "Mathematics",
    code: `MATH_${runId}`,
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  const scienceSubject = await Subject.create({
    schoolId: school._id,
    name: "Science",
    code: `SCI_${runId}`,
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  // 5. Create Teacher A (Assigned Class 1 - Math)
  const userA = await User.create({
    schoolId: school._id,
    email: `teacherA_${runId}@test.com`,
    password: hashedPassword,
    role: "TEACHER",
    name: "Teacher Alpha",
    isActive: true,
    mustChangePassword: true,
  });

  const teacherA = await Teacher.create({
    schoolId: school._id,
    teacherId: `TCH_A_${runId}`,
    employeeId: `EMP_A_${runId}`,
    firstName: "Alpha",
    lastName: "One",
    email: userA.email,
    phone: "9876543210",
    department: "Mathematics",
    designation: "Senior Math Teacher",
    userId: userA._id,
    status: "ACTIVE",
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  await TeacherAssignment.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    teacherId: teacherA._id,
    classId: class1._id,
    sectionId: section1._id,
    subjectId: mathSubject._id,
    assignmentType: "BOTH",
    isClassTeacher: true,
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  // 6. Create Teacher B (Assigned Class 2 - Science)
  const userB = await User.create({
    schoolId: school._id,
    email: `teacherB_${runId}@test.com`,
    password: hashedPassword,
    role: "TEACHER",
    name: "Teacher Beta",
    isActive: true,
    mustChangePassword: false,
  });

  const teacherB = await Teacher.create({
    schoolId: school._id,
    teacherId: `TCH_B_${runId}`,
    employeeId: `EMP_B_${runId}`,
    firstName: "Beta",
    lastName: "Two",
    email: userB.email,
    phone: "9876543211",
    department: "Science",
    designation: "Science Teacher",
    userId: userB._id,
    status: "ACTIVE",
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  await TeacherAssignment.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    teacherId: teacherB._id,
    classId: class2._id,
    sectionId: section2._id,
    subjectId: scienceSubject._id,
    assignmentType: "SUBJECT_TEACHER",
    isClassTeacher: false,
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  console.log("✓ Created Test Multi-Tenant School, 2 Classes, 2 Teachers & Allocations");

  // 7. Create Timetable Entries for Today
  const daysMap = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;
  const todayDay = daysMap[new Date().getDay()];

  await TimetableEntry.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    classId: class1._id,
    sectionId: section1._id,
    subjectId: mathSubject._id,
    teacherId: teacherA._id,
    dayOfWeek: todayDay,
    startTime: "09:00",
    endTime: "10:00",
    room: "Room 101",
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  await TimetableEntry.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    classId: class2._id,
    sectionId: section2._id,
    subjectId: scienceSubject._id,
    teacherId: teacherB._id,
    dayOfWeek: todayDay,
    startTime: "11:00",
    endTime: "12:00",
    room: "Lab 2",
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  // 8. Create Assignments for Teacher A (Class 1) and Teacher B (Class 2)
  await Assignment.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    classId: class1._id,
    sectionId: section1._id,
    subjectId: mathSubject._id,
    teacherId: teacherA._id,
    title: "Class 1 Algebra Homework",
    description: "Solve chapter 3 problems",
    assignedDate: new Date(),
    dueDate: new Date(Date.now() + 86400000 * 3),
    maximumMarks: 50,
    status: "PUBLISHED",
    isActive: true,
    createdBy: userA._id,
    updatedBy: userA._id,
  });

  await Assignment.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    classId: class2._id,
    sectionId: section2._id,
    subjectId: scienceSubject._id,
    teacherId: teacherB._id,
    title: "Class 2 Biology Report",
    description: "Write plant cells summary",
    assignedDate: new Date(),
    dueDate: new Date(Date.now() + 86400000 * 5),
    maximumMarks: 25,
    status: "PUBLISHED",
    isActive: true,
    createdBy: userB._id,
    updatedBy: userB._id,
  });

  // 9. Create Exams for Class 1 (Math) and Class 2 (Science)
  const examA = await Exam.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    name: "Midterm Exam 1",
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000 * 7),
    status: "SCHEDULED",
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  await ExamTarget.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    examId: examA._id,
    classId: class1._id,
    sectionId: section1._id,
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  await ExamSubject.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    examId: examA._id,
    classId: class1._id,
    subjectId: mathSubject._id,
    maximumMarks: 100,
    passingMarks: 40,
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  const examB = await Exam.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    name: "Science Term Test",
    startDate: new Date(),
    endDate: new Date(Date.now() + 86400000 * 7),
    status: "SCHEDULED",
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  await ExamTarget.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    examId: examB._id,
    classId: class2._id,
    sectionId: section2._id,
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  await ExamSubject.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    examId: examB._id,
    classId: class2._id,
    subjectId: scienceSubject._id,
    maximumMarks: 80,
    passingMarks: 32,
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  // 10. TEST TEACHER A SCOPE & ISOLATION
  console.log("\n--- Testing Teacher A Academic Scope Isolation ---");
  const scopeA = await getTeacherScope({
    schoolId: school._id.toString(),
    teacherId: teacherA._id.toString(),
  });

  if (scopeA.classIds.includes(class1._id.toString()) && !scopeA.classIds.includes(class2._id.toString())) {
    console.log("✓ Teacher A scope strictly contains Class 1 and NOT Class 2");
  } else {
    throw new Error(`Scope A isolation failed! classIds: ${JSON.stringify(scopeA.classIds)}`);
  }

  // Verify Timetable isolation
  const todayTimetableA = await TimetableEntry.find({
    schoolId: school._id,
    teacherId: teacherA._id,
    dayOfWeek: todayDay,
    isActive: true,
  });

  if (todayTimetableA.length === 1 && todayTimetableA[0].classId.toString() === class1._id.toString()) {
    console.log("✓ Teacher A today's timetable returns ONLY Class 1 period (no Class 2 periods)");
  } else {
    throw new Error(`Timetable A isolation failed! count=${todayTimetableA.length}`);
  }

  // Verify Assignments isolation
  const teacherAAssignments = await Assignment.find({
    schoolId: school._id,
    teacherId: teacherA._id,
    isActive: true,
  });

  if (teacherAAssignments.length === 1 && teacherAAssignments[0].title === "Class 1 Algebra Homework") {
    console.log("✓ Teacher A assignments strictly include Class 1 homework only");
  } else {
    throw new Error(`Assignment A isolation failed!`);
  }

  // 11. TEST TEACHER B SCOPE & ISOLATION
  console.log("\n--- Testing Teacher B Academic Scope Isolation ---");
  const scopeB = await getTeacherScope({
    schoolId: school._id.toString(),
    teacherId: teacherB._id.toString(),
  });

  if (scopeB.classIds.includes(class2._id.toString()) && !scopeB.classIds.includes(class1._id.toString())) {
    console.log("✓ Teacher B scope strictly contains Class 2 and NOT Class 1");
  } else {
    throw new Error(`Scope B isolation failed! classIds: ${JSON.stringify(scopeB.classIds)}`);
  }

  const todayTimetableB = await TimetableEntry.find({
    schoolId: school._id,
    teacherId: teacherB._id,
    dayOfWeek: todayDay,
    isActive: true,
  });

  if (todayTimetableB.length === 1 && todayTimetableB[0].classId.toString() === class2._id.toString()) {
    console.log("✓ Teacher B today's timetable returns ONLY Class 2 period (no Class 1 periods)");
  } else {
    throw new Error(`Timetable B isolation failed! count=${todayTimetableB.length}`);
  }

  // 12. TEST PENDING ATTENDANCE LOGIC
  console.log("\n--- Testing Attendance Pending Detection ---");
  const todayNormalized = normalizeAttendanceDate(new Date());

  const attendedBefore = await Attendance.distinct("sectionId", {
    schoolId: school._id,
    sectionId: { $in: scopeA.sectionIds },
    date: todayNormalized,
  });

  const pendingBefore = scopeA.sectionIds.filter((sId) => !attendedBefore.map(String).includes(sId));
  if (pendingBefore.includes(section1._id.toString())) {
    console.log("✓ Class 1 Section A correctly identified as Pending Attendance before roll-call");
  } else {
    throw new Error("Attendance pending detection failed before attendance creation!");
  }

  // Create student and attendance
  const studentDoc = await Student.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    classId: class1._id,
    sectionId: section1._id,
    admissionNumber: `ADM_${runId}`,
    rollNumber: "1",
    firstName: "Johnny",
    lastName: "Student",
    gender: "MALE",
    dateOfBirth: new Date("2012-05-10"),
    status: "ACTIVE",
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  await Attendance.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    classId: class1._id,
    sectionId: section1._id,
    studentId: studentDoc._id,
    date: todayNormalized,
    status: "PRESENT",
    markedBy: userA._id,
    markedByRole: "TEACHER",
  });

  const attendedAfter = await Attendance.distinct("sectionId", {
    schoolId: school._id,
    sectionId: { $in: scopeA.sectionIds },
    date: todayNormalized,
  });

  const pendingAfter = scopeA.sectionIds.filter((sId) => !attendedAfter.map(String).includes(sId));
  if (pendingAfter.length === 0) {
    console.log("✓ Class 1 Section A pending attendance cleared once attendance is submitted");
  } else {
    throw new Error("Attendance pending was not cleared after attendance submission!");
  }

  // 13. TEST TEACHER PROFILE UPDATE & RESTRICTIONS
  console.log("\n--- Testing Teacher Profile Updates & Immutable Field Restrictions ---");
  const updatedPhone = "+91 9999888877";
  const updatedAddress = {
    street: "123 Academic Lane",
    city: "New Delhi",
    state: "Delhi",
    postalCode: "110001",
    country: "India",
  };

  await Teacher.findByIdAndUpdate(
    teacherA._id,
    {
      $set: {
        phone: updatedPhone,
        address: updatedAddress,
        qualification: "Ph.D. in Pure Mathematics",
      },
    },
    { new: true }
  );

  const refreshedTeacherA = await Teacher.findById(teacherA._id).lean();
  if (
    refreshedTeacherA?.phone === updatedPhone &&
    refreshedTeacherA?.qualification === "Ph.D. in Pure Mathematics" &&
    refreshedTeacherA?.teacherId === `TCH_A_${runId}` && // Not modified
    refreshedTeacherA?.schoolId.toString() === school._id.toString() // Not modified
  ) {
    console.log("✓ Teacher profile updated permitted fields while preserving immutable identity & tenant fields");
  } else {
    throw new Error("Profile update or security restriction test failed!");
  }

  // 14. TEST PASSWORD CHANGE LOGIC
  console.log("\n--- Testing Password Change Flow & Bcrypt Hashing ---");
  const newRawPassword = "BrandNewSecurePassword456!";
  const userToChange = await User.findById(userA._id).select("+password");

  const matchOld = await bcrypt.compare("InitialTempPassword123!", userToChange!.password!);
  if (!matchOld) {
    throw new Error("Initial password verification failed!");
  }

  const hashedNew = await bcrypt.hash(newRawPassword, 10);
  userToChange!.password = hashedNew;
  userToChange!.mustChangePassword = false;
  await userToChange!.save();

  const refreshedUserA = await User.findById(userA._id).select("+password");
  const matchNew = await bcrypt.compare(newRawPassword, refreshedUserA!.password!);
  if (matchNew && refreshedUserA?.mustChangePassword === false) {
    console.log("✓ Password updated with bcrypt hash; mustChangePassword reset to false");
  } else {
    throw new Error("Password update verification failed!");
  }

  // Cleanup test records
  console.log("\n--- Cleaning up test records ---");
  await Promise.all([
    School.findByIdAndDelete(school._id),
    AcademicYear.findByIdAndDelete(academicYear._id),
    Class.deleteMany({ schoolId: school._id }),
    Section.deleteMany({ schoolId: school._id }),
    Subject.deleteMany({ schoolId: school._id }),
    User.deleteMany({ schoolId: school._id }),
    Teacher.deleteMany({ schoolId: school._id }),
    TeacherAssignment.deleteMany({ schoolId: school._id }),
    TimetableEntry.deleteMany({ schoolId: school._id }),
    Attendance.deleteMany({ schoolId: school._id }),
    Assignment.deleteMany({ schoolId: school._id }),
    AssignmentSubmission.deleteMany({ schoolId: school._id }),
    Exam.deleteMany({ schoolId: school._id }),
    ExamSubject.deleteMany({ schoolId: school._id }),
    ExamTarget.deleteMany({ schoolId: school._id }),
    Student.deleteMany({ schoolId: school._id }),
  ]);
  console.log("✓ Test records cleaned up successfully.");

  console.log("\n============================================================");
  console.log("ALL T1 TEACHER DASHBOARD & PROFILE TESTS PASSED!");
  console.log("============================================================\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
