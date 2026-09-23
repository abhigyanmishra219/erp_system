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
  console.log("STARTING T3 TEST SUITE: TEACHER ATTENDANCE & SCOPE SECURITY");
  console.log("============================================================\n");

  const mongoose = (await import("mongoose")).default;
  const bcrypt = (await import("bcryptjs")).default;
  const connectToDatabase = (await import("./src/lib/db")).default;
  const School = (await import("./src/models/School")).default;
  const AcademicYear = (await import("./src/models/AcademicYear")).default;
  const Class = (await import("./src/models/Class")).default;
  const Section = (await import("./src/models/Section")).default;
  const User = (await import("./src/models/User")).default;
  const Teacher = (await import("./src/models/Teacher")).default;
  const Student = (await import("./src/models/Student")).default;
  const TeacherAssignment = (await import("./src/models/TeacherAssignment")).default;
  const Attendance = (await import("./src/models/Attendance")).default;
  const AuditLog = (await import("./src/models/AuditLog")).default;
  const { verifyTeacherSectionScope } = await import("./src/lib/auth/teacherScope");
  const { normalizeAttendanceDate, formatAttendanceDate } = await import("./src/lib/utils/date");

  await connectToDatabase();

  const runId = Date.now().toString().slice(-6);
  const sysUserId = new mongoose.Types.ObjectId();

  // 1. Create Multi-Tenant School & Academic Year
  const school = await School.create({
    name: `T3 Test School ${runId}`,
    code: `T3SCH_${runId}`,
    address: "Attendance Street",
    city: "Delhi",
    state: "Delhi",
    country: "India",
    email: `t3_${runId}@school.com`,
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
    email: `admin_t3_${runId}@test.com`,
    password: await bcrypt.hash("AdminPass123!", 10),
    role: "ADMIN",
    name: "School Admin",
    isActive: true,
  });

  // 2. Create Class 1 (Section A) and Class 2 (Section B)
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

  // 3. Create Teachers
  // Teacher A -> Assigned to Class 1 Section A
  const userA = await User.create({
    schoolId: school._id,
    email: `teacherA_t3_${runId}@test.com`,
    password: await bcrypt.hash("Pass123!", 10),
    role: "TEACHER",
    name: "Teacher Alpha",
    isActive: true,
  });

  const teacherA = await Teacher.create({
    schoolId: school._id,
    teacherId: `TCH_A_T3_${runId}`,
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

  // Teacher B -> Assigned to Class 2 Section B
  const userB = await User.create({
    schoolId: school._id,
    email: `teacherB_t3_${runId}@test.com`,
    password: await bcrypt.hash("Pass123!", 10),
    role: "TEACHER",
    name: "Teacher Beta",
    isActive: true,
  });

  const teacherB = await Teacher.create({
    schoolId: school._id,
    teacherId: `TCH_B_T3_${runId}`,
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

  // 4. Create Students in Class 1 and Class 2
  const student1A = await Student.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    classId: class1._id,
    sectionId: section1._id,
    admissionNumber: `ADM1A_${runId}`,
    rollNumber: "1",
    firstName: "Alice",
    lastName: "ClassOne",
    gender: "FEMALE",
    dateOfBirth: new Date("2012-02-10"),
    status: "ACTIVE",
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  const student1B = await Student.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    classId: class1._id,
    sectionId: section1._id,
    admissionNumber: `ADM1B_${runId}`,
    rollNumber: "2",
    firstName: "Bob",
    lastName: "ClassOne",
    gender: "MALE",
    dateOfBirth: new Date("2012-04-12"),
    status: "ACTIVE",
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  const student2A = await Student.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    classId: class2._id,
    sectionId: section2._id,
    admissionNumber: `ADM2A_${runId}`,
    rollNumber: "1",
    firstName: "Charlie",
    lastName: "ClassTwo",
    gender: "MALE",
    dateOfBirth: new Date("2011-08-15"),
    status: "ACTIVE",
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  console.log("✓ Created 2 Classes, 2 Teachers, 3 Students for Attendance Verification");

  // 5. TEST CROSS-CLASS ATTENDANCE SUBMISSION PROTECTION
  console.log("\n--- Testing Cross-Class Attendance Authorization Guard ---");

  // Teacher A tries to submit or view Class 2 Section B
  const canTeacherAAccessClass2 = await verifyTeacherSectionScope({
    schoolId: school._id.toString(),
    teacherId: teacherA._id.toString(),
    classId: class2._id.toString(),
    sectionId: section2._id.toString(),
  });

  if (!canTeacherAAccessClass2) {
    console.log("✓ Teacher A scope check for Class 2 Section B returns FALSE (403 Forbidden)");
  } else {
    throw new Error("Security breach: Teacher A was authorized for Class 2!");
  }

  // Teacher A tries to submit or view Class 1 Section A
  const canTeacherAAccessClass1 = await verifyTeacherSectionScope({
    schoolId: school._id.toString(),
    teacherId: teacherA._id.toString(),
    classId: class1._id.toString(),
    sectionId: section1._id.toString(),
  });

  if (canTeacherAAccessClass1) {
    console.log("✓ Teacher A scope check for Class 1 Section A returns TRUE (200 Authorized)");
  } else {
    throw new Error("Teacher A was incorrectly rejected for assigned Class 1!");
  }

  // 6. TEST ATTENDANCE SUBMISSION FOR CLASS 1 (SECTION A)
  console.log("\n--- Testing Roll-call Attendance Submission & Upsert Logic ---");
  const todayNormalized = normalizeAttendanceDate(new Date());

  const recordsToInsert: Array<{ studentId: any; status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE"; remarks: string }> = [
    { studentId: student1A._id, status: "PRESENT", remarks: "On time" },
    { studentId: student1B._id, status: "ABSENT", remarks: "Sick leave" },
  ];

  const bulkOps: any[] = recordsToInsert.map((r) => ({
    updateOne: {
      filter: {
        schoolId: school._id,
        academicYearId: academicYear._id,
        studentId: r.studentId,
        date: todayNormalized,
      },
      update: {
        $set: {
          classId: class1._id,
          sectionId: section1._id,
          status: r.status,
          remarks: r.remarks,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          markedBy: userA._id,
          markedByRole: "TEACHER",
          isLocked: false,
          createdAt: new Date(),
        },
      },
      upsert: true,
    },
  }));

  await Attendance.bulkWrite(bulkOps);

  const insertedRecords = await Attendance.find({
    schoolId: school._id,
    classId: class1._id,
    sectionId: section1._id,
    date: todayNormalized,
  }).lean();

  if (
    insertedRecords.length === 2 &&
    insertedRecords.some((r) => r.status === "PRESENT") &&
    insertedRecords.some((r) => r.status === "ABSENT")
  ) {
    console.log("✓ Attendance saved successfully for Class 1 Section A with Teacher role");
  } else {
    throw new Error(`Attendance insertion failed! count=${insertedRecords.length}`);
  }

  // 7. TEST DUPLICATE ATTENDANCE PREVENTION (RE-SUBMITTING SAME DATE)
  console.log("\n--- Testing Duplicate Attendance Prevention (Idempotent Upsert) ---");
  // Change student1B from ABSENT to LATE
  const updateOps: any[] = [
    {
      updateOne: {
        filter: {
          schoolId: school._id,
          academicYearId: academicYear._id,
          studentId: student1B._id,
          date: todayNormalized,
        },
        update: {
          $set: {
            status: "LATE" as const,
            remarks: "Arrived at 9:15 AM",
            editedBy: userA._id,
            editedAt: new Date(),
            updatedAt: new Date(),
          },
        },
        upsert: true,
      },
    },
  ];

  await Attendance.bulkWrite(updateOps);

  const totalRecordsAfterUpdate = await Attendance.countDocuments({
    schoolId: school._id,
    classId: class1._id,
    sectionId: section1._id,
    date: todayNormalized,
  });

  if (totalRecordsAfterUpdate === 2) {
    const updatedStudentBRecord = await Attendance.findOne({
      schoolId: school._id,
      studentId: student1B._id,
      date: todayNormalized,
    }).lean();

    if (updatedStudentBRecord?.status === "LATE" && updatedStudentBRecord.editedBy) {
      console.log("✓ Attendance update prevented duplicates and recorded editedBy audit timestamp");
    } else {
      throw new Error("Attendance update did not modify status correctly!");
    }
  } else {
    throw new Error(`Duplicate records created! Total count: ${totalRecordsAfterUpdate}`);
  }

  // 8. TEST AUDIT LOG FOR ATTENDANCE MODIFICATION
  console.log("\n--- Testing Audit Log Creation ---");
  const auditEntry = await AuditLog.create({
    userId: userA._id,
    userRole: "TEACHER",
    action: "ATTENDANCE_BULK_UPDATED",
    entityType: "ATTENDANCE",
    entityId: `${section1._id}_${formatAttendanceDate(todayNormalized)}`,
    schoolId: school._id,
    metadata: {
      teacherId: teacherA._id.toString(),
      classId: class1._id.toString(),
      sectionId: section1._id.toString(),
      date: formatAttendanceDate(todayNormalized),
      totalRecords: 2,
    },
  });

  if (auditEntry && auditEntry.action === "ATTENDANCE_BULK_UPDATED") {
    console.log("✓ Audit log successfully recorded for attendance update operation");
  } else {
    throw new Error("Audit log creation failed!");
  }

  // 9. TEST ATTENDANCE HISTORY QUERIES
  console.log("\n--- Testing Attendance History Queries ---");

  // Daily history
  const dailyHistoryRecords = await Attendance.find({
    schoolId: school._id,
    classId: class1._id,
    sectionId: section1._id,
    date: todayNormalized,
  }).lean();

  if (dailyHistoryRecords.length === 2) {
    console.log("✓ Daily history successfully fetched 2 student records for Class 1 Section A");
  } else {
    throw new Error("Daily history query failed!");
  }

  // Individual Student history
  const student1ARecords = await Attendance.find({
    schoolId: school._id,
    studentId: student1A._id,
  }).lean();

  if (student1ARecords.length === 1 && student1ARecords[0].status === "PRESENT") {
    console.log("✓ Student 1A individual attendance timeline successfully retrieved");
  } else {
    throw new Error("Student history query failed!");
  }

  // Monthly register query
  const startOfMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));
  const endOfMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 0, 23, 59, 59));

  const monthlyRecords = await Attendance.find({
    schoolId: school._id,
    classId: class1._id,
    sectionId: section1._id,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  }).lean();

  if (monthlyRecords.length === 2) {
    console.log("✓ Monthly register matrix query returns all records for the month");
  } else {
    throw new Error("Monthly register query failed!");
  }

  // 10. CLEANUP
  console.log("\n--- Cleaning up test records ---");
  await Promise.all([
    School.findByIdAndDelete(school._id),
    AcademicYear.findByIdAndDelete(academicYear._id),
    Class.deleteMany({ schoolId: school._id }),
    Section.deleteMany({ schoolId: school._id }),
    User.deleteMany({ schoolId: school._id }),
    Teacher.deleteMany({ schoolId: school._id }),
    TeacherAssignment.deleteMany({ schoolId: school._id }),
    Student.deleteMany({ schoolId: school._id }),
    Attendance.deleteMany({ schoolId: school._id }),
    AuditLog.deleteMany({ schoolId: school._id }),
  ]);
  console.log("✓ Test records cleaned up successfully.");

  console.log("\n============================================================");
  console.log("ALL T3 TEACHER ATTENDANCE TESTS PASSED!");
  console.log("============================================================\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
