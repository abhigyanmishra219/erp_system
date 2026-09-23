import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

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

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n============================================================");
  console.log("STARTING S0 TEST SUITE: STUDENT PORTAL FOUNDATION & SECURITY");
  console.log("============================================================\n");

  const mongoose = (await import("mongoose")).default;
  const connectToDatabase = (await import("./src/lib/db")).default;
  const School = (await import("./src/models/School")).default;
  const User = (await import("./src/models/User")).default;
  const AcademicYear = (await import("./src/models/AcademicYear")).default;
  const Class = (await import("./src/models/Class")).default;
  const Section = (await import("./src/models/Section")).default;
  const Student = (await import("./src/models/Student")).default;
  const { requireStudent } = await import("./src/lib/auth/requireStudent");
  const { createToken } = await import("./src/lib/jwt");
  const { NextRequest } = await import("next/server");
  const { GET: getStudentMe } = await import("./src/app/api/student/me/route");

  await connectToDatabase();

  const cleanupIds: { [key: string]: any[] } = {
    schools: [],
    users: [],
    academicYears: [],
    classes: [],
    sections: [],
    students: [],
  };

  try {
    const runId = Date.now().toString().slice(-6);
    const hashedPassword = await bcrypt.hash("Password123!", 10);
    const adminId = new mongoose.Types.ObjectId();

    // 1. Create School A & School B
    const schoolA = await School.create({
      name: `Student Alpha Academy ${runId}`,
      code: `STU_A_${runId}`,
      address: "Alpha Road",
      city: "Bangalore",
      state: "Karnataka",
      country: "India",
      email: `alpha_${runId}@school.com`,
      plan: "STANDARD",
      studentLimit: 500,
      subscriptionStartDate: new Date(),
      subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
      subscriptionStatus: "ACTIVE",
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.schools.push(schoolA._id);

    const schoolB = await School.create({
      name: `Student Beta Academy ${runId}`,
      code: `STU_B_${runId}`,
      address: "Beta Road",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      email: `beta_${runId}@school.com`,
      plan: "STANDARD",
      studentLimit: 500,
      subscriptionStartDate: new Date(),
      subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
      subscriptionStatus: "ACTIVE",
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.schools.push(schoolB._id);

    // Academic Years
    const yearA = await AcademicYear.create({
      schoolId: schoolA._id,
      name: `2026-2027 ${runId}`,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.academicYears.push(yearA._id);

    const yearB = await AcademicYear.create({
      schoolId: schoolB._id,
      name: `2026-2027 ${runId}`,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.academicYears.push(yearB._id);

    // Class & Section
    const classA = await Class.create({
      schoolId: schoolA._id,
      academicYearId: yearA._id,
      name: "Grade 10",
      code: `G10_${runId}`,
      displayOrder: 1,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.classes.push(classA._id);

    const secA = await Section.create({
      schoolId: schoolA._id,
      academicYearId: yearA._id,
      classId: classA._id,
      name: "Section A",
      capacity: 35,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.sections.push(secA._id);

    const classB = await Class.create({
      schoolId: schoolB._id,
      academicYearId: yearB._id,
      name: "Grade 10",
      code: `G10B_${runId}`,
      displayOrder: 1,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.classes.push(classB._id);

    const secB = await Section.create({
      schoolId: schoolB._id,
      academicYearId: yearB._id,
      classId: classB._id,
      name: "Section B",
      capacity: 35,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.sections.push(secB._id);

    // 2. Create Student Users & Student Documents
    // Student 1 (School A)
    const userStudentA1 = await User.create({
      name: "Alice Walker",
      email: `alice_${runId}@student.com`,
      password: hashedPassword,
      role: "STUDENT",
      schoolId: schoolA._id,
      isActive: true,
    });
    cleanupIds.users.push(userStudentA1._id);

    const studentDocA1: any = await Student.create({
      schoolId: schoolA._id,
      userId: userStudentA1._id,
      admissionNumber: `ADM_A1_${runId}`,
      rollNumber: "101",
      firstName: "Alice",
      lastName: "Walker",
      email: userStudentA1.email,
      dateOfBirth: new Date("2010-05-14"),
      gender: "FEMALE",
      bloodGroup: "O+",
      academicYearId: yearA._id,
      classId: classA._id,
      sectionId: secA._id,
      admissionDate: new Date("2026-04-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.students.push(studentDocA1._id);

    // Student 2 (School A)
    const userStudentA2 = await User.create({
      name: "Bob Builder",
      email: `bob_${runId}@student.com`,
      password: hashedPassword,
      role: "STUDENT",
      schoolId: schoolA._id,
      isActive: true,
    });
    cleanupIds.users.push(userStudentA2._id);

    const studentDocA2: any = await Student.create({
      schoolId: schoolA._id,
      userId: userStudentA2._id,
      admissionNumber: `ADM_A2_${runId}`,
      rollNumber: "102",
      firstName: "Bob",
      lastName: "Builder",
      email: userStudentA2.email,
      dateOfBirth: new Date("2010-08-20"),
      gender: "MALE",
      bloodGroup: "A+",
      academicYearId: yearA._id,
      classId: classA._id,
      sectionId: secA._id,
      admissionDate: new Date("2026-04-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.students.push(studentDocA2._id);

    // Student B1 (School B)
    const userStudentB1 = await User.create({
      name: "Charlie Brown",
      email: `charlie_${runId}@student.com`,
      password: hashedPassword,
      role: "STUDENT",
      schoolId: schoolB._id,
      isActive: true,
    });
    cleanupIds.users.push(userStudentB1._id);

    const studentDocB1: any = await Student.create({
      schoolId: schoolB._id,
      userId: userStudentB1._id,
      admissionNumber: `ADM_B1_${runId}`,
      rollNumber: "201",
      firstName: "Charlie",
      lastName: "Brown",
      email: userStudentB1.email,
      dateOfBirth: new Date("2010-11-10"),
      gender: "MALE",
      bloodGroup: "B+",
      academicYearId: yearB._id,
      classId: classB._id,
      sectionId: secB._id,
      admissionDate: new Date("2026-04-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.students.push(studentDocB1._id);

    // Other roles for security testing
    const userAdmin = await User.create({
      name: "Admin User",
      email: `admin_${runId}@school.com`,
      password: hashedPassword,
      role: "ADMIN",
      schoolId: schoolA._id,
      isActive: true,
    });
    cleanupIds.users.push(userAdmin._id);

    const userTeacher = await User.create({
      name: "Teacher User",
      email: `teacher_${runId}@school.com`,
      password: hashedPassword,
      role: "TEACHER",
      schoolId: schoolA._id,
      isActive: true,
    });
    cleanupIds.users.push(userTeacher._id);

    const userParent = await User.create({
      name: "Parent User",
      email: `parent_${runId}@school.com`,
      password: hashedPassword,
      role: "PARENT",
      schoolId: schoolA._id,
      isActive: true,
    });
    cleanupIds.users.push(userParent._id);

    const userSysAdmin = await User.create({
      name: "System Admin",
      email: `sysadmin_${runId}@platform.com`,
      password: hashedPassword,
      role: "SYSTEM_ADMIN",
      isActive: true,
    });
    cleanupIds.users.push(userSysAdmin._id);

    const userInactiveStudent = await User.create({
      name: "Inactive Student",
      email: `inactive_${runId}@student.com`,
      password: hashedPassword,
      role: "STUDENT",
      schoolId: schoolA._id,
      isActive: false,
    });
    cleanupIds.users.push(userInactiveStudent._id);

    const userNoSchoolStudent = await User.create({
      name: "No School Student",
      email: `noschool_${runId}@student.com`,
      password: hashedPassword,
      role: "STUDENT",
      isActive: true,
    });
    cleanupIds.users.push(userNoSchoolStudent._id);

    // Generate JWT Tokens
    const tokenStudentA1 = createToken({
      userId: userStudentA1._id.toString(),
      email: userStudentA1.email,
      role: "STUDENT",
    });

    const tokenStudentA2 = createToken({
      userId: userStudentA2._id.toString(),
      email: userStudentA2.email,
      role: "STUDENT",
    });

    const tokenStudentB1 = createToken({
      userId: userStudentB1._id.toString(),
      email: userStudentB1.email,
      role: "STUDENT",
    });

    const tokenAdmin = createToken({
      userId: userAdmin._id.toString(),
      email: userAdmin.email,
      role: "ADMIN",
    });

    const tokenTeacher = createToken({
      userId: userTeacher._id.toString(),
      email: userTeacher.email,
      role: "TEACHER",
    });

    const tokenParent = createToken({
      userId: userParent._id.toString(),
      email: userParent.email,
      role: "PARENT",
    });

    const tokenSysAdmin = createToken({
      userId: userSysAdmin._id.toString(),
      email: userSysAdmin.email,
      role: "SYSTEM_ADMIN",
    });

    const tokenInactiveStudent = createToken({
      userId: userInactiveStudent._id.toString(),
      email: userInactiveStudent.email,
      role: "STUDENT",
    });

    const tokenNoSchoolStudent = createToken({
      userId: userNoSchoolStudent._id.toString(),
      email: userNoSchoolStudent.email,
      role: "STUDENT",
    });

    // =========================================================================
    // 1. STUDENT CAN ACCESS STUDENT PORTAL / requireStudent
    // =========================================================================
    console.log("\n--- Vector 1: Valid Student Authorization ---");
    {
      const req = new NextRequest("http://localhost:3000/api/student/me", {
        headers: { Authorization: `Bearer ${tokenStudentA1}` },
      });
      const auth = await requireStudent(req);
      assert(auth.success === true, "Student A1 successfully passes requireStudent");
      if (auth.success) {
        assert(auth.context.studentId === studentDocA1._id.toString(), "Student A1 resolves exact studentId");
        assert(auth.context.schoolId === schoolA._id.toString(), "Student A1 resolves exact schoolId");
        assert(auth.context.user.role === "STUDENT", "Authenticated user role is strictly STUDENT");
      }
    }

    // =========================================================================
    // 2-5. NON-STUDENT ROLES CANNOT BE TREATED AS STUDENT
    // =========================================================================
    console.log("\n--- Vectors 2-5: Role Boundary Checks ---");
    {
      // Admin
      const reqAdmin = new NextRequest("http://localhost:3000/api/student/me", {
        headers: { Authorization: `Bearer ${tokenAdmin}` },
      });
      const authAdmin = await requireStudent(reqAdmin);
      assert(authAdmin.success === false, "ADMIN cannot be treated as STUDENT");
      if (!authAdmin.success) {
        assert(authAdmin.response.status === 403, "ADMIN receives HTTP 403 Forbidden");
      }

      // Teacher
      const reqTeacher = new NextRequest("http://localhost:3000/api/student/me", {
        headers: { Authorization: `Bearer ${tokenTeacher}` },
      });
      const authTeacher = await requireStudent(reqTeacher);
      assert(authTeacher.success === false, "TEACHER cannot be treated as STUDENT");
      if (!authTeacher.success) {
        assert(authTeacher.response.status === 403, "TEACHER receives HTTP 403 Forbidden");
      }

      // Parent
      const reqParent = new NextRequest("http://localhost:3000/api/student/me", {
        headers: { Authorization: `Bearer ${tokenParent}` },
      });
      const authParent = await requireStudent(reqParent);
      assert(authParent.success === false, "PARENT cannot be treated as STUDENT");
      if (!authParent.success) {
        assert(authParent.response.status === 403, "PARENT receives HTTP 403 Forbidden");
      }

      // System Admin
      const reqSysAdmin = new NextRequest("http://localhost:3000/api/student/me", {
        headers: { Authorization: `Bearer ${tokenSysAdmin}` },
      });
      const authSysAdmin = await requireStudent(reqSysAdmin);
      assert(authSysAdmin.success === false, "SYSTEM_ADMIN cannot be treated as STUDENT");
      if (!authSysAdmin.success) {
        assert(authSysAdmin.response.status === 403, "SYSTEM_ADMIN receives HTTP 403 Forbidden");
      }
    }

    // =========================================================================
    // 6. INACTIVE STUDENT IS REJECTED
    // =========================================================================
    console.log("\n--- Vector 6: Inactive Student Rejection ---");
    {
      const reqInactive = new NextRequest("http://localhost:3000/api/student/me", {
        headers: { Authorization: `Bearer ${tokenInactiveStudent}` },
      });
      const authInactive = await requireStudent(reqInactive);
      assert(authInactive.success === false, "Inactive student is rejected");
      if (!authInactive.success) {
        assert(authInactive.response.status === 403, "Inactive student receives HTTP 403 Forbidden");
      }
    }

    // =========================================================================
    // 7. STUDENT WITHOUT SCHOOLID IS REJECTED
    // =========================================================================
    console.log("\n--- Vector 7: Student Without School ID Rejection ---");
    {
      const reqNoSchool = new NextRequest("http://localhost:3000/api/student/me", {
        headers: { Authorization: `Bearer ${tokenNoSchoolStudent}` },
      });
      const authNoSchool = await requireStudent(reqNoSchool);
      assert(authNoSchool.success === false, "Student without schoolId is rejected");
      if (!authNoSchool.success) {
        assert(authNoSchool.response.status === 403, "Student without schoolId receives HTTP 403");
      }
    }

    // =========================================================================
    // 8. SELF-SCOPING: STUDENT A CANNOT ACCESS STUDENT B IDENTITY
    // =========================================================================
    console.log("\n--- Vector 8: Self-Scoping Integrity ---");
    {
      // Student A1 requests profile
      const reqA1 = new NextRequest(
        `http://localhost:3000/api/student/me?studentId=${studentDocA2._id.toString()}`,
        { headers: { Authorization: `Bearer ${tokenStudentA1}` } }
      );
      const resA1 = await getStudentMe(reqA1);
      const jsonA1 = await resA1.json();
      assert(resA1.status === 200, "Student A1 query succeeds with HTTP 200");
      assert(jsonA1.data.student._id === studentDocA1._id.toString(), "Student A1 context anchored to Alice Walker, ignoring ?studentId=Bob parameter");
      assert(jsonA1.data.student.rollNumber === "101", "Student A1 receives own roll number 101");
    }

    // =========================================================================
    // 9. TENANT ISOLATION: SCHOOL A VS SCHOOL B
    // =========================================================================
    console.log("\n--- Vector 9: Multi-Tenant Cross-School Isolation ---");
    {
      const reqB1 = new NextRequest("http://localhost:3000/api/student/me", {
        headers: { Authorization: `Bearer ${tokenStudentB1}` },
      });
      const resB1 = await getStudentMe(reqB1);
      const jsonB1 = await resB1.json();
      assert(resB1.status === 200, "Student B1 query succeeds with HTTP 200");
      assert(jsonB1.data.school._id === schoolB._id.toString(), "Student B1 belongs strictly to School B tenant");
      assert(jsonB1.data.student._id === studentDocB1._id.toString(), "Student B1 resolves Charlie Brown in School B");
    }

    // =========================================================================
    // 10. AUTHENTICATED API ENDPOINT /api/student/me CONTEXT INTEGRITY
    // =========================================================================
    console.log("\n--- Vector 10: /api/student/me Context Verification ---");
    {
      const reqMe = new NextRequest("http://localhost:3000/api/student/me", {
        headers: { Authorization: `Bearer ${tokenStudentA1}` },
      });
      const resMe = await getStudentMe(reqMe);
      const jsonMe = await resMe.json();
      assert(jsonMe.success === true, "/api/student/me returns success: true");
      assert(jsonMe.data.student.className === "Grade 10", "Class name populated correctly");
      assert(jsonMe.data.student.sectionName === "Section A", "Section name populated correctly");
      assert(jsonMe.data.school.name.includes("Student Alpha Academy"), "School name populated correctly");
    }
  } catch (err) {
    console.error("Test execution exception:", err);
    failed++;
  } finally {
    // Cleanup
    console.log("\n--- Cleaning up test records ---");
    const StudentModel = (await import("./src/models/Student")).default;
    const SectionModel = (await import("./src/models/Section")).default;
    const ClassModel = (await import("./src/models/Class")).default;
    const AcademicYearModel = (await import("./src/models/AcademicYear")).default;
    const UserModel = (await import("./src/models/User")).default;
    const SchoolModel = (await import("./src/models/School")).default;

    if (cleanupIds.students.length) await StudentModel.deleteMany({ _id: { $in: cleanupIds.students } });
    if (cleanupIds.sections.length) await SectionModel.deleteMany({ _id: { $in: cleanupIds.sections } });
    if (cleanupIds.classes.length) await ClassModel.deleteMany({ _id: { $in: cleanupIds.classes } });
    if (cleanupIds.academicYears.length) await AcademicYearModel.deleteMany({ _id: { $in: cleanupIds.academicYears } });
    if (cleanupIds.users.length) await UserModel.deleteMany({ _id: { $in: cleanupIds.users } });
    if (cleanupIds.schools.length) await SchoolModel.deleteMany({ _id: { $in: cleanupIds.schools } });

    console.log("Cleanup complete.");

    console.log("\n============================================================");
    console.log(`S0 RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log("============================================================\n");

    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests();
