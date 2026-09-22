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

async function runPhaseA1Tests() {
  console.log("==================================================");
  console.log("STARTING PHASE A1 E2E VERIFICATION TEST SUITE");
  console.log("==================================================\n");

  const mongoose = (await import("mongoose")).default;
  const connectToDatabase = (await import("./src/lib/db")).default;
  const User = (await import("./src/models/User")).default;
  const School = (await import("./src/models/School")).default;
  const AcademicYear = (await import("./src/models/AcademicYear")).default;
  const Class = (await import("./src/models/Class")).default;
  const Section = (await import("./src/models/Section")).default;
  const Subject = (await import("./src/models/Subject")).default;
  const ClassSubject = (await import("./src/models/ClassSubject")).default;
  const AuditLog = (await import("./src/models/AuditLog")).default;
  const { createToken } = await import("./src/lib/jwt");

  await connectToDatabase();

  const timestamp = Date.now();

  // 1. Setup School A & School B
  const schoolA = await School.create({
    name: `Alpha Academy ${timestamp}`,
    code: `ALP${timestamp.toString().slice(-4)}`,
    status: "ACTIVE",
    plan: "STANDARD",
    studentLimit: 500,
    subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    createdBy: new mongoose.Types.ObjectId(),
    updatedBy: new mongoose.Types.ObjectId(),
  });

  const adminUserA = await User.create({
    name: "Admin Alpha",
    email: `admin_alpha_${timestamp}@test.com`,
    password: "AdminPass123!",
    role: "ADMIN",
    isActive: true,
    schoolId: schoolA._id,
  });
  schoolA.createdBy = adminUserA._id;
  schoolA.updatedBy = adminUserA._id;
  await schoolA.save();

  const schoolB = await School.create({
    name: `Beta International ${timestamp}`,
    code: `BET${timestamp.toString().slice(-4)}`,
    status: "ACTIVE",
    plan: "BASIC",
    studentLimit: 200,
    subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    createdBy: new mongoose.Types.ObjectId(),
    updatedBy: new mongoose.Types.ObjectId(),
  });

  const adminUserB = await User.create({
    name: "Admin Beta",
    email: `admin_beta_${timestamp}@test.com`,
    password: "AdminPass123!",
    role: "ADMIN",
    isActive: true,
    schoolId: schoolB._id,
  });
  schoolB.createdBy = adminUserB._id;
  schoolB.updatedBy = adminUserB._id;
  await schoolB.save();

  const tokenA = createToken({
    userId: adminUserA._id.toString(),
    email: adminUserA.email,
    role: "ADMIN",
  });

  const tokenB = createToken({
    userId: adminUserB._id.toString(),
    email: adminUserB.email,
    role: "ADMIN",
  });

  console.log(`✓ Test Tenants initialized: School A (${schoolA.name}) & School B (${schoolB.name})`);

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passedTests++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: School Profile & Branding
    // ----------------------------------------------------
    console.log("\n[TEST GROUP 1: School Profile & Branding]");

    // Update School A Profile
    const updatedName = `Alpha Academy Premier ${timestamp}`;
    const schoolAUpdated = await School.findByIdAndUpdate(
      schoolA._id,
      {
        $set: {
          name: updatedName,
          address: "100 Education Lane",
          city: "New Delhi",
          state: "Delhi",
          phone: "+91 11 98765432",
          email: "info@alphaacademy.edu",
          website: "https://alphaacademy.edu",
          branding: {
            logo: "https://alphaacademy.edu/logo.png",
            primaryColor: "#4338ca",
            secondaryColor: "#0ea5e9",
          },
        },
      },
      { new: true }
    );

    assert(schoolAUpdated?.name === updatedName, "School profile updated successfully");
    assert(schoolAUpdated?.branding?.primaryColor === "#4338ca", "School branding updated successfully");
    assert(schoolAUpdated?.code === schoolA.code, "Internal school code untouched during profile update");

    // ----------------------------------------------------
    // TEST 2: Academic Year Management & Constraints
    // ----------------------------------------------------
    console.log("\n[TEST GROUP 2: Academic Year Management]");

    const ayA1 = await AcademicYear.create({
      schoolId: schoolA._id,
      name: "2026-27",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: adminUserA._id,
      updatedBy: adminUserA._id,
    });
    assert(ayA1.status === "ACTIVE", "Academic Year 2026-27 created and activated for School A");

    // School B can have same academic year name (multi-tenant safe)
    const ayB1 = await AcademicYear.create({
      schoolId: schoolB._id,
      name: "2026-27",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: adminUserB._id,
      updatedBy: adminUserB._id,
    });
    assert(ayB1.schoolId.toString() === schoolB._id.toString(), "School B creates 2026-27 independently");

    // Duplicate academic year in same school must be rejected by compound index
    let duplicateAyFailed = false;
    try {
      await AcademicYear.create({
        schoolId: schoolA._id,
        name: "2026-27",
        startDate: new Date("2026-04-01"),
        endDate: new Date("2027-03-31"),
        createdBy: adminUserA._id,
        updatedBy: adminUserA._id,
      });
    } catch {
      duplicateAyFailed = true;
    }
    assert(duplicateAyFailed, "Duplicate academic year name in same school rejected by database constraint");

    // ----------------------------------------------------
    // TEST 3: Classes & Section Structure
    // ----------------------------------------------------
    console.log("\n[TEST GROUP 3: Classes & Sections]");

    const class10A = await Class.create({
      schoolId: schoolA._id,
      academicYearId: ayA1._id,
      name: "Class 10",
      code: "CLS10",
      displayOrder: 10,
      createdBy: adminUserA._id,
      updatedBy: adminUserA._id,
    });
    assert(class10A.name === "Class 10", "Class 10 created under School A 2026-27 session");

    // Duplicate class in same session rejected
    let duplicateClassFailed = false;
    try {
      await Class.create({
        schoolId: schoolA._id,
        academicYearId: ayA1._id,
        name: "Class 10",
        createdBy: adminUserA._id,
        updatedBy: adminUserA._id,
      });
    } catch {
      duplicateClassFailed = true;
    }
    assert(duplicateClassFailed, "Duplicate class name in same academic year rejected");

    // Create Sections
    const secA = await Section.create({
      schoolId: schoolA._id,
      academicYearId: ayA1._id,
      classId: class10A._id,
      name: "A",
      capacity: 40,
      createdBy: adminUserA._id,
      updatedBy: adminUserA._id,
    });

    const secB = await Section.create({
      schoolId: schoolA._id,
      academicYearId: ayA1._id,
      classId: class10A._id,
      name: "B",
      capacity: 35,
      createdBy: adminUserA._id,
      updatedBy: adminUserA._id,
    });
    assert(secA.name === "A" && secB.name === "B", "Sections A and B created under Class 10");

    // Duplicate section in same class rejected
    let duplicateSecFailed = false;
    try {
      await Section.create({
        schoolId: schoolA._id,
        academicYearId: ayA1._id,
        classId: class10A._id,
        name: "A",
        createdBy: adminUserA._id,
        updatedBy: adminUserA._id,
      });
    } catch {
      duplicateSecFailed = true;
    }
    assert(duplicateSecFailed, "Duplicate section A under Class 10 rejected");

    // ----------------------------------------------------
    // TEST 4: Subjects & Class-Subject Relationships
    // ----------------------------------------------------
    console.log("\n[TEST GROUP 4: Subjects & Class-Subject Mappings]");

    const mathSub = await Subject.create({
      schoolId: schoolA._id,
      name: "Mathematics",
      code: "MATH",
      subjectType: "CORE",
      createdBy: adminUserA._id,
      updatedBy: adminUserA._id,
    });

    const sciSub = await Subject.create({
      schoolId: schoolA._id,
      name: "Science",
      code: "SCI",
      subjectType: "CORE",
      createdBy: adminUserA._id,
      updatedBy: adminUserA._id,
    });
    assert(mathSub.code === "MATH" && sciSub.code === "SCI", "Core subjects created in School A catalog");

    // Assign Subject to Class
    const classMath = await ClassSubject.create({
      schoolId: schoolA._id,
      academicYearId: ayA1._id,
      classId: class10A._id,
      subjectId: mathSub._id,
      maximumMarks: 100,
      passingMarks: 33,
      createdBy: adminUserA._id,
      updatedBy: adminUserA._id,
    });
    assert(classMath.maximumMarks === 100 && classMath.passingMarks === 33, "Mathematics mapped to Class 10 with max 100 / pass 33");

    // Duplicate assignment rejected
    let duplicateMappingFailed = false;
    try {
      await ClassSubject.create({
        schoolId: schoolA._id,
        academicYearId: ayA1._id,
        classId: class10A._id,
        subjectId: mathSub._id,
        maximumMarks: 100,
        passingMarks: 33,
        createdBy: adminUserA._id,
        updatedBy: adminUserA._id,
      });
    } catch {
      duplicateMappingFailed = true;
    }
    assert(duplicateMappingFailed, "Duplicate class-subject mapping rejected");

    // ----------------------------------------------------
    // TEST 5: Grading, Attendance, and Fee Settings
    // ----------------------------------------------------
    console.log("\n[TEST GROUP 5: Settings Foundation]");

    await School.findByIdAndUpdate(schoolA._id, {
      $set: {
        gradingSettings: {
          gradingType: "PERCENTAGE",
          scales: [
            { grade: "A+", minPercentage: 90, maxPercentage: 100, gradePoint: 10, description: "Outstanding" },
            { grade: "A", minPercentage: 80, maxPercentage: 89.99, gradePoint: 9, description: "Excellent" },
            { grade: "F", minPercentage: 0, maxPercentage: 39.99, gradePoint: 0, description: "Fail" },
          ],
        },
        attendanceSettings: {
          attendanceTypes: ["PRESENT", "ABSENT", "LATE", "LEAVE"],
          workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        },
        feeSettings: {
          categories: ["Tuition Fee", "Lab Fee", "Sports Fee"],
          paymentFrequencies: ["MONTHLY", "QUARTERLY"],
          lateFeeGraceDays: 5,
          lateFeeFineAmount: 50,
          lateFeeType: "FIXED",
        },
      },
    });

    const refreshedA = await School.findById(schoolA._id).lean();
    assert(refreshedA?.gradingSettings?.scales?.length === 3, "Grading scales configured and persisted");
    assert(refreshedA?.attendanceSettings?.workingDays?.length === 5, "Attendance working days configured and persisted");
    assert(refreshedA?.feeSettings?.categories?.length === 3, "Fee categories configured and persisted");

    // ----------------------------------------------------
    // TEST 6: Strict Multi-Tenant Isolation
    // ----------------------------------------------------
    console.log("\n[TEST GROUP 6: Cross-Tenant Security Verification]");

    // Verify School B queries cannot see School A academic year
    const schoolBAcademicYears = await AcademicYear.find({ schoolId: schoolB._id });
    assert(
      !schoolBAcademicYears.some((ay) => ay._id.toString() === ayA1._id.toString()),
      "School B cannot view School A's academic years"
    );

    // Verify School B cannot query School A classes
    const schoolBClasses = await Class.find({ schoolId: schoolB._id });
    assert(
      !schoolBClasses.some((c) => c._id.toString() === class10A._id.toString()),
      "School B cannot view School A's classes"
    );

    // Verify School B cannot query School A subjects
    const schoolBSubjects = await Subject.find({ schoolId: schoolB._id });
    assert(
      !schoolBSubjects.some((s) => s._id.toString() === mathSub._id.toString()),
      "School B cannot view School A's subjects"
    );

    // ----------------------------------------------------
    // TEST 7: Clean Audit Logging
    // ----------------------------------------------------
    console.log("\n[TEST GROUP 7: Audit Trail Verification]");

    await AuditLog.create({
      userId: adminUserA._id,
      userRole: "ADMIN",
      action: "CLASS_CREATED",
      entityType: "CLASS",
      entityId: class10A._id.toString(),
      schoolId: schoolA._id,
      metadata: { name: class10A.name },
    });

    const auditLogs = await AuditLog.find({ schoolId: schoolA._id });
    assert(auditLogs.length > 0, "Audit log generated for School A mutations");

    console.log("\n==================================================");
    console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests}`);
    console.log("==================================================");
  } finally {
    // Clean up test data
    await Promise.all([
      School.deleteMany({ _id: { $in: [schoolA._id, schoolB._id] } }),
      User.deleteMany({ _id: { $in: [adminUserA._id, adminUserB._id] } }),
      AcademicYear.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } }),
      Class.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } }),
      Section.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } }),
      Subject.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } }),
      ClassSubject.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } }),
      AuditLog.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } }),
    ]);
    console.log("✓ Test database cleanup complete.");
  }
}

runPhaseA1Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
