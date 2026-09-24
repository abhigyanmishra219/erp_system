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

import {
  ERP_MODULES,
  SchoolModule,
  getEffectiveSubscriptionStatus,
  isSubscriptionActive,
  hasModuleAccess,
  requireModule,
  evaluateCapacity,
} from "./src/lib/subscription-guard";

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, failureDetails?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ PASS: ${testName}`);
  } else {
    failedTests++;
    console.error(`  ✗ FAIL: ${testName}`);
    if (failureDetails) {
      console.error(`    Details: ${failureDetails}`);
    }
  }
}

function runTestSuite() {
  console.log("============================================================");
  console.log("SUBSCRIPTION PLAN ENFORCEMENT & MODULE ACCESS TEST SUITE");
  console.log("============================================================\n");

  // ------------------------------------------------------------
  // SECTION 1: Module Registry & Data-Driven Centralization
  // ------------------------------------------------------------
  console.log("--- Section 1: Module Registry & Registry Integrity ---");
  const expectedModules: SchoolModule[] = [
    "ATTENDANCE",
    "ASSIGNMENTS",
    "STUDY_MATERIAL",
    "EXAMS",
    "RESULTS",
    "FEES",
    "NOTICES",
    "NOTIFICATIONS",
    "TIMETABLE",
    "LEAVE",
    "REPORTS",
  ];

  assert(
    expectedModules.every((m) => !!ERP_MODULES[m]),
    "All 11 ERP module identifiers exist in central ERP_MODULES registry"
  );

  assert(
    ERP_MODULES.ATTENDANCE.label === "Attendance" &&
      ERP_MODULES.FEES.label === "Fee Management" &&
      ERP_MODULES.REPORTS.label === "Reports & Analytics",
    "Central registry contains appropriate human-readable labels and paths"
  );

  // ------------------------------------------------------------
  // SECTION 2: Dynamic Plan Gating (No Hardcoded Plan Names)
  // ------------------------------------------------------------
  console.log("\n--- Section 2: Dynamic Plan Gating (Data-Driven Entitlements) ---");
  const customPlanSchool = {
    plan: "CUSTOM_TIER_ALPHA", // Arbitrary custom plan name
    subscriptionStatus: "ACTIVE",
    subscriptionExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    enabledModules: ["ATTENDANCE", "FEES", "TIMETABLE"] as SchoolModule[],
    studentLimit: 500,
  };

  assert(
    hasModuleAccess(customPlanSchool, "ATTENDANCE") === true,
    "hasModuleAccess returns true for module included in custom plan"
  );
  assert(
    hasModuleAccess(customPlanSchool, "FEES") === true,
    "hasModuleAccess returns true for FEES in custom plan"
  );
  assert(
    hasModuleAccess(customPlanSchool, "STUDY_MATERIAL") === false,
    "hasModuleAccess returns false for STUDY_MATERIAL not included in custom plan"
  );
  assert(
    hasModuleAccess(customPlanSchool, "EXAMS") === false,
    "hasModuleAccess returns false for EXAMS not included in custom plan"
  );
  assert(
    hasModuleAccess(customPlanSchool, "UNKNOWN_MOD" as any) === false,
    "hasModuleAccess returns false for unknown / unregistered module identifier"
  );

  // ------------------------------------------------------------
  // SECTION 3: Server-Side requireModule HTTP 403 Enforcement
  // ------------------------------------------------------------
  console.log("\n--- Section 3: Server-Side requireModule Enforcement ---");

  // 3a. Enabled Module
  const allowedCheck = requireModule(customPlanSchool, "ATTENDANCE");
  assert(
    allowedCheck.allowed === true && allowedCheck.response === undefined,
    "requireModule allows access to enabled module"
  );

  // 3b. Disabled Module (Returns HTTP 403 MODULE_NOT_INCLUDED)
  const lockedCheck = requireModule(customPlanSchool, "EXAMS");
  assert(
    lockedCheck.allowed === false && lockedCheck.response !== undefined,
    "requireModule rejects disabled module"
  );
  if (lockedCheck.response) {
    assert(
      lockedCheck.response.status === 403,
      "Disabled module returns HTTP 403 Forbidden"
    );
  }

  // ------------------------------------------------------------
  // SECTION 4: Subscription Status Lifecycle (ACTIVE, EXPIRED, SUSPENDED, CANCELLED)
  // ------------------------------------------------------------
  console.log("\n--- Section 4: Subscription Status & Expiration Lifecycles ---");

  // 4a. Active Valid Subscription
  const activeSchool = {
    plan: "STANDARD",
    subscriptionStatus: "ACTIVE",
    subscriptionExpiryDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    enabledModules: ["ATTENDANCE"] as SchoolModule[],
    studentLimit: 300,
  };
  assert(isSubscriptionActive(activeSchool) === true, "ACTIVE unexpired subscription is recognized as active");

  // 4b. Expired by Date
  const expiredByDateSchool = {
    plan: "STANDARD",
    subscriptionStatus: "ACTIVE",
    subscriptionExpiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    enabledModules: ["ATTENDANCE"] as SchoolModule[],
    studentLimit: 300,
  };
  assert(
    isSubscriptionActive(expiredByDateSchool) === false,
    "Subscription with past expiryDate is evaluated as inactive regardless of stored ACTIVE status"
  );
  assert(
    getEffectiveSubscriptionStatus(expiredByDateSchool) === "EXPIRED",
    "getEffectiveSubscriptionStatus dynamically calculates EXPIRED when expiryDate is in the past"
  );
  const expiredCheck = requireModule(expiredByDateSchool, "ATTENDANCE");
  assert(
    expiredCheck.allowed === false && expiredCheck.response?.status === 403,
    "Expired subscription module request returns HTTP 403 SUBSCRIPTION_EXPIRED"
  );

  // 4c. Suspended Subscription
  const suspendedSchool = {
    plan: "PROFESSIONAL",
    subscriptionStatus: "SUSPENDED",
    subscriptionExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    enabledModules: ["ATTENDANCE", "FEES", "EXAMS"] as SchoolModule[],
    studentLimit: 1000,
  };
  assert(isSubscriptionActive(suspendedSchool) === false, "SUSPENDED subscription is recognized as inactive");
  const suspendedCheck = requireModule(suspendedSchool, "ATTENDANCE");
  assert(
    suspendedCheck.allowed === false && suspendedCheck.response?.status === 403,
    "Suspended subscription module request returns HTTP 403 SUBSCRIPTION_SUSPENDED"
  );

  // 4d. Cancelled Subscription
  const cancelledSchool = {
    plan: "BASIC",
    subscriptionStatus: "CANCELLED",
    subscriptionExpiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    enabledModules: ["ATTENDANCE"] as SchoolModule[],
    studentLimit: 200,
  };
  assert(isSubscriptionActive(cancelledSchool) === false, "CANCELLED subscription is recognized as inactive");
  const cancelledCheck = requireModule(cancelledSchool, "ATTENDANCE");
  assert(
    cancelledCheck.allowed === false && cancelledCheck.response?.status === 403,
    "Cancelled subscription module request returns HTTP 403 SUBSCRIPTION_CANCELLED"
  );

  // ------------------------------------------------------------
  // SECTION 5: Student Capacity Enforcement
  // ------------------------------------------------------------
  console.log("\n--- Section 5: Student Capacity Limit Enforcement ---");

  const planLimit = 400;

  // 5a. 0 / 400 allows creation of 1 student
  const capTest0 = evaluateCapacity(planLimit, 0, 1);
  assert(
    capTest0.allowed === true,
    "0 / 400 allows student creation (availableSlots = 400)"
  );
  assert(capTest0.remaining === 400, "Calculates remaining = 400 accurately");

  // 5b. 399 / 400 allows creation of 1 student
  const capTest399 = evaluateCapacity(planLimit, 399, 1);
  assert(
    capTest399.allowed === true && capTest399.remaining === 1,
    "399 / 400 allows 1 student creation (availableSlots = 1)"
  );

  // 5c. 400 / 400 rejects creation of 1 student
  const capTest400 = evaluateCapacity(planLimit, 400, 1);
  assert(
    capTest400.allowed === false && capTest400.remaining === 0,
    "400 / 400 strictly rejects student creation"
  );

  // 5d. Excel Import Capacity Check: 395 active students + 10 imported students
  const capImportOverLimit = evaluateCapacity(planLimit, 395, 10);
  assert(
    capImportOverLimit.allowed === false,
    "Excel import of 10 students with only 5 available slots is rejected"
  );
  assert(
    capImportOverLimit.remaining === 5,
    "Excel import validation accurately identifies exactly 5 available slots"
  );

  // 5e. Excel Import Capacity Check: 390 active students + 10 imported students
  const capImportFits = evaluateCapacity(planLimit, 390, 10);
  assert(
    capImportFits.allowed === true && capImportFits.remaining === 10,
    "Excel import of 10 students with 10 available slots is accepted"
  );

  // ------------------------------------------------------------
  // SECTION 6: Plan Downgrades & Non-Deletion Rule
  // ------------------------------------------------------------
  console.log("\n--- Section 6: Plan Downgrade Data Retention & Admissions Lock ---");
  const downgradedLimit = 400;
  const existingActiveCount = 500; // School already has 500 active students

  const downgradeCapCheck = evaluateCapacity(downgradedLimit, existingActiveCount, 1);
  assert(
    downgradeCapCheck.allowed === false,
    "Downgraded plan (500 active / 400 limit) blocks new admissions safely without deleting existing 500 students"
  );
  assert(
    downgradeCapCheck.remaining === 0,
    "Available capacity is clamped to 0 when active count exceeds limit"
  );

  // ------------------------------------------------------------
  // SECTION 7: Multi-Tenant Subscription Isolation
  // ------------------------------------------------------------
  console.log("\n--- Section 7: Multi-Tenant Subscription Isolation ---");
  const schoolA = {
    plan: "ENTERPRISE",
    subscriptionStatus: "ACTIVE",
    subscriptionExpiryDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
    enabledModules: ["ATTENDANCE", "ASSIGNMENTS", "STUDY_MATERIAL", "EXAMS", "FEES"] as SchoolModule[],
    studentLimit: 2000,
  };

  const schoolB = {
    plan: "STARTER",
    subscriptionStatus: "ACTIVE",
    subscriptionExpiryDate: new Date(Date.now() + 100 * 24 * 60 * 60 * 1000),
    enabledModules: ["ATTENDANCE"] as SchoolModule[],
    studentLimit: 200,
  };

  assert(
    hasModuleAccess(schoolA, "FEES") === true && hasModuleAccess(schoolB, "FEES") === false,
    "Tenant A enabled module (FEES) is not accessible to Tenant B"
  );
  assert(
    hasModuleAccess(schoolA, "STUDY_MATERIAL") === true &&
      hasModuleAccess(schoolB, "STUDY_MATERIAL") === false,
    "Tenant A module (STUDY_MATERIAL) is isolated and locked for Tenant B"
  );

  // ------------------------------------------------------------
  // Final Results
  // ------------------------------------------------------------
  console.log("\n============================================================");
  console.log(`TEST SUMMARY: Total: ${totalTests} | Passed: ${passedTests} | Failed: ${failedTests}`);
  console.log("============================================================");

  if (failedTests > 0) {
    process.exit(1);
  } else {
    console.log("All subscription plan enforcement and access control tests PASSED successfully!\n");
  }
}

runTestSuite();
