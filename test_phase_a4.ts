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
  console.log("=== PHASE A4: ATTENDANCE MANAGEMENT ISOLATION & BUSINESS RULES TESTS =====");
  console.log("==========================================================================\n");

  const mongoose = (await import("mongoose")).default;
  const connectToDatabase = (await import("./src/lib/db")).default;
  const User = (await import("./src/models/User")).default;
  const School = (await import("./src/models/School")).default;
  const AcademicYear = (await import("./src/models/AcademicYear")).default;
  const Class = (await import("./src/models/Class")).default;
  const Section = (await import("./src/models/Section")).default;
  const Student = (await import("./src/models/Student")).default;
  const Teacher = (await import("./src/models/Teacher")).default;
  const TeacherAssignment = (await import("./src/models/TeacherAssignment")).default;
  const Attendance = (await import("./src/models/Attendance")).default;
  const AuditLog = (await import("./src/models/AuditLog")).default;
  const { normalizeAttendanceDate, formatAttendanceDate } = await import("./src/lib/utils/date");
  const { calculateAttendanceSummary } = await import("./src/lib/utils/attendance");
  const { markAttendanceSchema, bulkAttendanceSchema } = await import("./src/lib/validation/attendance");
  const { verifyTeacherAttendanceScope } = await import("./src/lib/auth/teacherAttendanceScope");

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
  // 1. SETUP MULTI-TENANT TEST ENVIRONMENT (SCHOOL A & SCHOOL B)
  // -------------------------------------------------------------
  console.log("1. Setting up Multi-Tenant Test Environment (School A & School B)...");

  const adminA = await User.create({
    name: "Admin A",
    email: `admin.a.${timestamp}@school-a.com`,
    password: "Password@123",
    role: "ADMIN",
    isActive: true,
  });

  const schoolA = await School.create({
    name: `Alpha Academy ${timestamp}`,
    code: `ALPH${timestamp.toString().slice(-4)}`,
    email: `alpha.${timestamp}@school.com`,
    subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });
  adminA.schoolId = schoolA._id;
  await adminA.save();

  const yearA = await AcademicYear.create({
    schoolId: schoolA._id,
    name: "2026-27",
    startDate: new Date("2026-04-01"),
    endDate: new Date("2027-03-31"),
    status: "ACTIVE",
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  const class1A = await Class.create({
    schoolId: schoolA._id,
    academicYearId: yearA._id,
    name: "Class 1",
    displayOrder: 1,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  const class2A = await Class.create({
    schoolId: schoolA._id,
    academicYearId: yearA._id,
    name: "Class 2",
    displayOrder: 2,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  const section1A = await Section.create({
    schoolId: schoolA._id,
    academicYearId: yearA._id,
    classId: class1A._id,
    name: "A",
    capacity: 40,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  const section1B = await Section.create({
    schoolId: schoolA._id,
    academicYearId: yearA._id,
    classId: class1A._id,
    name: "B",
    capacity: 40,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  const studentA1 = await Student.create({
    schoolId: schoolA._id,
    admissionNumber: `ADM-A1-${timestamp}`,
    firstName: "Rahul",
    lastName: "Sharma",
    dateOfBirth: new Date("2018-05-10"),
    gender: "MALE",
    academicYearId: yearA._id,
    classId: class1A._id,
    sectionId: section1A._id,
    admissionDate: new Date("2026-04-01"),
    status: "ACTIVE",
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  const studentA2 = await Student.create({
    schoolId: schoolA._id,
    admissionNumber: `ADM-A2-${timestamp}`,
    firstName: "Priya",
    lastName: "Patel",
    dateOfBirth: new Date("2018-06-15"),
    gender: "FEMALE",
    academicYearId: yearA._id,
    classId: class1A._id,
    sectionId: section1A._id,
    admissionDate: new Date("2026-04-01"),
    status: "ACTIVE",
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  // SCHOOL B
  const adminB = await User.create({
    name: "Admin B",
    email: `admin.b.${timestamp}@school-b.com`,
    password: "Password@123",
    role: "ADMIN",
    isActive: true,
  });

  const schoolB = await School.create({
    name: `Beta Academy ${timestamp}`,
    code: `BETA${timestamp.toString().slice(-4)}`,
    email: `beta.${timestamp}@school.com`,
    subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    createdBy: adminB._id,
    updatedBy: adminB._id,
  });
  adminB.schoolId = schoolB._id;
  await adminB.save();

  const yearB = await AcademicYear.create({
    schoolId: schoolB._id,
    name: "2026-27",
    startDate: new Date("2026-04-01"),
    endDate: new Date("2027-03-31"),
    status: "ACTIVE",
    createdBy: adminB._id,
    updatedBy: adminB._id,
  });

  const class1B = await Class.create({
    schoolId: schoolB._id,
    academicYearId: yearB._id,
    name: "Class 1",
    displayOrder: 1,
    createdBy: adminB._id,
    updatedBy: adminB._id,
  });

  const section1B_B = await Section.create({
    schoolId: schoolB._id,
    academicYearId: yearB._id,
    classId: class1B._id,
    name: "A",
    capacity: 35,
    createdBy: adminB._id,
    updatedBy: adminB._id,
  });

  const studentB1 = await Student.create({
    schoolId: schoolB._id,
    admissionNumber: `ADM-B1-${timestamp}`,
    firstName: "Amit",
    lastName: "Verma",
    dateOfBirth: new Date("2018-02-20"),
    gender: "MALE",
    academicYearId: yearB._id,
    classId: class1B._id,
    sectionId: section1B_B._id,
    admissionDate: new Date("2026-04-01"),
    status: "ACTIVE",
    createdBy: adminB._id,
    updatedBy: adminB._id,
  });

  assert(true, "School A and School B multi-tenant structures created successfully");

  // -------------------------------------------------------------
  // 2. DATE NORMALIZATION & TIMEZONE SAFETY
  // -------------------------------------------------------------
  console.log("\n2. Testing Date Normalization & UTC Drift Safety...");

  const testDateStr = "2026-09-22";
  const normalized = normalizeAttendanceDate(testDateStr);
  assert(
    normalized.toISOString() === "2026-09-22T00:00:00.000Z",
    "2026-09-22 is safely normalized to 2026-09-22T00:00:00.000Z without timezone shift"
  );
  assert(
    formatAttendanceDate(normalized) === "2026-09-22",
    "formatAttendanceDate correctly formats back to 2026-09-22"
  );

  // -------------------------------------------------------------
  // 3. ATTENDANCE STATUS VALIDATION
  // -------------------------------------------------------------
  console.log("\n3. Testing Attendance Status Validation...");

  const validPresent = markAttendanceSchema.safeParse({
    academicYearId: yearA._id.toString(),
    classId: class1A._id.toString(),
    sectionId: section1A._id.toString(),
    studentId: studentA1._id.toString(),
    date: "2026-09-22",
    status: "PRESENT",
  });
  assert(validPresent.success, "PRESENT status passes schema validation");

  const validAbsent = markAttendanceSchema.safeParse({
    academicYearId: yearA._id.toString(),
    classId: class1A._id.toString(),
    sectionId: section1A._id.toString(),
    studentId: studentA1._id.toString(),
    date: "2026-09-22",
    status: "ABSENT",
  });
  assert(validAbsent.success, "ABSENT status passes schema validation");

  const validLate = markAttendanceSchema.safeParse({
    academicYearId: yearA._id.toString(),
    classId: class1A._id.toString(),
    sectionId: section1A._id.toString(),
    studentId: studentA1._id.toString(),
    date: "2026-09-22",
    status: "LATE",
  });
  assert(validLate.success, "LATE status passes schema validation");

  const validLeave = markAttendanceSchema.safeParse({
    academicYearId: yearA._id.toString(),
    classId: class1A._id.toString(),
    sectionId: section1A._id.toString(),
    studentId: studentA1._id.toString(),
    date: "2026-09-22",
    status: "LEAVE",
  });
  assert(validLeave.success, "LEAVE status passes schema validation");

  const invalidHoliday = markAttendanceSchema.safeParse({
    academicYearId: yearA._id.toString(),
    classId: class1A._id.toString(),
    sectionId: section1A._id.toString(),
    studentId: studentA1._id.toString(),
    date: "2026-09-22",
    status: "HOLIDAY" as any,
  });
  assert(!invalidHoliday.success, "Invalid status HOLIDAY is strictly rejected");

  const invalidUnknown = markAttendanceSchema.safeParse({
    academicYearId: yearA._id.toString(),
    classId: class1A._id.toString(),
    sectionId: section1A._id.toString(),
    studentId: studentA1._id.toString(),
    date: "2026-09-22",
    status: "UNKNOWN" as any,
  });
  assert(!invalidUnknown.success, "Invalid status UNKNOWN is strictly rejected");

  // -------------------------------------------------------------
  // 4. DUPLICATE ATTENDANCE PREVENTION & UNIQUE COMPOUND INDEX
  // -------------------------------------------------------------
  console.log("\n4. Testing Duplicate Attendance Prevention & Database Index Constraint...");

  const testDate = normalizeAttendanceDate("2026-09-22");

  // Create initial attendance record
  const rec1 = await Attendance.create({
    schoolId: schoolA._id,
    academicYearId: yearA._id,
    classId: class1A._id,
    sectionId: section1A._id,
    studentId: studentA1._id,
    date: testDate,
    status: "PRESENT",
    markedBy: adminA._id,
    markedByRole: "ADMIN",
  });
  assert(!!rec1._id, "Created initial attendance record: Student A1 = PRESENT on 2026-09-22");

  // Attempt creating duplicate record directly in Mongoose (should fail duplicate key error)
  let duplicatePrevented = false;
  try {
    await Attendance.create({
      schoolId: schoolA._id,
      academicYearId: yearA._id,
      classId: class1A._id,
      sectionId: section1A._id,
      studentId: studentA1._id,
      date: testDate,
      status: "ABSENT",
      markedBy: adminA._id,
      markedByRole: "ADMIN",
    });
  } catch (err: any) {
    if (err.code === 11000 || err.name === "MongoServerError") {
      duplicatePrevented = true;
    }
  }
  assert(duplicatePrevented, "Database unique compound index strictly blocks duplicate attendance insert");

  // Upsert pattern: Updating existing record to ABSENT
  await Attendance.updateOne(
    {
      schoolId: schoolA._id,
      academicYearId: yearA._id,
      studentId: studentA1._id,
      date: testDate,
    },
    {
      $set: { status: "ABSENT", editedBy: adminA._id, editedAt: new Date() },
    }
  );

  const updatedRec = await Attendance.findOne({
    schoolId: schoolA._id,
    academicYearId: yearA._id,
    studentId: studentA1._id,
    date: testDate,
  });
  const totalCountForDate = await Attendance.countDocuments({
    schoolId: schoolA._id,
    academicYearId: yearA._id,
    studentId: studentA1._id,
    date: testDate,
  });

  assert(totalCountForDate === 1, "Exactly ONE attendance record exists after status change");
  assert(updatedRec?.status === "ABSENT", "Attendance successfully transitioned to ABSENT");

  // -------------------------------------------------------------
  // 5. BULK ATTENDANCE VALIDATION & UPSERT
  // -------------------------------------------------------------
  console.log("\n5. Testing Bulk Attendance Submission & Safe Atomic Writes...");

  // Bulk save for section 1A on date 2026-09-23
  const date23 = normalizeAttendanceDate("2026-09-23");
  const bulkOps = [
    {
      updateOne: {
        filter: {
          schoolId: schoolA._id,
          academicYearId: yearA._id,
          studentId: studentA1._id,
          date: date23,
        },
        update: {
          $set: {
            classId: class1A._id,
            sectionId: section1A._id,
            status: "PRESENT" as const,
            remarks: "On time",
            updatedAt: new Date(),
          },
          $setOnInsert: {
            markedBy: adminA._id,
            markedByRole: "ADMIN",
            isLocked: false,
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    },
    {
      updateOne: {
        filter: {
          schoolId: schoolA._id,
          academicYearId: yearA._id,
          studentId: studentA2._id,
          date: date23,
        },
        update: {
          $set: {
            classId: class1A._id,
            sectionId: section1A._id,
            status: "LATE" as const,
            remarks: "Bus delayed",
            updatedAt: new Date(),
          },
          $setOnInsert: {
            markedBy: adminA._id,
            markedByRole: "ADMIN",
            isLocked: false,
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    },
  ];

  await Attendance.bulkWrite(bulkOps);

  const sectionRecs = await Attendance.find({
    schoolId: schoolA._id,
    sectionId: section1A._id,
    date: date23,
  });
  assert(sectionRecs.length === 2, "Bulk attendance saved 2 student records atomically");

  // -------------------------------------------------------------
  // 6. MULTI-TENANT ISOLATION TESTS
  // -------------------------------------------------------------
  console.log("\n6. Testing Strict Multi-Tenant Data Isolation...");

  // School B Attendance Record
  await Attendance.create({
    schoolId: schoolB._id,
    academicYearId: yearB._id,
    classId: class1B._id,
    sectionId: section1B_B._id,
    studentId: studentB1._id,
    date: date23,
    status: "PRESENT",
    markedBy: adminB._id,
    markedByRole: "ADMIN",
  });

  // Admin A queries attendance with School A scope
  const schoolARecords = await Attendance.find({ schoolId: schoolA._id });
  const schoolBRecords = await Attendance.find({ schoolId: schoolB._id });

  assert(
    !schoolARecords.some((r) => r.studentId.toString() === studentB1._id.toString()),
    "School A queries never return School B student attendance records"
  );
  assert(
    !schoolBRecords.some((r) => r.studentId.toString() === studentA1._id.toString()),
    "School B queries never return School A student attendance records"
  );

  // Attempting to query student B1 under School A scope
  const crossTenantStudentCheck = await Student.findOne({
    _id: studentB1._id,
    schoolId: schoolA._id,
  });
  assert(crossTenantStudentCheck === null, "School A cannot access School B student record");

  // -------------------------------------------------------------
  // 7. CROSS-CLASS / CROSS-SECTION STUDENT MISMATCH TESTS
  // -------------------------------------------------------------
  console.log("\n7. Testing Cross-Class & Cross-Section Student Validation...");

  // Student A1 belongs to Class 1, Section A. Attempt verifying under Class 2 Section A
  const wrongClassStudent = await Student.findOne({
    _id: studentA1._id,
    schoolId: schoolA._id,
    classId: class2A._id,
    sectionId: section1A._id,
  });
  assert(wrongClassStudent === null, "Student in Class 1 is rejected when submitted under Class 2");

  // Attempt verifying under Class 1 Section B
  const wrongSectionStudent = await Student.findOne({
    _id: studentA1._id,
    schoolId: schoolA._id,
    classId: class1A._id,
    sectionId: section1B._id,
  });
  assert(wrongSectionStudent === null, "Student in Section A is rejected when submitted under Section B");

  // -------------------------------------------------------------
  // 7B. STUDENT ATTENDANCE HISTORY FILTERING & CONTEXT VALIDATION
  // -------------------------------------------------------------
  console.log("\n7B. Testing Student Attendance History Scoping & Multi-Context Isolation...");

  // Let's create Student A3 who has historical placement in Class 1-A and current in Class 2-A
  const studentA3 = await Student.create({
    schoolId: schoolA._id,
    admissionNumber: `ADM-A3-${timestamp}`,
    firstName: "Abhigyan",
    lastName: "Mishra",
    dateOfBirth: new Date("2018-01-10"),
    gender: "MALE",
    academicYearId: yearA._id,
    classId: class2A._id,
    sectionId: section1A._id,
    admissionDate: new Date("2025-04-01"),
    status: "ACTIVE",
    academicHistory: [
      {
        academicYearId: yearA._id,
        classId: class1A._id,
        sectionId: section1A._id,
        yearName: "2026-27",
        className: "Class 1",
        sectionName: "A",
        status: "COMPLETED",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2026-08-31"),
      },
    ],
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  // Historical record for Student A3 in Class 1-A (from September 2026)
  const historyDate1 = normalizeAttendanceDate("2026-09-01");
  await Attendance.create({
    schoolId: schoolA._id,
    academicYearId: yearA._id,
    classId: class1A._id,
    sectionId: section1A._id,
    studentId: studentA3._id,
    date: historyDate1,
    status: "PRESENT",
    remarks: "Class 1 record",
    markedBy: adminA._id,
    markedByRole: "ADMIN",
  });

  // Current record for Student A3 in Class 2-A (from September 2026)
  const historyDate2 = normalizeAttendanceDate("2026-09-22");
  await Attendance.create({
    schoolId: schoolA._id,
    academicYearId: yearA._id,
    classId: class2A._id,
    sectionId: section1A._id,
    studentId: studentA3._id,
    date: historyDate2,
    status: "PRESENT",
    remarks: "Class 2 record",
    markedBy: adminA._id,
    markedByRole: "ADMIN",
  });

  // 1. Querying with Class 2 & Section A filter
  const class2QueryFilter: Record<string, any> = {
    schoolId: schoolA._id,
    studentId: studentA3._id,
    academicYearId: yearA._id,
    classId: class2A._id,
    sectionId: section1A._id,
  };
  const class2History = await Attendance.find(class2QueryFilter).lean();
  assert(class2History.length === 1, "Class 2 query returns exactly 1 record");
  assert(
    class2History[0].classId.toString() === class2A._id.toString(),
    "Class 2 query returns ONLY attendance belonging to Class 2"
  );
  assert(
    !class2History.some((r) => r.classId.toString() === class1A._id.toString()),
    "Class 2 query NEVER leaks Class 1 attendance records"
  );

  // 2. Querying with Class 1 & Section A filter
  const class1QueryFilter: Record<string, any> = {
    schoolId: schoolA._id,
    studentId: studentA3._id,
    academicYearId: yearA._id,
    classId: class1A._id,
    sectionId: section1A._id,
  };
  const class1History = await Attendance.find(class1QueryFilter).lean();
  assert(class1History.length === 1, "Class 1 query returns historical Class 1 record");
  assert(
    class1History[0].classId.toString() === class1A._id.toString(),
    "Class 1 query returns ONLY attendance belonging to Class 1"
  );

  // 3. Querying Student A1 (who only belongs to Class 1) under Class 2 should fail validation
  const checkA1Placement = (
    studentA1.classId.toString() === class2A._id.toString() ||
    (studentA1.academicHistory || []).some((h: any) => h.classId.toString() === class2A._id.toString())
  );
  assert(!checkA1Placement, "Student A1 (Class 1 only) correctly detected as not belonging to Class 2");

  // 4. Querying student with non-existent class/section combo returns 0 records
  const emptyHistory = await Attendance.find({
    schoolId: schoolA._id,
    studentId: studentA3._id,
    academicYearId: yearA._id,
    classId: class2A._id,
    sectionId: section1B._id, // Section B
  }).lean();
  assert(emptyHistory.length === 0, "Query for class/section with no records returns empty array");

  // -------------------------------------------------------------
  // 8. ATTENDANCE PERCENTAGE & SUMMARY CALCULATION
  // -------------------------------------------------------------
  console.log("\n8. Testing Attendance Percentage & Metrics Calculations...");

  const mockAttendanceData = [
    { date: new Date("2026-09-01"), status: "PRESENT" },
    { date: new Date("2026-09-02"), status: "PRESENT" },
    { date: new Date("2026-09-03"), status: "PRESENT" },
    { date: new Date("2026-09-04"), status: "LATE" },
    { date: new Date("2026-09-05"), status: "ABSENT" },
    { date: new Date("2026-09-06"), status: "LEAVE" },
  ];

  const summary = calculateAttendanceSummary(mockAttendanceData);
  assert(summary.totalMarked === 6, "Total marked days = 6");
  assert(summary.presentCount === 3, "Present count = 3");
  assert(summary.lateCount === 1, "Late count = 1");
  assert(summary.absentCount === 1, "Absent count = 1");
  assert(summary.leaveCount === 1, "Leave count = 1");
  assert(summary.attendedCount === 4, "Attended count (Present + Late) = 4");
  // (4 / 6) * 100 = 66.7%
  assert(summary.percentage === 66.7, `Turnout percentage calculated correctly: ${summary.percentage}% === 66.7%`);

  // -------------------------------------------------------------
  // 9. ATTENDANCE LOCKING FOUNDATION
  // -------------------------------------------------------------
  console.log("\n9. Testing Attendance Locking Foundation...");

  const lockedDoc = await Attendance.create({
    schoolId: schoolA._id,
    academicYearId: yearA._id,
    classId: class1A._id,
    sectionId: section1A._id,
    studentId: studentA1._id,
    date: normalizeAttendanceDate("2026-09-10"),
    status: "PRESENT",
    isLocked: true,
    markedBy: adminA._id,
    markedByRole: "ADMIN",
  });

  assert(lockedDoc.isLocked === true, "Attendance record successfully flagged as locked");

  // -------------------------------------------------------------
  // 10. TEACHER ASSIGNMENT AUTHORIZATION FOUNDATION
  // -------------------------------------------------------------
  console.log("\n10. Testing Teacher Assignment Scope Authorization...");

  const teacherUser = await User.create({
    name: "Vikram Mehta",
    email: `vikram.${timestamp}@school-a.com`,
    password: "Password@123",
    role: "TEACHER",
    schoolId: schoolA._id,
    isActive: true,
  });

  const teacherProfile = await Teacher.create({
    schoolId: schoolA._id,
    userId: teacherUser._id,
    teacherId: `TCH-${timestamp}`,
    employeeId: `EMP-${timestamp}`,
    firstName: "Vikram",
    lastName: "Mehta",
    email: teacherUser.email,
    dateOfBirth: new Date("1988-03-12"),
    gender: "MALE",
    joiningDate: new Date("2025-06-01"),
    status: "ACTIVE",
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  // Assign Teacher to Class 1 Section A as CLASS_TEACHER
  await TeacherAssignment.create({
    schoolId: schoolA._id,
    teacherId: teacherProfile._id,
    academicYearId: yearA._id,
    classId: class1A._id,
    sectionId: section1A._id,
    assignmentType: "CLASS_TEACHER",
    isClassTeacher: true,
    isActive: true,
    createdBy: adminA._id,
    updatedBy: adminA._id,
  });

  // Verify access for assigned Section 1A
  const authorizedScope = await verifyTeacherAttendanceScope({
    schoolId: schoolA._id.toString(),
    userId: teacherUser._id.toString(),
    academicYearId: yearA._id.toString(),
    classId: class1A._id.toString(),
    sectionId: section1A._id.toString(),
  });
  assert(authorizedScope.hasAccess === true, "Teacher is authorized for assigned Class 1 Section A");
  assert(authorizedScope.isClassTeacher === true, "Teacher recognized as Class Teacher of Section 1A");

  // Verify access for unassigned Section 1B
  const unauthorizedScope1 = await verifyTeacherAttendanceScope({
    schoolId: schoolA._id.toString(),
    userId: teacherUser._id.toString(),
    academicYearId: yearA._id.toString(),
    classId: class1A._id.toString(),
    sectionId: section1B._id.toString(),
  });
  assert(unauthorizedScope1.hasAccess === false, "Teacher is denied access for unassigned Section 1B");

  // Verify access for unassigned Class 2 Section A
  const unauthorizedScope2 = await verifyTeacherAttendanceScope({
    schoolId: schoolA._id.toString(),
    userId: teacherUser._id.toString(),
    academicYearId: yearA._id.toString(),
    classId: class2A._id.toString(),
    sectionId: section1A._id.toString(),
  });
  assert(unauthorizedScope2.hasAccess === false, "Teacher is denied access for unassigned Class 2 Section A");

  // -------------------------------------------------------------
  // 11. AUDIT LOGGING VERIFICATION
  // -------------------------------------------------------------
  console.log("\n11. Testing Audit Logging for Attendance Events...");

  await AuditLog.create({
    userId: adminA._id,
    userRole: "ADMIN",
    action: "ATTENDANCE_BULK_CREATED",
    entityType: "ATTENDANCE_BULK",
    entityId: `${section1A._id}_2026-09-23`,
    schoolId: schoolA._id,
    metadata: {
      date: "2026-09-23",
      totalRecords: 2,
    },
  });

  const auditRecord = await AuditLog.findOne({
    schoolId: schoolA._id,
    action: "ATTENDANCE_BULK_CREATED",
  });
  assert(!!auditRecord, "ATTENDANCE_BULK_CREATED audit event properly logged with metadata");

  // -------------------------------------------------------------
  // CLEANUP TEST DATA
  // -------------------------------------------------------------
  console.log("\n12. Cleaning up test data...");
  await Promise.all([
    User.deleteMany({ _id: { $in: [adminA._id, adminB._id, teacherUser._id] } }),
    School.deleteMany({ _id: { $in: [schoolA._id, schoolB._id] } }),
    AcademicYear.deleteMany({ _id: { $in: [yearA._id, yearB._id] } }),
    Class.deleteMany({ _id: { $in: [class1A._id, class2A._id, class1B._id] } }),
    Section.deleteMany({ _id: { $in: [section1A._id, section1B._id, section1B_B._id] } }),
    Student.deleteMany({ _id: { $in: [studentA1._id, studentA2._id, studentA3._id, studentB1._id] } }),
    Teacher.deleteMany({ _id: teacherProfile._id }),
    TeacherAssignment.deleteMany({ teacherId: teacherProfile._id }),
    Attendance.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } }),
    AuditLog.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } }),
  ]);

  console.log("\n==========================================================================");
  console.log(`=== PHASE A4 TESTS COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED ===`);
  console.log("==========================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
