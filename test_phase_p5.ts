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

async function runTests() {
  console.log("============================================================");
  console.log("STARTING P5: PARENT FEE MANAGEMENT TEST SUITE");
  console.log("============================================================");

  const mongoose: any = (await import("mongoose")).default;
  const connectToDatabase: any = (await import("./src/lib/db")).default;
  const User: any = (await import("./src/models/User")).default;
  const Parent: any = (await import("./src/models/Parent")).default;
  const Student: any = (await import("./src/models/Student")).default;
  const StudentParent: any = (await import("./src/models/StudentParent")).default;
  const School: any = (await import("./src/models/School")).default;
  const AcademicYear: any = (await import("./src/models/AcademicYear")).default;
  const Class: any = (await import("./src/models/Class")).default;
  const Section: any = (await import("./src/models/Section")).default;
  const StudentFeeAccount: any = (await import("./src/models/StudentFeeAccount")).default;
  const FeePayment: any = (await import("./src/models/FeePayment")).default;
  const StudentFeeAssignment: any = (await import("./src/models/StudentFeeAssignment")).default;
  const FeeStructure: any = (await import("./src/models/FeeStructure")).default;

  const { GET: getFees, POST: postFees, PUT: putFees, PATCH: patchFees, DELETE: deleteFees } = await import("./src/app/api/parent/fees/route");
  const { GET: getReceipt, POST: postReceipt, PUT: putReceipt, PATCH: patchReceipt, DELETE: deleteReceipt } = await import("./src/app/api/parent/fees/receipts/[paymentId]/route");

  await connectToDatabase();

  const secret = process.env.JWT_SECRET || "your-secret-key";
  const cleanSuffix = `p5_${Date.now().toString().slice(-6)}`;
  const adminId = new mongoose.Types.ObjectId();

  // 1. Setup Test School WITH FEES enabled
  const schoolA = await School.create({
    name: `P5 School A ${cleanSuffix}`,
    code: `SCH_P5_${cleanSuffix}`,
    status: "ACTIVE",
    enabledModules: ["FEES"],
    address: "500 Financial Boulevard",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    phone: "9876543210",
    email: `p5_school_${cleanSuffix}@example.com`,
    plan: "STANDARD",
    studentLimit: 500,
    subscriptionStartDate: new Date(),
    subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
    subscriptionStatus: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Setup School B with FEES disabled for feature flag test
  const schoolDisabled = await School.create({
    name: `P5 School Disabled ${cleanSuffix}`,
    code: `SCH_DIS_${cleanSuffix}`,
    status: "ACTIVE",
    enabledModules: [], // Fees disabled
    address: "No Fees St",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    phone: "9876543210",
    email: `p5_disabled_${cleanSuffix}@example.com`,
    plan: "STANDARD",
    studentLimit: 500,
    subscriptionStartDate: new Date(),
    subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
    subscriptionStatus: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

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

  // 2. Setup Parent User & Parent Record
  const parentUser = await User.create({
    email: `parent_p5_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "PARENT",
    schoolId: schoolA._id,
    isActive: true,
    name: "Ramesh Sharma",
  });

  const parentDoc = await Parent.create({
    schoolId: schoolA._id,
    userId: parentUser._id,
    firstName: "Ramesh",
    lastName: "Sharma",
    email: parentUser.email,
    phone: "9876543210",
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 3. Setup Children: Student 1 (Aditi) & Student 2 (Aman) linked to Parent
  const studentUser1 = await User.create({
    email: `aditi_${cleanSuffix}@example.com`,
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
    firstName: "Aditi",
    lastName: "Sharma",
    classId: class10._id,
    sectionId: section10A._id,
    academicYearId: ayA._id,
    status: "ACTIVE",
    gender: "FEMALE",
    dateOfBirth: new Date("2010-05-15"),
    admissionDate: new Date("2024-04-01"),
    createdBy: adminId,
    updatedBy: adminId,
  });

  const studentUser2 = await User.create({
    email: `aman_${cleanSuffix}@example.com`,
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
    rollNumber: "102",
    firstName: "Aman",
    lastName: "Sharma",
    classId: class10._id,
    sectionId: section10A._id,
    academicYearId: ayA._id,
    status: "ACTIVE",
    gender: "MALE",
    dateOfBirth: new Date("2012-08-20"),
    admissionDate: new Date("2024-04-01"),
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 4. Setup Unlinked Child: Student 3 (Stranger)
  const studentUser3 = await User.create({
    email: `stranger_p5_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "STUDENT",
    schoolId: schoolA._id,
    isActive: true,
  });

  const studentUnlinked = await Student.create({
    schoolId: schoolA._id,
    userId: studentUser3._id,
    studentId: `STU3_${cleanSuffix}`,
    admissionNumber: `ADM3_${cleanSuffix}`,
    rollNumber: "103",
    firstName: "Stranger",
    lastName: "Child",
    classId: class10._id,
    sectionId: section10A._id,
    academicYearId: ayA._id,
    status: "ACTIVE",
    gender: "MALE",
    dateOfBirth: new Date("2011-01-01"),
    admissionDate: new Date("2024-04-01"),
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Link Student 1 and Student 2 to Parent
  await StudentParent.create([
    {
      schoolId: schoolA._id,
      parentId: parentDoc._id,
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
      parentId: parentDoc._id,
      studentId: student2._id,
      relationship: "FATHER",
      isPrimaryGuardian: true,
      isEmergencyContact: true,
      canPickup: true,
      createdBy: adminId,
      updatedBy: adminId,
    },
  ]);

  // 5. Setup Fee Structure and Assignments
  const feeStructure = await FeeStructure.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    feeCategoryId: new mongoose.Types.ObjectId(),
    name: "Standard Academic Annual Fee",
    classId: class10._id,
    amount: 50000,
    frequency: "ANNUAL",
    installments: [
      { name: "Term 1", amount: 25000, dueDate: new Date("2026-05-15"), sequence: 1 },
      { name: "Term 2", amount: 25000, dueDate: new Date("2026-11-15"), sequence: 2 },
    ],
    isActive: true,
    createdBy: adminId,
    updatedBy: adminId,
  });

  const assignment1 = await StudentFeeAssignment.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    studentId: student1._id,
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
      { name: "Term 1", amount: 22500, dueDate: new Date("2026-05-15"), sequence: 1, paidAmount: 22500, status: "PAID" },
      { name: "Term 2", amount: 22500, dueDate: new Date("2026-11-15"), sequence: 2, paidAmount: 2500, status: "PARTIALLY_PAID" },
    ],
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const assignment2 = await StudentFeeAssignment.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    studentId: student2._id,
    feeStructureId: feeStructure._id,
    baseAmount: 40000,
    discountType: "NONE",
    discountValue: 0,
    discountAmount: 0,
    concessionType: "NONE",
    concessionValue: 0,
    concessionAmount: 0,
    netAmount: 40000,
    dueSchedule: [
      { name: "Full Term", amount: 40000, dueDate: new Date("2026-05-15"), sequence: 1, paidAmount: 40000, status: "PAID" },
    ],
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const feeAccount1 = await StudentFeeAccount.create({
    schoolId: schoolA._id,
    studentId: student1._id,
    academicYearId: ayA._id,
    totalFee: 50000,
    discountAmount: 5000,
    concessionAmount: 0,
    netFee: 45000,
    paidAmount: 25000,
    pendingAmount: 20000,
    lateFeeAmount: 0,
    nextDueAmount: 20000,
    nextDueDate: new Date("2026-11-15"),
    status: "PARTIALLY_PAID",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const feeAccount2 = await StudentFeeAccount.create({
    schoolId: schoolA._id,
    studentId: student2._id,
    academicYearId: ayA._id,
    totalFee: 40000,
    discountAmount: 0,
    concessionAmount: 0,
    netFee: 40000,
    paidAmount: 40000,
    pendingAmount: 0,
    lateFeeAmount: 0,
    nextDueAmount: 0,
    nextDueDate: null,
    status: "PAID",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const feeAccountUnlinked = await StudentFeeAccount.create({
    schoolId: schoolA._id,
    studentId: studentUnlinked._id,
    academicYearId: ayA._id,
    totalFee: 60000,
    netFee: 60000,
    paidAmount: 0,
    pendingAmount: 60000,
    status: "PENDING",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Fee Payments
  const payment1 = await FeePayment.create({
    schoolId: schoolA._id,
    studentId: student1._id,
    feeAccountId: feeAccount1._id,
    academicYearId: ayA._id,
    receiptNumber: `RCPT1_${cleanSuffix}`,
    amount: 25000,
    paymentDate: new Date("2026-05-10"),
    paymentMethod: "BANK_TRANSFER",
    transactionId: "TXN_P5_123456",
    status: "ACTIVE",
    remarks: "First Term Installment",
    recordedBy: adminId,
    createdBy: adminId,
    updatedBy: adminId,
  });

  const payment2 = await FeePayment.create({
    schoolId: schoolA._id,
    studentId: student2._id,
    feeAccountId: feeAccount2._id,
    academicYearId: ayA._id,
    receiptNumber: `RCPT2_${cleanSuffix}`,
    amount: 40000,
    paymentDate: new Date("2026-05-12"),
    paymentMethod: "CHEQUE",
    transactionId: "CHQ_998877",
    status: "ACTIVE",
    remarks: "Full Year Fee Payment",
    recordedBy: adminId,
    createdBy: adminId,
    updatedBy: adminId,
  });

  const paymentUnlinked = await FeePayment.create({
    schoolId: schoolA._id,
    studentId: studentUnlinked._id,
    feeAccountId: feeAccountUnlinked._id,
    academicYearId: ayA._id,
    receiptNumber: `RCPT3_${cleanSuffix}`,
    amount: 15000,
    paymentDate: new Date("2026-05-15"),
    paymentMethod: "CASH",
    status: "ACTIVE",
    recordedBy: adminId,
    createdBy: adminId,
    updatedBy: adminId,
  });

  const parentToken = jwt.sign(
    {
      userId: parentUser._id.toString(),
      role: "PARENT",
      schoolId: schoolA._id.toString(),
      email: parentUser.email,
    },
    secret
  );

  function createParentReq(url: string) {
    return new NextRequest(new URL(url, "http://localhost:3000"), {
      headers: {
        authorization: `Bearer ${parentToken}`,
        cookie: `erp_auth_token=${parentToken}; token=${parentToken}`,
      },
    });
  }

  let testsPassed = 0;
  let testsTotal = 0;

  function assert(condition: boolean, testName: string) {
    testsTotal++;
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      testsPassed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // TEST 1: Default linked Child (Student 1 - Aditi) Fee Scoping
  console.log("\n--- TEST GROUP 1: Default Child Fee Scoping ---");
  {
    const req = createParentReq("http://localhost:3000/api/parent/fees");
    const res = await getFees(req);
    assert(res.status === 200, "GET /api/parent/fees returns 200 OK");
    const json = await res.json();
    assert(json.success === true, "Response reports success = true");
    assert(json.isEnabled === true, "Fee module is enabled for school");
    assert(json.data.student._id === student1._id.toString(), "Defaults to linked Student 1 (Aditi)");
    assert(json.data.summary.totalFee === 50000, "Student 1 total fee matches 50,000");
    assert(json.data.summary.netFee === 45000, "Student 1 net fee matches 45,000");
    assert(json.data.summary.paidAmount === 25000, "Student 1 paid amount matches 25,000");
    assert(json.data.summary.pendingAmount === 20000, "Student 1 pending amount matches 20,000");
    assert(json.data.payments.length === 1, "Exactly 1 payment found for Student 1");
    assert(json.data.payments[0].receiptNumber === `RCPT1_${cleanSuffix}`, "Receipt number matches");
    assert(json.data.payments[0].amount === 25000, "Payment amount matches 25,000");
  }

  // TEST 2: Multi-Child Switching to Student 2 (Aman)
  console.log("\n--- TEST GROUP 2: Multi-Child Switching (Student 2) ---");
  {
    const req = createParentReq(`http://localhost:3000/api/parent/fees?studentId=${student2._id.toString()}`);
    const res = await getFees(req);
    assert(res.status === 200, "GET /api/parent/fees?studentId=Student2 returns 200 OK");
    const json = await res.json();
    assert(json.data.student._id === student2._id.toString(), "Correctly scoped to Student 2 (Aman)");
    assert(json.data.summary.totalFee === 40000, "Student 2 total fee matches 40,000");
    assert(json.data.summary.paidAmount === 40000, "Student 2 paid amount matches 40,000 (Fully paid)");
    assert(json.data.summary.pendingAmount === 0, "Student 2 pending amount is 0");
    assert(json.data.summary.status === "PAID", "Status is PAID");
    assert(json.data.payments.length === 1, "Exactly 1 payment found for Student 2");
    assert(json.data.payments[0].receiptNumber === `RCPT2_${cleanSuffix}`, "Student 2 receipt matches");
  }

  // TEST 3: Security - Accessing unlinked Student 3 (Stranger) must be rejected with 403
  console.log("\n--- TEST GROUP 3: Security & Isolation (Unlinked Child Rejection) ---");
  {
    const req = createParentReq(`http://localhost:3000/api/parent/fees?studentId=${studentUnlinked._id.toString()}`);
    const res = await getFees(req);
    assert(res.status === 403, "Accessing unlinked Student 3 returns 403 Forbidden");
    const json = await res.json();
    assert(json.error.code === "FORBIDDEN_CHILD_ACCESS", "Error code is FORBIDDEN_CHILD_ACCESS");
  }

  // TEST 4: Fee Receipt Endpoint (`/api/parent/fees/receipts/[paymentId]`)
  console.log("\n--- TEST GROUP 4: Fee Receipt Viewing Endpoint ---");
  {
    const req = createParentReq(`http://localhost:3000/api/parent/fees/receipts/${payment1._id.toString()}?studentId=${student1._id.toString()}`);
    const res = await getReceipt(req, { params: Promise.resolve({ paymentId: payment1._id.toString() }) });
    assert(res.status === 200, "GET /api/parent/fees/receipts/[paymentId] returns 200 OK");
    const json = await res.json();
    assert(json.success === true, "Receipt success = true");
    assert(json.data.receipt.receiptNumber === `RCPT1_${cleanSuffix}`, "Receipt number matches");
    assert(json.data.receipt.amount === 25000, "Receipt amount matches 25,000");
    assert(json.data.receipt.amountInWords.includes("Twenty Five Thousand"), "Amount in words generated properly");
    assert(json.data.student.name === "Aditi Sharma", "Student name matches");
    assert(json.data.school.name === `P5 School A ${cleanSuffix}`, "School name matches");

    // Unlinked Child Receipt Access Rejection
    const reqUnlinked = createParentReq(`http://localhost:3000/api/parent/fees/receipts/${paymentUnlinked._id.toString()}?studentId=${studentUnlinked._id.toString()}`);
    const resUnlinked = await getReceipt(reqUnlinked, { params: Promise.resolve({ paymentId: paymentUnlinked._id.toString() }) });
    assert(resUnlinked.status === 403 || resUnlinked.status === 404, "Unlinked child receipt access is rejected with 403/404");

    // Parameter Child Mismatch Rejection
    const reqMismatch = createParentReq(`http://localhost:3000/api/parent/fees/receipts/${payment1._id.toString()}?studentId=${student2._id.toString()}`);
    const resMismatch = await getReceipt(reqMismatch, { params: Promise.resolve({ paymentId: payment1._id.toString() }) });
    assert(resMismatch.status === 403, "Child ID mismatch on receipt returns 403 Forbidden");
  }

  // TEST 5: Feature Flag Check (School with Fees Disabled)
  console.log("\n--- TEST GROUP 5: Feature Flag Check ---");
  {
    const parentUserDisabled = await User.create({
      email: `parent_dis_${cleanSuffix}@example.com`,
      password: "Password@123",
      role: "PARENT",
      schoolId: schoolDisabled._id,
      isActive: true,
      name: "Disabled School Parent",
    });

    const parentDocDisabled = await Parent.create({
      schoolId: schoolDisabled._id,
      userId: parentUserDisabled._id,
      firstName: "Disabled",
      lastName: "Parent",
      email: parentUserDisabled.email,
      phone: "9876543210",
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    const ayDis = await AcademicYear.create({
      schoolId: schoolDisabled._id,
      name: `2026-2027 Dis ${cleanSuffix}`,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    const classDis = await Class.create({
      schoolId: schoolDisabled._id,
      academicYearId: ayDis._id,
      name: "Class 10 Dis",
      code: `C10_DIS_${cleanSuffix}`,
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    const sectionDis = await Section.create({
      schoolId: schoolDisabled._id,
      classId: classDis._id,
      academicYearId: ayDis._id,
      name: "A",
      capacity: 40,
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    const studentUserDis = await User.create({
      email: `stu_dis_${cleanSuffix}@example.com`,
      password: "Password@123",
      role: "STUDENT",
      schoolId: schoolDisabled._id,
      isActive: true,
    });

    const studentDis = await Student.create({
      schoolId: schoolDisabled._id,
      userId: studentUserDis._id,
      studentId: `STU_DIS_${cleanSuffix}`,
      admissionNumber: `ADM_DIS_${cleanSuffix}`,
      firstName: "Disabled",
      lastName: "Child",
      classId: classDis._id,
      sectionId: sectionDis._id,
      academicYearId: ayDis._id,
      gender: "FEMALE",
      dateOfBirth: new Date("2012-01-01"),
      admissionDate: new Date("2024-04-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    await StudentParent.create({
      schoolId: schoolDisabled._id,
      parentId: parentDocDisabled._id,
      studentId: studentDis._id,
      relationship: "MOTHER",
      isPrimaryGuardian: true,
      isEmergencyContact: true,
      canPickup: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    const disabledParentToken = jwt.sign(
      {
        userId: parentUserDisabled._id.toString(),
        role: "PARENT",
        schoolId: schoolDisabled._id.toString(),
        email: parentUserDisabled.email,
      },
      secret
    );
    const reqDisabled = new NextRequest(new URL("http://localhost:3000/api/parent/fees"), {
      headers: {
        authorization: `Bearer ${disabledParentToken}`,
        cookie: `erp_auth_token=${disabledParentToken}; token=${disabledParentToken}`,
      },
    });
    const resDisabled = await getFees(reqDisabled);
    assert(resDisabled.status === 200, "Disabled fees returns 200 with isEnabled=false");
    const jsonDisabled = await resDisabled.json();
    assert(jsonDisabled.isEnabled === false, "isEnabled is false when FEES module not in school.enabledModules");
  }

  // TEST 6: Read-Only HTTP Method Enforcement (405 Method Not Allowed)
  console.log("\n--- TEST GROUP 6: Read-Only HTTP Method Enforcement ---");
  {
    assert((await postFees()).status === 405, "POST /api/parent/fees returns 405 Method Not Allowed");
    assert((await putFees()).status === 405, "PUT /api/parent/fees returns 405 Method Not Allowed");
    assert((await patchFees()).status === 405, "PATCH /api/parent/fees returns 405 Method Not Allowed");
    assert((await deleteFees()).status === 405, "DELETE /api/parent/fees returns 405 Method Not Allowed");
    assert((await postReceipt()).status === 405, "POST /api/parent/fees/receipts/[paymentId] returns 405");
    assert((await putReceipt()).status === 405, "PUT /api/parent/fees/receipts/[paymentId] returns 405");
    assert((await patchReceipt()).status === 405, "PATCH /api/parent/fees/receipts/[paymentId] returns 405");
    assert((await deleteReceipt()).status === 405, "DELETE /api/parent/fees/receipts/[paymentId] returns 405");
  }

  console.log("\n============================================================");
  console.log(`ALL TESTS PASSED! (${testsPassed}/${testsTotal})`);
  console.log("============================================================");

  // Cleanup test artifacts
  await Promise.all([
    School.deleteMany({ _id: { $in: [schoolA._id, schoolDisabled._id] } }),
    AcademicYear.deleteOne({ _id: ayA._id }),
    Class.deleteOne({ _id: class10._id }),
    Section.deleteOne({ _id: section10A._id }),
    StudentFeeAccount.deleteMany({ schoolId: schoolA._id }),
    StudentFeeAssignment.deleteMany({ schoolId: schoolA._id }),
    FeeStructure.deleteMany({ schoolId: schoolA._id }),
    FeePayment.deleteMany({ schoolId: schoolA._id }),
    StudentParent.deleteMany({ schoolId: schoolA._id }),
    Parent.deleteOne({ _id: parentDoc._id }),
    Student.deleteMany({ _id: { $in: [student1._id, student2._id, studentUnlinked._id] } }),
    User.deleteMany({ _id: { $in: [studentUser1._id, studentUser2._id, studentUser3._id, parentUser._id] } }),
  ]);

  process.exit(0);
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
