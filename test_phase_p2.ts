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

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

function generateToken(payload: { userId: string; role: string; schoolId?: string; email: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

function createRequest(url: string, token?: string, method: string = "GET", body?: any) {
  const headers: Record<string, string> = {};
  if (token) {
    headers["authorization"] = `Bearer ${token}`;
    headers["cookie"] = `erp_auth_token=${token}; token=${token}`;
  }
  if (body) {
    headers["content-type"] = "application/json";
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function runTests() {
  console.log("============================================================");
  console.log("P2 — PARENT ATTENDANCE TEST SUITE");
  console.log("============================================================");

  const mongoose: any = (await import("mongoose")).default;
  const connectToDatabase: any = (await import("./src/lib/db")).default;
  const User: any = (await import("./src/models/User")).default;
  const Parent: any = (await import("./src/models/Parent")).default;
  const Student: any = (await import("./src/models/Student")).default;
  const StudentParent: any = (await import("./src/models/StudentParent")).default;
  const School: any = (await import("./src/models/School")).default;
  const Class: any = (await import("./src/models/Class")).default;
  const Section: any = (await import("./src/models/Section")).default;
  const AcademicYear: any = (await import("./src/models/AcademicYear")).default;
  const Attendance: any = (await import("./src/models/Attendance")).default;
  const { GET: getParentAttendance, POST: postParentAttendance, PUT: putParentAttendance, DELETE: deleteParentAttendance } = (await import("./src/app/api/parent/attendance/route")) as any;

  await connectToDatabase();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const cleanSuffix = `p2_${Date.now().toString().slice(-6)}`;
  const adminId = new mongoose.Types.ObjectId();

  // 1. Setup Schools
  const schoolA = await School.create({
    name: `P2 School A ${cleanSuffix}`,
    code: `SCH_A_${cleanSuffix}`,
    status: "ACTIVE",
    enabledModules: ["ATTENDANCE"],
    address: "10 Downing Street",
    city: "London",
    state: "Greater London",
    country: "United Kingdom",
    phone: "+44 20 7946 0999",
    email: `p2_schoolA_${cleanSuffix}@example.com`,
    website: "https://example.com/schoolA",
    plan: "STANDARD",
    studentLimit: 500,
    subscriptionStartDate: new Date(),
    subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
    subscriptionStatus: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const schoolB = await School.create({
    name: `P2 School B ${cleanSuffix}`,
    code: `SCH_B_${cleanSuffix}`,
    status: "ACTIVE",
    address: "221B Baker Street",
    city: "London",
    state: "Greater London",
    country: "United Kingdom",
    phone: "+44 20 7946 0888",
    email: `p2_schoolB_${cleanSuffix}@example.com`,
    website: "https://example.com/schoolB",
    plan: "STANDARD",
    studentLimit: 500,
    subscriptionStartDate: new Date(),
    subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
    subscriptionStatus: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Setup Academic Structure for School A
  const ayA = await AcademicYear.create({
    schoolId: schoolA._id,
    name: `2026-2027 ${cleanSuffix}`,
    startDate: new Date("2026-04-01"),
    endDate: new Date("2027-03-31"),
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const class10 = await Class.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    name: "Class 10",
    code: `C10_${cleanSuffix}`,
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const section10A = await Section.create({
    schoolId: schoolA._id,
    classId: class10._id,
    academicYearId: ayA._id,
    name: "A",
    capacity: 40,
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const class8 = await Class.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    name: "Class 8",
    code: `C8_${cleanSuffix}`,
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const section8B = await Section.create({
    schoolId: schoolA._id,
    classId: class8._id,
    academicYearId: ayA._id,
    name: "B",
    capacity: 35,
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 2. Setup Parent A in School A
  const parentUserA = await User.create({
    email: `parentA_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "PARENT",
    schoolId: schoolA._id,
    isActive: true,
    name: "Rajesh Kothari",
  });

  const parentDocA = await Parent.create({
    schoolId: schoolA._id,
    userId: parentUserA._id,
    firstName: "Rajesh",
    lastName: "Kothari",
    email: parentUserA.email,
    phone: "9876543210",
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 3. Setup Children for Parent A:
  // Child 1: Aarav Kothari (Class 10-A)
  const studentUser1 = await User.create({
    email: `aarav_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "STUDENT",
    schoolId: schoolA._id,
    isActive: true,
  });

  const student1 = await Student.create({
    schoolId: schoolA._id,
    userId: studentUser1._id,
    studentId: `STU1_${cleanSuffix}`,
    admissionNumber: `ADM1_${cleanSuffix}`,
    rollNumber: "101",
    firstName: "Aarav",
    lastName: "Kothari",
    classId: class10._id,
    sectionId: section10A._id,
    academicYearId: ayA._id,
    status: "ACTIVE",
    gender: "MALE",
    dateOfBirth: new Date("2011-04-15"),
    admissionDate: new Date("2024-04-01"),
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Child 2: Ananya Kothari (Class 8-B)
  const studentUser2 = await User.create({
    email: `ananya_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "STUDENT",
    schoolId: schoolA._id,
    isActive: true,
  });

  const student2 = await Student.create({
    schoolId: schoolA._id,
    userId: studentUser2._id,
    studentId: `STU2_${cleanSuffix}`,
    admissionNumber: `ADM2_${cleanSuffix}`,
    rollNumber: "202",
    firstName: "Ananya",
    lastName: "Kothari",
    classId: class8._id,
    sectionId: section8B._id,
    academicYearId: ayA._id,
    status: "ACTIVE",
    gender: "FEMALE",
    dateOfBirth: new Date("2013-09-20"),
    admissionDate: new Date("2024-04-01"),
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Child 3: Baby Kothari (No Attendance Records -> 0 Sessions)
  const studentUser3 = await User.create({
    email: `baby_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "STUDENT",
    schoolId: schoolA._id,
    isActive: true,
  });

  const studentZero = await Student.create({
    schoolId: schoolA._id,
    userId: studentUser3._id,
    studentId: `STU_ZERO_${cleanSuffix}`,
    admissionNumber: `ADM_ZERO_${cleanSuffix}`,
    firstName: "Baby",
    lastName: "Kothari",
    classId: class8._id,
    sectionId: section8B._id,
    academicYearId: ayA._id,
    status: "ACTIVE",
    gender: "FEMALE",
    dateOfBirth: new Date("2015-01-01"),
    admissionDate: new Date("2024-04-01"),
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Link Student 1, Student 2, and StudentZero to Parent A
  await StudentParent.create([
    {
      schoolId: schoolA._id,
      parentId: parentDocA._id,
      studentId: student1._id,
      relationship: "FATHER",
      isPrimaryGuardian: true,
      isEmergencyContact: true,
      canPickup: true,
      createdBy: adminId,
      updatedBy: adminId,
    },
    {
      schoolId: schoolA._id,
      parentId: parentDocA._id,
      studentId: student2._id,
      relationship: "FATHER",
      isPrimaryGuardian: true,
      isEmergencyContact: true,
      canPickup: true,
      createdBy: adminId,
      updatedBy: adminId,
    },
    {
      schoolId: schoolA._id,
      parentId: parentDocA._id,
      studentId: studentZero._id,
      relationship: "FATHER",
      isPrimaryGuardian: true,
      isEmergencyContact: true,
      canPickup: true,
      createdBy: adminId,
      updatedBy: adminId,
    },
  ]);

  // 4. Setup Unlinked Student 3 in School A (belongs to another family)
  const studentUserUnlinked = await User.create({
    email: `unlinked_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "STUDENT",
    schoolId: schoolA._id,
    isActive: true,
  });

  const studentUnlinked = await Student.create({
    schoolId: schoolA._id,
    userId: studentUserUnlinked._id,
    studentId: `STU_UNLINKED_${cleanSuffix}`,
    admissionNumber: `ADM_UNLINKED_${cleanSuffix}`,
    firstName: "Rohan",
    lastName: "Verma",
    classId: class10._id,
    sectionId: section10A._id,
    academicYearId: ayA._id,
    status: "ACTIVE",
    gender: "MALE",
    dateOfBirth: new Date("2011-06-10"),
    admissionDate: new Date("2024-04-01"),
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 5. Setup Student 4 in School B (Different School Tenant)
  const studentUserB = await User.create({
    email: `schoolb_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "STUDENT",
    schoolId: schoolB._id,
    isActive: true,
  });

  const ayB = await AcademicYear.create({
    schoolId: schoolB._id,
    name: `2026-2027 B ${cleanSuffix}`,
    startDate: new Date("2026-04-01"),
    endDate: new Date("2027-03-31"),
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const classB = await Class.create({
    schoolId: schoolB._id,
    academicYearId: ayB._id,
    name: "Grade 9",
    code: `G9_${cleanSuffix}`,
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const sectionB = await Section.create({
    schoolId: schoolB._id,
    classId: classB._id,
    academicYearId: ayB._id,
    name: "A",
    capacity: 30,
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const studentSchoolB = await Student.create({
    schoolId: schoolB._id,
    userId: studentUserB._id,
    studentId: `STU_B_${cleanSuffix}`,
    admissionNumber: `ADM_B_${cleanSuffix}`,
    firstName: "Karan",
    lastName: "Kapoor",
    classId: classB._id,
    sectionId: sectionB._id,
    academicYearId: ayB._id,
    status: "ACTIVE",
    gender: "MALE",
    dateOfBirth: new Date("2012-01-05"),
    admissionDate: new Date("2024-04-01"),
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 6. Setup Attendance Data:
  // Student 1 (Aarav): 8 Present, 1 Late, 1 Absent (Total 10, Attended 9 -> 90.0%)
  for (let i = 1; i <= 8; i++) {
    await Attendance.create({
      schoolId: schoolA._id,
      studentId: student1._id,
      academicYearId: ayA._id,
      classId: class10._id,
      sectionId: section10A._id,
      date: new Date(`2026-09-0${i}`),
      status: "PRESENT",
      remarks: "Present on time",
      markedBy: adminId,
      createdBy: adminId,
      updatedBy: adminId,
    });
  }
  await Attendance.create({
    schoolId: schoolA._id,
    studentId: student1._id,
    academicYearId: ayA._id,
    classId: class10._id,
    sectionId: section10A._id,
    date: new Date("2026-09-09"),
    status: "LATE",
    remarks: "Bus delayed",
    markedBy: adminId,
    createdBy: adminId,
    updatedBy: adminId,
  });
  await Attendance.create({
    schoolId: schoolA._id,
    studentId: student1._id,
    academicYearId: ayA._id,
    classId: class10._id,
    sectionId: section10A._id,
    date: new Date("2026-09-10"),
    status: "ABSENT",
    remarks: "Sick leave unnotified",
    markedBy: adminId,
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Student 2 (Ananya): 4 Present, 2 Absent, 2 Leave (Total 8, Attended 4 -> 50.0%)
  for (let i = 1; i <= 4; i++) {
    await Attendance.create({
      schoolId: schoolA._id,
      studentId: student2._id,
      academicYearId: ayA._id,
      classId: class8._id,
      sectionId: section8B._id,
      date: new Date(`2026-09-0${i}`),
      status: "PRESENT",
      markedBy: adminId,
      createdBy: adminId,
      updatedBy: adminId,
    });
  }
  for (let i = 5; i <= 6; i++) {
    await Attendance.create({
      schoolId: schoolA._id,
      studentId: student2._id,
      academicYearId: ayA._id,
      classId: class8._id,
      sectionId: section8B._id,
      date: new Date(`2026-09-0${i}`),
      status: "ABSENT",
      markedBy: adminId,
      createdBy: adminId,
      updatedBy: adminId,
    });
  }
  for (let i = 7; i <= 8; i++) {
    await Attendance.create({
      schoolId: schoolA._id,
      studentId: student2._id,
      academicYearId: ayA._id,
      classId: class8._id,
      sectionId: section8B._id,
      date: new Date(`2026-09-0${i}`),
      status: "LEAVE",
      remarks: "Medical leave",
      markedBy: adminId,
      createdBy: adminId,
      updatedBy: adminId,
    });
  }

  // Tokens
  const parentAToken = generateToken({
    userId: parentUserA._id.toString(),
    role: "PARENT",
    schoolId: schoolA._id.toString(),
    email: parentUserA.email,
  });

  console.log("\n--- TEST GROUP 1: Default Selected Child Attendance (Student 1) ---");
  {
    const req = createRequest("http://localhost:3000/api/parent/attendance", parentAToken);
    const res = await getParentAttendance(req);
    const data = await res.json();

    assert(res.status === 200, "GET /api/parent/attendance returns 200 OK");
    assert(data.success === true, "Response reports success: true");
    assert(data.selectedStudentId === student1._id.toString(), "Defaults to Student 1 (Aarav)");
    assert(data.data.student.fullName === "Aarav Kothari", "Student full name is Aarav Kothari");
    assert(data.data.summary.totalMarked === 10, "Total marked days is 10");
    assert(data.data.summary.presentCount === 8, "Present count is 8");
    assert(data.data.summary.lateCount === 1, "Late count is 1");
    assert(data.data.summary.absentCount === 1, "Absent count is 1");
    assert(data.data.summary.attendedCount === 9, "Attended count is 9");
    assert(data.data.summary.percentage === 90, "Percentage is exactly 90.0%");
    assert(data.data.history.length === 10, "History log contains 10 records");
    assert(data.data.monthlyBreakdown.length === 1, "Monthly breakdown contains 1 month");
  }

  console.log("\n--- TEST GROUP 2: Explicit Child Switch to Student 2 ---");
  {
    const req = createRequest(
      `http://localhost:3000/api/parent/attendance?studentId=${student2._id.toString()}`,
      parentAToken
    );
    const res = await getParentAttendance(req);
    const data = await res.json();

    assert(res.status === 200, "Attendance returns 200 OK for Student 2");
    assert(data.selectedStudentId === student2._id.toString(), "Selected student is Student 2");
    assert(data.data.student.fullName === "Ananya Kothari", "Student name is Ananya Kothari");
    assert(data.data.summary.totalMarked === 8, "Student 2 total marked is 8");
    assert(data.data.summary.presentCount === 4, "Student 2 present count is 4");
    assert(data.data.summary.absentCount === 2, "Student 2 absent count is 2");
    assert(data.data.summary.leaveCount === 2, "Student 2 leave count is 2");
    assert(data.data.summary.percentage === 50, "Student 2 percentage is exactly 50.0%");
    assert(data.data.history.length === 8, "Student 2 history contains 8 records");
  }

  console.log("\n--- TEST GROUP 3: Zero Sessions Edge Case (Never display 100%) ---");
  {
    const req = createRequest(
      `http://localhost:3000/api/parent/attendance?studentId=${studentZero._id.toString()}`,
      parentAToken
    );
    const res = await getParentAttendance(req);
    const data = await res.json();

    assert(res.status === 200, "Returns 200 OK for student with 0 records");
    assert(data.data.summary.totalMarked === 0, "Total marked is 0");
    assert(data.data.summary.percentage === 0, "Percentage is strictly 0% (never 100%)");
    assert(data.data.history.length === 0, "History is empty array");
  }

  console.log("\n--- TEST GROUP 4: Security - Unlinked Student in Same School ---");
  {
    const req = createRequest(
      `http://localhost:3000/api/parent/attendance?studentId=${studentUnlinked._id.toString()}`,
      parentAToken
    );
    const res = await getParentAttendance(req);
    const data = await res.json();

    assert(res.status === 403, "Access to unlinked student rejected with 403 Forbidden");
    assert(data.success === false, "Success is false");
    assert(
      data.error?.code === "FORBIDDEN_CHILD_ACCESS",
      "Error code is FORBIDDEN_CHILD_ACCESS"
    );
  }

  console.log("\n--- TEST GROUP 5: Security - Student in Another School Tenant ---");
  {
    const req = createRequest(
      `http://localhost:3000/api/parent/attendance?studentId=${studentSchoolB._id.toString()}`,
      parentAToken
    );
    const res = await getParentAttendance(req);
    const data = await res.json();

    assert(res.status === 403, "Access to other school student rejected with 403 Forbidden");
    assert(data.success === false, "Cross-school student access blocked");
  }

  console.log("\n--- TEST GROUP 6: Filter by Status & Month ---");
  {
    // Filter by ABSENT
    const reqAbsent = createRequest(
      `http://localhost:3000/api/parent/attendance?studentId=${student1._id.toString()}&status=ABSENT`,
      parentAToken
    );
    const resAbsent = await getParentAttendance(reqAbsent);
    const dataAbsent = await resAbsent.json();

    assert(resAbsent.status === 200, "Status filter returns 200 OK");
    assert(dataAbsent.data.history.length === 1, "Only 1 absent record returned for Student 1");
    assert(dataAbsent.data.history[0].status === "ABSENT", "Returned record has status ABSENT");

    // Filter by Month
    const reqMonth = createRequest(
      `http://localhost:3000/api/parent/attendance?studentId=${student1._id.toString()}&month=2026-09`,
      parentAToken
    );
    const resMonth = await getParentAttendance(reqMonth);
    const dataMonth = await resMonth.json();

    assert(resMonth.status === 200, "Month filter returns 200 OK");
    assert(dataMonth.data.history.length === 10, "10 records returned for 2026-09");
  }

  console.log("\n--- TEST GROUP 7: Read-Only Immutability Verification ---");
  {
    const reqPost = createRequest("http://localhost:3000/api/parent/attendance", parentAToken, "POST", { date: new Date() });
    const resPost = await postParentAttendance();
    assert(resPost.status === 405, "POST is rejected with 405 Method Not Allowed");

    const resPut = await putParentAttendance();
    assert(resPut.status === 405, "PUT is rejected with 405 Method Not Allowed");

    const resDelete = await deleteParentAttendance();
    assert(resDelete.status === 405, "DELETE is rejected with 405 Method Not Allowed");
  }

  console.log("\n--- TEST GROUP 8: Role Protection ---");
  {
    const stuToken = generateToken({
      userId: studentUser1._id.toString(),
      role: "STUDENT",
      schoolId: schoolA._id.toString(),
      email: studentUser1.email,
    });
    const reqStu = createRequest("http://localhost:3000/api/parent/attendance", stuToken);
    const resStu = await getParentAttendance(reqStu);
    assert(resStu.status === 403, "STUDENT role rejected with 403 Forbidden");

    const teacherUser = await User.create({
      email: `teacher_${cleanSuffix}@example.com`,
      password: "Password@123",
      role: "TEACHER",
      schoolId: schoolA._id,
      isActive: true,
    });
    const teacherToken = generateToken({
      userId: teacherUser._id.toString(),
      role: "TEACHER",
      schoolId: schoolA._id.toString(),
      email: teacherUser.email,
    });
    const reqTeacher = createRequest("http://localhost:3000/api/parent/attendance", teacherToken);
    const resTeacher = await getParentAttendance(reqTeacher);
    assert(resTeacher.status === 403, "TEACHER role rejected with 403 Forbidden");
  }

  console.log("\n============================================================");
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("============================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
