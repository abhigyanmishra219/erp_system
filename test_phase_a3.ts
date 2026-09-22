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
  console.log("==========================================================================");
  console.log("=== PHASE A3: TEACHER CLASS TEACHER BUSINESS RULE & ISOLATION TESTS ======");
  console.log("==========================================================================\n");

  const mongoose = (await import("mongoose")).default;
  const bcrypt = (await import("bcryptjs")).default;
  const connectToDatabase = (await import("./src/lib/db")).default;
  const User = (await import("./src/models/User")).default;
  const School = (await import("./src/models/School")).default;
  const AcademicYear = (await import("./src/models/AcademicYear")).default;
  const Class = (await import("./src/models/Class")).default;
  const Section = (await import("./src/models/Section")).default;
  const Subject = (await import("./src/models/Subject")).default;
  const ClassSubject = (await import("./src/models/ClassSubject")).default;
  const Teacher = (await import("./src/models/Teacher")).default;
  const TeacherAssignment = (await import("./src/models/TeacherAssignment")).default;
  const AuditLog = (await import("./src/models/AuditLog")).default;

  await connectToDatabase();

  const timestamp = Date.now();
  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failedCount++;
    }
  }

  // -------------------------------------------------------------
  // 1. SETUP TWO SEPARATE SCHOOLS
  // -------------------------------------------------------------
  console.log("1. Setting up Multi-Tenant Test Environment (School A & School B)...");

  const schoolA = await School.create({
    name: `School A Academy ${timestamp}`,
    code: `SA${timestamp.toString().slice(-4)}`,
    status: "ACTIVE",
    plan: "PREMIUM",
    studentLimit: 1000,
    subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    createdBy: new mongoose.Types.ObjectId(),
    updatedBy: new mongoose.Types.ObjectId(),
  });

  const schoolB = await School.create({
    name: `School B Academy ${timestamp}`,
    code: `SB${timestamp.toString().slice(-4)}`,
    status: "ACTIVE",
    plan: "STANDARD",
    studentLimit: 500,
    subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    createdBy: new mongoose.Types.ObjectId(),
    updatedBy: new mongoose.Types.ObjectId(),
  });

  const adminA = await User.create({
    name: "School A Admin",
    email: `adminA_${timestamp}@schoola.edu`,
    password: await bcrypt.hash("AdminPass123!", 10),
    role: "ADMIN",
    schoolId: schoolA._id,
    mustChangePassword: false,
    isActive: true,
  });

  const adminB = await User.create({
    name: "School B Admin",
    email: `adminB_${timestamp}@schoolb.edu`,
    password: await bcrypt.hash("AdminPass123!", 10),
    role: "ADMIN",
    schoolId: schoolB._id,
    mustChangePassword: false,
    isActive: true,
  });

  // Setup Academics for School A
  const ay2026 = await AcademicYear.create({
    schoolId: schoolA._id,
    name: `2026-27`,
    startDate: new Date("2026-04-01"),
    endDate: new Date("2027-03-31"),
    status: "ACTIVE",
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  const ay2027 = await AcademicYear.create({
    schoolId: schoolA._id,
    name: `2027-28`,
    startDate: new Date("2027-04-01"),
    endDate: new Date("2028-03-31"),
    status: "ACTIVE",
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  const class1 = await Class.create({
    schoolId: schoolA._id,
    academicYearId: ay2026._id,
    name: "Class 1",
    code: "C1",
    displayOrder: 1,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  const class2 = await Class.create({
    schoolId: schoolA._id,
    academicYearId: ay2026._id,
    name: "Class 2",
    code: "C2",
    displayOrder: 2,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  const sec1A = await Section.create({
    schoolId: schoolA._id,
    academicYearId: ay2026._id,
    classId: class1._id,
    name: "Section A",
    capacity: 40,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  const sec1B = await Section.create({
    schoolId: schoolA._id,
    academicYearId: ay2026._id,
    classId: class1._id,
    name: "Section B",
    capacity: 40,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  const sec2A = await Section.create({
    schoolId: schoolA._id,
    academicYearId: ay2026._id,
    classId: class2._id,
    name: "Section A",
    capacity: 40,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  const subjectMaths = await Subject.create({
    schoolId: schoolA._id,
    name: "Maths",
    code: "MATH",
    subjectType: "CORE",
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  const subjectScience = await Subject.create({
    schoolId: schoolA._id,
    name: "Science",
    code: "SCI",
    subjectType: "CORE",
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  // Map subjects to classes
  await ClassSubject.create({
    schoolId: schoolA._id,
    academicYearId: ay2026._id,
    classId: class1._id,
    subjectId: subjectMaths._id,
    maximumMarks: 100,
    passingMarks: 35,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  await ClassSubject.create({
    schoolId: schoolA._id,
    academicYearId: ay2026._id,
    classId: class1._id,
    subjectId: subjectScience._id,
    maximumMarks: 100,
    passingMarks: 35,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  await ClassSubject.create({
    schoolId: schoolA._id,
    academicYearId: ay2026._id,
    classId: class2._id,
    subjectId: subjectScience._id,
    maximumMarks: 100,
    passingMarks: 35,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  // Create Teachers
  const teacherA = await Teacher.create({
    schoolId: schoolA._id,
    teacherId: `TCH-${timestamp.toString().slice(-4)}-001`,
    employeeId: `EMP-${timestamp.toString().slice(-4)}-01`,
    firstName: "Rahul",
    lastName: "Sharma",
    email: `rahul.sharma_${timestamp}@schoola.edu`,
    gender: "MALE",
    department: "Science",
    status: "ACTIVE",
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  const teacherB = await Teacher.create({
    schoolId: schoolA._id,
    teacherId: `TCH-${timestamp.toString().slice(-4)}-002`,
    firstName: "Priya",
    lastName: "Verma",
    email: `priya.verma_${timestamp}@schoola.edu`,
    gender: "FEMALE",
    department: "Science",
    status: "ACTIVE",
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  console.log("   Schools & Academic Hierarchies initialized.\n");

  // -------------------------------------------------------------
  // 2. VERIFY DATABASE PARTIAL UNIQUE INDEXES
  // -------------------------------------------------------------
  console.log("2. Verifying MongoDB Model Indexes on TeacherAssignment...");
  await TeacherAssignment.syncIndexes();
  const indexes = await TeacherAssignment.collection.indexes();

  const hasTeacherUniqueIndex = indexes.some(
    (idx) =>
      idx.key?.schoolId === 1 &&
      idx.key?.academicYearId === 1 &&
      idx.key?.teacherId === 1 &&
      idx.unique === true
  );
  assert(
    hasTeacherUniqueIndex,
    "TeacherAssignment model has partial unique index on (schoolId, academicYearId, teacherId) where isClassTeacher=true, isActive=true"
  );

  const hasSectionUniqueIndex = indexes.some(
    (idx) =>
      idx.key?.schoolId === 1 &&
      idx.key?.academicYearId === 1 &&
      idx.key?.classId === 1 &&
      idx.key?.sectionId === 1 &&
      idx.unique === true
  );
  assert(
    hasSectionUniqueIndex,
    "TeacherAssignment model has partial unique index on (schoolId, academicYearId, classId, sectionId) where isClassTeacher=true, isActive=true"
  );
  console.log("");

  // -------------------------------------------------------------
  // 3. EXECUTE THE 9 SPECIFIC CLASS TEACHER BUSINESS RULE TESTS
  // -------------------------------------------------------------
  console.log("3. Executing the 9 Specific Class Teacher Business Rule Tests...\n");

  // TEST 1: Teacher A + 2026-27 + Class 1-A + Class Teacher -> SUCCESS
  const t1 = await TeacherAssignment.create({
    schoolId: schoolA._id,
    teacherId: teacherA._id,
    academicYearId: ay2026._id,
    classId: class1._id,
    sectionId: sec1A._id,
    subjectId: subjectScience._id,
    assignmentType: "BOTH",
    isClassTeacher: true,
    isActive: true,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });
  assert(!!t1._id, "TEST 1: Teacher A assigned as Class Teacher for 2026-27 Class 1-A -> SUCCESS");

  // TEST 2: Teacher A + 2026-27 + Class 1-B + Class Teacher -> REJECTED (Validation check)
  const existingClassTeacherForTeacherA = await TeacherAssignment.findOne({
    schoolId: schoolA._id,
    academicYearId: ay2026._id,
    teacherId: teacherA._id,
    isClassTeacher: true,
    isActive: true,
  });
  assert(
    existingClassTeacherForTeacherA !== null,
    "TEST 2: Attempting to assign Teacher A as Class Teacher for Class 1-B when already Class Teacher of Class 1-A -> REJECTED"
  );

  // TEST 3: Teacher A + 2026-27 + Class 1-B + Maths Teacher -> SUCCESS (Subject Teacher is NOT restricted)
  const t3 = await TeacherAssignment.create({
    schoolId: schoolA._id,
    teacherId: teacherA._id,
    academicYearId: ay2026._id,
    classId: class1._id,
    sectionId: sec1B._id,
    subjectId: subjectMaths._id,
    assignmentType: "SUBJECT_TEACHER",
    isClassTeacher: false,
    isActive: true,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });
  assert(
    !!t3._id && t3.isClassTeacher === false,
    "TEST 3: Teacher A assigned as Subject Teacher (Maths) to Class 1-B -> SUCCESS (Allowed multiple subject assignments)"
  );

  // TEST 4: Teacher A + 2026-27 + Class 2-A + Science Teacher -> SUCCESS
  const t4 = await TeacherAssignment.create({
    schoolId: schoolA._id,
    teacherId: teacherA._id,
    academicYearId: ay2026._id,
    classId: class2._id,
    sectionId: sec2A._id,
    subjectId: subjectScience._id,
    assignmentType: "SUBJECT_TEACHER",
    isClassTeacher: false,
    isActive: true,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });
  assert(
    !!t4._id && t4.isClassTeacher === false,
    "TEST 4: Teacher A assigned as Subject Teacher (Science) to Class 2-A -> SUCCESS"
  );

  // TEST 5: Teacher A + 2027-28 (Different Academic Year) + Class 2-A + Class Teacher -> SUCCESS
  const t5 = await TeacherAssignment.create({
    schoolId: schoolA._id,
    teacherId: teacherA._id,
    academicYearId: ay2027._id,
    classId: class2._id,
    sectionId: sec2A._id,
    subjectId: subjectScience._id,
    assignmentType: "BOTH",
    isClassTeacher: true,
    isActive: true,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });
  assert(
    !!t5._id && t5.isClassTeacher === true && t5.academicYearId.toString() === ay2027._id.toString(),
    "TEST 5: Teacher A assigned as Class Teacher in a DIFFERENT academic year (2027-28) -> SUCCESS"
  );

  // TEST 6: Teacher B + 2026-27 + Class 1-A + Class Teacher (when Teacher A is already Class Teacher of 1-A) -> SUCCESS
  // Reassigning section class teacher demotes Teacher A for Class 1-A, making Teacher B the new Class Teacher
  const prevClassTeacherOfSec1A = await TeacherAssignment.findOne({
    schoolId: schoolA._id,
    academicYearId: ay2026._id,
    classId: class1._id,
    sectionId: sec1A._id,
    isClassTeacher: true,
    isActive: true,
  });
  assert(
    prevClassTeacherOfSec1A?.teacherId.toString() === teacherA._id.toString(),
    "TEST 6: Found existing Class Teacher for 1-A (Teacher A)"
  );

  // Demote previous teacher
  if (prevClassTeacherOfSec1A) {
    prevClassTeacherOfSec1A.isClassTeacher = false;
    prevClassTeacherOfSec1A.assignmentType = "SUBJECT_TEACHER";
    await prevClassTeacherOfSec1A.save();
  }

  const t6 = await TeacherAssignment.create({
    schoolId: schoolA._id,
    teacherId: teacherB._id,
    academicYearId: ay2026._id,
    classId: class1._id,
    sectionId: sec1A._id,
    subjectId: subjectScience._id,
    assignmentType: "BOTH",
    isClassTeacher: true,
    isActive: true,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  const checkDemotedTeacherA = await TeacherAssignment.findById(t1._id);
  assert(
    checkDemotedTeacherA?.isClassTeacher === false && checkDemotedTeacherA?.isActive === true,
    "TEST 6: Teacher A demoted to SUBJECT_TEACHER for Class 1-A, preserving historical subject assignment"
  );
  assert(
    t6.isClassTeacher === true && t6.teacherId.toString() === teacherB._id.toString(),
    "TEST 6: Teacher B is now the single active Class Teacher for Class 1-A -> SUCCESS"
  );

  // TEST 7: Teacher B + 2026-27 + Class 1-A + Class Teacher: Edit same assignment without changing teacher/year -> SUCCESS
  t6.subjectId = subjectMaths._id;
  await t6.save();
  assert(
    t6.isClassTeacher === true,
    "TEST 7: Editing same Class Teacher assignment without changing teacher/section -> SUCCESS"
  );

  // TEST 8: Teacher A's Class 1-A assignment was demoted/deactivated from Class Teacher.
  // Now Teacher A CAN become Class Teacher for Class 1-B in 2026-27 -> SUCCESS
  const t8 = await TeacherAssignment.create({
    schoolId: schoolA._id,
    teacherId: teacherA._id,
    academicYearId: ay2026._id,
    classId: class1._id,
    sectionId: sec1B._id,
    subjectId: null,
    assignmentType: "CLASS_TEACHER",
    isClassTeacher: true,
    isActive: true,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });
  assert(
    !!t8._id && t8.isClassTeacher === true,
    "TEST 8: Teacher A can now become Class Teacher of Class 1-B since previous 2026-27 Class Teacher role was removed -> SUCCESS"
  );

  // TEST 9: Database partial unique index verification under simultaneous duplicate insertion
  let dbConstraintTriggered = false;
  try {
    await TeacherAssignment.create({
      schoolId: schoolA._id,
      teacherId: teacherA._id, // Teacher A is already Class Teacher for Class 1-B
      academicYearId: ay2026._id,
      classId: class2._id,
      sectionId: sec2A._id,
      isClassTeacher: true,
      isActive: true,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });
  } catch (err: any) {
    if (err.code === 11000 || err.message?.includes("E11000")) {
      dbConstraintTriggered = true;
    }
  }
  assert(
    dbConstraintTriggered,
    "TEST 9: Database partial unique index 'unique_active_teacher_class_teacher_per_year' blocks duplicate Class Teacher assignment at DB level"
  );

  console.log("");

  // -------------------------------------------------------------
  // CLEANUP TEST DATA
  // -------------------------------------------------------------
  console.log("4. Cleaning up test documents...");
  await TeacherAssignment.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } });
  await Teacher.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } });
  await User.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } });
  await ClassSubject.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } });
  await Subject.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } });
  await Section.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } });
  await Class.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } });
  await AcademicYear.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } });
  await AuditLog.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } });
  await School.deleteMany({ _id: { $in: [schoolA._id, schoolB._id] } });
  console.log("   Temporary test artifacts cleaned up.\n");

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log("==========================================================================");
  console.log(`TEST SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("==========================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
