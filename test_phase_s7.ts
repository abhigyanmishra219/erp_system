import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

// Load .env.local
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
    cookie: `erp_auth_token=${token}`,
    "content-type": "application/json",
  };
  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function generateStudentToken(userId: string, schoolId: string, email: string) {
  return jwt.sign(
    {
      userId: userId.toString(),
      role: "STUDENT",
      schoolId: schoolId.toString(),
      email,
    },
    process.env.JWT_SECRET || "your-secret-key"
  );
}

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
    failedTests++;
  }
}

async function runS7TestSuite() {
  console.log("============================================================");
  console.log("🧪 STARTING S7: STUDENT FEE VIEW TEST SUITE");
  console.log("============================================================\n");

  const connectToDatabase = (await import("./src/lib/db")).default;
  const School = (await import("./src/models/School")).default;
  const User = (await import("./src/models/User")).default;
  const Student = (await import("./src/models/Student")).default;
  const Class = (await import("./src/models/Class")).default;
  const Section = (await import("./src/models/Section")).default;
  const AcademicYear = (await import("./src/models/AcademicYear")).default;
  const StudentFeeAccount = (await import("./src/models/StudentFeeAccount")).default;
  const FeePayment = (await import("./src/models/FeePayment")).default;
  const StudentFeeAssignment = (await import("./src/models/StudentFeeAssignment")).default;
  const FeeStructure = (await import("./src/models/FeeStructure")).default;
  const FeeCategory = (await import("./src/models/FeeCategory")).default;

  const {
    GET: getFees,
    POST: postFees,
    PUT: putFees,
    PATCH: patchFees,
    DELETE: deleteFees,
  } = await import("./src/app/api/student/fees/route");

  const {
    GET: getReceipt,
    POST: postReceipt,
    PUT: putReceipt,
    PATCH: patchReceipt,
    DELETE: deleteReceipt,
  } = await import("./src/app/api/student/fees/receipts/[paymentId]/route");

  await connectToDatabase();

  const testSuffix = `s7_${Date.now()}`;

  // 1. Create School with FEES module enabled
  const school = await School.create({
    name: `S7 Academy ${testSuffix}`,
    code: `S7_${Date.now().toString().slice(-6)}`,
    status: "ACTIVE",
    plan: "STANDARD",
    studentLimit: 100,
    subscriptionStartDate: new Date(),
    subscriptionExpiryDate: new Date(Date.now() + 365 * 86400000),
    enabledModules: ["ATTENDANCE", "EXAMS", "RESULTS", "FEES"],
    feeSettings: {
      categories: ["Tuition Fee", "Examination Fee"],
      paymentFrequencies: ["MONTHLY", "QUARTERLY", "ANNUALLY"],
      lateFeeGraceDays: 7,
      lateFeeFineAmount: 100,
      lateFeeType: "FIXED",
    },
    createdBy: new mongoose.Types.ObjectId(),
    updatedBy: new mongoose.Types.ObjectId(),
  });

  // 2. Create Academic Year
  const academicYear: any = await (AcademicYear as any).create({
    schoolId: school._id,
    name: `2026-2027 ${testSuffix}`,
    startDate: new Date("2026-04-01"),
    endDate: new Date("2027-03-31"),
    status: "ACTIVE",
    createdBy: new mongoose.Types.ObjectId(),
    updatedBy: new mongoose.Types.ObjectId(),
  });

  // 3. Create Class & Section
  const classDoc = await Class.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    name: `Class 10 ${testSuffix}`,
    code: `C10_${Date.now().toString().slice(-4)}`,
    createdBy: new mongoose.Types.ObjectId(),
    updatedBy: new mongoose.Types.ObjectId(),
  });

  const sectionDoc = await Section.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    classId: classDoc._id,
    name: "A",
    capacity: 40,
    createdBy: new mongoose.Types.ObjectId(),
    updatedBy: new mongoose.Types.ObjectId(),
  });

  // 4. Create Students A and B
  const userA = await User.create({
    email: `student_a_${testSuffix}@example.com`,
    password: "$2b$10$abcdefghijklmnopqrstuv",
    name: "Arya Stark",
    role: "STUDENT",
    schoolId: school._id,
    isActive: true,
  });

  const studentA = await Student.create({
    schoolId: school._id,
    admissionNumber: `ADM-A-${Date.now().toString().slice(-4)}`,
    firstName: "Arya",
    lastName: "Stark",
    email: userA.email,
    gender: "FEMALE",
    dateOfBirth: new Date("2010-05-15"),
    academicYearId: academicYear._id,
    classId: classDoc._id,
    sectionId: sectionDoc._id,
    admissionDate: new Date("2026-04-01"),
    status: "ACTIVE",
    userId: userA._id,
    createdBy: userA._id,
    updatedBy: userA._id,
  });

  const userB = await User.create({
    email: `student_b_${testSuffix}@example.com`,
    password: "$2b$10$abcdefghijklmnopqrstuv",
    name: "Jon Snow",
    role: "STUDENT",
    schoolId: school._id,
    isActive: true,
  });

  const studentB = await Student.create({
    schoolId: school._id,
    admissionNumber: `ADM-B-${Date.now().toString().slice(-4)}`,
    firstName: "Jon",
    lastName: "Snow",
    email: userB.email,
    gender: "MALE",
    dateOfBirth: new Date("2009-08-20"),
    academicYearId: academicYear._id,
    classId: classDoc._id,
    sectionId: sectionDoc._id,
    admissionDate: new Date("2026-04-01"),
    status: "ACTIVE",
    userId: userB._id,
    createdBy: userB._id,
    updatedBy: userB._id,
  });

  // 5. Create Fee Category & Fee Structure for Student A
  const feeCategory = await FeeCategory.create({
    schoolId: school._id,
    name: `Tuition Category ${testSuffix}`,
    code: `TUIT_${Date.now().toString().slice(-4)}`,
    createdBy: userA._id,
    updatedBy: userA._id,
  });

  const feeStructure = await FeeStructure.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    feeCategoryId: feeCategory._id,
    classId: classDoc._id,
    name: "Grade 10 Annual Composite Fee",
    amount: 50000,
    frequency: "ANNUAL",
    installments: [
      {
        name: "Term 1 Installment",
        amount: 25000,
        dueDate: new Date("2026-05-01"),
        sequence: 1,
      },
      {
        name: "Term 2 Installment",
        amount: 25000,
        dueDate: new Date("2026-10-01"),
        sequence: 2,
      },
    ],
    isActive: true,
    createdBy: userA._id,
    updatedBy: userA._id,
  });

  // Assign Fee Structure to Student A: Base 50,000 with 5,000 discount => Net 45,000
  const feeAssignmentA = await StudentFeeAssignment.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    studentId: studentA._id,
    feeStructureId: feeStructure._id,
    baseAmount: 50000,
    discountType: "FIXED",
    discountValue: 5000,
    discountAmount: 5000,
    concessionType: "NONE",
    concessionValue: 0,
    concessionAmount: 0,
    netAmount: 45000,
    dueSchedule: [
      {
        name: "Term 1 Installment",
        amount: 22500,
        dueDate: new Date("2027-05-01"),
        sequence: 1,
        paidAmount: 20000,
        status: "PARTIALLY_PAID",
      },
      {
        name: "Term 2 Installment",
        amount: 22500,
        dueDate: new Date("2027-10-01"),
        sequence: 2,
        paidAmount: 0,
        status: "UNPAID",
      },
    ],
    status: "ACTIVE",
    createdBy: userA._id,
    updatedBy: userA._id,
  });

  // Create Fee Account for Student A
  const feeAccountA = await StudentFeeAccount.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    studentId: studentA._id,
    totalFee: 50000,
    discountAmount: 5000,
    concessionAmount: 0,
    netFee: 45000,
    paidAmount: 20000,
    pendingAmount: 25000,
    lateFeeAmount: 0,
    nextDueAmount: 2500,
    nextDueDate: new Date("2027-05-01"),
    status: "PARTIALLY_PAID",
  });

  // Create Fee Payment for Student A: 20,000 via UPI
  const paymentA = await FeePayment.create({
    schoolId: school._id,
    academicYearId: academicYear._id,
    studentId: studentA._id,
    feeAccountId: feeAccountA._id,
    amount: 20000,
    paymentDate: new Date("2026-04-15"),
    paymentMethod: "UPI",
    transactionId: `UPI_TXN_${Date.now()}`,
    receiptNumber: `REC-S7-${Date.now().toString().slice(-6)}`,
    remarks: "Term 1 Partial Deposit",
    status: "ACTIVE",
    recordedBy: userA._id,
  });

  const tokenA = generateStudentToken(userA._id.toString(), school._id.toString(), userA.email);
  const tokenB = generateStudentToken(userB._id.toString(), school._id.toString(), userB.email);

  // ============================================================
  // 1. Fee Overview & Summary Verification
  // ============================================================
  console.log("--- 1. Testing Student Fee Overview (/api/student/fees) ---");
  const reqA = makeRequest("http://localhost:3000/api/student/fees", tokenA);
  const resA = await getFees(reqA);
  assert(resA.status === 200, "Student A fees API returns HTTP 200");

  const jsonA = await resA.json();
  assert(jsonA.success === true, "Response success is true");
  assert(jsonA.isEnabled === true, "Fee module is enabled");
  assert(jsonA.data.summary.totalFee === 50000, "Total fee matches 50,000");
  assert(jsonA.data.summary.discountAmount === 5000, "Discount matches 5,000");
  assert(jsonA.data.summary.netFee === 45000, "Net fee matches 45,000");
  assert(jsonA.data.summary.paidAmount === 20000, "Paid fee matches 20,000");
  assert(jsonA.data.summary.pendingAmount === 25000, "Pending fee matches 25,000");
  assert(jsonA.data.summary.status === "PARTIALLY_PAID", "Account status is PARTIALLY_PAID");

  // ============================================================
  // 2. Payment History Verification
  // ============================================================
  console.log("\n--- 2. Testing Payment History (/api/student/fees) ---");
  assert(jsonA.data.payments.length === 1, "Student A has 1 payment record");
  const paymentRecord = jsonA.data.payments[0];
  assert(paymentRecord.receiptNumber === paymentA.receiptNumber, "Receipt number matches");
  assert(paymentRecord.amount === 20000, "Payment amount is 20,000");
  assert(paymentRecord.paymentMethod === "UPI", "Payment method is UPI");
  assert(paymentRecord.transactionId === paymentA.transactionId, "Transaction ID is present");
  assert(paymentRecord.status === "ACTIVE", "Payment status is ACTIVE");

  // ============================================================
  // 3. Fee Structure Breakdown & Installments
  // ============================================================
  console.log("\n--- 3. Testing Fee Structures Breakdown (/api/student/fees) ---");
  assert(jsonA.data.assignments.length === 1, "1 assigned fee structure returned");
  const assignmentRecord = jsonA.data.assignments[0];
  assert(assignmentRecord.feeStructureName === "Grade 10 Annual Composite Fee", "Fee structure name matches");
  assert(assignmentRecord.netAmount === 45000, "Net structure amount matches 45,000");
  assert(assignmentRecord.dueSchedule.length === 2, "2 installments in schedule");
  assert(assignmentRecord.dueSchedule[0].paidAmount === 20000, "Installment 1 paid amount is 20,000");
  assert(assignmentRecord.dueSchedule[0].status === "PARTIALLY_PAID", "Installment 1 is PARTIALLY_PAID");
  assert(assignmentRecord.dueSchedule[1].status === "UNPAID", "Installment 2 is UNPAID");

  // ============================================================
  // 4. Feature Flag: Disabled State
  // ============================================================
  console.log("\n--- 4. Testing Feature Flag (Disabled Fee Module) ---");
  // Temporarily disable FEES module for school
  await School.findByIdAndUpdate(school._id, {
    enabledModules: ["ATTENDANCE", "EXAMS", "RESULTS"], // removed FEES
  });

  const reqDisabled = makeRequest("http://localhost:3000/api/student/fees", tokenA);
  const resDisabled = await getFees(reqDisabled);
  assert(resDisabled.status === 200, "Disabled fees returns HTTP 200");
  const jsonDisabled = await resDisabled.json();
  assert(jsonDisabled.success === true, "Response success is true");
  assert(jsonDisabled.isEnabled === false, "isEnabled flag is false");
  assert(jsonDisabled.data === null, "Fee data is null when module disabled (no data leak)");

  // Re-enable FEES module
  await School.findByIdAndUpdate(school._id, {
    enabledModules: ["ATTENDANCE", "EXAMS", "RESULTS", "FEES"],
  });

  // ============================================================
  // 5. Security & Isolation: Student Identity Scoping
  // ============================================================
  console.log("\n--- 5. Testing Security: Identity Resolution & Query Tampering Prevention ---");
  // Student A tries to inject ?studentId=studentB
  const reqTamper = makeRequest(
    `http://localhost:3000/api/student/fees?studentId=${studentB._id.toString()}`,
    tokenA
  );
  const resTamper = await getFees(reqTamper);
  const jsonTamper = await resTamper.json();
  assert(jsonTamper.data.summary.totalFee === 50000, "Student A query param ignored, returns Student A's own 50,000 fee");
  assert(jsonTamper.data.payments.length === 1, "Returns Student A payments, NOT Student B");

  // Student B check (no fees assigned)
  const reqB = makeRequest("http://localhost:3000/api/student/fees", tokenB);
  const resB = await getFees(reqB);
  const jsonB = await resB.json();
  assert(jsonB.data.summary.totalFee === 0, "Student B has 0 assigned fee");
  assert(jsonB.data.payments.length === 0, "Student B has 0 payments");

  // ============================================================
  // 6. Single Payment Receipt Details (/api/student/fees/receipts/[paymentId])
  // ============================================================
  console.log("\n--- 6. Testing Payment Receipt Details (/api/student/fees/receipts/[paymentId]) ---");
  const reqReceiptA = makeRequest(
    `http://localhost:3000/api/student/fees/receipts/${paymentA._id.toString()}`,
    tokenA
  );
  const resReceiptA = await getReceipt(reqReceiptA, {
    params: Promise.resolve({ paymentId: paymentA._id.toString() }),
  });
  assert(resReceiptA.status === 200, "Student A can view own receipt (HTTP 200)");
  const jsonReceiptA = await resReceiptA.json();
  assert(jsonReceiptA.data.receipt.receiptNumber === paymentA.receiptNumber, "Receipt number matches");
  assert(jsonReceiptA.data.receipt.amount === 20000, "Receipt amount matches 20,000");
  assert(jsonReceiptA.data.receipt.amountInWords.includes("Twenty Thousand"), "Amount in words includes Twenty Thousand");
  assert(jsonReceiptA.data.student.name === "Arya Stark", "Student name matches Arya Stark");
  assert(jsonReceiptA.data.school.name === school.name, "School name matches");

  // Student B tries to access Student A's receipt -> 404
  const reqReceiptB = makeRequest(
    `http://localhost:3000/api/student/fees/receipts/${paymentA._id.toString()}`,
    tokenB
  );
  const resReceiptB = await getReceipt(reqReceiptB, {
    params: Promise.resolve({ paymentId: paymentA._id.toString() }),
  });
  assert(resReceiptB.status === 404, "Student B cannot view Student A's receipt (HTTP 404)");

  // ============================================================
  // 7. Read-Only Immutability: HTTP 405 on Mutations
  // ============================================================
  console.log("\n--- 7. Testing Read-Only Security Enforcement (HTTP 405 on mutations) ---");
  const dummyParams = { params: Promise.resolve({ paymentId: paymentA._id.toString() }) };

  assert((await postFees()).status === 405, "POST /api/student/fees rejected with 405");
  assert((await putFees()).status === 405, "PUT /api/student/fees rejected with 405");
  assert((await patchFees()).status === 405, "PATCH /api/student/fees rejected with 405");
  assert((await deleteFees()).status === 405, "DELETE /api/student/fees rejected with 405");

  assert((await postReceipt()).status === 405, "POST /api/student/fees/receipts/[id] rejected with 405");
  assert((await putReceipt()).status === 405, "PUT /api/student/fees/receipts/[id] rejected with 405");
  assert((await patchReceipt()).status === 405, "PATCH /api/student/fees/receipts/[id] rejected with 405");
  assert((await deleteReceipt()).status === 405, "DELETE /api/student/fees/receipts/[id] rejected with 405");

  // ============================================================
  // CLEANUP
  // ============================================================
  await Promise.all([
    School.findByIdAndDelete(school._id),
    AcademicYear.findByIdAndDelete(academicYear._id),
    Class.findByIdAndDelete(classDoc._id),
    Section.findByIdAndDelete(sectionDoc._id),
    User.findByIdAndDelete(userA._id),
    User.findByIdAndDelete(userB._id),
    Student.findByIdAndDelete(studentA._id),
    Student.findByIdAndDelete(studentB._id),
    FeeCategory.findByIdAndDelete(feeCategory._id),
    FeeStructure.findByIdAndDelete(feeStructure._id),
    StudentFeeAssignment.findByIdAndDelete(feeAssignmentA._id),
    StudentFeeAccount.findByIdAndDelete(feeAccountA._id),
    FeePayment.findByIdAndDelete(paymentA._id),
  ]);

  console.log("\n============================================================");
  console.log(`📊 S7 TEST SUITE COMPLETE: ${passedTests} Passed, ${failedTests} Failed`);
  console.log("============================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runS7TestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
