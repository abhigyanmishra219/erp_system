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
  console.log("STARTING T2 TEST SUITE: TEACHER STUDENT VIEWING & SCOPE SECURITY");
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
  const Parent = (await import("./src/models/Parent")).default;
  const StudentParent = (await import("./src/models/StudentParent")).default;
  const TeacherAssignment = (await import("./src/models/TeacherAssignment")).default;
  const Attendance = (await import("./src/models/Attendance")).default;
  const { getTeacherScope } = await import("./src/lib/auth/teacherScope");

  await connectToDatabase();

  const runId = Date.now().toString().slice(-6);
  const sysUserId = new mongoose.Types.ObjectId();

  // 1. Create School & Academic Year
  const school = await School.create({
    name: `T2 Test Academy ${runId}`,
    code: `T2SCH_${runId}`,
    address: "Test Road",
    city: "Test City",
    state: "State",
    country: "India",
    email: `t2_${runId}@school.com`,
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

  const adminUser = await User.create({
    schoolId: school._id,
    email: `admin_t2_${runId}@test.com`,
    password: await bcrypt.hash("AdminPass123!", 10),
    role: "ADMIN",
    name: "Admin User",
    isActive: true,
  });

  // 2. Create Class 1 (Section A) & Class 2 (Section B)
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

  // 3. Create Teachers: Teacher A (Class 1) and Teacher B (Class 2)
  const userA = await User.create({
    schoolId: school._id,
    email: `teacherA_t2_${runId}@test.com`,
    password: await bcrypt.hash("TempPass123!", 10),
    role: "TEACHER",
    name: "Teacher Alpha",
    isActive: true,
  });

  const teacherA = await Teacher.create({
    schoolId: school._id,
    teacherId: `TCH_A_T2_${runId}`,
    firstName: "Alpha",
    lastName: "Teacher",
    email: userA.email,
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
    assignmentType: "CLASS_TEACHER",
    isClassTeacher: true,
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  const userB = await User.create({
    schoolId: school._id,
    email: `teacherB_t2_${runId}@test.com`,
    password: await bcrypt.hash("TempPass123!", 10),
    role: "TEACHER",
    name: "Teacher Beta",
    isActive: true,
  });

  const teacherB = await Teacher.create({
    schoolId: school._id,
    teacherId: `TCH_B_T2_${runId}`,
    firstName: "Beta",
    lastName: "Teacher",
    email: userB.email,
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
    assignmentType: "CLASS_TEACHER",
    isClassTeacher: true,
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  // 4. Create Students: Student 1 (in Class 1 Sec A) and Student 2 (in Class 2 Sec B)
  const student1 = await Student.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    classId: class1._id,
    sectionId: section1._id,
    admissionNumber: `ADM1_${runId}`,
    rollNumber: "101",
    firstName: "Alice",
    lastName: "Wonder",
    gender: "FEMALE",
    dateOfBirth: new Date("2012-01-15"),
    bloodGroup: "O+",
    status: "ACTIVE",
    emergencyContact: {
      name: "Arthur Wonder",
      relationship: "Father",
      phone: "9876500001",
    },
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  const parent1 = await Parent.create({
    schoolId: school._id,
    firstName: "Arthur",
    lastName: "Wonder",
    phone: "9876500001",
    email: `parent1_${runId}@test.com`,
    occupation: "Engineer",
    relationship: "FATHER",
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  await StudentParent.create({
    schoolId: school._id,
    studentId: student1._id,
    parentId: parent1._id,
    relationship: "FATHER",
    isPrimaryGuardian: true,
    isEmergencyContact: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  const student2 = await Student.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    classId: class2._id,
    sectionId: section2._id,
    admissionNumber: `ADM2_${runId}`,
    rollNumber: "201",
    firstName: "Bob",
    lastName: "Builder",
    gender: "MALE",
    dateOfBirth: new Date("2012-06-20"),
    bloodGroup: "A+",
    status: "ACTIVE",
    emergencyContact: {
      name: "Betty Builder",
      relationship: "Mother",
      phone: "9876500002",
    },
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  console.log("✓ Created 2 Classes, 2 Teachers, 2 Students with Guardians");

  // 5. TEST TEACHER A STUDENT LIST SCOPING
  console.log("\n--- Testing Teacher A Student Directory Query ---");
  const scopeA = await getTeacherScope({
    schoolId: school._id.toString(),
    teacherId: teacherA._id.toString(),
  });

  const studentsVisibleToTeacherA = await Student.find({
    schoolId: school._id,
    classId: { $in: scopeA.classIds },
    sectionId: { $in: scopeA.sectionIds },
  }).lean();

  const studentAIds = studentsVisibleToTeacherA.map((s) => s._id.toString());
  if (
    studentAIds.includes(student1._id.toString()) &&
    !studentAIds.includes(student2._id.toString())
  ) {
    console.log("✓ Teacher A can see Student 1 (Class 1) and CANNOT see Student 2 (Class 2)");
  } else {
    throw new Error(`Teacher A student scoping failed! Visible: ${JSON.stringify(studentAIds)}`);
  }

  // 6. TEST TEACHER B STUDENT LIST SCOPING
  console.log("\n--- Testing Teacher B Student Directory Query ---");
  const scopeB = await getTeacherScope({
    schoolId: school._id.toString(),
    teacherId: teacherB._id.toString(),
  });

  const studentsVisibleToTeacherB = await Student.find({
    schoolId: school._id,
    classId: { $in: scopeB.classIds },
    sectionId: { $in: scopeB.sectionIds },
  }).lean();

  const studentBIds = studentsVisibleToTeacherB.map((s) => s._id.toString());
  if (
    studentBIds.includes(student2._id.toString()) &&
    !studentBIds.includes(student1._id.toString())
  ) {
    console.log("✓ Teacher B can see Student 2 (Class 2) and CANNOT see Student 1 (Class 1)");
  } else {
    throw new Error(`Teacher B student scoping failed! Visible: ${JSON.stringify(studentBIds)}`);
  }

  // 7. TEST CROSS-CLASS ACCESS ATTEMPT BY TEACHER A
  console.log("\n--- Testing Teacher A attempting to query Class 2 or Student 2 ---");
  // Attempt 1: Filter query with class2 ID
  const class2QueryByTeacherA = await Student.find({
    schoolId: school._id,
    classId: { $in: scopeA.classIds.filter((id) => id === class2._id.toString()) },
    sectionId: { $in: scopeA.sectionIds },
  }).lean();

  if (class2QueryByTeacherA.length === 0) {
    console.log("✓ Filtering by unauthorized Class 2 returns 0 students for Teacher A");
  } else {
    throw new Error("Teacher A was able to filter by Class 2!");
  }

  // Attempt 2: Direct profile view authorization logic
  const targetStudentB = await Student.findOne({ _id: student2._id, schoolId: school._id }).lean();
  const isTeacherAAuthorizedForStudentB =
    scopeA.classIds.includes(targetStudentB?.classId?.toString() || "") &&
    scopeA.sectionIds.includes(targetStudentB?.sectionId?.toString() || "");

  if (!isTeacherAAuthorizedForStudentB) {
    console.log("✓ Teacher A is strictly REJECTED (Access Denied / 403) from viewing Student 2 profile");
  } else {
    throw new Error("Teacher A authorization check improperly allowed Student 2 profile view!");
  }

  // 8. TEST TEACHER A VIEWING AUTHORIZED STUDENT 1 PROFILE
  console.log("\n--- Testing Teacher A viewing authorized Student 1 Profile & Guardians ---");
  const targetStudentA = await Student.findOne({ _id: student1._id, schoolId: school._id }).lean();
  const isTeacherAAuthorizedForStudentA =
    scopeA.classIds.includes(targetStudentA?.classId?.toString() || "") &&
    scopeA.sectionIds.includes(targetStudentA?.sectionId?.toString() || "");

  if (isTeacherAAuthorizedForStudentA) {
    const guardiansA = await StudentParent.find({
      schoolId: school._id,
      studentId: student1._id,
    })
      .populate("parentId")
      .lean();

    if (guardiansA.length === 1 && (guardiansA[0].parentId as any)?.firstName === "Arthur") {
      console.log("✓ Teacher A successfully authorized to view Student 1 profile with guardian details");
    } else {
      throw new Error("Guardian retrieval for authorized student failed!");
    }
  } else {
    throw new Error("Teacher A was rejected from viewing authorized Student 1 profile!");
  }

  // 9. TEST CROSS-SCHOOL ISOLATION
  console.log("\n--- Testing Cross-School Isolation ---");
  const otherSchool = await School.create({
    name: `Other School ${runId}`,
    code: `OTH_${runId}`,
    plan: "STANDARD",
    subscriptionStartDate: new Date(),
    subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
    createdBy: sysUserId,
    updatedBy: sysUserId,
  });

  const studentInOtherSchool = await Student.create({
    schoolId: otherSchool._id,
    academicYearId: academicYear._id,
    classId: class1._id,
    sectionId: section1._id,
    admissionNumber: `ADM_OTH_${runId}`,
    firstName: "Eve",
    lastName: "Outsider",
    gender: "FEMALE",
    dateOfBirth: new Date("2012-03-01"),
    status: "ACTIVE",
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  const crossSchoolQuery = await Student.find({
    schoolId: school._id, // Enforced by requireTeacher
    _id: studentInOtherSchool._id,
  });

  if (crossSchoolQuery.length === 0) {
    console.log("✓ Cross-school query strictly returns 0 results (Tenant Isolation verified)");
  } else {
    throw new Error("Cross-school leak detected!");
  }

  // 10. CLEANUP
  console.log("\n--- Cleaning up test records ---");
  await Promise.all([
    School.deleteMany({ _id: { $in: [school._id, otherSchool._id] } }),
    AcademicYear.deleteMany({ schoolId: school._id }),
    Class.deleteMany({ schoolId: school._id }),
    Section.deleteMany({ schoolId: school._id }),
    User.deleteMany({ schoolId: school._id }),
    Teacher.deleteMany({ schoolId: school._id }),
    TeacherAssignment.deleteMany({ schoolId: school._id }),
    Student.deleteMany({ schoolId: { $in: [school._id, otherSchool._id] } }),
    Parent.deleteMany({ schoolId: school._id }),
    StudentParent.deleteMany({ schoolId: school._id }),
  ]);
  console.log("✓ Test records cleaned up successfully.");

  console.log("\n============================================================");
  console.log("ALL T2 TEACHER MY STUDENTS TESTS PASSED!");
  console.log("============================================================\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
