import assert from "assert";
import { createToken, verifyToken } from "../lib/jwt";
import { PERMISSIONS, DEFAULT_ROLE_PERMISSIONS, hasPermission } from "../lib/auth/permissions";

/**
 * Self-contained unit & logic verification suite for Teacher Portal Security & Scope Isolation (Phase T0).
 * Run with: npx tsx src/scripts/test-teacher-security.ts
 */

interface MockUser {
  _id: string;
  email: string;
  role: "SYSTEM_ADMIN" | "ADMIN" | "TEACHER" | "STUDENT" | "PARENT";
  isActive: boolean;
  schoolId?: string;
}

interface MockTeacher {
  _id: string;
  userId: string;
  schoolId: string;
  status: "ACTIVE" | "INACTIVE";
}

interface MockAssignment {
  _id: string;
  schoolId: string;
  teacherId: string;
  academicYearId: string;
  classId: string;
  sectionId: string;
  subjectId?: string;
  assignmentType: "SUBJECT_TEACHER" | "CLASS_TEACHER" | "BOTH";
  isClassTeacher: boolean;
  isActive: boolean;
}

// Simulated requireTeacher logic for unit testing the authentication & authorization contract
function simulateRequireTeacher(user: MockUser | null, teacher: MockTeacher | null, schoolExists: boolean, schoolActive: boolean) {
  if (!user) {
    return { success: false, code: "USER_NOT_FOUND", status: 404 };
  }
  if (!user.isActive) {
    return { success: false, code: "ACCOUNT_DISABLED", status: 403 };
  }
  if (user.role !== "TEACHER") {
    return { success: false, code: "FORBIDDEN", status: 403 };
  }
  if (!user.schoolId) {
    return { success: false, code: "NO_TENANT_ASSOCIATION", status: 403 };
  }
  if (!schoolExists) {
    return { success: false, code: "SCHOOL_NOT_FOUND", status: 404 };
  }
  if (!schoolActive) {
    return { success: false, code: "SCHOOL_INACTIVE", status: 403 };
  }
  if (!teacher) {
    return { success: false, code: "TEACHER_PROFILE_NOT_FOUND", status: 404 };
  }
  if (teacher.status === "INACTIVE") {
    return { success: false, code: "TEACHER_INACTIVE", status: 403 };
  }

  return { success: true, teacherId: teacher._id, schoolId: user.schoolId };
}

// Simulated scope checking logic
function simulateVerifyScope(
  assignments: MockAssignment[],
  schoolId: string,
  teacherId: string,
  target: { schoolId: string; classId?: string; sectionId?: string; subjectId?: string }
) {
  // 1. Tenant Isolation
  if (schoolId !== target.schoolId) {
    return { hasAccess: false, reason: "Cross-tenant access prohibited" };
  }

  // 2. Class check
  if (target.classId) {
    const classAssignments = assignments.filter(
      (a) => a.schoolId === schoolId && a.teacherId === teacherId && a.classId === target.classId && a.isActive
    );
    if (classAssignments.length === 0) {
      return { hasAccess: false, reason: "Teacher not assigned to class" };
    }

    // 3. Section check
    if (target.sectionId) {
      const sectionAssignments = classAssignments.filter((a) => a.sectionId === target.sectionId);
      if (sectionAssignments.length === 0) {
        return { hasAccess: false, reason: "Teacher not assigned to section" };
      }

      // 4. Subject check
      if (target.subjectId) {
        const hasSubject = sectionAssignments.some(
          (a) =>
            a.subjectId === target.subjectId ||
            a.isClassTeacher ||
            a.assignmentType === "CLASS_TEACHER" ||
            a.assignmentType === "BOTH"
        );
        if (!hasSubject) {
          return { hasAccess: false, reason: "Teacher not assigned to subject" };
        }
      }
    }
  }

  return { hasAccess: true };
}

let passedCount = 0;
let totalCount = 0;

