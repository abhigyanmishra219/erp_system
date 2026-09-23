import { createToken, verifyToken } from "../lib/jwt";
import { calculateAttendancePercentage } from "../lib/utils/attendance";
import { TimetableConflictService } from "../lib/services/timetableConflictService";
import { ColumnMapper } from "../lib/import/columnMapper";
import { hasPermission, PERMISSIONS } from "../lib/auth/permissions";

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  message?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, category: string, errorMsg?: string) {
  if (condition) {
    results.push({ name, category, passed: true });
    console.log(`  ✓ [PASS] [${category}] ${name}`);
  } else {
    results.push({ name, category, passed: false, message: errorMsg || "Assertion failed" });
    console.error(`  ✗ [FAIL] [${category}] ${name}: ${errorMsg || "Assertion failed"}`);
  }
}

async function runSecuritySuite() {
  console.log("\n============================================================");
  console.log("       SCHOOL ERP SaaS — A12 SECURITY & HARDENING SUITE      ");
  console.log("============================================================\n");

  // 1. JWT & Authentication Verification
  console.log("--- 1. Authentication & JWT Integrity ---");
  const testPayload = {
    userId: "507f1f77bcf86cd799439011",
    email: "admin@school.edu",
    role: "ADMIN" as const,
  };
  const token = createToken(testPayload, "1h");
  const decoded = verifyToken(token);
  assert(!!decoded && decoded.userId === testPayload.userId, "Valid JWT correctly decoded", "AUTH");

  const tamperedToken = token.slice(0, -5) + "abcde";
  const tamperedDecoded = verifyToken(tamperedToken);
  assert(tamperedDecoded === null, "Tampered JWT rejected", "AUTH");

  const malformedDecoded = verifyToken("invalid.jwt.token.format");
  assert(malformedDecoded === null, "Malformed JWT rejected", "AUTH");

  // 2. Zero-Denominator Attendance Rule (0 / 0 = 0%, Never 100%)
  console.log("\n--- 2. Zero-Denominator Attendance Rule ---");
  const zeroDaysAttendance = calculateAttendancePercentage(0, 0);
  assert(zeroDaysAttendance === 0, "0 Present / 0 Working Days returns 0% (never 100%)", "ATTENDANCE");

  const negativeDaysAttendance = calculateAttendancePercentage(0, -5);
  assert(negativeDaysAttendance === 0, "Negative working days safely returns 0%", "ATTENDANCE");

  const normalAttendance = calculateAttendancePercentage(18, 20);
  assert(normalAttendance === 90, "18 Present / 20 Working Days returns 90.0%", "ATTENDANCE");

  const halfDayAttendance = calculateAttendancePercentage(15, 20);
  assert(halfDayAttendance === 75, "15 Present / 20 Working Days returns 75.0%", "ATTENDANCE");

  // 3. Timetable Interval Overlap Conflict Detection
  console.log("\n--- 3. Timetable Interval Overlap Engine ---");
  const overlap1 = TimetableConflictService.hasTimeOverlap("09:00", "10:00", "09:30", "10:30");
  assert(overlap1 === true, "Detects internal time slot overlap (09:00-10:00 vs 09:30-10:30)", "TIMETABLE");

  const overlap2 = TimetableConflictService.hasTimeOverlap("09:00", "10:00", "08:30", "09:30");
  assert(overlap2 === true, "Detects preceding time slot overlap (09:00-10:00 vs 08:30-09:30)", "TIMETABLE");

  const overlap3 = TimetableConflictService.hasTimeOverlap("09:00", "10:00", "08:00", "11:00");
  assert(overlap3 === true, "Detects enclosing time slot overlap (09:00-10:00 vs 08:00-11:00)", "TIMETABLE");

  const noOverlapAdjacent = TimetableConflictService.hasTimeOverlap("09:00", "10:00", "10:00", "11:00");
  assert(noOverlapAdjacent === false, "Adjacent consecutive periods are permitted (09:00-10:00 vs 10:00-11:00)", "TIMETABLE");

  const noOverlapSeparate = TimetableConflictService.hasTimeOverlap("09:00", "10:00", "11:00", "12:00");
  assert(noOverlapSeparate === false, "Distinct separate periods are permitted (09:00-10:00 vs 11:00-12:00)", "TIMETABLE");

  // 4. Excel Import Column Mapping & Alias Dictionaries
  console.log("\n--- 4. Excel Import Mapping & Schema Validation ---");
  const testHeaders = ["Admission No", "First Name", "Last Name", "Gender", "Date of Birth", "Session", "Class", "Section", "Mobile"];
  const suggested = ColumnMapper.autoSuggestMapping("STUDENTS", testHeaders);

  assert(suggested.admissionNumber === "Admission No", "Auto-maps 'Admission No' alias to admissionNumber", "IMPORT");
  assert(suggested.phone === "Mobile", "Auto-maps 'Mobile' alias to phone", "IMPORT");
  assert(suggested.academicYear === "Session", "Auto-maps 'Session' alias to academicYear", "IMPORT");

  const checkReq = ColumnMapper.validateRequiredMappings("STUDENTS", suggested);
  assert(checkReq.valid === true, "Recognizes all mandatory student fields are mapped", "IMPORT");

  const missingReq = ColumnMapper.validateRequiredMappings("STUDENTS", { firstName: "First Name" });
  assert(missingReq.valid === false && missingReq.missingRequiredFields.length > 0, "Flags unmapped mandatory fields", "IMPORT");

  // 5. RBAC & Permission Enforcement
  console.log("\n--- 5. RBAC & Permission Matrix ---");
  const adminHasImport = hasPermission("ADMIN", PERMISSIONS.IMPORT_CREATE);
  assert(adminHasImport === true, "ADMIN role has IMPORT_CREATE permission", "RBAC");

  const teacherHasNoImport = hasPermission("TEACHER", PERMISSIONS.IMPORT_CREATE);
  assert(teacherHasNoImport === false, "TEACHER role blocked from IMPORT_CREATE", "RBAC");

  const studentHasNoAdmin = hasPermission("STUDENT", PERMISSIONS.STUDENT_CREATE);
  assert(studentHasNoAdmin === false, "STUDENT role blocked from STUDENT_CREATE", "RBAC");

  const parentHasNoSettings = hasPermission("PARENT", PERMISSIONS.SETTINGS_MANAGE);
  assert(parentHasNoSettings === false, "PARENT role blocked from SETTINGS_MANAGE", "RBAC");

  const adminHasReportsExcel = hasPermission("ADMIN", PERMISSIONS.REPORTS_EXPORT_EXCEL);
  assert(adminHasReportsExcel === true, "ADMIN role has REPORTS_EXPORT_EXCEL permission", "RBAC");

  // --- Summary Report ---
  console.log("\n============================================================");
  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.filter((r) => !r.passed).length;
  console.log(`TOTAL TESTS: ${results.length} | PASSED: ${totalPassed} | FAILED: ${totalFailed}`);
  console.log("============================================================\n");

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runSecuritySuite().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
