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

function createRequest(url: string, token?: string) {
  const headers: Record<string, string> = {};
  if (token) {
    headers["authorization"] = `Bearer ${token}`;
    headers["cookie"] = `erp_auth_token=${token}; token=${token}`;
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), { headers });
}

async function runTests() {
  console.log("============================================================");
  console.log("P1 — CHILD SELECTION & PARENT DASHBOARD TEST SUITE");
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
  const TimetableEntry: any = (await import("./src/models/TimetableEntry")).default;
  const StudentFeeAccount: any = (await import("./src/models/StudentFeeAccount")).default;
  const Subject: any = (await import("./src/models/Subject")).default;
  const { GET: getParentDashboard } = (await import("./src/app/api/parent/dashboard/route")) as any;
  const { GET: getParentChildren } = (await import("./src/app/api/parent/children/route")) as any;

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

  const cleanSuffix = `p1_${Date.now().toString().slice(-6)}`;
  const adminId = new mongoose.Types.ObjectId();

  // 1. Setup Schools
  const schoolA = await School.create({
    name: `P1 School A ${cleanSuffix}`,
    code: `SCH_A_${cleanSuffix}`,
    status: "ACTIVE",
    enabledModules: ["FEES", "ATTENDANCE", "EXAMS", "ASSIGNMENTS"],
    address: "123 Oxford Street",
    city: "London",
    state: "Greater London",
    country: "United Kingdom",
    phone: "+44 20 7946 0912",
    email: `p1_schoolA_${cleanSuffix}@example.com`,
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
    name: `P1 School B ${cleanSuffix}`,
    code: `SCH_B_${cleanSuffix}`,
    status: "ACTIVE",
    address: "456 King Street",
    city: "Cambridge",
    state: "Cambridgeshire",
    country: "United Kingdom",
    phone: "+44 20 7946 0913",
    email: `p1_schoolB_${cleanSuffix}@example.com`,
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

  const subjectMath = await Subject.create({
    schoolId: schoolA._id,
    name: "Mathematics",
    code: `MATH_${cleanSuffix}`,
    type: "THEORY",
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Setup Academic Structure for School B
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

  // 2. Setup Parent A in School A
  const parentUserA = await User.create({
    email: `parentA_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "PARENT",
    schoolId: schoolA._id,
    status: "ACTIVE",
    name: "Vikram Sharma",
  });

  const parentDocA = await Parent.create({
    schoolId: schoolA._id,
    userId: parentUserA._id,
    firstName: "Vikram",
    lastName: "Sharma",
    email: parentUserA.email,
    phone: "9876543210",
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 3. Setup Children for Parent A:
  // Child 1: Aarav Sharma (Class 10-A)
  const studentUser1 = await User.create({
    email: `aarav_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "STUDENT",
    schoolId: schoolA._id,
    status: "ACTIVE",
  });

  const student1 = await Student.create({
    schoolId: schoolA._id,
    userId: studentUser1._id,
    studentId: `STU1_${cleanSuffix}`,
    admissionNumber: `ADM1_${cleanSuffix}`,
    rollNumber: "101",
    firstName: "Aarav",
    lastName: "Sharma",
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

  // Child 2: Ananya Sharma (Class 8-B)
  const studentUser2 = await User.create({
    email: `ananya_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "STUDENT",
    schoolId: schoolA._id,
    status: "ACTIVE",
  });

  const student2 = await Student.create({
    schoolId: schoolA._id,
    userId: studentUser2._id,
    studentId: `STU2_${cleanSuffix}`,
    admissionNumber: `ADM2_${cleanSuffix}`,
    rollNumber: "202",
    firstName: "Ananya",
    lastName: "Sharma",
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

  // Link Student 1 & Student 2 to Parent A
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
  ]);

  // 4. Setup Unlinked Student 3 in School A (belongs to another family)
  const studentUser3 = await User.create({
    email: `kabir_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "STUDENT",
    schoolId: schoolA._id,
    status: "ACTIVE",
  });

  const student3 = await Student.create({
    schoolId: schoolA._id,
    userId: studentUser3._id,
    studentId: `STU3_${cleanSuffix}`,
    admissionNumber: `ADM3_${cleanSuffix}`,
    rollNumber: "303",
    firstName: "Kabir",
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
  const studentUser4 = await User.create({
    email: `rohan_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "STUDENT",
    schoolId: schoolB._id,
    status: "ACTIVE",
  });

  const student4 = await Student.create({
    schoolId: schoolB._id,
    userId: studentUser4._id,
    studentId: `STU4_${cleanSuffix}`,
    admissionNumber: `ADM4_${cleanSuffix}`,
    firstName: "Rohan",
    lastName: "Mehta",
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

  // 6. Setup Academic Data for Student 1 (Aarav) and Student 2 (Ananya)
  // Attendance for Student 1: 5 Present, 1 Absent (83%)
  for (let i = 1; i <= 5; i++) {
    await Attendance.create({
      schoolId: schoolA._id,
      studentId: student1._id,
      academicYearId: ayA._id,
      classId: class10._id,
      sectionId: section10A._id,
      date: new Date(`2026-09-0${i}`),
      status: "PRESENT",
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
    date: new Date("2026-09-06"),
    status: "ABSENT",
    markedBy: adminId,
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Attendance for Student 2: 2 Present, 2 Absent (50%)
  for (let i = 1; i <= 2; i++) {
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
  for (let i = 3; i <= 4; i++) {
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

  // Timetable for Student 1 (Class 10-A)
  const todayName = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][new Date().getDay()];
  await TimetableEntry.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    classId: class10._id,
    sectionId: section10A._id,
    subjectId: subjectMath._id,
    dayOfWeek: todayName,
    teacherId: adminId,
    startTime: "09:00",
    endTime: "10:00",
    room: "Room 101",
    isActive: true,
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Fee Account for Student 1
  await StudentFeeAccount.create({
    schoolId: schoolA._id,
    studentId: student1._id,
    academicYearId: ayA._id,
    totalFee: 15000,
    paidAmount: 10000,
    pendingAmount: 5000,
    status: "PARTIALLY_PAID",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Fee Account for Student 2
  await StudentFeeAccount.create({
    schoolId: schoolA._id,
    studentId: student2._id,
    academicYearId: ayA._id,
    totalFee: 12000,
    paidAmount: 12000,
    pendingAmount: 0,
    status: "PAID",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Tokens
  const parentAToken = generateToken({
    userId: parentUserA._id.toString(),
    role: "PARENT",
    schoolId: schoolA._id.toString(),
    email: parentUserA.email,
  });

  console.log("\n--- TEST GROUP 1: Parent Children Discovery ---");
  {
    const req = createRequest("http://localhost:3000/api/parent/children", parentAToken);
    const res = await getParentChildren(req);
    const data = await res.json();

    assert(res.status === 200, "GET /api/parent/children returns 200 OK");
    assert(data.success === true, "Response reports success: true");
    assert(data.data.children.length === 2, "Parent A has exactly 2 linked children");
    assert(
      data.data.children.some((c: any) => c.studentId === student1._id.toString()),
      "Children list includes Student 1 (Aarav)"
    );
    assert(
      data.data.children.some((c: any) => c.studentId === student2._id.toString()),
      "Children list includes Student 2 (Ananya)"
    );
  }

  console.log("\n--- TEST GROUP 2: Default Child Selection on Dashboard ---");
  {
    const req = createRequest("http://localhost:3000/api/parent/dashboard", parentAToken);
    const res = await getParentDashboard(req);
    const data = await res.json();

    assert(res.status === 200, "Dashboard returns 200 OK without explicit studentId");
    assert(data.success === true, "Dashboard reports success: true");
    assert(data.hasChildren === true, "Dashboard indicates parent has children");
    assert(
      data.selectedStudentId === student1._id.toString(),
      "Dashboard defaults to first linked child (Student 1)"
    );
    assert(
      data.data.profileSummary.fullName === "Aarav Sharma",
      "Profile summary matches Student 1 (Aarav Sharma)"
    );
    assert(
      data.data.attendance.summary.percentage === 83,
      "Attendance percentage matches Student 1 (83%)"
    );
    assert(
      data.data.feeSummary.pendingAmount === 5000,
      "Fee summary pending amount matches Student 1 (₹5,000)"
    );
    assert(
      data.data.todayTimetable.length === 1,
      "Timetable includes today's period for Student 1"
    );
  }

  console.log("\n--- TEST GROUP 3: Explicit Child Switching to Student 2 ---");
  {
    const req = createRequest(
      `http://localhost:3000/api/parent/dashboard?studentId=${student2._id.toString()}`,
      parentAToken
    );
    const res = await getParentDashboard(req);
    const data = await res.json();

    assert(res.status === 200, "Dashboard returns 200 OK when switching to Student 2");
    assert(
      data.selectedStudentId === student2._id.toString(),
      "Dashboard selectedStudentId matches Student 2"
    );
    assert(
      data.data.profileSummary.fullName === "Ananya Sharma",
      "Profile summary matches Student 2 (Ananya Sharma)"
    );
    assert(
      data.data.attendance.summary.percentage === 50,
      "Attendance percentage matches Student 2 (50%)"
    );
    assert(
      data.data.feeSummary.pendingAmount === 0,
      "Fee summary pending amount matches Student 2 (₹0, Fully Paid)"
    );
    assert(
      data.data.todayTimetable.length === 0,
      "Timetable for Student 2 is isolated from Student 1"
    );
  }

  console.log("\n--- TEST GROUP 4: Security - Unlinked Student in Same School ---");
  {
    const req = createRequest(
      `http://localhost:3000/api/parent/dashboard?studentId=${student3._id.toString()}`,
      parentAToken
    );
    const res = await getParentDashboard(req);
    const data = await res.json();

    assert(res.status === 403, "Access to unlinked student in same school is rejected with 403 Forbidden");
    assert(data.success === false, "Response reports success: false");
    assert(
      data.error?.code === "FORBIDDEN_CHILD_ACCESS",
      "Error code is FORBIDDEN_CHILD_ACCESS"
    );
  }

  console.log("\n--- TEST GROUP 5: Security - Student from Another School Tenant ---");
  {
    const req = createRequest(
      `http://localhost:3000/api/parent/dashboard?studentId=${student4._id.toString()}`,
      parentAToken
    );
    const res = await getParentDashboard(req);
    const data = await res.json();

    assert(res.status === 403, "Access to student from different school is rejected with 403 Forbidden");
    assert(data.success === false, "Response reports success: false");
    assert(
      data.error?.code === "FORBIDDEN_CHILD_ACCESS",
      "Cross-school student access is blocked"
    );
  }

  console.log("\n--- TEST GROUP 6: Parent with 0 Linked Children ---");
  {
    const parentUserEmpty = await User.create({
      email: `parentEmpty_${cleanSuffix}@example.com`,
      password: "Password@123",
      role: "PARENT",
      schoolId: schoolA._id,
      status: "ACTIVE",
      name: "Empty Parent",
    });

    await Parent.create({
      schoolId: schoolA._id,
      userId: parentUserEmpty._id,
      firstName: "Empty",
      lastName: "Parent",
      email: parentUserEmpty.email,
      phone: "9876543211",
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    const emptyToken = generateToken({
      userId: parentUserEmpty._id.toString(),
      role: "PARENT",
      schoolId: schoolA._id.toString(),
      email: parentUserEmpty.email,
    });

    const req = createRequest("http://localhost:3000/api/parent/dashboard", emptyToken);
    const res = await getParentDashboard(req);
    const data = await res.json();

    assert(res.status === 200, "Parent with 0 children gets 200 OK empty response");
    assert(data.hasChildren === false, "Response reports hasChildren: false");
    assert(data.data === null, "Dashboard data is null without crashing");
  }

  console.log("\n--- TEST GROUP 7: RBAC Protection & Non-Parent Rejections ---");
  {
    // Test Student Role Rejection
    const stuToken = generateToken({
      userId: studentUser1._id.toString(),
      role: "STUDENT",
      schoolId: schoolA._id.toString(),
      email: studentUser1.email,
    });
    const reqStu = createRequest("http://localhost:3000/api/parent/dashboard", stuToken);
    const resStu = await getParentDashboard(reqStu);
    assert(resStu.status === 403, "STUDENT role rejected from Parent Dashboard with 403");

    // Test Teacher Role Rejection
    const teacherUser = await User.create({
      email: `teacher_${cleanSuffix}@example.com`,
      password: "Password@123",
      role: "TEACHER",
      schoolId: schoolA._id,
      status: "ACTIVE",
    });
    const teacherToken = generateToken({
      userId: teacherUser._id.toString(),
      role: "TEACHER",
      schoolId: schoolA._id.toString(),
      email: teacherUser.email,
    });
    const reqTeacher = createRequest("http://localhost:3000/api/parent/dashboard", teacherToken);
    const resTeacher = await getParentDashboard(reqTeacher);
    assert(resTeacher.status === 403, "TEACHER role rejected from Parent Dashboard with 403");

    // Test Inactive Parent Rejection
    const inactiveParentUser = await User.create({
      email: `parentInactive_${cleanSuffix}@example.com`,
      password: "Password@123",
      role: "PARENT",
      schoolId: schoolA._id,
      isActive: false,
    });
    const inactiveToken = generateToken({
      userId: inactiveParentUser._id.toString(),
      role: "PARENT",
      schoolId: schoolA._id.toString(),
      email: inactiveParentUser.email,
    });
    const reqInactive = createRequest("http://localhost:3000/api/parent/dashboard", inactiveToken);
    const resInactive = await getParentDashboard(reqInactive);
    assert(resInactive.status === 403, "Inactive parent account rejected with 403");
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