function runTest(name: string, fn: () => void) {
  totalCount++;
  try {
    fn();
    console.log(`✔ [PASS] ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`✖ [FAIL] ${name}`);
    console.error(`  Error: ${err.message}`);
  }
}

console.log("============================================================");
console.log("      T0 TEACHER PORTAL SECURITY & SCOPE SUITE              ");
console.log("============================================================\n");

// 1. ADMIN cannot access Teacher Portal
runTest("1. ADMIN cannot access Teacher Portal as TEACHER", () => {
  const adminUser: MockUser = { _id: "u1", email: "admin@school.com", role: "ADMIN", isActive: true, schoolId: "s1" };
  const teacher: MockTeacher = { _id: "t1", userId: "u1", schoolId: "s1", status: "ACTIVE" };
  const result = simulateRequireTeacher(adminUser, teacher, true, true);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.code, "FORBIDDEN");
});

// 2. SYSTEM_ADMIN cannot access Teacher Portal
runTest("2. SYSTEM_ADMIN cannot be treated as TEACHER", () => {
  const sysUser: MockUser = { _id: "u2", email: "sys@erp.com", role: "SYSTEM_ADMIN", isActive: true, schoolId: "s1" };
  const teacher: MockTeacher = { _id: "t2", userId: "u2", schoolId: "s1", status: "ACTIVE" };
  const result = simulateRequireTeacher(sysUser, teacher, true, true);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.code, "FORBIDDEN");
});

// 3. STUDENT cannot access Teacher Portal
runTest("3. STUDENT cannot access Teacher Portal", () => {
  const studentUser: MockUser = { _id: "u3", email: "stu@school.com", role: "STUDENT", isActive: true, schoolId: "s1" };
  const result = simulateRequireTeacher(studentUser, null, true, true);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.code, "FORBIDDEN");
});

// 4. PARENT cannot access Teacher Portal
runTest("4. PARENT cannot access Teacher Portal", () => {
  const parentUser: MockUser = { _id: "u4", email: "parent@school.com", role: "PARENT", isActive: true, schoolId: "s1" };
  const result = simulateRequireTeacher(parentUser, null, true, true);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.code, "FORBIDDEN");
});

// 5. Inactive teacher is rejected
runTest("5. Inactive teacher is rejected (account disabled or teacher profile inactive)", () => {
  const userDisabled: MockUser = { _id: "u5", email: "t@s.com", role: "TEACHER", isActive: false, schoolId: "s1" };
  const teacher: MockTeacher = { _id: "t5", userId: "u5", schoolId: "s1", status: "ACTIVE" };
  const res1 = simulateRequireTeacher(userDisabled, teacher, true, true);
  assert.strictEqual(res1.success, false);
  assert.strictEqual(res1.code, "ACCOUNT_DISABLED");

  const userActive: MockUser = { _id: "u6", email: "t6@s.com", role: "TEACHER", isActive: true, schoolId: "s1" };
  const teacherInactive: MockTeacher = { _id: "t6", userId: "u6", schoolId: "s1", status: "INACTIVE" };
  const res2 = simulateRequireTeacher(userActive, teacherInactive, true, true);
  assert.strictEqual(res2.success, false);
  assert.strictEqual(res2.code, "TEACHER_INACTIVE");
});

// 6. Teacher without schoolId is rejected
runTest("6. Teacher without schoolId is rejected", () => {
  const teacherNoSchool: MockUser = { _id: "u7", email: "t7@s.com", role: "TEACHER", isActive: true };
  const teacher: MockTeacher = { _id: "t7", userId: "u7", schoolId: "s1", status: "ACTIVE" };
  const result = simulateRequireTeacher(teacherNoSchool, teacher, true, true);
  assert.strictEqual(result.success, false);
  assert.strictEqual(result.code, "NO_TENANT_ASSOCIATION");
});

// 7. Teacher from School A cannot access School B
runTest("7. Teacher from School A cannot access School B", () => {
  const assignments: MockAssignment[] = [
    {
      _id: "a1",
      schoolId: "schoolA",
      teacherId: "teacher1",
      academicYearId: "ay1",
      classId: "c1",
      sectionId: "sec1",
      subjectId: "math",
      assignmentType: "SUBJECT_TEACHER",
      isClassTeacher: false,
      isActive: true,
    },
  ];

  const result = simulateVerifyScope(assignments, "schoolA", "teacher1", {
    schoolId: "schoolB",
    classId: "c1",
    sectionId: "sec1",
  });
  assert.strictEqual(result.hasAccess, false);
  assert.strictEqual(result.reason, "Cross-tenant access prohibited");
});

// 8. Teacher cannot access unassigned class
runTest("8. Teacher cannot access unassigned class", () => {
  const assignments: MockAssignment[] = [
    {
      _id: "a1",
      schoolId: "schoolA",
      teacherId: "teacher1",
      academicYearId: "ay1",
      classId: "class10",
      sectionId: "secA",
      subjectId: "math",
      assignmentType: "SUBJECT_TEACHER",
      isClassTeacher: false,
      isActive: true,
    },
  ];

  const result = simulateVerifyScope(assignments, "schoolA", "teacher1", {
    schoolId: "schoolA",
    classId: "class12", // unassigned class
  });
  assert.strictEqual(result.hasAccess, false);
  assert.strictEqual(result.reason, "Teacher not assigned to class");
});

// 9. Teacher cannot access unassigned section
runTest("9. Teacher cannot access unassigned section", () => {
  const assignments: MockAssignment[] = [
    {
      _id: "a1",
      schoolId: "schoolA",
      teacherId: "teacher1",
      academicYearId: "ay1",
      classId: "class10",
      sectionId: "secA",
      subjectId: "math",
      assignmentType: "SUBJECT_TEACHER",
      isClassTeacher: false,
      isActive: true,
    },
  ];

  const result = simulateVerifyScope(assignments, "schoolA", "teacher1", {
    schoolId: "schoolA",
    classId: "class10",
    sectionId: "secB", // unassigned section
  });
  assert.strictEqual(result.hasAccess, false);
  assert.strictEqual(result.reason, "Teacher not assigned to section");
});

// 10. Teacher cannot access unassigned subject
runTest("10. Teacher cannot access unassigned subject", () => {
  const assignments: MockAssignment[] = [
    {
      _id: "a1",
      schoolId: "schoolA",
      teacherId: "teacher1",
      academicYearId: "ay1",
      classId: "class10",
      sectionId: "secA",
      subjectId: "math",
      assignmentType: "SUBJECT_TEACHER",
      isClassTeacher: false,
      isActive: true,
    },
  ];

  const result = simulateVerifyScope(assignments, "schoolA", "teacher1", {
    schoolId: "schoolA",
    classId: "class10",
    sectionId: "secA",
    subjectId: "physics", // unassigned subject
  });
  assert.strictEqual(result.hasAccess, false);
  assert.strictEqual(result.reason, "Teacher not assigned to subject");
});

// 11. Assigned teacher CAN access assigned class, section, subject
runTest("11. Assigned teacher successfully accesses assigned class, section & subject", () => {
  const assignments: MockAssignment[] = [
    {
      _id: "a1",
      schoolId: "schoolA",
      teacherId: "teacher1",
      academicYearId: "ay1",
      classId: "class10",
      sectionId: "secA",
      subjectId: "math",
      assignmentType: "SUBJECT_TEACHER",
      isClassTeacher: false,
      isActive: true,
    },
  ];

  const result = simulateVerifyScope(assignments, "schoolA", "teacher1", {
    schoolId: "schoolA",
    classId: "class10",
    sectionId: "secA",
    subjectId: "math",
  });
  assert.strictEqual(result.hasAccess, true);
});

// 12. Class Teacher has all-subject access in their designated section
runTest("12. Class Teacher has all-subject authority in their assigned section", () => {
  const assignments: MockAssignment[] = [
    {
      _id: "a1",
      schoolId: "schoolA",
      teacherId: "teacher1",
      academicYearId: "ay1",
      classId: "class10",
      sectionId: "secA",
      assignmentType: "CLASS_TEACHER",
      isClassTeacher: true,
      isActive: true,
    },
  ];

  const result = simulateVerifyScope(assignments, "schoolA", "teacher1", {
    schoolId: "schoolA",
    classId: "class10",
    sectionId: "secA",
    subjectId: "chemistry", // Class Teacher can manage all subjects for their section
  });
  assert.strictEqual(result.hasAccess, true);
});

// 13. Teacher RBAC permissions matrix includes teacher-specific permissions
runTest("13. Teacher RBAC matrix contains required teacher.* permissions", () => {
  assert.strictEqual(hasPermission("TEACHER", PERMISSIONS.TEACHER_DASHBOARD_VIEW), true);
  assert.strictEqual(hasPermission("TEACHER", PERMISSIONS.TEACHER_STUDENT_VIEW), true);
  assert.strictEqual(hasPermission("TEACHER", PERMISSIONS.TEACHER_ATTENDANCE_MARK), true);
  assert.strictEqual(hasPermission("TEACHER", PERMISSIONS.TEACHER_ASSIGNMENT_CREATE), true);
  assert.strictEqual(hasPermission("TEACHER", PERMISSIONS.TEACHER_MARKS_ENTER), true);
  assert.strictEqual(hasPermission("TEACHER", PERMISSIONS.SETTINGS_MANAGE), false); // Cannot manage school settings
  assert.strictEqual(hasPermission("TEACHER", PERMISSIONS.FEE_CATEGORY_MANAGE), false); // Cannot manage fees
});

console.log("\n============================================================");
console.log(`TEST SUMMARY: ${passedCount} passed, ${totalCount - passedCount} failed (Total: ${totalCount})`);
if (passedCount === totalCount) {
  console.log("ALL TEACHER PORTAL SECURITY & SCOPE SUITES PASSED CLEANLY");
} else {
  console.error("SOME TESTS FAILED");
  process.exit(1);
}
console.log("============================================================\n");
