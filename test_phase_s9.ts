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

function makeRequest(url: string, token?: string, method: string = "GET", body?: any) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
    headers.cookie = `erp_auth_token=${token}`;
  }
  return new NextRequest(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function generateToken(payload: any) {
  return jwt.sign(payload, process.env.JWT_SECRET || "your-secret-key");
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

async function runS9SecurityTestSuite() {
  console.log("============================================================");
  console.log("🛡️  STARTING S9: STUDENT SECURITY & HARDENING TEST SUITE");
  console.log("============================================================\n");

  const connectToDatabase = (await import("./src/lib/db")).default;
  const School = (await import("./src/models/School")).default;
  const User = (await import("./src/models/User")).default;
  const Student = (await import("./src/models/Student")).default;
  const Class = (await import("./src/models/Class")).default;
  const Section = (await import("./src/models/Section")).default;
  const AcademicYear = (await import("./src/models/AcademicYear")).default;
  const Subject = (await import("./src/models/Subject")).default;
  const Attendance = (await import("./src/models/Attendance")).default;
  const Assignment = (await import("./src/models/Assignment")).default;
  const AssignmentSubmission = (await import("./src/models/AssignmentSubmission")).default;
  const StudyMaterial = (await import("./src/models/StudyMaterial")).default;
  const Exam = (await import("./src/models/Exam")).default;
  const ExamTarget = (await import("./src/models/ExamTarget")).default;
  const ExamSubject = (await import("./src/models/ExamSubject")).default;
  const ExamResult = (await import("./src/models/ExamResult")).default;
  const StudentFeeAccount = (await import("./src/models/StudentFeeAccount")).default;
  const FeePayment = (await import("./src/models/FeePayment")).default;
  const TimetableEntry = (await import("./src/models/TimetableEntry")).default;
  const Notice = (await import("./src/models/Notice")).default;
  const Notification = (await import("./src/models/Notification")).default;

  // Endpoint handlers
  const { GET: getDashboard } = await import("./src/app/api/student/dashboard/route");
  const { GET: getProfile } = await import("./src/app/api/student/profile/route");
  const { GET: getAttendance } = await import("./src/app/api/student/attendance/route");
  const { GET: getAssignments } = await import("./src/app/api/student/assignments/route");
  const { GET: getAssignmentDetail } = await import("./src/app/api/student/assignments/[assignmentId]/route");
  const { POST: submitAssignment } = await import("./src/app/api/student/assignments/[assignmentId]/submit/route");
  const { GET: getStudyMaterial } = await import("./src/app/api/student/study-material/route");
  const { GET: getExams } = await import("./src/app/api/student/exams/route");
  const { GET: getExamDetail } = await import("./src/app/api/student/exams/[examId]/route");
  const { GET: getResults } = await import("./src/app/api/student/results/route");
  const { GET: getResultDetail } = await import("./src/app/api/student/results/[examId]/route");
  const { GET: getReportCards } = await import("./src/app/api/student/report-cards/route");
  const { GET: getReportCardDetail } = await import("./src/app/api/student/report-cards/[examId]/route");
  const { GET: getReportCardPdf } = await import("./src/app/api/student/report-cards/[examId]/pdf/route");
  const { GET: getFees } = await import("./src/app/api/student/fees/route");
  const { GET: getFeeReceipt } = await import("./src/app/api/student/fees/receipts/[paymentId]/route");
  const { GET: getTimetable } = await import("./src/app/api/student/timetable/route");
  const { GET: getNotices } = await import("./src/app/api/student/notices/route");
  const { GET: getNotifications } = await import("./src/app/api/student/notifications/route");
  const { GET: getNotifCount } = await import("./src/app/api/student/notifications/unread-count/route");

  await connectToDatabase();

  const testSuffix = `s9_${Date.now()}`;

  // ------------------------------------------------------------
  // SETUP TEST FIXTURES: School A & School B, Students A, B, C
  // ------------------------------------------------------------
  const schoolA = await School.create({
    name: `School Alpha ${testSuffix}`,
    code: `SCH_A_${Date.now().toString().slice(-5)}`,
    status: "ACTIVE",
    plan: "STANDARD",
    studentLimit: 50,
    subscriptionStartDate: new Date(),
    subscriptionExpiryDate: new Date(Date.now() + 365 * 86400000),
    enabledModules: ["ATTENDANCE", "ASSIGNMENTS", "EXAMS", "RESULTS", "FEES", "NOTICES"],
    createdBy: new mongoose.Types.ObjectId(),
    updatedBy: new mongoose.Types.ObjectId(),
  });

  const schoolB = await School.create({
    name: `School Beta ${testSuffix}`,
    code: `SCH_B_${Date.now().toString().slice(-5)}`,
    status: "ACTIVE",
    plan: "STANDARD",
    studentLimit: 50,
    subscriptionStartDate: new Date(),
    subscriptionExpiryDate: new Date(Date.now() + 365 * 86400000),
    enabledModules: ["ATTENDANCE", "ASSIGNMENTS", "EXAMS", "RESULTS", "FEES", "NOTICES"],
    createdBy: new mongoose.Types.ObjectId(),
    updatedBy: new mongoose.Types.ObjectId(),
  });

  const academicYearA: any = await (AcademicYear as any).create({
    schoolId: schoolA._id,
    name: `2026-2027 ${testSuffix}`,
    startDate: new Date("2026-04-01"),
    endDate: new Date("2027-03-31"),
    status: "ACTIVE",
    createdBy: new mongoose.Types.ObjectId(),
    updatedBy: new mongoose.Types.ObjectId(),
  });

  const classA = await Class.create({
    schoolId: schoolA._id,
    academicYearId: academicYearA._id,
    name: `Class 10-A ${testSuffix}`,
    code: `C10A_${Date.now().toString().slice(-4)}`,
    createdBy: new mongoose.Types.ObjectId(),
    updatedBy: new mongoose.Types.ObjectId(),
  });

  const sectionA = await Section.create({
    schoolId: schoolA._id,
    academicYearId: academicYearA._id,
    classId: classA._id,
    name: "A",
    capacity: 35,
    createdBy: new mongoose.Types.ObjectId(),
    updatedBy: new mongoose.Types.ObjectId(),
  });

  const subjectMath = await Subject.create({
    schoolId: schoolA._id,
    name: `Math ${testSuffix}`,
    code: `MTH_${Date.now().toString().slice(-4)}`,
    subjectType: "CORE",
    createdBy: new mongoose.Types.ObjectId(),
    updatedBy: new mongoose.Types.ObjectId(),
  });

  // Student A in School A
  const userA = await User.create({
    email: `student_alpha_${testSuffix}@example.com`,
    password: "$2b$10$abcdefghijklmnopqrstuv",
    name: "Alice Alpha",
    role: "STUDENT",
    schoolId: schoolA._id,
    isActive: true,
  });

  const studentA = await Student.create({
    schoolId: schoolA._id,
    admissionNumber: `ADM-A-${Date.now().toString().slice(-4)}`,
    firstName: "Alice",
    lastName: "Alpha",
    email: userA.email,
    gender: "FEMALE",
    dateOfBirth: new Date("2010-01-01"),
    academicYearId: academicYearA._id,
    classId: classA._id,
    sectionId: sectionA._id,
    admissionDate: new Date("2026-04-01"),
    status: "ACTIVE",
    userId: userA._id,
    createdBy: userA._id,
    updatedBy: userA._id,
  });

  // Student B in School A (Same school, different student)
  const userB = await User.create({
    email: `student_bob_${testSuffix}@example.com`,
    password: "$2b$10$abcdefghijklmnopqrstuv",
    name: "Bob Bravo",
    role: "STUDENT",
    schoolId: schoolA._id,
    isActive: true,
  });

  const studentB = await Student.create({
    schoolId: schoolA._id,
    admissionNumber: `ADM-B-${Date.now().toString().slice(-4)}`,
    firstName: "Bob",
    lastName: "Bravo",
    email: userB.email,
    gender: "MALE",
    dateOfBirth: new Date("2010-02-02"),
    academicYearId: academicYearA._id,
    classId: classA._id,
    sectionId: sectionA._id,
    admissionDate: new Date("2026-04-01"),
    status: "ACTIVE",
    userId: userB._id,
    createdBy: userB._id,
    updatedBy: userB._id,
  });

  // Student C in School B (Different School Tenant)
  const userC = await User.create({
    email: `student_charlie_${testSuffix}@example.com`,
    password: "$2b$10$abcdefghijklmnopqrstuv",
    name: "Charlie Charlie",
    role: "STUDENT",
    schoolId: schoolB._id,
    isActive: true,
  });

  const studentC = await Student.create({
    schoolId: schoolB._id,
    admissionNumber: `ADM-C-${Date.now().toString().slice(-4)}`,
    firstName: "Charlie",
    lastName: "Charlie",
    email: userC.email,
    gender: "MALE",
    dateOfBirth: new Date("2010-03-03"),
    academicYearId: new mongoose.Types.ObjectId(),
    classId: new mongoose.Types.ObjectId(),
    sectionId: new mongoose.Types.ObjectId(),
    admissionDate: new Date("2026-04-01"),
    status: "ACTIVE",
    userId: userC._id,
    createdBy: userC._id,
    updatedBy: userC._id,
  });

  // Inactive Student
  const userInactive = await User.create({
    email: `student_inactive_${testSuffix}@example.com`,
    password: "$2b$10$abcdefghijklmnopqrstuv",
    name: "Inactive Student",
    role: "STUDENT",
    schoolId: schoolA._id,
    isActive: false, // Disabled user
  });

  // Other Roles for RBAC checks
  const userAdmin = await User.create({
    email: `admin_${testSuffix}@example.com`,
    password: "$2b$10$abcdefghijklmnopqrstuv",
    name: "School Admin",
    role: "ADMIN",
    schoolId: schoolA._id,
    isActive: true,
  });

  const userTeacher = await User.create({
    email: `teacher_${testSuffix}@example.com`,
    password: "$2b$10$abcdefghijklmnopqrstuv",
    name: "Teacher User",
    role: "TEACHER",
    schoolId: schoolA._id,
    isActive: true,
  });

  const userParent = await User.create({
    email: `parent_${testSuffix}@example.com`,
    password: "$2b$10$abcdefghijklmnopqrstuv",
    name: "Parent User",
    role: "PARENT",
    schoolId: schoolA._id,
    isActive: true,
  });

  // Tokens
  const tokenA = generateToken({
    userId: userA._id.toString(),
    role: "STUDENT",
    schoolId: schoolA._id.toString(),
    email: userA.email,
  });

  const tokenB = generateToken({
    userId: userB._id.toString(),
    role: "STUDENT",
    schoolId: schoolA._id.toString(),
    email: userB.email,
  });

  const tokenC = generateToken({
    userId: userC._id.toString(),
    role: "STUDENT",
    schoolId: schoolB._id.toString(),
    email: userC.email,
  });

  const tokenInactive = generateToken({
    userId: userInactive._id.toString(),
    role: "STUDENT",
    schoolId: schoolA._id.toString(),
    email: userInactive.email,
  });

  const tokenAdmin = generateToken({
    userId: userAdmin._id.toString(),
    role: "ADMIN",
    schoolId: schoolA._id.toString(),
    email: userAdmin.email,
  });

  const tokenTeacher = generateToken({
    userId: userTeacher._id.toString(),
    role: "TEACHER",
    schoolId: schoolA._id.toString(),
    email: userTeacher.email,
  });

  const tokenParent = generateToken({
    userId: userParent._id.toString(),
    role: "PARENT",
    schoolId: schoolA._id.toString(),
    email: userParent.email,
  });

  // Seed domain items for Student A
  const assignmentA = await Assignment.create({
    schoolId: schoolA._id,
    academicYearId: academicYearA._id,
    classId: classA._id,
    sectionId: sectionA._id,
    subjectId: subjectMath._id,
    teacherId: userTeacher._id,
    title: `Algebra Set 1 ${testSuffix}`,
    description: "Solve problems 1-10",
    assignedDate: new Date("2026-04-10"),
    dueDate: new Date("2026-04-20"),
    maximumMarks: 100,
    status: "PUBLISHED",
    isActive: true,
    createdBy: userTeacher._id,
    updatedBy: userTeacher._id,
  });

  const submissionA = await AssignmentSubmission.create({
    schoolId: schoolA._id,
    academicYearId: academicYearA._id,
    classId: classA._id,
    sectionId: sectionA._id,
    assignmentId: assignmentA._id,
    studentId: studentA._id,
    content: "Alice solution text",
    status: "REVIEWED",
    marks: 98,
    feedback: "Exceptional work Alice",
    submittedAt: new Date(),
    reviewedAt: new Date(),
    reviewedBy: userTeacher._id,
  });

  const examA = await Exam.create({
    schoolId: schoolA._id,
    academicYearId: academicYearA._id,
    name: `Midterm Examination ${testSuffix}`,
    startDate: new Date("2026-05-01"),
    endDate: new Date("2026-05-10"),
    status: "COMPLETED",
    isActive: true,
    createdBy: userA._id,
    updatedBy: userA._id,
  });

  await ExamTarget.create({
    schoolId: schoolA._id,
    examId: examA._id,
    academicYearId: academicYearA._id,
    classId: classA._id,
    sectionId: sectionA._id,
    isActive: true,
    createdBy: userA._id,
    updatedBy: userA._id,
  });

  const examSubjectMath = await ExamSubject.create({
    schoolId: schoolA._id,
    examId: examA._id,
    academicYearId: academicYearA._id,
    classId: classA._id,
    subjectId: subjectMath._id,
    maximumMarks: 100,
    passingMarks: 40,
    isActive: true,
    createdBy: userA._id,
    updatedBy: userA._id,
  });

  const resultA = await (ExamResult as any).create({
    schoolId: schoolA._id,
    academicYearId: academicYearA._id,
    classId: classA._id,
    sectionId: sectionA._id,
    examId: examA._id,
    examSubjectId: examSubjectMath._id,
    studentId: studentA._id,
    subjectId: subjectMath._id,
    marks: 95,
    grade: "A+",
    isPassed: true,
    status: "PUBLISHED",
    publishedAt: new Date(),
    enteredBy: userA._id,
  });

  const FeeCategory = (await import("./src/models/FeeCategory")).default;
  const FeeStructure = (await import("./src/models/FeeStructure")).default;
  const StudentFeeAssignment = (await import("./src/models/StudentFeeAssignment")).default;

  const feeCategoryA = await FeeCategory.create({
    schoolId: schoolA._id,
    name: `Tuition ${testSuffix}`,
    code: `T_${Date.now().toString().slice(-4)}`,
    createdBy: userA._id,
    updatedBy: userA._id,
  });

  const feeStructureA = await FeeStructure.create({
    schoolId: schoolA._id,
    academicYearId: academicYearA._id,
    feeCategoryId: feeCategoryA._id,
    classId: classA._id,
    name: "Grade 10 Tuition Fee",
    amount: 40000,
    frequency: "ANNUAL",
    installments: [
      {
        name: "Term 1",
        amount: 20000,
        dueDate: new Date("2027-05-01"),
        sequence: 1,
      },
      {
        name: "Term 2",
        amount: 20000,
        dueDate: new Date("2027-10-01"),
        sequence: 2,
      },
    ],
    isActive: true,
    createdBy: userA._id,
    updatedBy: userA._id,
  });

  const feeAssignmentA = await StudentFeeAssignment.create({
    schoolId: schoolA._id,
    academicYearId: academicYearA._id,
    studentId: studentA._id,
    feeStructureId: feeStructureA._id,
    baseAmount: 40000,
    discountType: "NONE",
    discountValue: 0,
    discountAmount: 0,
    concessionType: "NONE",
    concessionValue: 0,
    concessionAmount: 0,
    netAmount: 40000,
    dueSchedule: [
      {
        name: "Term 1",
        amount: 20000,
        dueDate: new Date("2027-05-01"),
        sequence: 1,
        paidAmount: 20000,
        status: "PAID",
      },
      {
        name: "Term 2",
        amount: 20000,
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

  const feeAccountA = await StudentFeeAccount.create({
    schoolId: schoolA._id,
    academicYearId: academicYearA._id,
    studentId: studentA._id,
    totalFee: 40000,
    netFee: 40000,
    paidAmount: 20000,
    pendingAmount: 20000,
    status: "PARTIALLY_PAID",
  });

  const paymentA = await FeePayment.create({
    schoolId: schoolA._id,
    academicYearId: academicYearA._id,
    studentId: studentA._id,
    feeAccountId: feeAccountA._id,
    amount: 20000,
    paymentDate: new Date(),
    paymentMethod: "UPI",
    receiptNumber: `REC-S9-${Date.now().toString().slice(-6)}`,
    status: "ACTIVE",
    recordedBy: userA._id,
  });

  const notifA = await Notification.create({
    schoolId: schoolA._id,
    recipientUserId: userA._id,
    title: `Welcome Alice ${testSuffix}`,
    message: "Your student portal is activated",
    type: "NOTICE",
    referenceType: "NONE",
    isRead: false,
  });

  // ============================================================
  // 1. AUTHENTICATION SECURITY TESTS
  // ============================================================
  console.log("--- 1. Testing Authentication & Session Integrity ---");

  // Missing token
  const resNoToken = await getProfile(makeRequest("http://localhost:3000/api/student/profile"));
  assert(resNoToken.status === 401, "Missing token returns HTTP 401 Unauthorized");

  // Invalid / Malformed token
  const resInvalid = await getProfile(makeRequest("http://localhost:3000/api/student/profile", "invalid.jwt.token"));
  assert(resInvalid.status === 401, "Invalid token returns HTTP 401 Unauthorized");

  // Tampered signature token
  const tamperedToken = tokenA.slice(0, -5) + "abcde";
  const resTampered = await getProfile(makeRequest("http://localhost:3000/api/student/profile", tamperedToken));
  assert(resTampered.status === 401, "Tampered signature token returns HTTP 401 Unauthorized");

  // Inactive / Disabled User
  const resInactive = await getProfile(makeRequest("http://localhost:3000/api/student/profile", tokenInactive));
  assert(resInactive.status === 403, "Inactive student account returns HTTP 403 Forbidden");

  // Valid Active Student Session
  const resValid = await getProfile(makeRequest("http://localhost:3000/api/student/profile", tokenA));
  assert(resValid.status === 200, "Valid active student session returns HTTP 200 OK");

  // ============================================================
  // 2. ROLE-BASED ACCESS CONTROL (RBAC)
  // ============================================================
  console.log("\n--- 2. Testing RBAC Rejections (ADMIN, TEACHER, PARENT != STUDENT) ---");

  const resAdmin = await getDashboard(makeRequest("http://localhost:3000/api/student/dashboard", tokenAdmin));
  assert(resAdmin.status === 403, "ADMIN role rejected on student dashboard with HTTP 403");

  const resTeacher = await getDashboard(makeRequest("http://localhost:3000/api/student/dashboard", tokenTeacher));
  assert(resTeacher.status === 403, "TEACHER role rejected on student dashboard with HTTP 403");

  const resParent = await getDashboard(makeRequest("http://localhost:3000/api/student/dashboard", tokenParent));
  assert(resParent.status === 403, "PARENT role rejected on student dashboard with HTTP 403");

  // ============================================================
  // 3. SELF-DATA ISOLATION (Student A vs Student B within same school)
  // ============================================================
  console.log("\n--- 3. Testing Self-Data Isolation (Student A vs Student B) ---");

  // Results isolation
  const resResultsA = await getResults(makeRequest("http://localhost:3000/api/student/results", tokenA));
  const jsonResultsA = await resResultsA.json();
  assert(jsonResultsA.data.examResults.length === 1, "Student A sees their 1 published exam result");

  const resResultsB = await getResults(makeRequest("http://localhost:3000/api/student/results", tokenB));
  const jsonResultsB = await resResultsB.json();
  assert(jsonResultsB.data.examResults.length === 0, "Student B has 0 results (Student A's results NOT leaked)");

  // Fees isolation
  const resFeesA = await getFees(makeRequest("http://localhost:3000/api/student/fees", tokenA));
  const jsonFeesA = await resFeesA.json();
  assert(jsonFeesA.data.summary.totalFee === 40000, "Student A sees their own 40,000 fee account");
  assert(jsonFeesA.data.payments.length === 1, "Student A sees 1 fee payment");

  const resFeesB = await getFees(makeRequest("http://localhost:3000/api/student/fees", tokenB));
  const jsonFeesB = await resFeesB.json();
  assert(jsonFeesB.data.summary.totalFee === 0, "Student B sees 0 fee account (Student A's fee NOT leaked)");
  assert(jsonFeesB.data.payments.length === 0, "Student B has 0 payments");

  // Fee receipt cross-access
  const resReceiptB = await getFeeReceipt(
    makeRequest(`http://localhost:3000/api/student/fees/receipts/${paymentA._id.toString()}`, tokenB),
    { params: Promise.resolve({ paymentId: paymentA._id.toString() }) }
  );
  assert(resReceiptB.status === 404, "Student B cannot view Student A's payment receipt (HTTP 404)");

  // Report Card PDF cross-access
  const resPdfB = await getReportCardPdf(
    makeRequest(`http://localhost:3000/api/student/report-cards/${examA._id.toString()}/pdf`, tokenB),
    { params: Promise.resolve({ examId: examA._id.toString() }) }
  );
  assert(resPdfB.status === 404, "Student B cannot download Student A's report card PDF (HTTP 404)");

  // Notifications isolation
  const resNotifA = await getNotifications(makeRequest("http://localhost:3000/api/student/notifications", tokenA));
  const jsonNotifA = await resNotifA.json();
  assert(jsonNotifA.data.notifications.length === 1, "Student A has 1 notification");

  const resNotifB = await getNotifications(makeRequest("http://localhost:3000/api/student/notifications", tokenB));
  const jsonNotifB = await resNotifB.json();
  assert(jsonNotifB.data.notifications.length === 0, "Student B sees 0 notifications (No leak)");

  // ============================================================
  // 4. TENANT MULTI-SCHOOL ISOLATION (School A vs School B)
  // ============================================================
  console.log("\n--- 4. Testing Tenant Multi-School Isolation (School A vs School B) ---");

  // Student C (School B) accesses exams
  const resExamsC = await getExams(makeRequest("http://localhost:3000/api/student/exams", tokenC));
  const jsonExamsC = await resExamsC.json();
  assert(jsonExamsC.data.exams.length === 0, "School B Student C sees 0 exams from School A");

  // Student C attempts to access School A's specific exam
  const resExamDetailC = await getExamDetail(
    makeRequest(`http://localhost:3000/api/student/exams/${examA._id.toString()}`, tokenC),
    { params: Promise.resolve({ examId: examA._id.toString() }) }
  );
  assert(resExamDetailC.status === 404, "Student from School B gets HTTP 404 accessing School A's exam");

  // Student C attempts to download School A report card PDF
  const resPdfC = await getReportCardPdf(
    makeRequest(`http://localhost:3000/api/student/report-cards/${examA._id.toString()}/pdf`, tokenC),
    { params: Promise.resolve({ examId: examA._id.toString() }) }
  );
  assert(resPdfC.status === 404, "Student from School B gets HTTP 404 downloading School A's report card");

  // Student C attempts to view School A payment receipt
  const resReceiptC = await getFeeReceipt(
    makeRequest(`http://localhost:3000/api/student/fees/receipts/${paymentA._id.toString()}`, tokenC),
    { params: Promise.resolve({ paymentId: paymentA._id.toString() }) }
  );
  assert(resReceiptC.status === 404, "Student from School B gets HTTP 404 viewing School A's receipt");

  // ============================================================
  // 5. URL MANIPULATION & QUERY TAMPERING
  // ============================================================
  console.log("\n--- 5. Testing URL Manipulation & Query Tampering Prevention ---");

  // Injected ?studentId=studentB on Attendance
  const resAttTamper = await getAttendance(
    makeRequest(`http://localhost:3000/api/student/attendance?studentId=${studentB._id.toString()}`, tokenA)
  );
  const jsonAttTamper = await resAttTamper.json();
  assert(jsonAttTamper.data.academicContext.class._id === classA._id.toString(), "Attendance query param ignored, student A context resolved");

  // Injected ?studentId=studentB on Fees
  const resFeeTamper = await getFees(
    makeRequest(`http://localhost:3000/api/student/fees?studentId=${studentB._id.toString()}`, tokenA)
  );
  const jsonFeeTamper = await resFeeTamper.json();
  assert(jsonFeeTamper.data.summary.totalFee === 40000, "Fee query param ignored, student A's 40,000 fee returned");

  // Injected fake examId on results
  const resFakeResult = await getResultDetail(
    makeRequest("http://localhost:3000/api/student/results/65b123456789abcdef012345", tokenA),
    { params: Promise.resolve({ examId: "65b123456789abcdef012345" }) }
  );
  assert(resFakeResult.status === 404, "Non-existent / unauthorized exam result returns HTTP 404");

  // ============================================================
  // 6. ASSIGNMENT & SUBMISSION SECURITY
  // ============================================================
  console.log("\n--- 6. Testing Assignment & Submission Security ---");

  // View assignment detail
  const resAssignDetailA = await getAssignmentDetail(
    makeRequest(`http://localhost:3000/api/student/assignments/${assignmentA._id.toString()}`, tokenA),
    { params: Promise.resolve({ assignmentId: assignmentA._id.toString() }) }
  );
  const jsonAssignA = await resAssignDetailA.json();
  assert(jsonAssignA.data.submission !== null, "Student A sees their own submission");
  assert(jsonAssignA.data.submission.marks === 98, "Student A sees their own grade (98 marks)");
  assert(jsonAssignA.data.submission.feedback === "Exceptional work Alice", "Student A sees their own feedback");

  // Student B views assignment -> submission is null (hasn't submitted yet)
  const resAssignDetailB = await getAssignmentDetail(
    makeRequest(`http://localhost:3000/api/student/assignments/${assignmentA._id.toString()}`, tokenB),
    { params: Promise.resolve({ assignmentId: assignmentA._id.toString() }) }
  );
  const jsonAssignB = await resAssignDetailB.json();
  assert(jsonAssignB.data.submission === null, "Student B does NOT see Student A's submission");

  // Student C (School B) tries to view assignment -> 404
  const resAssignDetailC = await getAssignmentDetail(
    makeRequest(`http://localhost:3000/api/student/assignments/${assignmentA._id.toString()}`, tokenC),
    { params: Promise.resolve({ assignmentId: assignmentA._id.toString() }) }
  );
  assert(resAssignDetailC.status === 404, "Student from School B cannot access School A assignment (HTTP 404)");

  // ============================================================
  // 7. PUBLICATION RULES (Unpublished vs Published)
  // ============================================================
  console.log("\n--- 7. Testing Result Publication Rules ---");

  // Create DRAFT result for exam
  const examDraft = await Exam.create({
    schoolId: schoolA._id,
    academicYearId: academicYearA._id,
    name: `Draft Exam ${testSuffix}`,
    startDate: new Date(),
    endDate: new Date(),
    status: "COMPLETED",
    isActive: true,
    createdBy: userA._id,
    updatedBy: userA._id,
  });

  const resultDraft = await (ExamResult as any).create({
    schoolId: schoolA._id,
    academicYearId: academicYearA._id,
    classId: classA._id,
    sectionId: sectionA._id,
    examId: examDraft._id,
    examSubjectId: examSubjectMath._id,
    studentId: studentA._id,
    subjectId: subjectMath._id,
    marks: 75,
    grade: "B",
    status: "DRAFT", // UNPUBLISHED
    enteredBy: userA._id,
  });

  const resUnpublished = await getResultDetail(
    makeRequest(`http://localhost:3000/api/student/results/${examDraft._id.toString()}`, tokenA),
    { params: Promise.resolve({ examId: examDraft._id.toString() }) }
  );
  assert(resUnpublished.status === 404, "Unpublished DRAFT result is hidden from student (HTTP 404)");

  // ============================================================
  // 8. TIMETABLE & NOTICES SCOPING
  // ============================================================
  console.log("\n--- 8. Testing Timetable & Notices Scoping ---");

  const timetableEntryA = await TimetableEntry.create({
    schoolId: schoolA._id,
    academicYearId: academicYearA._id,
    classId: classA._id,
    sectionId: sectionA._id,
    subjectId: subjectMath._id,
    teacherId: userTeacher._id,
    dayOfWeek: "MONDAY",
    startTime: "09:00",
    endTime: "10:00",
    room: "Room 101",
    isActive: true,
    createdBy: userA._id,
    updatedBy: userA._id,
  });

  const resTimetableA = await getTimetable(makeRequest("http://localhost:3000/api/student/timetable", tokenA));
  const jsonTimetableA = await resTimetableA.json();
  assert(jsonTimetableA.data.entries.length === 1, "Student A sees their class timetable entry");

  const resTimetableC = await getTimetable(makeRequest("http://localhost:3000/api/student/timetable", tokenC));
  const jsonTimetableC = await resTimetableC.json();
  assert(jsonTimetableC.data.entries.length === 0, "School B Student C sees 0 entries from School A");

  // Notices
  const noticeA = await Notice.create({
    schoolId: schoolA._id,
    title: `Sports Day ${testSuffix}`,
    description: "Annual sports day celebration",
    targetType: "STUDENTS",
    targetRoles: ["STUDENT"],
    status: "PUBLISHED",
    publishedAt: new Date(),
    isActive: true,
    createdBy: userA._id,
    updatedBy: userA._id,
  });

  const resNoticesA = await getNotices(makeRequest("http://localhost:3000/api/student/notices", tokenA));
  const jsonNoticesA = await resNoticesA.json();
  assert(jsonNoticesA.data.notices.length >= 1, "Student A sees School A published notices");

  const resNoticesC = await getNotices(makeRequest("http://localhost:3000/api/student/notices", tokenC));
  const jsonNoticesC = await resNoticesC.json();
  assert(jsonNoticesC.data.notices.length === 0, "School B Student C sees 0 notices from School A");

  // ============================================================
  // 9. READ-ONLY IMMUTABILITY (HTTP 405 on All Mutation Endpoints)
  // ============================================================
  console.log("\n--- 9. Testing Read-Only HTTP 405 Rejections Across All Modules ---");

  const { POST: postAtt, PUT: putAtt, DELETE: delAtt } = await import("./src/app/api/student/attendance/route");
  assert((await postAtt()).status === 405, "POST /api/student/attendance rejected with 405");
  assert((await putAtt()).status === 405, "PUT /api/student/attendance rejected with 405");
  assert((await delAtt()).status === 405, "DELETE /api/student/attendance rejected with 405");

  const { POST: postExams, DELETE: delExams } = await import("./src/app/api/student/exams/route");
  assert((await postExams()).status === 405, "POST /api/student/exams rejected with 405");
  assert((await delExams()).status === 405, "DELETE /api/student/exams rejected with 405");

  const { POST: postResults, DELETE: delResults } = await import("./src/app/api/student/results/route");
  assert((await postResults()).status === 405, "POST /api/student/results rejected with 405");
  assert((await delResults()).status === 405, "DELETE /api/student/results rejected with 405");

  const { POST: postFeesMut, DELETE: delFeesMut } = await import("./src/app/api/student/fees/route");
  assert((await postFeesMut()).status === 405, "POST /api/student/fees rejected with 405");
  assert((await delFeesMut()).status === 405, "DELETE /api/student/fees rejected with 405");

  const { POST: postTT, DELETE: delTT } = await import("./src/app/api/student/timetable/route");
  assert((await postTT()).status === 405, "POST /api/student/timetable rejected with 405");
  assert((await delTT()).status === 405, "DELETE /api/student/timetable rejected with 405");

  const { POST: postNotice, DELETE: delNotice } = await import("./src/app/api/student/notices/route");
  assert((await postNotice()).status === 405, "POST /api/student/notices rejected with 405");
  assert((await delNotice()).status === 405, "DELETE /api/student/notices rejected with 405");

  // ============================================================
  // CLEANUP TEST DATA
  // ============================================================
  await Promise.all([
    School.deleteMany({ _id: { $in: [schoolA._id, schoolB._id] } }),
    AcademicYear.deleteMany({ _id: academicYearA._id }),
    Class.deleteMany({ _id: classA._id }),
    Section.deleteMany({ _id: sectionA._id }),
    Subject.deleteMany({ _id: subjectMath._id }),
    User.deleteMany({ _id: { $in: [userA._id, userB._id, userC._id, userInactive._id, userAdmin._id, userTeacher._id, userParent._id] } }),
    Student.deleteMany({ _id: { $in: [studentA._id, studentB._id, studentC._id] } }),
    Assignment.deleteMany({ _id: assignmentA._id }),
    AssignmentSubmission.deleteMany({ _id: submissionA._id }),
    Exam.deleteMany({ _id: { $in: [examA._id, examDraft._id] } }),
    ExamTarget.deleteMany({ examId: { $in: [examA._id, examDraft._id] } }),
    ExamSubject.deleteMany({ _id: examSubjectMath._id }),
    ExamResult.deleteMany({ _id: { $in: [resultA._id, resultDraft._id] } }),
    StudentFeeAccount.deleteMany({ _id: feeAccountA._id }),
    FeePayment.deleteMany({ _id: paymentA._id }),
    TimetableEntry.deleteMany({ _id: timetableEntryA._id }),
    Notice.deleteMany({ _id: noticeA._id }),
    Notification.deleteMany({ _id: notifA._id }),
  ]);

  console.log("\n============================================================");
  console.log(`📊 S9 SECURITY TEST SUITE COMPLETE: ${passedTests} Passed, ${failedTests} Failed`);
  console.log("============================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runS9SecurityTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
