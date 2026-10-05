import { NextRequest } from "next/server";
import connectToDatabase from "../lib/db";
import User from "../models/User";
import { createToken } from "../lib/jwt";
import { POST as registerPost } from "../app/api/auth/register/route";
import {
  GET as adminsGet,
  POST as adminsPost,
} from "../app/api/system-admin/admins/route";
import {
  PATCH as adminPatch,
} from "../app/api/system-admin/admins/[id]/route";

interface TestReport {
  name: string;
  category: string;
  passed: boolean;
  expectedStatus: number | string;
  actualStatus: number | string;
  message?: string;
}

const report: TestReport[] = [];

function recordTest(
  name: string,
  category: string,
  passed: boolean,
  expectedStatus: number | string,
  actualStatus: number | string,
  message?: string
) {
  report.push({
    name,
    category,
    passed,
    expectedStatus,
    actualStatus,
    message,
  });

  const icon = passed ? "✓ [PASS]" : "✗ [FAIL]";
  console.log(
    `  ${icon} [${category}] ${name} | Expected: ${expectedStatus}, Received: ${actualStatus}`
  );
  if (!passed && message) {
    console.error(`      Error: ${message}`);
  }
}

function makeRequest(
  url: string,
  method: string,
  body?: unknown,
  token?: string
): NextRequest {
  const headers = new Headers();
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function runSystemAdminSecurityTests() {
  console.log("\n==================================================================");
  console.log("   PRODUCTION SECURITY SUITE — SYSTEM ADMIN CREATION & RBAC       ");
  console.log("==================================================================\n");

  await connectToDatabase();

  const timestamp = Date.now();
  const testIdsToClean: string[] = [];

  // 1. Create or ensure test accounts in DB for all 5 roles
  console.log("Setting up multi-role test users in database...");

  // System Admin
  let testSysAdmin = await User.findOne({ email: "test_sysadmin@security.test" });
  if (!testSysAdmin) {
    testSysAdmin = await User.create({
      email: "test_sysadmin@security.test",
      name: "Security SysAdmin",
      password: "HashedPassword123!",
      role: "SYSTEM_ADMIN",
      schoolId: null,
      isActive: true,
    });
  }
  testIdsToClean.push(testSysAdmin._id.toString());

  // School Admin
  let testSchoolAdmin = await User.findOne({ email: "test_admin@security.test" });
  if (!testSchoolAdmin) {
    testSchoolAdmin = await User.create({
      email: "test_admin@security.test",
      name: "Security School Admin",
      password: "HashedPassword123!",
      role: "ADMIN",
      isActive: true,
    });
  }
  testIdsToClean.push(testSchoolAdmin._id.toString());

  // Teacher
  let testTeacher = await User.findOne({ email: "test_teacher@security.test" });
  if (!testTeacher) {
    testTeacher = await User.create({
      email: "test_teacher@security.test",
      name: "Security Teacher",
      password: "HashedPassword123!",
      role: "TEACHER",
      isActive: true,
    });
  }
  testIdsToClean.push(testTeacher._id.toString());

  // Student
  let testStudent = await User.findOne({ email: "test_student@security.test" });
  if (!testStudent) {
    testStudent = await User.create({
      email: "test_student@security.test",
      name: "Security Student",
      password: "HashedPassword123!",
      role: "STUDENT",
      isActive: true,
    });
  }
  testIdsToClean.push(testStudent._id.toString());

  // Parent
  let testParent = await User.findOne({ email: "test_parent@security.test" });
  if (!testParent) {
    testParent = await User.create({
      email: "test_parent@security.test",
      name: "Security Parent",
      password: "HashedPassword123!",
      role: "PARENT",
      isActive: true,
    });
  }
  testIdsToClean.push(testParent._id.toString());

  // Generate valid signed JWT tokens for each role
  const sysAdminToken = createToken({
    userId: testSysAdmin._id.toString(),
    email: testSysAdmin.email,
    role: "SYSTEM_ADMIN",
  });

  const schoolAdminToken = createToken({
    userId: testSchoolAdmin._id.toString(),
    email: testSchoolAdmin.email,
    role: "ADMIN",
  });

  const teacherToken = createToken({
    userId: testTeacher._id.toString(),
    email: testTeacher.email,
    role: "TEACHER",
  });

  const studentToken = createToken({
    userId: testStudent._id.toString(),
    email: testStudent.email,
    role: "STUDENT",
  });

  const parentToken = createToken({
    userId: testParent._id.toString(),
    email: testParent.email,
    role: "PARENT",
  });

  // -------------------------------------------------------------
  // TEST GROUP 1: Public / Unauthenticated Registration Access
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 1: Unauthenticated Registration Access ---");

  // 1.1 Unauthenticated POST /api/auth/register MUST FAIL
  {
    const req = makeRequest("http://localhost:3000/api/auth/register", "POST", {
      email: `unauth_admin_${timestamp}@security.test`,
      password: "Password123!",
      name: "Hacker Attempt",
    });
    const res = await registerPost(req);
    const passed = res.status === 401 || res.status === 403;
    recordTest(
      "Unauthenticated POST /api/auth/register",
      "PUBLIC_AUTH",
      passed,
      "401 or 403",
      res.status
    );
  }

  // 1.2 Unauthenticated POST /api/system-admin/admins MUST FAIL
  {
    const req = makeRequest(
      "http://localhost:3000/api/system-admin/admins",
      "POST",
      {
        email: `unauth_sysadmin_${timestamp}@security.test`,
        password: "Password123!",
        name: "Direct API Hacker",
      }
    );
    const res = await adminsPost(req);
    const passed = res.status === 401 || res.status === 403;
    recordTest(
      "Unauthenticated POST /api/system-admin/admins",
      "PUBLIC_AUTH",
      passed,
      "401 or 403",
      res.status
    );
  }

  // -------------------------------------------------------------
  // TEST GROUP 2: Non-SYSTEM_ADMIN Role Access Blocked
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 2: Non-SYSTEM_ADMIN Role Access Blocked ---");

  // 2.1 ADMIN: POST create system admin MUST FAIL
  {
    const req = makeRequest(
      "http://localhost:3000/api/system-admin/admins",
      "POST",
      {
        email: `admin_created_${timestamp}@security.test`,
        password: "Password123!",
        name: "Admin Attempt",
      },
      schoolAdminToken
    );
    const res = await adminsPost(req);
    const passed = res.status === 403;
    recordTest(
      "ADMIN: POST /api/system-admin/admins",
      "RBAC_RESTRICTION",
      passed,
      403,
      res.status
    );
  }

  // 2.2 TEACHER: POST create system admin MUST FAIL
  {
    const req = makeRequest(
      "http://localhost:3000/api/system-admin/admins",
      "POST",
      {
        email: `teacher_created_${timestamp}@security.test`,
        password: "Password123!",
        name: "Teacher Attempt",
      },
      teacherToken
    );
    const res = await adminsPost(req);
    const passed = res.status === 403;
    recordTest(
      "TEACHER: POST /api/system-admin/admins",
      "RBAC_RESTRICTION",
      passed,
      403,
      res.status
    );
  }

  // 2.3 STUDENT: POST create system admin MUST FAIL
  {
    const req = makeRequest(
      "http://localhost:3000/api/system-admin/admins",
      "POST",
      {
        email: `student_created_${timestamp}@security.test`,
        password: "Password123!",
        name: "Student Attempt",
      },
      studentToken
    );
    const res = await adminsPost(req);
    const passed = res.status === 403;
    recordTest(
      "STUDENT: POST /api/system-admin/admins",
      "RBAC_RESTRICTION",
      passed,
      403,
      res.status
    );
  }

  // 2.4 PARENT: POST create system admin MUST FAIL
  {
    const req = makeRequest(
      "http://localhost:3000/api/system-admin/admins",
      "POST",
      {
        email: `parent_created_${timestamp}@security.test`,
        password: "Password123!",
        name: "Parent Attempt",
      },
      parentToken
    );
    const res = await adminsPost(req);
    const passed = res.status === 403;
    recordTest(
      "PARENT: POST /api/system-admin/admins",
      "RBAC_RESTRICTION",
      passed,
      403,
      res.status
    );
  }

  // 2.5 Non-SYSTEM_ADMIN on POST /api/auth/register MUST ALSO FAIL
  {
    const req = makeRequest(
      "http://localhost:3000/api/auth/register",
      "POST",
      {
        email: `schooladmin_reg_${timestamp}@security.test`,
        password: "Password123!",
      },
      schoolAdminToken
    );
    const res = await registerPost(req);
    const passed = res.status === 403;
    recordTest(
      "ADMIN: POST /api/auth/register",
      "RBAC_RESTRICTION",
      passed,
      403,
      res.status
    );
  }

  // -------------------------------------------------------------
  // TEST GROUP 3: SYSTEM_ADMIN Authorized Operations
  // -------------------------------------------------------------
  console.log("\n--- TEST GROUP 3: SYSTEM_ADMIN Authorized Operations ---");

  let createdAdminId = "";
  const newAdminEmail = `created_sysadmin_${timestamp}@security.test`;

  // 3.1 SYSTEM_ADMIN: POST create system admin MUST SUCCEED
  {
    const req = makeRequest(
      "http://localhost:3000/api/system-admin/admins",
      "POST",
      {
        email: newAdminEmail,
        password: "SuperSecurePassword123!",
        name: "New Provisioned Admin",
      },
      sysAdminToken
    );
    const res = await adminsPost(req);
    const body = await res.json();
    const passed = res.status === 201 && body.success === true && !!body.data?.id;
    if (body.data?.id) {
      createdAdminId = body.data.id;
      testIdsToClean.push(createdAdminId);
    }
    recordTest(
      "SYSTEM_ADMIN: POST create system admin",
      "SYSTEM_ADMIN_AUTH",
      passed,
      201,
      res.status,
      body.error?.message
    );
  }

  // 3.2 Tenant Separation Verification: schoolId MUST BE NULL
  {
    const createdUserDoc = await User.findById(createdAdminId).lean();
    const passed =
      !!createdUserDoc &&
      createdUserDoc.role === "SYSTEM_ADMIN" &&
      (createdUserDoc.schoolId === null || createdUserDoc.schoolId === undefined) &&
      (createdUserDoc.studentId === null || createdUserDoc.studentId === undefined);
    recordTest(
      "Tenant Separation: schoolId & tenant pointers are null",
      "TENANT_ISOLATION",
      passed,
      "null",
      String(createdUserDoc?.schoolId)
    );
  }

  // 3.3 SYSTEM_ADMIN: GET system admins MUST SUCCEED
  {
    const req = makeRequest(
      "http://localhost:3000/api/system-admin/admins",
      "GET",
      undefined,
      sysAdminToken
    );
    const res = await adminsGet(req);
    const body = await res.json();
    const passed =
      res.status === 200 &&
      body.success === true &&
      Array.isArray(body.data) &&
      body.data.some((a: { email: string }) => a.email === newAdminEmail);
    recordTest(
      "SYSTEM_ADMIN: GET system admins",
      "SYSTEM_ADMIN_AUTH",
      passed,
      200,
      res.status
    );
  }

  // 3.4 Non-SYSTEM_ADMIN: GET system admins MUST FAIL
  {
    const req = makeRequest(
      "http://localhost:3000/api/system-admin/admins",
      "GET",
      undefined,
      teacherToken
    );
    const res = await adminsGet(req);
    const passed = res.status === 403;
    recordTest(
      "TEACHER: GET /api/system-admin/admins blocked",
      "RBAC_RESTRICTION",
      passed,
      403,
      res.status
    );
  }

  // 3.5 SYSTEM_ADMIN: deactivate system admin MUST SUCCEED
  {
    const req = makeRequest(
      `http://localhost:3000/api/system-admin/admins/${createdAdminId}`,
      "PATCH",
      { isActive: false },
      sysAdminToken
    );
    const res = await adminPatch(req, {
      params: Promise.resolve({ id: createdAdminId }),
    });
    const body = await res.json();
    const passed = res.status === 200 && body.data?.isActive === false;
    recordTest(
      "SYSTEM_ADMIN: deactivate other system admin",
      "SYSTEM_ADMIN_AUTH",
      passed,
      200,
      res.status
    );
  }

  // 3.6 SYSTEM_ADMIN: Self-deactivation MUST BE REJECTED
  {
    const req = makeRequest(
      `http://localhost:3000/api/system-admin/admins/${testSysAdmin._id.toString()}`,
      "PATCH",
      { isActive: false },
      sysAdminToken
    );
    const res = await adminPatch(req, {
      params: Promise.resolve({ id: testSysAdmin._id.toString() }),
    });
    const passed = res.status === 400;
    recordTest(
      "SYSTEM_ADMIN: Self-deactivation protection triggered",
      "SECURITY_PROTECTION",
      passed,
      400,
      res.status
    );
  }

  // 3.7 Direct API URL call without auth cannot bypass UI
  {
    const req = makeRequest(
      `http://localhost:3000/api/system-admin/admins/${createdAdminId}`,
      "PATCH",
      { isActive: true }
    );
    const res = await adminPatch(req, {
      params: Promise.resolve({ id: createdAdminId }),
    });
    const passed = res.status === 401 || res.status === 403;
    recordTest(
      "Direct API access bypass check (PATCH without auth fails)",
      "SECURITY_PROTECTION",
      passed,
      "401 or 403",
      res.status
    );
  }

  // -------------------------------------------------------------
  // Cleanup test users
  // -------------------------------------------------------------
  console.log("\nCleaning up test artifacts from database...");
  if (testIdsToClean.length > 0) {
    await User.deleteMany({ _id: { $in: testIdsToClean } });
  }

  // Summary
  const total = report.length;
  const passedCount = report.filter((r) => r.passed).length;
  const failedCount = total - passedCount;

  console.log("\n==================================================================");
  console.log(`TOTAL SECURITY TESTS: ${total} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log("==================================================================\n");

  if (failedCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runSystemAdminSecurityTests().catch((err) => {
  console.error("Test execution encountered an error:", err);
  process.exit(1);
});
