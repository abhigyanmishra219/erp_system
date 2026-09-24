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
} catch {
  // ignore
}

function makeRequest(url: string, token?: string, method: string = "GET", body?: any) {
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

async function runP0TestSuite() {
  console.log("============================================================");
  console.log("🧪 STARTING P0: PARENT PORTAL FOUNDATION & SECURITY TESTS");
  console.log("============================================================\n");

  const mongoose: any = (await import("mongoose")).default;
  const connectToDatabase: any = (await import("./src/lib/db")).default;
  const User: any = (await import("./src/models/User")).default;
  const School: any = (await import("./src/models/School")).default;
  const AcademicYear: any = (await import("./src/models/AcademicYear")).default;
  const Class: any = (await import("./src/models/Class")).default;
  const Section: any = (await import("./src/models/Section")).default;
  const Student: any = (await import("./src/models/Student")).default;
  const Parent: any = (await import("./src/models/Parent")).default;
  const StudentParent: any = (await import("./src/models/StudentParent")).default;

  const { createToken } = await import("./src/lib/jwt");
  const { requireParent } = await import("./src/lib/auth/requireParent");
  const { GET: getParentMe } = (await import("./src/app/api/parent/me/route")) as any;
  const { GET: getParentChildren } = (await import("./src/app/api/parent/children/route")) as any;

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
    // 1. Setup School 1 & School 2
    const school1 = await School.create({
      name: `P0 Grand Academy ${timestamp}`,
      code: `P0_${timestamp}`,
      status: "ACTIVE",
      address: "123 Oxford Street",
      city: "London",
      state: "Greater London",
      country: "United Kingdom",
      phone: "+44 20 7946 0912",
      email: `p0_school1_${timestamp}@example.com`,
      website: "https://example.com/school1",
      plan: "STANDARD",
      studentLimit: 500,
      subscriptionStartDate: new Date(),
      subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
      subscriptionStatus: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    const school2 = await School.create({
      name: `P0 Cambridge Academy ${timestamp}`,
      code: `P02_${timestamp}`,
      status: "ACTIVE",
      address: "456 King Street",
      city: "Cambridge",
      state: "Cambridgeshire",
      country: "United Kingdom",
      phone: "+44 20 7946 0913",
      email: `p0_school2_${timestamp}@example.com`,
      website: "https://example.com/school2",
      plan: "STANDARD",
      studentLimit: 500,
      subscriptionStartDate: new Date(),
      subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
      subscriptionStatus: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    const ay1 = await AcademicYear.create({
      schoolId: school1._id,
      name: `2026-2027 ${timestamp}`,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    const class1 = await Class.create({
      schoolId: school1._id,
      name: `Grade 5 ${timestamp}`,
      code: `G5_${timestamp}`.slice(0, 10),
      academicYearId: ay1._id,
      createdBy: adminId,
      updatedBy: adminId,
    });

    const section1 = await Section.create({
      schoolId: school1._id,
      classId: class1._id,
      academicYearId: ay1._id,
      name: "A",
      capacity: 30,
      createdBy: adminId,
      updatedBy: adminId,
    });

    // 2. Setup Students in School 1
    // Student 1 (Child of Parent A)
    const userStudent1 = await User.create({
      schoolId: school1._id,
      name: `Emma Watson ${timestamp}`,
      email: `emma_${timestamp}@example.com`,
      password: "password123",
      role: "STUDENT",
      status: "ACTIVE",
    });
    const student1 = await Student.create({
      schoolId: school1._id,
      userId: userStudent1._id,
      studentId: `STU-1-${timestamp}`.slice(0, 15),
      admissionNumber: `ADM-1-${timestamp}`.slice(0, 15),
      rollNumber: `R-01`,
      firstName: "Emma",
      lastName: "Watson",
      gender: "FEMALE",
      dateOfBirth: new Date("2015-04-15"),
      admissionDate: new Date("2024-04-01"),
      classId: class1._id,
      sectionId: section1._id,
      academicYearId: ay1._id,
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Student 2 (Child of Parent A - Sibling)
    const userStudent2 = await User.create({
      schoolId: school1._id,
      name: `Alex Watson ${timestamp}`,
      email: `alex_${timestamp}@example.com`,
      password: "password123",
      role: "STUDENT",
      status: "ACTIVE",
    });
    const student2 = await Student.create({
      schoolId: school1._id,
      userId: userStudent2._id,
      studentId: `STU-2-${timestamp}`.slice(0, 15),
      admissionNumber: `ADM-2-${timestamp}`.slice(0, 15),
      rollNumber: `R-02`,
      firstName: "Alex",
      lastName: "Watson",
      gender: "MALE",
      dateOfBirth: new Date("2017-08-20"),
      admissionDate: new Date("2024-04-01"),
      classId: class1._id,
      sectionId: section1._id,
      academicYearId: ay1._id,
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Student 3 (Unlinked student in School 1)
    const userStudent3 = await User.create({
      schoolId: school1._id,
      name: `Harry Potter ${timestamp}`,
      email: `harry_${timestamp}@example.com`,
      password: "password123",
      role: "STUDENT",
      status: "ACTIVE",
    });
    const student3 = await Student.create({
      schoolId: school1._id,
      userId: userStudent3._id,
      studentId: `STU-3-${timestamp}`.slice(0, 15),
      admissionNumber: `ADM-3-${timestamp}`.slice(0, 15),
      rollNumber: `R-03`,
      firstName: "Harry",
      lastName: "Potter",
      gender: "MALE",
      dateOfBirth: new Date("2015-07-31"),
      admissionDate: new Date("2024-04-01"),
      classId: class1._id,
      sectionId: section1._id,
      academicYearId: ay1._id,
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // 3. Setup Parent A (Linked to Student 1 and Student 2 in School 1)
    const userParentA = await User.create({
      schoolId: school1._id,
      name: `John Watson ${timestamp}`,
      email: `parentA_${timestamp}@example.com`,
      password: "password123",
      role: "PARENT",
      status: "ACTIVE",
      isActive: true,
    });
    const parentA = await Parent.create({
      schoolId: school1._id,
      userId: userParentA._id,
      firstName: "John",
      lastName: "Watson",
      email: userParentA.email,
      phone: "+44 7700 900077",
      relationship: "FATHER",
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Create relationship links
    await StudentParent.create([
      {
        schoolId: school1._id,
        studentId: student1._id,
        parentId: parentA._id,
        relationship: "FATHER",
        isPrimaryGuardian: true,
        isEmergencyContact: true,
        canPickup: true,
        createdBy: adminId,
        updatedBy: adminId,
      },
      {
        schoolId: school1._id,
        studentId: student2._id,
        parentId: parentA._id,
        relationship: "FATHER",
        isPrimaryGuardian: true,
        isEmergencyContact: false,
        canPickup: true,
        createdBy: adminId,
        updatedBy: adminId,
      },
    ]);

    const tokenParentA = createToken({
      userId: userParentA._id.toString(),
      role: "PARENT",
      email: userParentA.email,
    });

    // 4. Setup Parent B (Parent with NO linked children in School 1)
    const userParentB = await User.create({
      schoolId: school1._id,
      name: `Mary Morstan ${timestamp}`,
      email: `parentB_${timestamp}@example.com`,
      password: "password123",
      role: "PARENT",
      status: "ACTIVE",
      isActive: true,
    });
    const parentB = await Parent.create({
      schoolId: school1._id,
      userId: userParentB._id,
      firstName: "Mary",
      lastName: "Morstan",
      email: userParentB.email,
      phone: "+44 7700 900088",
      relationship: "MOTHER",
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    const tokenParentB = createToken({
      userId: userParentB._id.toString(),
      role: "PARENT",
      email: userParentB.email,
    });

    // 5. Setup Other Roles for RBAC checks
    // Teacher
    const userTeacher = await User.create({
      schoolId: school1._id,
      name: `Teacher User ${timestamp}`,
      email: `teacher_${timestamp}@example.com`,
      password: "password123",
      role: "TEACHER",
      status: "ACTIVE",
      isActive: true,
    });
    const tokenTeacher = createToken({
      userId: userTeacher._id.toString(),
      role: "TEACHER",
      email: userTeacher.email,
    });

    // Admin
    const userAdmin = await User.create({
      schoolId: school1._id,
      name: `Admin User ${timestamp}`,
      email: `admin_${timestamp}@example.com`,
      password: "password123",
      role: "ADMIN",
      status: "ACTIVE",
      isActive: true,
    });
    const tokenAdmin = createToken({
      userId: userAdmin._id.toString(),
      role: "ADMIN",
      email: userAdmin.email,
    });

    // System Admin
    const userSysAdmin = await User.create({
      name: `Sys Admin ${timestamp}`,
      email: `sysadmin_${timestamp}@example.com`,
      password: "password123",
      role: "SYSTEM_ADMIN",
      status: "ACTIVE",
      isActive: true,
    });
    const tokenSysAdmin = createToken({
      userId: userSysAdmin._id.toString(),
      role: "SYSTEM_ADMIN",
      email: userSysAdmin.email,
    });

    // Student token
    const tokenStudent = createToken({
      userId: userStudent1._id.toString(),
      role: "STUDENT",
      email: userStudent1.email,
    });

    // Inactive Parent User
    const userInactiveParent = await User.create({
      schoolId: school1._id,
      name: `Inactive Parent ${timestamp}`,
      email: `inactive_parent_${timestamp}@example.com`,
      password: "password123",
      role: "PARENT",
      status: "INACTIVE",
      isActive: false,
    });
    const tokenInactiveParent = createToken({
      userId: userInactiveParent._id.toString(),
      role: "PARENT",
      email: userInactiveParent.email,
    });

    // Parent User without schoolId
    const userNoSchoolParent = await User.create({
      name: `No School Parent ${timestamp}`,
      email: `noschool_parent_${timestamp}@example.com`,
      password: "password123",
      role: "PARENT",
      status: "ACTIVE",
      isActive: true,
    });
    const tokenNoSchoolParent = createToken({
      userId: userNoSchoolParent._id.toString(),
      role: "PARENT",
      email: userNoSchoolParent.email,
    });

    // Foreign Parent in School 2
    const userParentSchool2 = await User.create({
      schoolId: school2._id,
      name: `Parent School 2 ${timestamp}`,
      email: `parent_school2_${timestamp}@example.com`,
      password: "password123",
      role: "PARENT",
      status: "ACTIVE",
      isActive: true,
    });
    const parentSchool2 = await Parent.create({
      schoolId: school2._id,
      userId: userParentSchool2._id,
      firstName: "George",
      lastName: "Clark",
      email: userParentSchool2.email,
      phone: "+44 7700 900099",
      relationship: "FATHER",
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    const tokenParentSchool2 = createToken({
      userId: userParentSchool2._id.toString(),
      role: "PARENT",
      email: userParentSchool2.email,
    });

    console.log("--- TEST SECTION 1: AUTH & RBAC VERIFICATION ---");

    // 1. PARENT can access Parent Portal
    const authParentA = await requireParent(makeRequest("/api/parent/me", tokenParentA));
    assert(authParentA.success === true, "1. PARENT can access Parent Portal via requireParent guard");
    if (authParentA.success) {
      assert(authParentA.context.user.role === "PARENT", "Parent user role is PARENT");
      assert(authParentA.context.linkedChildren.length === 2, "Parent A has 2 linked children resolved");
      assert(authParentA.context.childIds.includes(student1._id.toString()), "Child 1 is linked to Parent A");
      assert(authParentA.context.childIds.includes(student2._id.toString()), "Child 2 is linked to Parent A");
    }

    // 2. STUDENT cannot access Parent Portal (HTTP 403)
    const authStudent = await requireParent(makeRequest("/api/parent/me", tokenStudent));
    assert(authStudent.success === false, "2. STUDENT is rejected by requireParent");
    if (!authStudent.success) {
      assert(authStudent.response.status === 403, "STUDENT receives HTTP 403 Forbidden");
    }

    // 3. TEACHER cannot access Parent Portal (HTTP 403)
    const authTeacher = await requireParent(makeRequest("/api/parent/me", tokenTeacher));
    assert(authTeacher.success === false, "3. TEACHER is rejected by requireParent");
    if (!authTeacher.success) {
      assert(authTeacher.response.status === 403, "TEACHER receives HTTP 403 Forbidden");
    }

    // 4. ADMIN cannot be treated as PARENT (HTTP 403)
    const authAdmin = await requireParent(makeRequest("/api/parent/me", tokenAdmin));
    assert(authAdmin.success === false, "4. ADMIN cannot be treated as PARENT");
    if (!authAdmin.success) {
      assert(authAdmin.response.status === 403, "ADMIN receives HTTP 403 Forbidden");
    }

    // 5. SYSTEM_ADMIN cannot be treated as PARENT (HTTP 403)
    const authSysAdmin = await requireParent(makeRequest("/api/parent/me", tokenSysAdmin));
    assert(authSysAdmin.success === false, "5. SYSTEM_ADMIN cannot be treated as PARENT");
    if (!authSysAdmin.success) {
      assert(authSysAdmin.response.status === 403, "SYSTEM_ADMIN receives HTTP 403 Forbidden");
    }

    // 6. Inactive parent is rejected (HTTP 403)
    const authInactive = await requireParent(makeRequest("/api/parent/me", tokenInactiveParent));
    assert(authInactive.success === false, "6. Inactive parent is rejected");
    if (!authInactive.success) {
      assert(authInactive.response.status === 403, "Inactive parent receives HTTP 403 Forbidden");
    }

    // 7. Parent without schoolId is rejected (HTTP 403)
    const authNoSchool = await requireParent(makeRequest("/api/parent/me", tokenNoSchoolParent));
    assert(authNoSchool.success === false, "7. Parent without schoolId is rejected");
    if (!authNoSchool.success) {
      assert(authNoSchool.response.status === 403, "Parent without schoolId receives HTTP 403");
    }

    // Unauthenticated user is rejected (HTTP 401)
    const authUnauth = await requireParent(makeRequest("/api/parent/me", "invalid.jwt.token"));
    assert(authUnauth.success === false, "Unauthenticated user is rejected");
    if (!authUnauth.success) {
      assert(authUnauth.response.status === 401, "Unauthenticated user receives HTTP 401");
    }

    console.log("\n--- TEST SECTION 2: PARENT → CHILD RELATIONSHIP & SCOPE ---");

    // 8. Parent with no linked children gets a valid empty state
    const authParentB = await requireParent(makeRequest("/api/parent/me", tokenParentB));
    assert(authParentB.success === true, "8. Parent B without linked children can authenticate");
    if (authParentB.success) {
      assert(authParentB.context.linkedChildren.length === 0, "Parent B linkedChildren array is empty (no fake data)");
      assert(authParentB.context.childIds.length === 0, "Parent B childIds is empty");
    }

    const resChildrenB = await getParentChildren(makeRequest("/api/parent/children", tokenParentB));
    const jsonChildrenB = await resChildrenB.json();
    assert(resChildrenB.status === 200, "Parent B fetches children API successfully");
    assert(jsonChildrenB.data.totalChildren === 0, "API returns totalChildren: 0 for Parent B");
    assert(jsonChildrenB.data.children.length === 0, "API returns empty children array for Parent B");

    // 9. Parent cannot access an unlinked student
    if (authParentA.success) {
      assert(
        !authParentA.context.childIds.includes(student3._id.toString()),
        "9. Parent A context does NOT include unlinked student (Student 3)"
      );
    }

    // 10. Parent cannot cross school boundaries (tenant isolation)
    const authSchool2 = await requireParent(makeRequest("/api/parent/me", tokenParentSchool2));
    assert(authSchool2.success === true, "10. School 2 Parent authenticates under School 2");
    if (authSchool2.success) {
      assert(
        authSchool2.context.schoolId === school2._id.toString(),
        "School 2 Parent is bound to School 2 tenant ID"
      );
      assert(
        !authSchool2.context.childIds.includes(student1._id.toString()),
        "School 2 Parent cannot access School 1 students"
      );
    }

    console.log("\n--- TEST SECTION 3: API ENDPOINTS INTEGRATION ---");

    // Test /api/parent/me for Parent A
    const resMeA = await getParentMe(makeRequest("/api/parent/me", tokenParentA));
    const jsonMeA = await resMeA.json();
    assert(resMeA.status === 200, "GET /api/parent/me returns HTTP 200");
    assert(jsonMeA.success === true, "GET /api/parent/me success is true");
    assert(jsonMeA.data.parent.fullName === "John Watson", "Parent full name matches");
    assert(jsonMeA.data.linkedChildren.length === 2, "Parent A has 2 children in API response");
    assert(jsonMeA.data.linkedChildren[0].student.fullName === "Emma Watson", "Child 1 details match");
    assert(jsonMeA.data.linkedChildren[1].student.fullName === "Alex Watson", "Child 2 details match");

    // Test /api/parent/children for Parent A
    const resChildrenA = await getParentChildren(makeRequest("/api/parent/children", tokenParentA));
    const jsonChildrenA = await resChildrenA.json();
    assert(resChildrenA.status === 200, "GET /api/parent/children returns HTTP 200");
    assert(jsonChildrenA.data.totalChildren === 2, "totalChildren is 2");

    console.log("\n============================================================");
    console.log(`📊 P0 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("============================================================");

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  }
}

runP0TestSuite();
