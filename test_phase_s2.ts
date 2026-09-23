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

async function runS2TestSuite() {
  console.log("============================================================");
  console.log("🧪 STARTING S2: STUDENT ATTENDANCE TEST SUITE");
  console.log("============================================================\n");

  const mongoose: any = (await import("mongoose")).default;
  const connectToDatabase: any = (await import("./src/lib/db")).default;
  const User: any = (await import("./src/models/User")).default;
  const School: any = (await import("./src/models/School")).default;
  const AcademicYear: any = (await import("./src/models/AcademicYear")).default;
  const Class: any = (await import("./src/models/Class")).default;
  const Section: any = (await import("./src/models/Section")).default;
  const Student: any = (await import("./src/models/Student")).default;
  const Attendance: any = (await import("./src/models/Attendance")).default;

  const { createToken } = await import("./src/lib/jwt");
  const { calculateAttendancePercentage, calculateAttendanceSummary } = await import("./src/lib/utils/attendance");
  const { GET: getStudentAttendance } = (await import("./src/app/api/student/attendance/route")) as any;

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
    console.log("--- 1. Testing Core Attendance Calculation Formula Requirements ---");
    // Test: 0/0 -> 0%
    const p0_0 = calculateAttendancePercentage(0, 0);
    assert(p0_0 === 0, "0/0 returns 0% (never falls back to 100% or NaN)");

    // Test: 2/3 -> 66.7%
    const p2_3 = calculateAttendancePercentage(2, 3);
    assert(p2_3 === 66.7, `2/3 returns 66.7% (got ${p2_3}%)`);

    // Test: 3/3 -> 100%
    const p3_3 = calculateAttendancePercentage(3, 3);
    assert(p3_3 === 100, `3/3 returns 100% (got ${p3_3}%)`);

    // Test: 0/3 -> 0%
    const p0_3 = calculateAttendancePercentage(0, 3);
    assert(p0_3 === 0, `0/3 returns 0% (got ${p0_3}%)`);

    // Test: calculateAttendanceSummary on empty records
    const emptySummary = calculateAttendanceSummary([]);
    assert(emptySummary.totalMarked === 0, "Empty records totalMarked === 0");
    assert(emptySummary.percentage === 0, "Empty records percentage === 0%");

    console.log("\n--- 2. Setting Up Test Database Fixtures ---");
    const school = await School.create({
      name: `S2 Academy ${timestamp}`,
      code: `S2_${timestamp}`,
      status: "ACTIVE",
      address: "200 Attendance Way",
      city: "Bangalore",
      state: "Karnataka",
      country: "India",
      phone: "1234567890",
      email: `s2_school_${timestamp}@example.com`,
      plan: "STANDARD",
      studentLimit: 500,
      subscriptionStartDate: new Date(),
      subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
      subscriptionStatus: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Year 1 (2025-2026 - Past Year)
    const yearPast = await AcademicYear.create({
      schoolId: school._id,
      name: `2025-2026 ${timestamp}`,
      startDate: new Date("2025-04-01"),
      endDate: new Date("2026-03-31"),
      status: "INACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Year 2 (2026-2027 - Current Active Year)
    const yearCurrent = await AcademicYear.create({
      schoolId: school._id,
      name: `2026-2027 ${timestamp}`,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Class 10-A
    const classA = await Class.create({
      schoolId: school._id,
      academicYearId: yearCurrent._id,
      name: `Class 10-${timestamp}`,
      code: `C10_${timestamp}`.slice(0, 10),
      createdBy: adminId,
      updatedBy: adminId,
    });

    const sectionA = await Section.create({
      schoolId: school._id,
      academicYearId: yearCurrent._id,
      classId: classA._id,
      name: "A",
      capacity: 35,
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Student A (Alice)
    const userA = await User.create({
      email: `alice_${timestamp}@example.com`,
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
      firstName: "Alice",
      lastName: "Smith",
      dateOfBirth: new Date("2010-01-01"),
      gender: "FEMALE",
      academicYearId: yearCurrent._id,
      classId: classA._id,
      sectionId: sectionA._id,
      admissionDate: new Date("2024-04-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Student B (Bob - in same class)
    const userB = await User.create({
      email: `bob_${timestamp}@example.com`,
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
      firstName: "Bob",
      lastName: "Jones",
      dateOfBirth: new Date("2010-02-02"),
      gender: "MALE",
      academicYearId: yearCurrent._id,
      classId: classA._id,
      sectionId: sectionA._id,
      admissionDate: new Date("2024-04-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // 3. Populate Attendance Records for Student A (Current Year: 3 days -> 2 Present, 1 Absent = 66.7%)
    // Month 1: August 2026 (1 Present)
    await Attendance.create({
      schoolId: school._id,
      academicYearId: yearCurrent._id,
      classId: classA._id,
      sectionId: sectionA._id,
      studentId: studentA._id,
      date: new Date("2026-08-15"),
      status: "PRESENT",
      remarks: "On time",
      markedBy: adminId,
      markedByRole: "TEACHER",
      isLocked: false,
    });

    // Month 2: September 2026 (1 Present, 1 Absent)
    await Attendance.create([
      {
        schoolId: school._id,
        academicYearId: yearCurrent._id,
        classId: classA._id,
        sectionId: sectionA._id,
        studentId: studentA._id,
        date: new Date("2026-09-10"),
        status: "PRESENT",
        remarks: "Active in class",
        markedBy: adminId,
        markedByRole: "TEACHER",
        isLocked: false,
      },
      {
        schoolId: school._id,
        academicYearId: yearCurrent._id,
        classId: classA._id,
        sectionId: sectionA._id,
        studentId: studentA._id,
        date: new Date("2026-09-11"),
        status: "ABSENT",
        remarks: "Sick leave unnotified",
        markedBy: adminId,
        markedByRole: "TEACHER",
        isLocked: false,
      },
    ]);

    // Student A records in Past Year (2025-2026: 2 days -> 2 Present = 100%)
    await Attendance.create([
      {
        schoolId: school._id,
        academicYearId: yearPast._id,
        classId: classA._id,
        sectionId: sectionA._id,
        studentId: studentA._id,
        date: new Date("2025-10-01"),
        status: "PRESENT",
        remarks: "Present in Grade 9",
        markedBy: adminId,
        markedByRole: "TEACHER",
        isLocked: false,
      },
      {
        schoolId: school._id,
        academicYearId: yearPast._id,
        classId: classA._id,
        sectionId: sectionA._id,
        studentId: studentA._id,
        date: new Date("2025-10-02"),
        status: "PRESENT",
        remarks: "Present in Grade 9",
        markedBy: adminId,
        markedByRole: "TEACHER",
        isLocked: false,
      },
    ]);

    // Student B records in Current Year (3 days -> 3 Absent = 0%)
    await Attendance.create([
      {
        schoolId: school._id,
        academicYearId: yearCurrent._id,
        classId: classA._id,
        sectionId: sectionA._id,
        studentId: studentB._id,
        date: new Date("2026-09-10"),
        status: "ABSENT",
        markedBy: adminId,
        markedByRole: "TEACHER",
        isLocked: false,
      },
      {
        schoolId: school._id,
        academicYearId: yearCurrent._id,
        classId: classA._id,
        sectionId: sectionA._id,
        studentId: studentB._id,
        date: new Date("2026-09-11"),
        status: "ABSENT",
        markedBy: adminId,
        markedByRole: "TEACHER",
        isLocked: false,
      },
      {
        schoolId: school._id,
        academicYearId: yearCurrent._id,
        classId: classA._id,
        sectionId: sectionA._id,
        studentId: studentB._id,
        date: new Date("2026-09-12"),
        status: "ABSENT",
        markedBy: adminId,
        markedByRole: "TEACHER",
        isLocked: false,
      },
    ]);

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

    console.log("\n--- 3. Testing Student A Attendance (Current Academic Year) ---");
    const resA = await getStudentAttendance(makeRequest("/api/student/attendance", tokenA));
    const dataA = await resA.json();

    assert(resA.status === 200, "Student A attendance API returns HTTP 200");
    assert(dataA.success === true, "Response success is true");
    assert(dataA.data.summary.totalMarked === 3, "Student A current year total marked is 3");
    assert(dataA.data.summary.presentCount === 2, "Student A current year present count is 2");
    assert(dataA.data.summary.absentCount === 1, "Student A current year absent count is 1");
    assert(dataA.data.summary.percentage === 66.7, `Student A attendance percentage is 66.7% (got ${dataA.data.summary.percentage}%)`);

    // Monthly breakdown check
    assert(dataA.data.monthlyBreakdown.length === 2, "Monthly breakdown contains 2 months (August & September)");
    const septMonth = dataA.data.monthlyBreakdown.find((m: any) => m.monthKey === "2026-09");
    assert(septMonth !== undefined, "September 2026 breakdown exists");
    assert(septMonth.totalMarked === 2, "September total marked is 2");
    assert(septMonth.presentCount === 1, "September present count is 1");
    assert(septMonth.absentCount === 1, "September absent count is 1");
    assert(septMonth.percentage === 50, "September percentage is 50%");

    const augMonth = dataA.data.monthlyBreakdown.find((m: any) => m.monthKey === "2026-08");
    assert(augMonth !== undefined, "August 2026 breakdown exists");
    assert(augMonth.totalMarked === 1, "August total marked is 1");
    assert(augMonth.presentCount === 1, "August present count is 1");
    assert(augMonth.percentage === 100, "August percentage is 100%");

    console.log("\n--- 4. Testing Academic-Year Filtering ---");
    // Query past year: 2025-2026
    const resPast = await getStudentAttendance(
      makeRequest(`/api/student/attendance?academicYearId=${yearPast._id}`, tokenA)
    );
    const dataPast = await resPast.json();

    assert(resPast.status === 200, "Past year query returns HTTP 200");
    assert(dataPast.data.summary.totalMarked === 2, "Past year total marked is 2");
    assert(dataPast.data.summary.presentCount === 2, "Past year present count is 2");
    assert(dataPast.data.summary.percentage === 100, "Past year percentage is 100% (2/2)");
    assert(dataPast.data.monthlyBreakdown.length === 1, "Past year has 1 month (October 2025)");
    assert(dataPast.data.history.length === 2, "Past year history has 2 entries");

    console.log("\n--- 5. Testing Student B Attendance (0/3 -> 0%) ---");
    const resB = await getStudentAttendance(makeRequest("/api/student/attendance", tokenB));
    const dataB = await resB.json();

    assert(resB.status === 200, "Student B attendance API returns HTTP 200");
    assert(dataB.data.summary.totalMarked === 3, "Student B total marked is 3");
    assert(dataB.data.summary.presentCount === 0, "Student B present count is 0");
    assert(dataB.data.summary.absentCount === 3, "Student B absent count is 3");
    assert(dataB.data.summary.percentage === 0, "Student B percentage is 0% (0/3)");

    console.log("\n--- 6. Security: Anti-Tampering & Student Identity Isolation ---");
    // Attempt to pass arbitrary studentId for Student B in Student A's request
    const tamperedRes = await getStudentAttendance(
      makeRequest(`/api/student/attendance?studentId=${studentB._id}`, tokenA)
    );
    const tamperedData = await tamperedRes.json();

    assert(tamperedRes.status === 200, "Tampered request handled without server crash");
    // Must return Student A's attendance (66.7%), NOT Student B's attendance (0%)
    assert(
      tamperedData.data.summary.percentage === 66.7,
      "API strictly derives student identity from session; ignores query studentId"
    );
    assert(
      tamperedData.data.summary.absentCount === 1,
      "Student A receives own attendance, not Student B's 3 absent records"
    );

    // Clean up test data
    await Promise.all([
      School.findByIdAndDelete(school._id),
      AcademicYear.deleteMany({ schoolId: school._id }),
      Class.deleteMany({ schoolId: school._id }),
      Section.deleteMany({ schoolId: school._id }),
      User.deleteMany({ schoolId: school._id }),
      Student.deleteMany({ schoolId: school._id }),
      Attendance.deleteMany({ schoolId: school._id }),
    ]);

    console.log("\n============================================================");
    console.log(`📊 S2 TEST SUITE COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log("============================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Fatal Error in S2 test suite:", err);
    process.exit(1);
  }
}

runS2TestSuite();
