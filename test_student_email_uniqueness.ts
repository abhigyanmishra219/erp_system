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
  const { default: mongoose } = await import("mongoose");
  const { default: connectToDatabase } = await import("./src/lib/db");
  const { default: Student } = await import("./src/models/Student");
  const { default: School } = await import("./src/models/School");
  const { default: User } = await import("./src/models/User");
  const { default: AcademicYear } = await import("./src/models/AcademicYear");
  const { default: Class } = await import("./src/models/Class");
  const { default: Section } = await import("./src/models/Section");
  const { normalizeEmail } = await import("./src/lib/utils/email");

  console.log("==================================================");
  console.log("RUNNING STUDENT EMAIL UNIQUENESS TEST SUITE");
  console.log("==================================================");

  await connectToDatabase();
  await Student.syncIndexes();

  const dummyAdminId = new mongoose.Types.ObjectId();

  // 1. Setup two mock schools
  let schoolA = await School.findOne({ code: "TEST_SCH_A" });
  if (!schoolA) {
    schoolA = await School.create({
      name: "Test School A",
      code: "TEST_SCH_A",
      address: "Address A",
      email: "admin_a@test.com",
      status: "ACTIVE",
      subscriptionExpiryDate: new Date("2030-01-01"),
      createdBy: dummyAdminId,
      updatedBy: dummyAdminId,
    });
  }

  let schoolB = await School.findOne({ code: "TEST_SCH_B" });
  if (!schoolB) {
    schoolB = await School.create({
      name: "Test School B",
      code: "TEST_SCH_B",
      address: "Address B",
      email: "admin_b@test.com",
      status: "ACTIVE",
      subscriptionExpiryDate: new Date("2030-01-01"),
      createdBy: dummyAdminId,
      updatedBy: dummyAdminId,
    });
  }

  // Cleanup test students from previous runs
  await Student.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } });
  await User.deleteMany({ email: { $in: ["existing_user@portal.com", "concurrent_test@gmail.com"] } });

  // Create academic setup for School A
  let ayA = await AcademicYear.findOne({ schoolId: schoolA._id });
  if (!ayA) {
    ayA = await AcademicYear.create({
      schoolId: schoolA._id,
      name: "2026-2027",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: dummyAdminId,
      updatedBy: dummyAdminId,
    });
  }

  let classA = await Class.findOne({ schoolId: schoolA._id });
  if (!classA) {
    classA = await Class.create({
      schoolId: schoolA._id,
      academicYearId: ayA._id,
      name: "Grade 10",
      code: "G10",
      displayOrder: 1,
      createdBy: dummyAdminId,
      updatedBy: dummyAdminId,
    });
  }

  let secA = await Section.findOne({ schoolId: schoolA._id });
  if (!secA) {
    secA = await Section.create({
      schoolId: schoolA._id,
      academicYearId: ayA._id,
      classId: classA._id,
      name: "A",
      capacity: 40,
      createdBy: dummyAdminId,
      updatedBy: dummyAdminId,
    });
  }

  // Create academic setup for School B
  let ayB = await AcademicYear.findOne({ schoolId: schoolB._id });
  if (!ayB) {
    ayB = await AcademicYear.create({
      schoolId: schoolB._id,
      name: "2026-2027",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: dummyAdminId,
      updatedBy: dummyAdminId,
    });
  }

  let classB = await Class.findOne({ schoolId: schoolB._id });
  if (!classB) {
    classB = await Class.create({
      schoolId: schoolB._id,
      academicYearId: ayB._id,
      name: "Grade 10",
      code: "G10-B",
      displayOrder: 1,
      createdBy: dummyAdminId,
      updatedBy: dummyAdminId,
    });
  }

  let secB = await Section.findOne({ schoolId: schoolB._id });
  if (!secB) {
    secB = await Section.create({
      schoolId: schoolB._id,
      academicYearId: ayB._id,
      classId: classB._id,
      name: "A",
      capacity: 40,
      createdBy: dummyAdminId,
      updatedBy: dummyAdminId,
    });
  }

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // Helper to create student directly simulating API logic
  async function createStudentSim(schoolId: any, ayId: any, cId: any, sId: any, admNo: string, email?: string) {
    const normalized = normalizeEmail(email);
    if (normalized) {
      const exists = await Student.findOne({ schoolId, email: normalized });
      if (exists) {
        const err: any = new Error("Duplicate email in school");
        err.statusCode = 409;
        throw err;
      }
    }
    const st = new Student({
      schoolId,
      academicYearId: ayId,
      classId: cId,
      sectionId: sId,
      admissionNumber: admNo,
      firstName: "Test",
      lastName: "Student",
      dateOfBirth: new Date("2010-01-01"),
      gender: "MALE",
      email: normalized,
      createdBy: dummyAdminId,
      updatedBy: dummyAdminId,
    });
    await st.save();
    return st;
  }

  // TEST 1: Create Student A with abc@gmail.com -> SUCCESS
  let studentA: any;
  try {
    studentA = await createStudentSim(schoolA._id, ayA._id, classA._id, secA._id, "ADM-001", "abc@gmail.com");
    assert(studentA.email === "abc@gmail.com", "Test 1: Create Student A with abc@gmail.com -> SUCCESS");
  } catch (e: any) {
    assert(false, `Test 1: Failed: ${e.message}`);
  }

  // TEST 2: Create Student B with abc@gmail.com in same school -> FAIL
  try {
    await createStudentSim(schoolA._id, ayA._id, classA._id, secA._id, "ADM-002", "abc@gmail.com");
    assert(false, "Test 2: Create Student B with duplicate email should fail");
  } catch (e: any) {
    assert(e.statusCode === 409 || e.code === 11000, "Test 2: Create Student B with duplicate email -> FAIL (409 Conflict)");
  }

  // TEST 3: Create Student B with ABC@gmail.com (case difference) -> FAIL
  try {
    await createStudentSim(schoolA._id, ayA._id, classA._id, secA._id, "ADM-003", "ABC@gmail.com");
    assert(false, "Test 3: Create Student B with ABC@gmail.com should fail");
  } catch (e: any) {
    assert(e.statusCode === 409 || e.code === 11000, "Test 3: Create Student B with ABC@gmail.com (case insensitive) -> FAIL (409 Conflict)");
  }

  // TEST 4: Create Student B with ' abc@gmail.com ' (whitespace) -> FAIL
  try {
    await createStudentSim(schoolA._id, ayA._id, classA._id, secA._id, "ADM-004", "  abc@gmail.com  ");
    assert(false, "Test 4: Create Student B with whitespace email should fail");
  } catch (e: any) {
    assert(e.statusCode === 409 || e.code === 11000, "Test 4: Create Student B with '  abc@gmail.com  ' (trimmed) -> FAIL (409 Conflict)");
  }

  // Create Student B with unique email for update tests
  let studentB = await createStudentSim(schoolA._id, ayA._id, classA._id, secA._id, "ADM-005", "unique_b@gmail.com");

  // TEST 5: Edit Student A and keep abc@gmail.com -> SUCCESS
  try {
    const normalizedA = normalizeEmail("abc@gmail.com");
    const conflict = await Student.findOne({
      schoolId: schoolA._id,
      _id: { $ne: studentA._id },
      email: normalizedA,
    });
    assert(!conflict, "Test 5: Edit Student A keeping own email has no conflict -> SUCCESS");
  } catch (e: any) {
    assert(false, `Test 5: Failed: ${e.message}`);
  }

  // TEST 6: Edit Student B and change email to abc@gmail.com -> FAIL
  try {
    const normalizedB = normalizeEmail("abc@gmail.com");
    const conflict = await Student.findOne({
      schoolId: schoolA._id,
      _id: { $ne: studentB._id },
      email: normalizedB,
    });
    assert(!!conflict, "Test 6: Edit Student B to abc@gmail.com conflicts with Student A -> FAIL");
  } catch (e: any) {
    assert(false, `Test 6: Failed: ${e.message}`);
  }

  // TEST 7 & 8: Cross-tenant isolation
  // Student A in School A has abc@gmail.com
  // Student in School B can also have abc@gmail.com -> SUCCESS
  try {
    const studentSchoolB = await createStudentSim(
      schoolB._id,
      ayB._id,
      classB._id,
      secB._id,
      "ADM-SCHB-001",
      "abc@gmail.com"
    );
    assert(
      studentSchoolB.email === "abc@gmail.com",
      "Test 7 & 8: Student in School B can use abc@gmail.com (Cross-tenant isolation) -> SUCCESS"
    );
  } catch (e: any) {
    assert(false, `Test 7 & 8: Failed: ${e.message}`);
  }

  // TEST 9: Two students with no email in same school -> SUCCESS
  try {
    const noEmail1 = await createStudentSim(schoolA._id, ayA._id, classA._id, secA._id, "ADM-NO-EMAIL-1", undefined);
    const noEmail2 = await createStudentSim(schoolA._id, ayA._id, classA._id, secA._id, "ADM-NO-EMAIL-2", "");
    assert(
      !noEmail1.email && !noEmail2.email,
      "Test 9: Multiple students with no email can coexist in same school -> SUCCESS"
    );
  } catch (e: any) {
    assert(false, `Test 9: Failed: ${e.message}`);
  }

  // TEST 10: Student portal account creation using email already belonging to another User -> FAIL
  try {
    const existingUser = await User.create({
      name: "Existing Teacher",
      email: "existing_user@portal.com",
      password: "password123",
      role: "TEACHER",
      schoolId: schoolA._id,
    });

    // Check account creation validation
    const candidateEmail = normalizeEmail("existing_user@portal.com");
    const userFound = await User.findOne({ email: candidateEmail });
    const isConflict =
      userFound &&
      (userFound.role !== "STUDENT" || (userFound.studentId && userFound.studentId.toString() !== studentA._id.toString()));
    assert(!!isConflict, "Test 10: Portal account with email belonging to non-student user detected -> FAIL");
  } catch (e: any) {
    assert(false, `Test 10: Failed: ${e.message}`);
  }

  // TEST 11: Concurrent creation with duplicate email hitting DB index directly
  try {
    const doc1 = new Student({
      schoolId: schoolA._id,
      academicYearId: ayA._id,
      classId: classA._id,
      sectionId: secA._id,
      admissionNumber: "CONCURRENT-001",
      firstName: "Concurrent1",
      lastName: "Test",
      dateOfBirth: new Date("2010-01-01"),
      gender: "FEMALE",
      email: "concurrent_test@gmail.com",
      createdBy: dummyAdminId,
      updatedBy: dummyAdminId,
    });

    const doc2 = new Student({
      schoolId: schoolA._id,
      academicYearId: ayA._id,
      classId: classA._id,
      sectionId: secA._id,
      admissionNumber: "CONCURRENT-002",
      firstName: "Concurrent2",
      lastName: "Test",
      dateOfBirth: new Date("2010-01-01"),
      gender: "FEMALE",
      email: "concurrent_test@gmail.com",
      createdBy: dummyAdminId,
      updatedBy: dummyAdminId,
    });

    const results = await Promise.allSettled([doc1.save(), doc2.save()]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert(
      fulfilled.length === 1 && rejected.length === 1,
      "Test 11: Concurrent duplicate creation -> Only 1 succeeds, DB unique index protects integrity -> SUCCESS"
    );
  } catch (e: any) {
    assert(false, `Test 11: Failed: ${e.message}`);
  }

  // Cleanup test data
  await Student.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } });
  await User.deleteMany({ email: { $in: ["existing_user@portal.com", "concurrent_test@gmail.com"] } });
  await School.deleteMany({ code: { $in: ["TEST_SCH_A", "TEST_SCH_B"] } });

  console.log("==================================================");
  console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
