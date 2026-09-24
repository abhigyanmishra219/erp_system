import fs from "fs";
import path from "path";
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
} catch (e) {
  console.error("Failed to load .env.local", e);
}

function makeToken(user: any, schoolId: string, role: string, jwt: any, expiresIn: string = "1h", secret?: string) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: role,
      schoolId: schoolId.toString(),
      email: user.email,
    },
    secret || process.env.JWT_SECRET || "your-secret-key",
    { expiresIn }
  );
}

function makeRequest(url: string, method: string = "GET", token?: string, body?: any) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["cookie"] = `erp_auth_token=${token}; token=${token}`;
    headers["authorization"] = `Bearer ${token}`;
  }
  const reqInit: any = {
    method,
    headers,
  };
  if (body) {
    reqInit.body = JSON.stringify(body);
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), reqInit);
}

async function runTests() {
  console.log("============================================================");
  console.log("STARTING PHASE P8: PARENT SECURITY, TENANT ISOLATION & E2E");
  console.log("============================================================");

  const connectToDatabase: any = (await import("./src/lib/db")).default;
  const User: any = (await import("./src/models/User")).default;
  const School: any = (await import("./src/models/School")).default;
  const AcademicYear: any = (await import("./src/models/AcademicYear")).default;
  const Class: any = (await import("./src/models/Class")).default;
  const Section: any = (await import("./src/models/Section")).default;
  const Subject: any = (await import("./src/models/Subject")).default;
  const Student: any = (await import("./src/models/Student")).default;
  const Parent: any = (await import("./src/models/Parent")).default;
  const StudentParent: any = (await import("./src/models/StudentParent")).default;
  const Attendance: any = (await import("./src/models/Attendance")).default;
  const Assignment: any = (await import("./src/models/Assignment")).default;
  const AssignmentSubmission: any = (await import("./src/models/AssignmentSubmission")).default;
  const Exam: any = (await import("./src/models/Exam")).default;
  const ExamSubject: any = (await import("./src/models/ExamSubject")).default;
  const ExamResult: any = (await import("./src/models/ExamResult")).default;
  const FeeStructure: any = (await import("./src/models/FeeStructure")).default;
  const StudentFeeAccount: any = (await import("./src/models/StudentFeeAccount")).default;
  const StudentFeeAssignment: any = (await import("./src/models/StudentFeeAssignment")).default;
  const TimetableEntry: any = (await import("./src/models/TimetableEntry")).default;
  const Notice: any = (await import("./src/models/Notice")).default;
  const LeaveRequest: any = (await import("./src/models/LeaveRequest")).default;
  const Notification: any = (await import("./src/models/Notification")).default;
  const jwt: any = (await import("jsonwebtoken")).default;
  const mongoose: any = (await import("mongoose")).default;

  // Route handlers
  const { GET: getAttendance } = await import("./src/app/api/parent/attendance/route");
  const { GET: getAssignments } = await import("./src/app/api/parent/assignments/route");
  const { GET: getResults } = await import("./src/app/api/parent/results/route");
  const { GET: getFees } = await import("./src/app/api/parent/fees/route");
  const { GET: getTimetable } = await import("./src/app/api/parent/timetable/route");
  const { GET: getExams } = await import("./src/app/api/parent/exams/route");
  const { GET: getNotices, POST: postNotices } = await import("./src/app/api/parent/notices/route");
  const { GET: getLeave, POST: postLeave } = await import("./src/app/api/parent/leave/route");
  const { GET: getNotifications } = await import("./src/app/api/parent/notifications/route");
  const { GET: getChildren } = await import("./src/app/api/parent/children/route");
  const { GET: getDashboard } = await import("./src/app/api/parent/dashboard/route");
  const { GET: getMe } = await import("./src/app/api/parent/me/route");

  await connectToDatabase();

  const timestamp = Date.now().toString().slice(-6);
  const adminId = new mongoose.Types.ObjectId();

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

  // ============================================================
  // SETUP TEST DATA: SCHOOL A & SCHOOL B
  // ============================================================
  console.log("\n--- Setting up Multi-Tenant & Multi-Child Fixtures ---");

  // School A (Tenant A)
  const schoolA = await School.create({
    name: `School A ${timestamp}`,
    code: `SA_${timestamp}`,
    status: "ACTIVE",
    address: "100 Alpha Road",
    city: "London",
    state: "London",
    country: "UK",
    phone: "+44 20 7111 0001",
    email: `schoolA_${timestamp}@example.com`,
    plan: "STANDARD",
    studentLimit: 500,
    subscriptionStartDate: new Date(),
    subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
    subscriptionStatus: "ACTIVE",
    enabledModules: ["FEES", "ATTENDANCE", "EXAMS", "TIMETABLE", "ASSIGNMENTS", "NOTICES", "LEAVE"],
    createdBy: adminId,
    updatedBy: adminId,
  });

  // School B (Tenant B)
  const schoolB = await School.create({
    name: `School B ${timestamp}`,
    code: `SB_${timestamp}`,
    status: "ACTIVE",
    address: "200 Beta Road",
    city: "Manchester",
    state: "Manchester",
    country: "UK",
    phone: "+44 16 1111 0002",
    email: `schoolB_${timestamp}@example.com`,
    plan: "STANDARD",
    studentLimit: 500,
    subscriptionStartDate: new Date(),
    subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
    subscriptionStatus: "ACTIVE",
    enabledModules: ["FEES", "ATTENDANCE", "EXAMS", "TIMETABLE", "ASSIGNMENTS", "NOTICES", "LEAVE"],
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Academic Years
  const ayA = await AcademicYear.create({
    schoolId: schoolA._id,
    name: `2026-2027 A ${timestamp}`,
    startDate: new Date("2026-04-01"),
    endDate: new Date("2027-03-31"),
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const ayB = await AcademicYear.create({
    schoolId: schoolB._id,
    name: `2026-2027 B ${timestamp}`,
    startDate: new Date("2026-04-01"),
    endDate: new Date("2027-03-31"),
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Classes & Sections in School A
  const classA1 = await Class.create({
    schoolId: schoolA._id,
    name: `Grade 10-A ${timestamp}`,
    code: `G10A_${timestamp}`.slice(0, 10),
    academicYearId: ayA._id,
    createdBy: adminId,
    updatedBy: adminId,
  });
  const secA1 = await Section.create({
    schoolId: schoolA._id,
    classId: classA1._id,
    academicYearId: ayA._id,
    name: "A",
    capacity: 40,
    createdBy: adminId,
    updatedBy: adminId,
  });

  const classA2 = await Class.create({
    schoolId: schoolA._id,
    name: `Grade 8-A ${timestamp}`,
    code: `G8A_${timestamp}`.slice(0, 10),
    academicYearId: ayA._id,
    createdBy: adminId,
    updatedBy: adminId,
  });
  const secA2 = await Section.create({
    schoolId: schoolA._id,
    classId: classA2._id,
    academicYearId: ayA._id,
    name: "B",
    capacity: 40,
    createdBy: adminId,
    updatedBy: adminId,
  });

  const classA3 = await Class.create({
    schoolId: schoolA._id,
    name: `Grade 5-A ${timestamp}`,
    code: `G5A_${timestamp}`.slice(0, 10),
    academicYearId: ayA._id,
    createdBy: adminId,
    updatedBy: adminId,
  });
  const secA3 = await Section.create({
    schoolId: schoolA._id,
    classId: classA3._id,
    academicYearId: ayA._id,
    name: "A",
    capacity: 40,
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Class in School B
  const classB = await Class.create({
    schoolId: schoolB._id,
    name: `Grade 10-B ${timestamp}`,
    code: `G10B_${timestamp}`.slice(0, 10),
    academicYearId: ayB._id,
    createdBy: adminId,
    updatedBy: adminId,
  });
  const secB = await Section.create({
    schoolId: schoolB._id,
    classId: classB._id,
    academicYearId: ayB._id,
    name: "A",
    capacity: 40,
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Subjects
  const subMath = await Subject.create({
    schoolId: schoolA._id,
    name: "Mathematics",
    code: `MTH_${timestamp}`.slice(0, 10),
    type: "THEORY",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 1. Parent A Users & Children (Student 1, Student 2, Student 3)
  const userStudent1 = await User.create({
    schoolId: schoolA._id,
    name: `Alice Child 1 ${timestamp}`,
    email: `alice_${timestamp}@example.com`,
    password: "password123",
    role: "STUDENT",
    status: "ACTIVE",
  });
  const student1 = await Student.create({
    schoolId: schoolA._id,
    userId: userStudent1._id,
    admissionNumber: `ADM1_${timestamp}`,
    rollNumber: "101",
    firstName: "Alice",
    lastName: `Child1-${timestamp}`,
    gender: "FEMALE",
    dateOfBirth: new Date("2012-01-01"),
    admissionDate: new Date("2026-08-01"),
    classId: classA1._id,
    sectionId: secA1._id,
    academicYearId: ayA._id,
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const userStudent2 = await User.create({
    schoolId: schoolA._id,
    name: `Bob Child 2 ${timestamp}`,
    email: `bob_${timestamp}@example.com`,
    password: "password123",
    role: "STUDENT",
    status: "ACTIVE",
  });
  const student2 = await Student.create({
    schoolId: schoolA._id,
    userId: userStudent2._id,
    admissionNumber: `ADM2_${timestamp}`,
    rollNumber: "202",
    firstName: "Bob",
    lastName: `Child2-${timestamp}`,
    gender: "MALE",
    dateOfBirth: new Date("2014-03-15"),
    admissionDate: new Date("2026-08-01"),
    classId: classA2._id,
    sectionId: secA2._id,
    academicYearId: ayA._id,
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const userStudent3 = await User.create({
    schoolId: schoolA._id,
    name: `Charlie Child 3 ${timestamp}`,
    email: `charlie_${timestamp}@example.com`,
    password: "password123",
    role: "STUDENT",
    status: "ACTIVE",
  });
  const student3 = await Student.create({
    schoolId: schoolA._id,
    userId: userStudent3._id,
    admissionNumber: `ADM3_${timestamp}`,
    rollNumber: "303",
    firstName: "Charlie",
    lastName: `Child3-${timestamp}`,
    gender: "MALE",
    dateOfBirth: new Date("2016-08-20"),
    admissionDate: new Date("2026-08-01"),
    classId: classA3._id,
    sectionId: secA3._id,
    academicYearId: ayA._id,
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Parent A User & Doc (links Student 1, Student 2, Student 3)
  const userParentA = await User.create({
    schoolId: schoolA._id,
    name: `Parent Alpha ${timestamp}`,
    email: `parentA_${timestamp}@example.com`,
    password: "password123",
    role: "PARENT",
    status: "ACTIVE",
  });

  const parentDocA = await Parent.create({
    schoolId: schoolA._id,
    userId: userParentA._id,
    firstName: "Alpha",
    lastName: `Parent-${timestamp}`,
    email: userParentA.email,
    phone: "+44 20 7111 2222",
    relationship: "FATHER",
    children: [
      { studentId: student1._id, relationship: "FATHER", isPrimaryContact: true, canPickup: true },
      { studentId: student2._id, relationship: "FATHER", isPrimaryContact: true, canPickup: true },
      { studentId: student3._id, relationship: "FATHER", isPrimaryContact: true, canPickup: true },
    ],
    createdBy: adminId,
    updatedBy: adminId,
  });

  const spA1 = await StudentParent.create({
    schoolId: schoolA._id,
    studentId: student1._id,
    parentId: parentDocA._id,
    relationship: "FATHER",
    isPrimaryGuardian: true,
    createdBy: adminId,
    updatedBy: adminId,
  });
  const spA2 = await StudentParent.create({
    schoolId: schoolA._id,
    studentId: student2._id,
    parentId: parentDocA._id,
    relationship: "FATHER",
    isPrimaryGuardian: true,
    createdBy: adminId,
    updatedBy: adminId,
  });
  const spA3 = await StudentParent.create({
    schoolId: schoolA._id,
    studentId: student3._id,
    parentId: parentDocA._id,
    relationship: "FATHER",
    isPrimaryGuardian: true,
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 2. Parent B User & Child (Student 4 in School A, Unlinked to Parent A)
  const userStudent4 = await User.create({
    schoolId: schoolA._id,
    name: `David Student 4 ${timestamp}`,
    email: `david_${timestamp}@example.com`,
    password: "password123",
    role: "STUDENT",
    status: "ACTIVE",
  });
  const student4 = await Student.create({
    schoolId: schoolA._id,
    userId: userStudent4._id,
    admissionNumber: `ADM4_${timestamp}`,
    rollNumber: "404",
    firstName: "David",
    lastName: `OtherParent-${timestamp}`,
    gender: "MALE",
    dateOfBirth: new Date("2012-06-10"),
    classId: classA1._id,
    sectionId: secA1._id,
    academicYearId: ayA._id,
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const userParentB = await User.create({
    schoolId: schoolA._id,
    name: `Parent Beta ${timestamp}`,
    email: `parentB_${timestamp}@example.com`,
    password: "password123",
    role: "PARENT",
    status: "ACTIVE",
  });
  const parentDocB = await Parent.create({
    schoolId: schoolA._id,
    userId: userParentB._id,
    firstName: "Beta",
    lastName: `Parent-${timestamp}`,
    email: userParentB.email,
    phone: "+44 20 7333 4444",
    relationship: "MOTHER",
    children: [
      { studentId: student4._id, relationship: "MOTHER", isPrimaryContact: true, canPickup: true },
    ],
    createdBy: adminId,
    updatedBy: adminId,
  });
  const spB4 = await StudentParent.create({
    schoolId: schoolA._id,
    studentId: student4._id,
    parentId: parentDocB._id,
    relationship: "MOTHER",
    isPrimaryGuardian: true,
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 3. School B Student 5 & Parent C (Cross-tenant)
  const userStudent5 = await User.create({
    schoolId: schoolB._id,
    name: `Eve Student 5 ${timestamp}`,
    email: `eve_${timestamp}@example.com`,
    password: "password123",
    role: "STUDENT",
    status: "ACTIVE",
  });
  const student5 = await Student.create({
    schoolId: schoolB._id,
    userId: userStudent5._id,
    admissionNumber: `ADM5_${timestamp}`,
    rollNumber: "505",
    firstName: "Eve",
    lastName: `SchoolB-${timestamp}`,
    gender: "FEMALE",
    dateOfBirth: new Date("2012-11-25"),
    classId: classB._id,
    sectionId: secB._id,
    academicYearId: ayB._id,
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });
  const userParentC = await User.create({
    schoolId: schoolB._id,
    name: `Parent Gamma ${timestamp}`,
    email: `parentC_${timestamp}@example.com`,
    password: "password123",
    role: "PARENT",
    status: "ACTIVE",
  });
  const parentDocC = await Parent.create({
    schoolId: schoolB._id,
    userId: userParentC._id,
    firstName: "Gamma",
    lastName: `SchoolB-${timestamp}`,
    email: userParentC.email,
    phone: "+44 16 1999 8888",
    relationship: "MOTHER",
    children: [
      { studentId: student5._id, relationship: "MOTHER", isPrimaryContact: true, canPickup: true },
    ],
    createdBy: adminId,
    updatedBy: adminId,
  });
  const spC5 = await StudentParent.create({
    schoolId: schoolB._id,
    studentId: student5._id,
    parentId: parentDocC._id,
    relationship: "MOTHER",
    isPrimaryGuardian: true,
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Tokens
  const tokenParentA = makeToken(userParentA, schoolA._id, "PARENT", jwt);
  const tokenParentB = makeToken(userParentB, schoolA._id, "PARENT", jwt);
  const tokenParentC = makeToken(userParentC, schoolB._id, "PARENT", jwt);

  const student1Id = student1._id.toString();
  const student2Id = student2._id.toString();
  const student3Id = student3._id.toString();
  const student4Id = student4._id.toString(); // Unlinked in same school
  const student5Id = student5._id.toString(); // Different school tenant

  // ============================================================
  // TEST 1: AUTHENTICATION & TOKEN HARDENING
  // ============================================================
  console.log("\n============================================================");
  console.log("SECTION 1: AUTHENTICATION & JWT SECURITY");
  console.log("============================================================");

  // 1.1 Valid Parent Token
  const reqValid = makeRequest("/api/parent/me", "GET", tokenParentA);
  const resValid = await getMe(reqValid);
  assert(resValid.status === 200, "Valid Parent JWT succeeds (200 OK)");

  // 1.2 Missing Token
  const reqNoAuth = makeRequest("/api/parent/me", "GET");
  const resNoAuth = await getMe(reqNoAuth);
  assert(resNoAuth.status === 401, "Missing Auth returns 401 UNAUTHENTICATED");

  // 1.3 Invalid Secret JWT
  const tokenBadSecret = makeToken(userParentA, schoolA._id, "PARENT", jwt, "1h", "wrong-secret-key-xyz");
  const reqBadSecret = makeRequest("/api/parent/me", "GET", tokenBadSecret);
  const resBadSecret = await getMe(reqBadSecret);
  assert(resBadSecret.status === 401, "Tampered Secret JWT returns 401 INVALID_TOKEN");

  // 1.4 Expired JWT
  const tokenExpired = jwt.sign(
    { userId: userParentA._id.toString(), role: "PARENT", schoolId: schoolA._id.toString() },
    process.env.JWT_SECRET || "your-secret-key",
    { expiresIn: "-10s" }
  );
  const reqExpired = makeRequest("/api/parent/me", "GET", tokenExpired);
  const resExpired = await getMe(reqExpired);
  assert(resExpired.status === 401, "Expired JWT returns 401 INVALID_TOKEN");

  // 1.5 Inactive User / Deactivated Parent
  const inactiveUser = await User.create({
    schoolId: schoolA._id,
    name: `Inactive Parent ${timestamp}`,
    email: `inactive_${timestamp}@example.com`,
    password: "password123",
    role: "PARENT",
    isActive: false,
  });
  const tokenInactive = makeToken(inactiveUser, schoolA._id, "PARENT", jwt);
  const reqInactive = makeRequest("/api/parent/me", "GET", tokenInactive);
  const resInactive = await getMe(reqInactive);
  assert(resInactive.status === 403, "Deactivated parent returns 403 ACCOUNT_DISABLED");

  // ============================================================
  // TEST 2: ROLE SECURITY & RBAC REJECTION
  // ============================================================
  console.log("\n============================================================");
  console.log("SECTION 2: ROLE RBAC SECURITY");
  console.log("============================================================");

  const rolesToTest = ["SYSTEM_ADMIN", "ADMIN", "TEACHER", "STUDENT"];
  for (const otherRole of rolesToTest) {
    const otherUser = await User.create({
      schoolId: schoolA._id,
      name: `${otherRole} User ${timestamp}`,
      email: `${otherRole.toLowerCase()}_${timestamp}@example.com`,
      password: "password123",
      role: otherRole,
      status: "ACTIVE",
    });
    const tokenOther = makeToken(otherUser, schoolA._id, otherRole, jwt);
    const reqOther = makeRequest("/api/parent/dashboard", "GET", tokenOther);
    const resOther = await getDashboard(reqOther);
    assert(resOther.status === 403, `Role ${otherRole} is rejected with 403 FORBIDDEN on parent routes`);
    await User.deleteOne({ _id: otherUser._id });
  }

  // ============================================================
  // TEST 3 & 4: PARENT-CHILD ISOLATION & URL MANIPULATION
  // ============================================================
  console.log("\n============================================================");
  console.log("SECTION 3 & 4: PARENT-CHILD ISOLATION & URL MANIPULATION");
  console.log("============================================================");

  // Parent A attempting direct query for Student 4 (Unlinked child in same school)
  const endpointsToTest = [
    { name: "Attendance", fn: getAttendance, path: "/api/parent/attendance" },
    { name: "Assignments", fn: getAssignments, path: "/api/parent/assignments" },
    { name: "Results", fn: getResults, path: "/api/parent/results" },
    { name: "Fees", fn: getFees, path: "/api/parent/fees" },
    { name: "Timetable", fn: getTimetable, path: "/api/parent/timetable" },
    { name: "Exams", fn: getExams, path: "/api/parent/exams" },
    { name: "Leave History", fn: getLeave, path: "/api/parent/leave" },
    { name: "Notices", fn: getNotices, path: "/api/parent/notices" },
  ];

  for (const ep of endpointsToTest) {
    const reqManipulated = makeRequest(`${ep.path}?studentId=${student4Id}`, "GET", tokenParentA);
    const resManipulated = await ep.fn(reqManipulated);
    assert(
      resManipulated.status === 403,
      `URL manipulation on ${ep.name} for unlinked student4 rejected with 403 FORBIDDEN_CHILD_ACCESS`
    );
  }

  // Submit leave for unlinked student 4
  const leaveManipulatedReq = makeRequest("/api/parent/leave", "POST", tokenParentA, {
    studentId: student4Id,
    fromDate: "2026-10-01",
    toDate: "2026-10-02",
    reason: "Unauthorized leave attempt",
  });
  const leaveManipulatedRes = await postLeave(leaveManipulatedReq);
  assert(
    leaveManipulatedRes.status === 403,
    "Leave submission for unlinked student4 rejected with 403 FORBIDDEN_CHILD_ACCESS"
  );

  // ============================================================
  // TEST 5: CROSS-TENANT ISOLATION
  // ============================================================
  console.log("\n============================================================");
  console.log("SECTION 5: CROSS-TENANT ISOLATION");
  console.log("============================================================");

  // Parent A (School A) attempting access to Student 5 (School B)
  for (const ep of endpointsToTest) {
    const reqCrossTenant = makeRequest(`${ep.path}?studentId=${student5Id}`, "GET", tokenParentA);
    const resCrossTenant = await ep.fn(reqCrossTenant);
    assert(
      resCrossTenant.status === 403 || resCrossTenant.status === 404,
      `Cross-tenant access on ${ep.name} for School B student5 rejected (Status: ${resCrossTenant.status})`
    );
  }

  // ============================================================
  // TEST 6: MULTI-CHILD SWITCHING (Child 1, Child 2, Child 3)
  // ============================================================
  console.log("\n============================================================");
  console.log("SECTION 6: MULTI-CHILD DATA ISOLATION & SWITCHING");
  console.log("============================================================");

  // Children endpoint loads all 3 linked children
  const reqGetChildren = makeRequest("/api/parent/children", "GET", tokenParentA);
  const resGetChildren = await getChildren(reqGetChildren);
  const dataGetChildren = await resGetChildren.json();

  assert(resGetChildren.status === 200, "GET /api/parent/children returns 200 OK");
  assert(dataGetChildren.data?.children?.length === 3, "Parent A retrieves exactly 3 linked children");

  const childIdsReturned = (dataGetChildren.data?.children || []).map((c: any) => c.studentId);
  assert(
    childIdsReturned.includes(student1Id) &&
      childIdsReturned.includes(student2Id) &&
      childIdsReturned.includes(student3Id) &&
      !childIdsReturned.includes(student4Id),
    "Children list strictly includes Student 1, 2, 3 and excludes Student 4"
  );

  // Seed distinct Attendance for Child 1, Child 2, Child 3
  await Attendance.create([
    {
      schoolId: schoolA._id,
      studentId: student1._id,
      classId: classA1._id,
      sectionId: secA1._id,
      academicYearId: ayA._id,
      date: new Date("2026-09-01"),
      status: "PRESENT",
      markedBy: adminId,
    },
    {
      schoolId: schoolA._id,
      studentId: student1._id,
      classId: classA1._id,
      sectionId: secA1._id,
      academicYearId: ayA._id,
      date: new Date("2026-09-02"),
      status: "PRESENT",
      markedBy: adminId,
    },
    {
      schoolId: schoolA._id,
      studentId: student2._id,
      classId: classA2._id,
      sectionId: secA2._id,
      academicYearId: ayA._id,
      date: new Date("2026-09-01"),
      status: "ABSENT",
      markedBy: adminId,
    },
  ]);

  // Child 1 Attendance: 2 present out of 2 = 100%
  const reqAtt1 = makeRequest(`/api/parent/attendance?studentId=${student1Id}`, "GET", tokenParentA);
  const resAtt1 = await getAttendance(reqAtt1);
  const dataAtt1 = await resAtt1.json();
  assert(dataAtt1.data?.summary?.percentage === 100, "Child 1 attendance percentage is 100% (2/2)");

  // Child 2 Attendance: 0 present out of 1 = 0%
  const reqAtt2 = makeRequest(`/api/parent/attendance?studentId=${student2Id}`, "GET", tokenParentA);
  const resAtt2 = await getAttendance(reqAtt2);
  const dataAtt2 = await resAtt2.json();
  assert(dataAtt2.data?.summary?.percentage === 0, "Child 2 attendance percentage is 0% (0/1 absent)");

  // Child 3 Attendance: 0 records = 0% (Never 100%)
  const reqAtt3 = makeRequest(`/api/parent/attendance?studentId=${student3Id}`, "GET", tokenParentA);
  const resAtt3 = await getAttendance(reqAtt3);
  const dataAtt3 = await resAtt3.json();
  assert(dataAtt3.data?.summary?.percentage === 0, "Child 3 with 0 attendance sessions returns 0% (never 100%)");

  // ============================================================
  // TEST 7: ASSIGNMENT TESTING
  // ============================================================
  console.log("\n============================================================");
  console.log("SECTION 7: ASSIGNMENT AUTHORIZATION & SCOPING");
  console.log("============================================================");

  const assignClass1 = await Assignment.create({
    schoolId: schoolA._id,
    title: `Algebra Homework Class 10 ${timestamp}`,
    description: "Complete exercises 1 to 10 from chapter 3.",
    subjectId: subMath._id,
    classId: classA1._id,
    sectionId: secA1._id,
    academicYearId: ayA._id,
    teacherId: adminId,
    assignedDate: new Date(),
    dueDate: new Date(Date.now() + 86400000 * 3),
    totalMarks: 50,
    status: "PUBLISHED",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const reqAssign1 = makeRequest(`/api/parent/assignments?studentId=${student1Id}`, "GET", tokenParentA);
  const resAssign1 = await getAssignments(reqAssign1);
  const dataAssign1 = await resAssign1.json();
  const assignTitles1 = (dataAssign1.data?.assignments || []).map((a: any) => a.title);

  assert(assignTitles1.includes(assignClass1.title), "Child 1 in Class 10 sees Algebra Homework");

  const reqAssign2 = makeRequest(`/api/parent/assignments?studentId=${student2Id}`, "GET", tokenParentA);
  const resAssign2 = await getAssignments(reqAssign2);
  const dataAssign2 = await resAssign2.json();
  const assignTitles2 = (dataAssign2.data?.assignments || []).map((a: any) => a.title);

  assert(!assignTitles2.includes(assignClass1.title), "Child 2 in Class 8 DOES NOT see Class 10 Algebra Homework");

  // ============================================================
  // TEST 8: RESULT VISIBILITY (Published vs Unpublished)
  // ============================================================
  console.log("\n============================================================");
  console.log("SECTION 8: RESULT PUBLICATION & VISIBILITY");
  console.log("============================================================");

  const examPub = await Exam.create({
    schoolId: schoolA._id,
    name: `Term 1 Finals ${timestamp}`,
    academicYearId: ayA._id,
    startDate: new Date("2026-09-10"),
    endDate: new Date("2026-09-20"),
    status: "PUBLISHED",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const examSubPub = await ExamSubject.create({
    schoolId: schoolA._id,
    examId: examPub._id,
    academicYearId: ayA._id,
    classId: classA1._id,
    subjectId: subMath._id,
    maximumMarks: 100,
    passingMarks: 40,
    examDate: new Date("2026-09-12"),
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Published Result for Child 1
  const resultPub = await ExamResult.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    classId: classA1._id,
    sectionId: secA1._id,
    examId: examPub._id,
    examSubjectId: examSubPub._id,
    subjectId: subMath._id,
    studentId: student1._id,
    marks: 88,
    grade: "A",
    isPassed: true,
    status: "PUBLISHED",
    publishedAt: new Date(),
    enteredBy: adminId,
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Unpublished (Draft) Result for Child 2
  const resultDraft = await ExamResult.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    classId: classA2._id,
    sectionId: secA2._id,
    examId: examPub._id,
    examSubjectId: examSubPub._id,
    subjectId: subMath._id,
    studentId: student2._id,
    marks: 45,
    grade: "C",
    isPassed: true,
    status: "DRAFT",
    enteredBy: adminId,
    createdBy: adminId,
    updatedBy: adminId,
  });

  const reqRes1 = makeRequest(`/api/parent/results?studentId=${student1Id}`, "GET", tokenParentA);
  const resRes1 = await getResults(reqRes1);
  const dataRes1 = await resRes1.json();
  const results1 = dataRes1.data?.examResults || [];

  assert(results1.length > 0, "Child 1 sees published result");

  const reqRes2 = makeRequest(`/api/parent/results?studentId=${student2Id}`, "GET", tokenParentA);
  const resRes2 = await getResults(reqRes2);
  const dataRes2 = await resRes2.json();
  const results2 = dataRes2.data?.examResults || [];

  assert(results2.length === 0, "Child 2 unpublished (DRAFT) result is HIDDEN from parent");

  // ============================================================
  // TEST 9: FEE MANAGEMENT & ACCOUNT ISOLATION
  // ============================================================
  console.log("\n============================================================");
  console.log("SECTION 9: FEE ACCOUNT AUTHORIZATION");
  console.log("============================================================");

  const FeeCategory: any = (await import("./src/models/FeeCategory")).default;

  const feeCategory = await FeeCategory.create({
    schoolId: schoolA._id,
    name: `Tuition ${timestamp}`,
    code: `TUI_${timestamp}`.slice(0, 10),
    isActive: true,
    createdBy: adminId,
    updatedBy: adminId,
  });

  const feeStructure = await FeeStructure.create({
    schoolId: schoolA._id,
    feeCategoryId: feeCategory._id,
    name: `Term Fee Grade 10 ${timestamp}`,
    academicYearId: ayA._id,
    classId: classA1._id,
    amount: 1500,
    dueDate: new Date(Date.now() + 86400000 * 30),
    createdBy: adminId,
    updatedBy: adminId,
  });

  const feeAssign1 = await StudentFeeAssignment.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    studentId: student1._id,
    feeStructureId: feeStructure._id,
    baseAmount: 1500,
    discountType: "NONE",
    discountValue: 0,
    discountAmount: 0,
    concessionType: "NONE",
    concessionValue: 0,
    concessionAmount: 0,
    netAmount: 1500,
    dueSchedule: [
      {
        name: "Term 1",
        amount: 1500,
        dueDate: new Date(Date.now() + 86400000 * 30),
        sequence: 1,
        paidAmount: 500,
        status: "PARTIALLY_PAID",
      },
    ],
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const feeAccount1 = await StudentFeeAccount.create({
    schoolId: schoolA._id,
    studentId: student1._id,
    academicYearId: ayA._id,
    totalFee: 1500,
    netFee: 1500,
    paidAmount: 500,
    pendingAmount: 1000,
    status: "PARTIALLY_PAID",
  });

  const FeePayment: any = (await import("./src/models/FeePayment")).default;

  const payment1 = await FeePayment.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    studentId: student1._id,
    feeAccountId: feeAccount1._id,
    amount: 500,
    paymentDate: new Date(),
    paymentMethod: "CASH",
    receiptNumber: `REC_${timestamp}`,
    status: "ACTIVE",
    recordedBy: adminId,
  });

  const reqFee1 = makeRequest(`/api/parent/fees?studentId=${student1Id}`, "GET", tokenParentA);
  const resFee1 = await getFees(reqFee1);
  const dataFee1 = await resFee1.json();

  assert(resFee1.status === 200, "Parent A fee fetch for Child 1 succeeds");
  assert(dataFee1.data?.summary?.pendingAmount === 1000, "Child 1 pending fee is accurately reported as 1000");

  // ============================================================
  // TEST 10: TIMETABLE & EXAMS SCOPING
  // ============================================================
  console.log("\n============================================================");
  console.log("SECTION 10: TIMETABLE & EXAMS SCOPING");
  console.log("============================================================");

  const reqTt1 = makeRequest(`/api/parent/timetable?studentId=${student1Id}`, "GET", tokenParentA);
  const resTt1 = await getTimetable(reqTt1);
  assert(resTt1.status === 200, "Timetable for Child 1 loaded with class/section scope");

  const reqExams1 = makeRequest(`/api/parent/exams?studentId=${student1Id}`, "GET", tokenParentA);
  const resExams1 = await getExams(reqExams1);
  assert(resExams1.status === 200, "Exams for Child 1 loaded with class/section scope");

  // ============================================================
  // TEST 11: NOTICES AUDIENCE & READ-ONLY
  // ============================================================
  console.log("\n============================================================");
  console.log("SECTION 11: NOTICES AUDIENCE & READ-ONLY ENFORCEMENT");
  console.log("============================================================");

  const noticeSchool = await Notice.create({
    schoolId: schoolA._id,
    title: `Sports Day Circular ${timestamp}`,
    description: "Annual sports day next month.",
    targetType: "SCHOOL",
    targetRoles: ["PARENT", "STUDENT"],
    publishedAt: new Date(),
    status: "PUBLISHED",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const reqNotice = makeRequest(`/api/parent/notices?studentId=${student1Id}`, "GET", tokenParentA);
  const resNotice = await getNotices(reqNotice);
  const dataNotice = await resNotice.json();
  const noticeTitles = (dataNotice.data?.notices || []).map((n: any) => n.title);

  assert(noticeTitles.includes(noticeSchool.title), "School-wide notice is included in Parent notice list");

  const resPostNotice = await postNotices();
  assert(resPostNotice.status === 405, "POST /api/parent/notices strictly rejects with 405 Method Not Allowed");

  // ============================================================
  // TEST 12: NOTIFICATIONS USER ISOLATION
  // ============================================================
  console.log("\n============================================================");
  console.log("SECTION 12: NOTIFICATIONS USER ISOLATION");
  console.log("============================================================");

  const notifA = await Notification.create({
    schoolId: schoolA._id,
    recipientUserId: userParentA._id,
    title: "Parent A Alert",
    message: "Fee due for term 1",
    type: "FEE",
    isRead: false,
    createdBy: adminId,
    updatedBy: adminId,
  });

  const notifB = await Notification.create({
    schoolId: schoolA._id,
    recipientUserId: userParentB._id,
    title: "Parent B Private Alert",
    message: "Meeting scheduled",
    type: "NOTICE",
    isRead: false,
    createdBy: adminId,
    updatedBy: adminId,
  });

  const reqNotifA = makeRequest("/api/parent/notifications", "GET", tokenParentA);
  const resNotifA = await getNotifications(reqNotifA);
  const dataNotifA = await resNotifA.json();
  const notifIdsA = (dataNotifA.data?.notifications || []).map((n: any) => n._id);

  assert(notifIdsA.includes(notifA._id.toString()), "Parent A receives Parent A's notification");
  assert(!notifIdsA.includes(notifB._id.toString()), "Parent A NEVER receives Parent B's notification");

  // ============================================================
  // CLEANUP TEST FIXTURES
  // ============================================================
  console.log("\n--- Cleaning up Test Fixtures ---");
  await Promise.all([
    School.deleteMany({ _id: { $in: [schoolA._id, schoolB._id] } }),
    AcademicYear.deleteMany({ _id: { $in: [ayA._id, ayB._id] } }),
    Class.deleteMany({ _id: { $in: [classA1._id, classA2._id, classA3._id, classB._id] } }),
    Section.deleteMany({ _id: { $in: [secA1._id, secA2._id, secA3._id, secB._id] } }),
    Subject.deleteMany({ _id: subMath._id }),
    Student.deleteMany({ _id: { $in: [student1._id, student2._id, student3._id, student4._id, student5._id] } }),
    User.deleteMany({
      _id: {
        $in: [
          userStudent1._id,
          userStudent2._id,
          userStudent3._id,
          userStudent4._id,
          userStudent5._id,
          userParentA._id,
          userParentB._id,
          userParentC._id,
          inactiveUser._id,
        ],
      },
    }),
    Parent.deleteMany({ _id: { $in: [parentDocA._id, parentDocB._id, parentDocC._id] } }),
    StudentParent.deleteMany({ _id: { $in: [spA1._id, spA2._id, spA3._id, spB4._id, spC5._id] } }),
    Attendance.deleteMany({ studentId: { $in: [student1._id, student2._id, student3._id] } }),
    Assignment.deleteMany({ _id: assignClass1._id }),
    Exam.deleteMany({ _id: examPub._id }),
    ExamSubject.deleteMany({ _id: examSubPub._id }),
    ExamResult.deleteMany({ _id: { $in: [resultPub._id, resultDraft._id] } }),
    FeeCategory.deleteOne({ _id: feeCategory._id }),
    FeeStructure.deleteMany({ _id: feeStructure._id }),
    StudentFeeAssignment.deleteMany({ _id: feeAssign1._id }),
    FeePayment.deleteMany({ _id: payment1._id }),
    StudentFeeAccount.deleteMany({ _id: feeAccount1._id }),
    Notice.deleteMany({ _id: noticeSchool._id }),
    Notification.deleteMany({ _id: { $in: [notifA._id, notifB._id] } }),
  ]);

  console.log("\n============================================================");
  console.log(`P8 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================");

  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
