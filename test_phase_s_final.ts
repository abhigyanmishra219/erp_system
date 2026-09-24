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

function makeRequest(url: string, token: string, method: string = "GET", body?: any) {
  const headers: Record<string, string> = {
    authorization: `Bearer ${token}`,
    cookie: `erp_auth_token=${token}; token=${token}`,
  };
  if (body) {
    headers["content-type"] = "application/json";
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function runFinalIntegrationTestSuite() {
  console.log("============================================================");
  console.log("🧪 STARTING FINAL INTEGRATION: REPORT CARDS + NOTIFICATIONS");
  console.log("============================================================\n");

  const mongoose: any = (await import("mongoose")).default;
  const connectToDatabase: any = (await import("./src/lib/db")).default;
  const User: any = (await import("./src/models/User")).default;
  const School: any = (await import("./src/models/School")).default;
  const AcademicYear: any = (await import("./src/models/AcademicYear")).default;
  const Class: any = (await import("./src/models/Class")).default;
  const Section: any = (await import("./src/models/Section")).default;
  const Subject: any = (await import("./src/models/Subject")).default;
  const Teacher: any = (await import("./src/models/Teacher")).default;
  const Student: any = (await import("./src/models/Student")).default;
  const Exam: any = (await import("./src/models/Exam")).default;
  const ExamTarget: any = (await import("./src/models/ExamTarget")).default;
  const ExamSubject: any = (await import("./src/models/ExamSubject")).default;
  const ExamResult: any = (await import("./src/models/ExamResult")).default;
  const Attendance: any = (await import("./src/models/Attendance")).default;
  const Notification: any = (await import("./src/models/Notification")).default;
  const Notice: any = (await import("./src/models/Notice")).default;
  const AuditLog: any = (await import("./src/models/AuditLog")).default;

  const { createToken } = await import("./src/lib/jwt");

  console.log("Connecting to database...");
  await connectToDatabase();
  console.log("Connected to database successfully.");

  // Report cards API
  const { GET: getReportCards, POST: postReportCards } = (await import("./src/app/api/student/report-cards/route")) as any;
  const { GET: getReportCardByExamId } = (await import("./src/app/api/student/report-cards/[examId]/route")) as any;
  const { GET: getReportCardPdf } = (await import("./src/app/api/student/report-cards/[examId]/pdf/route")) as any;

  // Notifications API
  const { GET: getNotifications } = (await import("./src/app/api/student/notifications/route")) as any;
  const { GET: getUnreadCount } = (await import("./src/app/api/student/notifications/unread-count/route")) as any;
  const { POST: markNotificationRead } = (await import("./src/app/api/student/notifications/[notificationId]/read/route")) as any;
  const { POST: markAllNotificationsRead } = (await import("./src/app/api/student/notifications/read-all/route")) as any;

  // Admin exam results route (for publish notification dispatch)
  const { PATCH: updateAdminExamResults } = (await import("./src/app/api/admin/exams/[examId]/results/route")) as any;

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
    // 1. Setup School 1 & Academic Year
    const school1 = await School.create({
      name: `Final School 1 ${timestamp}`,
      code: `FS1_${timestamp}`,
      status: "ACTIVE",
      address: "100 Oxford Street",
      city: "London",
      state: "Greater London",
      country: "United Kingdom",
      phone: "+44 20 7946 0912",
      email: `fs1_${timestamp}@example.com`,
      website: "https://example.com/school",
      plan: "STANDARD",
      studentLimit: 500,
      subscriptionStartDate: new Date(),
      subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
      subscriptionStatus: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
      gradingSettings: {
        system: "PERCENTAGE",
        scales: [
          { grade: "A+", minPercentage: 90, maxPercentage: 100, gpa: 4.0, description: "Outstanding" },
          { grade: "A", minPercentage: 80, maxPercentage: 89.99, gpa: 3.7, description: "Excellent" },
          { grade: "B", minPercentage: 70, maxPercentage: 79.99, gpa: 3.0, description: "Good" },
          { grade: "C", minPercentage: 60, maxPercentage: 69.99, gpa: 2.0, description: "Satisfactory" },
          { grade: "D", minPercentage: 40, maxPercentage: 59.99, gpa: 1.0, description: "Pass" },
          { grade: "F", minPercentage: 0, maxPercentage: 39.99, gpa: 0.0, description: "Fail" },
        ],
      },
    });

    // Setup School 2 for tenant isolation
    const school2 = await School.create({
      name: `Final School 2 ${timestamp}`,
      code: `FS2_${timestamp}`,
      status: "ACTIVE",
      address: "200 Cambridge Street",
      city: "Cambridge",
      state: "Cambridgeshire",
      country: "United Kingdom",
      phone: "+44 20 7946 0913",
      email: `fs2_${timestamp}@example.com`,
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

    const ay2 = await AcademicYear.create({
      schoolId: school2._id,
      name: `2026-2027 S2 ${timestamp}`,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    const class1 = await Class.create({
      schoolId: school1._id,
      name: `Grade 10 ${timestamp}`,
      code: `G10_${timestamp}`.slice(0, 10),
      academicYearId: ay1._id,
      createdBy: adminId,
      updatedBy: adminId,
    });

    const section1 = await Section.create({
      schoolId: school1._id,
      classId: class1._id,
      academicYearId: ay1._id,
      name: `A`,
      capacity: 40,
      createdBy: adminId,
      updatedBy: adminId,
    });

    const class2 = await Class.create({
      schoolId: school2._id,
      name: `Grade 10 S2 ${timestamp}`,
      code: `G10S2_${timestamp}`.slice(0, 10),
      academicYearId: ay2._id,
      createdBy: adminId,
      updatedBy: adminId,
    });

    const section2 = await Section.create({
      schoolId: school2._id,
      classId: class2._id,
      academicYearId: ay2._id,
      name: `A`,
      capacity: 40,
      createdBy: adminId,
      updatedBy: adminId,
    });

    const subjectMath = await Subject.create({
      schoolId: school1._id,
      name: "Mathematics",
      code: `MTH_${timestamp}`.slice(0, 10),
      type: "THEORY",
      createdBy: adminId,
      updatedBy: adminId,
    });

    const subjectScience = await Subject.create({
      schoolId: school1._id,
      name: "Science",
      code: `SCI_${timestamp}`.slice(0, 10),
      type: "THEORY",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Users & Students
    // 1. Admin User
    const adminUser = await User.create({
      schoolId: school1._id,
      name: `Admin User ${timestamp}`,
      email: `admin_${timestamp}@example.com`,
      password: "password123",
      role: "ADMIN",
      status: "ACTIVE",
    });
    const adminToken = createToken({
      userId: adminUser._id.toString(),
      role: "ADMIN",
      email: adminUser.email,
    });

    // 2. Student A (School 1)
    const userA = await User.create({
      schoolId: school1._id,
      name: `Alice Student ${timestamp}`,
      email: `alice_${timestamp}@example.com`,
      password: "password123",
      role: "STUDENT",
      status: "ACTIVE",
    });
    const studentA = await Student.create({
      schoolId: school1._id,
      userId: userA._id,
      studentId: `STU-A-${timestamp}`.slice(0, 15),
      admissionNumber: `ADM-A-${timestamp}`.slice(0, 15),
      rollNumber: `R-01`,
      firstName: "Alice",
      lastName: "Smith",
      gender: "FEMALE",
      dateOfBirth: new Date("2010-05-15"),
      admissionDate: new Date("2024-04-01"),
      classId: class1._id,
      sectionId: section1._id,
      academicYearId: ay1._id,
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    const tokenA = createToken({
      userId: userA._id.toString(),
      role: "STUDENT",
      email: userA.email,
    });

    // 3. Student B (School 1)
    const userB = await User.create({
      schoolId: school1._id,
      name: `Bob Student ${timestamp}`,
      email: `bob_${timestamp}@example.com`,
      password: "password123",
      role: "STUDENT",
      status: "ACTIVE",
    });
    const studentB = await Student.create({
      schoolId: school1._id,
      userId: userB._id,
      studentId: `STU-B-${timestamp}`.slice(0, 15),
      admissionNumber: `ADM-B-${timestamp}`.slice(0, 15),
      rollNumber: `R-02`,
      firstName: "Bob",
      lastName: "Jones",
      gender: "MALE",
      dateOfBirth: new Date("2010-08-20"),
      admissionDate: new Date("2024-04-01"),
      classId: class1._id,
      sectionId: section1._id,
      academicYearId: ay1._id,
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    const tokenB = createToken({
      userId: userB._id.toString(),
      role: "STUDENT",
      email: userB.email,
    });

    // 4. Student C (School 2 - Foreign Tenant)
    const userC = await User.create({
      schoolId: school2._id,
      name: `Charlie Student ${timestamp}`,
      email: `charlie_${timestamp}@example.com`,
      password: "password123",
      role: "STUDENT",
      status: "ACTIVE",
    });
    const studentC = await Student.create({
      schoolId: school2._id,
      userId: userC._id,
      studentId: `STU-C-${timestamp}`.slice(0, 15),
      admissionNumber: `ADM-C-${timestamp}`.slice(0, 15),
      rollNumber: `R-03`,
      firstName: "Charlie",
      lastName: "Brown",
      gender: "MALE",
      dateOfBirth: new Date("2011-01-10"),
      admissionDate: new Date("2024-04-01"),
      classId: class2._id,
      sectionId: section2._id,
      academicYearId: ay2._id,
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    const tokenC = createToken({
      userId: userC._id.toString(),
      role: "STUDENT",
      email: userC.email,
    });

    console.log("--- PART 1: REPORT CARDS TESTS ---");

    // 1. Initial State: No exams published -> Empty state
    const resEmpty = await getReportCards(makeRequest("/api/student/report-cards", tokenA));
    const jsonEmpty = await resEmpty.json();
    assert(resEmpty.status === 200, "Empty report cards returns HTTP 200");
    assert(jsonEmpty.success === true, "Empty report cards success is true");
    assert(jsonEmpty.data?.reportCards?.length === 0, "Initial report cards list is empty (no fake data)");

    // 2. Create Published Exam and Draft Exam
    const examPublished = await Exam.create({
      schoolId: school1._id,
      academicYearId: ay1._id,
      name: `Mid-Term Examination ${timestamp}`,
      examType: "TERM",
      status: "COMPLETED",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-10"),
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    await ExamTarget.create({
      schoolId: school1._id,
      examId: examPublished._id,
      academicYearId: ay1._id,
      classId: class1._id,
      sectionId: section1._id,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    const esMath = await ExamSubject.create({
      schoolId: school1._id,
      examId: examPublished._id,
      academicYearId: ay1._id,
      classId: class1._id,
      subjectId: subjectMath._id,
      examDate: new Date("2026-09-02"),
      maximumMarks: 100,
      passingMarks: 40,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    const esScience = await ExamSubject.create({
      schoolId: school1._id,
      examId: examPublished._id,
      academicYearId: ay1._id,
      classId: class1._id,
      subjectId: subjectScience._id,
      examDate: new Date("2026-09-04"),
      maximumMarks: 100,
      passingMarks: 40,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Create Draft Exam
    const examDraft = await Exam.create({
      schoolId: school1._id,
      academicYearId: ay1._id,
      name: `Draft Quiz Examination ${timestamp}`,
      examType: "CLASS_TEST",
      status: "COMPLETED",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-05"),
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    await ExamTarget.create({
      schoolId: school1._id,
      examId: examDraft._id,
      academicYearId: ay1._id,
      classId: class1._id,
      sectionId: section1._id,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    const esDraftMath = await ExamSubject.create({
      schoolId: school1._id,
      examId: examDraft._id,
      academicYearId: ay1._id,
      classId: class1._id,
      subjectId: subjectMath._id,
      maximumMarks: 100,
      passingMarks: 40,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Create results for Student A (PUBLISHED on examPublished, DRAFT on examDraft)
    await ExamResult.create([
      {
        schoolId: school1._id,
        examId: examPublished._id,
        examSubjectId: esMath._id,
        academicYearId: ay1._id,
        classId: class1._id,
        sectionId: section1._id,
        subjectId: subjectMath._id,
        studentId: studentA._id,
        marks: 88,
        grade: "A",
        isPassed: true,
        status: "PUBLISHED",
        enteredBy: adminId,
      },
      {
        schoolId: school1._id,
        examId: examPublished._id,
        examSubjectId: esScience._id,
        academicYearId: ay1._id,
        classId: class1._id,
        sectionId: section1._id,
        subjectId: subjectScience._id,
        studentId: studentA._id,
        marks: 92,
        grade: "A+",
        isPassed: true,
        status: "PUBLISHED",
        enteredBy: adminId,
      },
      {
        schoolId: school1._id,
        examId: examDraft._id,
        examSubjectId: esDraftMath._id,
        academicYearId: ay1._id,
        classId: class1._id,
        sectionId: section1._id,
        subjectId: subjectMath._id,
        studentId: studentA._id,
        marks: 75,
        grade: "B",
        isPassed: true,
        status: "DRAFT", // Must NOT be visible
        enteredBy: adminId,
      },
    ]);

    // Student B has only DRAFT results on examPublished
    await ExamResult.create([
      {
        schoolId: school1._id,
        examId: examPublished._id,
        examSubjectId: esMath._id,
        academicYearId: ay1._id,
        classId: class1._id,
        sectionId: section1._id,
        subjectId: subjectMath._id,
        studentId: studentB._id,
        marks: 50,
        grade: "D",
        isPassed: true,
        status: "DRAFT",
        enteredBy: adminId,
      },
    ]);

    // Test Report Cards List for Student A
    const resA = await getReportCards(makeRequest("/api/student/report-cards", tokenA));
    const jsonA = await resA.json();
    assert(resA.status === 200, "Student A can fetch report cards list");
    assert(jsonA.data.reportCards.length === 1, "Student A sees exactly 1 published report card");
    assert(jsonA.data.reportCards[0].examId === examPublished._id.toString(), "Published exam matches");
    assert(jsonA.data.reportCards[0].percentage === 90, "Aggregate percentage is computed correctly (90%)");
    assert(jsonA.data.reportCards[0].overallGrade === "A+", "Overall grade mapped correctly (A+)");
    assert(jsonA.data.reportCards[0].isPassed === true, "Student A passed");

    // Test Draft report cards not visible for Student B
    const resB = await getReportCards(makeRequest("/api/student/report-cards", tokenB));
    const jsonB = await resB.json();
    assert(resB.status === 200, "Student B can query report cards");
    assert(jsonB.data.reportCards.length === 0, "Draft results are not visible as published report cards to Student B");

    // Test Report Card Detail Endpoint
    const resDetailA = await getReportCardByExamId(
      makeRequest(`/api/student/report-cards/${examPublished._id}`, tokenA),
      { params: Promise.resolve({ examId: examPublished._id.toString() }) }
    );
    const jsonDetailA = await resDetailA.json();
    assert(resDetailA.status === 200, "Student A can view own published report card statement");
    assert(jsonDetailA.data.reportCard.student.name === "Alice Smith", "Student details populated accurately");
    assert(jsonDetailA.data.reportCard.academic.subjects.length === 2, "All evaluated subjects present");
    assert(jsonDetailA.data.reportCard.academic.totalObtainedMarks === 180, "Total marks matches (180/200)");

    // Test Draft report card detail access rejected (404)
    const resDetailDraft = await getReportCardByExamId(
      makeRequest(`/api/student/report-cards/${examDraft._id}`, tokenA),
      { params: Promise.resolve({ examId: examDraft._id.toString() }) }
    );
    assert(resDetailDraft.status === 404, "Access to unpublished/draft report card returns HTTP 404");

    // Test Cross-tenant student isolation (Student C from School 2 cannot view School 1 report card)
    const resDetailC = await getReportCardByExamId(
      makeRequest(`/api/student/report-cards/${examPublished._id}`, tokenC),
      { params: Promise.resolve({ examId: examPublished._id.toString() }) }
    );
    assert(resDetailC.status === 404, "Student C from School 2 cannot access School 1 report card");

    // Test PDF Generation and Download
    const resPdfA = await getReportCardPdf(
      makeRequest(`/api/student/report-cards/${examPublished._id}/pdf`, tokenA),
      { params: Promise.resolve({ examId: examPublished._id.toString() }) }
    );
    assert(resPdfA.status === 200, "Student A can download report card PDF");
    assert(resPdfA.headers.get("content-type") === "application/pdf", "PDF endpoint returns application/pdf content type");

    // Test PDF Cross-student / draft access rejected
    const resPdfDraft = await getReportCardPdf(
      makeRequest(`/api/student/report-cards/${examDraft._id}/pdf`, tokenA),
      { params: Promise.resolve({ examId: examDraft._id.toString() }) }
    );
    assert(resPdfDraft.status === 404, "PDF download for draft exam returns HTTP 404");

    // Test Unauthenticated request rejected (401)
    const resUnauth = await getReportCards(makeRequest("/api/student/report-cards", "invalid.jwt.token"));
    assert(resUnauth.status === 401, "Unauthenticated request to report cards returns 401");

    // Test Admin role rejected on student portal (403)
    const resAdminForbidden = await getReportCards(makeRequest("/api/student/report-cards", adminToken));
    assert(resAdminForbidden.status === 403, "ADMIN role forbidden on student report cards endpoint");

    // Test Mutations forbidden (405)
    const resPostForbidden = await postReportCards(makeRequest("/api/student/report-cards", tokenA, "POST"));
    assert(resPostForbidden.status === 405, "POST mutation returns HTTP 405 Method Not Allowed");

    console.log("\n--- PART 2: NOTIFICATIONS TESTS ---");

    // 1. Initial State: No notifications
    const resNotifEmpty = await getNotifications(makeRequest("/api/student/notifications", tokenA));
    const jsonNotifEmpty = await resNotifEmpty.json();
    assert(resNotifEmpty.status === 200, "Student A fetches notifications list");
    assert(jsonNotifEmpty.data.total === 0, "No initial notifications for Student A");

    // 2. Unread count endpoint
    const resUnreadEmpty = await getUnreadCount(makeRequest("/api/student/notifications/unread-count", tokenA));
    const jsonUnreadEmpty = await resUnreadEmpty.json();
    assert(resUnreadEmpty.status === 200, "Unread count returns 200");
    assert(jsonUnreadEmpty.data.unreadCount === 0, "Unread count is 0 initially");

    // 3. Create notifications for Student A and Student B
    const notifA1 = await Notification.create({
      schoolId: school1._id,
      recipientUserId: userA._id,
      type: "RESULT",
      title: "Report Card Published",
      message: "Your report card for Mid-Term Examination has been published.",
      referenceType: "EXAM",
      referenceId: examPublished._id.toString(),
      actionUrl: "/student/report-cards",
      isRead: false,
    });

    const notifA2 = await Notification.create({
      schoolId: school1._id,
      recipientUserId: userA._id,
      type: "NOTICE",
      title: "Annual Sports Day",
      message: "Sports day circular for Grade 10.",
      referenceType: "NOTICE",
      referenceId: "notice_123",
      actionUrl: "/student/notices",
      isRead: false,
    });

    // Notification for Student B (different student)
    const notifB1 = await Notification.create({
      schoolId: school1._id,
      recipientUserId: userB._id,
      type: "FEE",
      title: "Fee Reminder",
      message: "Term 2 fee invoice generated.",
      referenceType: "FEE",
      isRead: false,
    });

    // 4. Verify unread count for Student A
    const resUnreadA = await getUnreadCount(makeRequest("/api/student/notifications/unread-count", tokenA));
    const jsonUnreadA = await resUnreadA.json();
    assert(jsonUnreadA.data.unreadCount === 2, "Student A unread count is 2");

    // Verify unread count for Student B
    const resUnreadB = await getUnreadCount(makeRequest("/api/student/notifications/unread-count", tokenB));
    const jsonUnreadB = await resUnreadB.json();
    assert(jsonUnreadB.data.unreadCount === 1, "Student B unread count is 1");

    // 5. Test Filters (ALL, UNREAD, Category)
    const resAllA = await getNotifications(makeRequest("/api/student/notifications?filter=ALL", tokenA));
    const jsonAllA = await resAllA.json();
    assert(jsonAllA.data.notifications.length === 2, "Student A has 2 notifications in ALL filter");

    const resTypeFilter = await getNotifications(makeRequest("/api/student/notifications?type=RESULT", tokenA));
    const jsonTypeFilter = await resTypeFilter.json();
    assert(jsonTypeFilter.data.notifications.length === 1, "Type filter for RESULT returns exactly 1 notification");
    assert(jsonTypeFilter.data.notifications[0].type === "RESULT", "Returned notification is of type RESULT");

    // 6. Test Mark Single Notification as Read
    const resMarkRead = await markNotificationRead(
      makeRequest(`/api/student/notifications/${notifA1._id}/read`, tokenA, "POST"),
      { params: Promise.resolve({ notificationId: notifA1._id.toString() }) }
    );
    assert(resMarkRead.status === 200, "Mark notification as read returns HTTP 200");

    // Verify database state and unread count
    const updatedNotifA1 = await Notification.findById(notifA1._id).lean();
    assert(updatedNotifA1?.isRead === true, "Notification isRead is true in database");
    assert(updatedNotifA1?.readAt !== null, "Notification readAt is recorded");

    const resUnreadAfterMark = await getUnreadCount(makeRequest("/api/student/notifications/unread-count", tokenA));
    const jsonUnreadAfterMark = await resUnreadAfterMark.json();
    assert(jsonUnreadAfterMark.data.unreadCount === 1, "Unread count decreased to 1");

    // 7. Test Cross-Student Security (Student A cannot mark Student B's notification as read)
    const resCrossMark = await markNotificationRead(
      makeRequest(`/api/student/notifications/${notifB1._id}/read`, tokenA, "POST"),
      { params: Promise.resolve({ notificationId: notifB1._id.toString() }) }
    );
    assert(resCrossMark.status === 404, "Cross-student mark read rejected with HTTP 404");

    const unaffectedNotifB = await Notification.findById(notifB1._id).lean();
    assert(unaffectedNotifB?.isRead === false, "Student B notification remains unread (isolation enforced)");

    // 8. Test Mark All as Read
    const resMarkAll = await markAllNotificationsRead(
      makeRequest("/api/student/notifications/read-all", tokenA, "POST")
    );
    assert(resMarkAll.status === 200, "Mark all as read returns HTTP 200");

    const resUnreadAfterMarkAll = await getUnreadCount(makeRequest("/api/student/notifications/unread-count", tokenA));
    const jsonUnreadAfterMarkAll = await resUnreadAfterMarkAll.json();
    assert(jsonUnreadAfterMarkAll.data.unreadCount === 0, "Student A unread count is now 0");

    // Student B's unread count should still be 1 (unaffected by Student A's mark all as read)
    const resUnreadBCheck = await getUnreadCount(makeRequest("/api/student/notifications/unread-count", tokenB));
    const jsonUnreadBCheck = await resUnreadBCheck.json();
    assert(jsonUnreadBCheck.data.unreadCount === 1, "Student B's unread count unaffected by Student A mark-all-read");

    // 9. Test Admin Publishing Dispatches In-App Notification
    const resAdminPublish = await updateAdminExamResults(
      makeRequest(`/api/admin/exams/${examPublished._id}/results`, adminToken, "PATCH", {
        status: "PUBLISHED",
        classId: class1._id.toString(),
      }),
      { params: Promise.resolve({ examId: examPublished._id.toString() }) }
    );
    assert(resAdminPublish.status === 200, "Admin publishing results returns HTTP 200");

    // Check if notification was dispatched to Student A / Student B
    const publishedNotifs = await Notification.find({
      schoolId: school1._id,
      type: "RESULT",
      referenceType: "EXAM",
      referenceId: examPublished._id.toString(),
    }).lean();
    assert(publishedNotifs.length >= 1, "Admin publishing successfully generated in-app student notifications");

    console.log("\n============================================================");
    console.log(`📊 FINAL RESULTS: ${passed} PASSED, ${failed} FAILED`);
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

runFinalIntegrationTestSuite();
