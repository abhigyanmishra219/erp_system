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

async function runS6TestSuite() {
  console.log("============================================================");
  console.log("🧪 STARTING S6: STUDENT REPORT CARDS TEST SUITE");
  console.log("============================================================\n");

  const mongoose: any = (await import("mongoose")).default;
  const connectToDatabase: any = (await import("./src/lib/db")).default;
  const User: any = (await import("./src/models/User")).default;
  const School: any = (await import("./src/models/School")).default;
  const AcademicYear: any = (await import("./src/models/AcademicYear")).default;
  const Class: any = (await import("./src/models/Class")).default;
  const Section: any = (await import("./src/models/Section")).default;
  const Subject: any = (await import("./src/models/Subject")).default;
  const Student: any = (await import("./src/models/Student")).default;
  const Teacher: any = (await import("./src/models/Teacher")).default;
  const Exam: any = (await import("./src/models/Exam")).default;
  const ExamTarget: any = (await import("./src/models/ExamTarget")).default;
  const ExamSubject: any = (await import("./src/models/ExamSubject")).default;
  const ExamResult: any = (await import("./src/models/ExamResult")).default;
  const Attendance: any = (await import("./src/models/Attendance")).default;

  const { createToken } = await import("./src/lib/jwt");
  const { GET: getReportCards, POST: postReportCards, PUT: putReportCards, DELETE: deleteReportCards, PATCH: patchReportCards } = (await import("./src/app/api/student/report-cards/route")) as any;
  const { GET: getReportCardByExamId, POST: postRCById, PUT: putRCById, DELETE: deleteRCById, PATCH: patchRCById } = (await import("./src/app/api/student/report-cards/[examId]/route")) as any;
  const { GET: getReportCardPdf, POST: postPdf, PUT: putPdf, DELETE: deletePdf, PATCH: patchPdf } = (await import("./src/app/api/student/report-cards/[examId]/pdf/route")) as any;

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
    // 1. Setup School 1 & Academic Year
    const school1 = await School.create({
      name: `S6 Grand Academy ${timestamp}`,
      code: `S6_${timestamp}`,
      status: "ACTIVE",
      address: "100 Oxford Street",
      city: "London",
      state: "Greater London",
      country: "United Kingdom",
      phone: "+44 20 7946 0912",
      email: `s6_school1_${timestamp}@example.com`,
      website: "https://example.com/school",
      plan: "STANDARD",
      studentLimit: 500,
      subscriptionStartDate: new Date(),
      subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
      subscriptionStatus: "ACTIVE",
      gradingSettings: {
        gradingType: "PERCENTAGE",
        scales: [
          { grade: "A+", minPercentage: 90, maxPercentage: 100, description: "Outstanding" },
          { grade: "A", minPercentage: 80, maxPercentage: 89.99, description: "Excellent" },
          { grade: "B+", minPercentage: 70, maxPercentage: 79.99, description: "Very Good" },
          { grade: "B", minPercentage: 60, maxPercentage: 69.99, description: "Good" },
          { grade: "C", minPercentage: 50, maxPercentage: 59.99, description: "Average" },
          { grade: "D", minPercentage: 40, maxPercentage: 49.99, description: "Pass" },
          { grade: "F", minPercentage: 0, maxPercentage: 39.99, description: "Fail" },
        ],
      },
      createdBy: adminId,
      updatedBy: adminId,
    });

    const academicYear1 = await AcademicYear.create({
      schoolId: school1._id,
      name: `2026-2027 ${timestamp}`,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Class 10-A
    const class10A = await Class.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      name: `Class 10-${timestamp}`,
      code: `C10_${timestamp}`.slice(0, 10),
      createdBy: adminId,
      updatedBy: adminId,
    });

    const section10A = await Section.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      classId: class10A._id,
      name: "A",
      capacity: 35,
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Class 9-B (for isolation)
    const class9B = await Class.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      name: `Class 9-${timestamp}`,
      code: `C9_${timestamp}`.slice(0, 10),
      createdBy: adminId,
      updatedBy: adminId,
    });

    const section9B = await Section.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      classId: class9B._id,
      name: "B",
      capacity: 30,
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Subjects
    const subjectMath = await Subject.create({
      schoolId: school1._id,
      name: `Mathematics ${timestamp}`,
      code: `MATH_${timestamp}`.slice(0, 10),
      type: "THEORY",
      createdBy: adminId,
      updatedBy: adminId,
    });

    const subjectScience = await Subject.create({
      schoolId: school1._id,
      name: `Science ${timestamp}`,
      code: `SCI_${timestamp}`.slice(0, 10),
      type: "THEORY",
      createdBy: adminId,
      updatedBy: adminId,
    });

    const subjectEnglish = await Subject.create({
      schoolId: school1._id,
      name: `English ${timestamp}`,
      code: `ENG_${timestamp}`.slice(0, 10),
      type: "THEORY",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Teacher
    const teacherUser = await User.create({
      email: `teacher_s6_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "TEACHER",
      schoolId: school1._id,
      status: "ACTIVE",
    });

    // Student A in Class 10-A
    const userA = await User.create({
      email: `studentA_s6_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "STUDENT",
      schoolId: school1._id,
      status: "ACTIVE",
    });

    const studentA = await Student.create({
      schoolId: school1._id,
      userId: userA._id,
      admissionNumber: `ADM-S6A-${timestamp}`.slice(0, 15),
      studentId: `STU-S6A-${timestamp}`.slice(0, 15),
      firstName: "Arya",
      lastName: "Stark",
      dateOfBirth: new Date("2010-05-12"),
      gender: "FEMALE",
      academicYearId: academicYear1._id,
      classId: class10A._id,
      sectionId: section10A._id,
      admissionDate: new Date("2024-04-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Student B in Class 9-B
    const userB = await User.create({
      email: `studentB_s6_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "STUDENT",
      schoolId: school1._id,
      status: "ACTIVE",
    });

    const studentB = await Student.create({
      schoolId: school1._id,
      userId: userB._id,
      admissionNumber: `ADM-S6B-${timestamp}`.slice(0, 15),
      studentId: `STU-S6B-${timestamp}`.slice(0, 15),
      firstName: "Bran",
      lastName: "Stark",
      dateOfBirth: new Date("2011-08-20"),
      gender: "MALE",
      academicYearId: academicYear1._id,
      classId: class9B._id,
      sectionId: section9B._id,
      admissionDate: new Date("2024-04-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // 2. Setup Attendance Records for Student A (Total: 20 days, 18 present, 2 absent -> 90%)
    for (let d = 1; d <= 20; d++) {
      await Attendance.create({
        schoolId: school1._id,
        academicYearId: academicYear1._id,
        classId: class10A._id,
        sectionId: section10A._id,
        studentId: studentA._id,
        date: new Date(`2026-09-${d < 10 ? `0${d}` : d}`),
        status: d <= 18 ? "PRESENT" : "ABSENT",
        markedBy: adminId,
        createdBy: adminId,
        updatedBy: adminId,
      });
    }

    // 3. Create Exams
    // Exam 1: Midterm Examination (Published for Student A)
    const examMidterm = await Exam.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      name: `Term 1 Assessment ${timestamp}`,
      description: "First terminal assessment.",
      startDate: new Date("2026-10-10"),
      endDate: new Date("2026-10-20"),
      status: "PUBLISHED",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    await ExamTarget.create({
      schoolId: school1._id,
      examId: examMidterm._id,
      academicYearId: academicYear1._id,
      classId: class10A._id,
      sectionId: section10A._id,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    const esMath = await ExamSubject.create({
      schoolId: school1._id,
      examId: examMidterm._id,
      academicYearId: academicYear1._id,
      classId: class10A._id,
      subjectId: subjectMath._id,
      examDate: new Date("2026-10-12"),
      maximumMarks: 100,
      passingMarks: 40,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    const esScience = await ExamSubject.create({
      schoolId: school1._id,
      examId: examMidterm._id,
      academicYearId: academicYear1._id,
      classId: class10A._id,
      subjectId: subjectScience._id,
      examDate: new Date("2026-10-15"),
      maximumMarks: 100,
      passingMarks: 40,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    const esEnglish = await ExamSubject.create({
      schoolId: school1._id,
      examId: examMidterm._id,
      academicYearId: academicYear1._id,
      classId: class10A._id,
      subjectId: subjectEnglish._id,
      examDate: new Date("2026-10-18"),
      maximumMarks: 100,
      passingMarks: 40,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Exam 2: Term 2 Exam (Draft / Unpublished for Student A)
    const examTerm2 = await Exam.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      name: `Term 2 Assessment ${timestamp}`,
      description: "Second terminal assessment.",
      startDate: new Date("2027-01-10"),
      endDate: new Date("2027-01-20"),
      status: "ONGOING",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    await ExamTarget.create({
      schoolId: school1._id,
      examId: examTerm2._id,
      academicYearId: academicYear1._id,
      classId: class10A._id,
      sectionId: section10A._id,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    const esTerm2Math = await ExamSubject.create({
      schoolId: school1._id,
      examId: examTerm2._id,
      academicYearId: academicYear1._id,
      classId: class10A._id,
      subjectId: subjectMath._id,
      examDate: new Date("2027-01-12"),
      maximumMarks: 100,
      passingMarks: 40,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    // 4. Create Exam Results
    // Midterm Results for Student A (Arya): PUBLISHED
    // Marks: Math: 96, Science: 88, English: 92 -> Total: 276 / 300 = 92% -> A+, Passed
    await ExamResult.create({
      schoolId: school1._id,
      examId: examMidterm._id,
      examSubjectId: esMath._id,
      academicYearId: academicYear1._id,
      studentId: studentA._id,
      classId: class10A._id,
      sectionId: section10A._id,
      subjectId: subjectMath._id,
      marks: 96,
      grade: "A+",
      isPassed: true,
      remarks: "Exceptional mastery.",
      status: "PUBLISHED",
      enteredBy: teacherUser._id,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      publishedAt: new Date(),
    });

    await ExamResult.create({
      schoolId: school1._id,
      examId: examMidterm._id,
      examSubjectId: esScience._id,
      academicYearId: academicYear1._id,
      studentId: studentA._id,
      classId: class10A._id,
      sectionId: section10A._id,
      subjectId: subjectScience._id,
      marks: 88,
      grade: "A",
      isPassed: true,
      remarks: "Very solid grasp.",
      status: "PUBLISHED",
      enteredBy: teacherUser._id,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      publishedAt: new Date(),
    });

    await ExamResult.create({
      schoolId: school1._id,
      examId: examMidterm._id,
      examSubjectId: esEnglish._id,
      academicYearId: academicYear1._id,
      studentId: studentA._id,
      classId: class10A._id,
      sectionId: section10A._id,
      subjectId: subjectEnglish._id,
      marks: 92,
      grade: "A+",
      isPassed: true,
      remarks: "Superb comprehension.",
      status: "PUBLISHED",
      enteredBy: teacherUser._id,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      publishedAt: new Date(),
    });

    // Term 2 Results for Student A: DRAFT (Teacher entered 90 in Math, but UNPUBLISHED)
    await ExamResult.create({
      schoolId: school1._id,
      examId: examTerm2._id,
      examSubjectId: esTerm2Math._id,
      academicYearId: academicYear1._id,
      studentId: studentA._id,
      classId: class10A._id,
      sectionId: section10A._id,
      subjectId: subjectMath._id,
      marks: 90,
      grade: "A+",
      isPassed: true,
      remarks: "Draft entered by teacher.",
      status: "DRAFT",
      enteredBy: teacherUser._id,
    });

    // Tokens
    const tokenA = createToken({
      userId: userA._id.toString(),
      email: userA.email,
      role: "STUDENT",
    });

    const tokenB = createToken({
      userId: userB._id.toString(),
      email: userB.email,
      role: "STUDENT",
    });

    console.log("--- 1. Testing Student Report Cards List (/api/student/report-cards) ---");
    const listResA = await getReportCards(makeRequest("/api/student/report-cards", tokenA));
    const listDataA = await listResA.json();

    assert(listResA.status === 200, "Student A report cards list returns HTTP 200");
    assert(listDataA.success === true, "Response success is true");
    assert(listDataA.data.summary.totalPublishedReportCards === 1, "Student A has 1 published report card (Term 1)");
    assert(listDataA.data.reportCards.length === 1, "1 report card returned in array");

    const rcItem = listDataA.data.reportCards[0];
    assert(rcItem.examId === examMidterm._id.toString(), "Report card exam ID matches Term 1");
    assert(rcItem.examName.includes("Term 1 Assessment"), "Report card exam name matches");
    assert(rcItem.totalObtainedMarks === 276, "Total marks obtained is 276 (96 + 88 + 92)");
    assert(rcItem.totalMaximumMarks === 300, "Total max marks is 300");
    assert(rcItem.percentage === 92, "Overall percentage is 92%");
    assert(rcItem.overallGrade === "A+", "Overall grade is A+");
    assert(rcItem.isPassed === true, "isPassed is true");
    assert(rcItem.totalSubjects === 3, "Total subjects is 3");
    assert(rcItem.attendancePercentage === 90, "Attendance percentage integrated accurately (90%)");
    assert(rcItem.resultStatus === "PUBLISHED", "Result status is PUBLISHED");

    console.log("\n--- 2. Testing Publication Rule: Unpublished Report Cards Hidden ---");
    assert(
      !listDataA.data.reportCards.some((rc: any) => rc.examId === examTerm2._id.toString()),
      "Term 2 (DRAFT results) is NOT present in student report cards list"
    );

    // Direct single report card query for Term 2 (Unpublished)
    const term2ResA = await getReportCardByExamId(
      makeRequest(`/api/student/report-cards/${examTerm2._id}`, tokenA),
      { params: Promise.resolve({ examId: examTerm2._id.toString() }) }
    );
    assert(term2ResA.status === 404, "Direct fetch for unpublished report card returns HTTP 404");

    console.log("\n--- 3. Testing Single Report Card Content & Product Spec (/api/student/report-cards/[examId]) ---");
    const singleResA = await getReportCardByExamId(
      makeRequest(`/api/student/report-cards/${examMidterm._id}`, tokenA),
      { params: Promise.resolve({ examId: examMidterm._id.toString() }) }
    );
    const singleDataA = await singleResA.json();

    assert(singleResA.status === 200, "Single report card returns HTTP 200");
    const rc = singleDataA.data.reportCard;

    // Verify all specified fields:
    assert(rc.school.name.includes("S6 Grand Academy"), "School name is present");
    assert(rc.student.name === "Arya Stark", "Student name is Arya Stark");
    assert(rc.student.admissionNumber.includes("ADM-S6A"), "Admission number is present");
    assert(rc.student.class.name.includes("Class 10"), "Class name is Class 10");
    assert(rc.student.section.name === "A", "Section name is A");
    assert(Array.isArray(rc.academic.subjects) && rc.academic.subjects.length === 3, "3 subjects present in evaluation table");

    const mathEval = rc.academic.subjects.find((s: any) => s.subjectId === subjectMath._id.toString());
    assert(mathEval !== undefined, "Math subject present in table");
    assert(mathEval.marks === 96, "Math obtained marks is 96");
    assert(mathEval.maximumMarks === 100, "Math max marks is 100");
    assert(mathEval.passingMarks === 40, "Math pass marks is 40");
    assert(mathEval.grade === "A+", "Math grade is A+");
    assert(mathEval.remarks === "Exceptional mastery.", "Math remarks present");

    assert(rc.academic.totalObtainedMarks === 276, "Grand total obtained marks is 276");
    assert(rc.academic.totalMaximumMarks === 300, "Grand total maximum marks is 300");
    assert(rc.academic.percentage === 92, "Percentage is 92%");
    assert(rc.academic.overallGrade === "A+", "Overall grade is A+");
    assert(rc.academic.isPassed === true, "Academic pass status is true");
    assert(rc.attendance.attendancePercentage === 90, "Attendance percentage is 90%");
    assert(rc.attendance.present === 18 && rc.attendance.totalSessions === 20, "Attendance count matches (18/20)");

    console.log("\n--- 4. Testing Access Control & Cross-Student Security ---");
    // Student B attempts to query report cards list
    const listResB = await getReportCards(makeRequest("/api/student/report-cards", tokenB));
    const listDataB = await listResB.json();
    assert(listDataB.data.summary.totalPublishedReportCards === 0, "Student B has 0 published report cards");
    assert(listDataB.data.reportCards.length === 0, "Student B report cards list is empty");

    // Student B attempts to access Student A's Term 1 report card
    const singleResB = await getReportCardByExamId(
      makeRequest(`/api/student/report-cards/${examMidterm._id}`, tokenB),
      { params: Promise.resolve({ examId: examMidterm._id.toString() }) }
    );
    assert(singleResB.status === 404, "Student B cannot view Student A report card (HTTP 404)");

    console.log("\n--- 5. Testing PDF Generation & Download (/api/student/report-cards/[examId]/pdf) ---");
    const pdfResA = await getReportCardPdf(
      makeRequest(`/api/student/report-cards/${examMidterm._id}/pdf`, tokenA),
      { params: Promise.resolve({ examId: examMidterm._id.toString() }) }
    );

    assert(pdfResA.status === 200, "PDF endpoint returns HTTP 200");
    assert(pdfResA.headers.get("content-type") === "application/pdf", "Content-Type is application/pdf");
    assert(pdfResA.headers.get("content-disposition")?.includes("attachment"), "Content-Disposition is attachment");

    const pdfArrayBuffer = await pdfResA.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);
    assert(pdfBuffer.length > 1000, "Generated PDF buffer is non-empty and well-sized");
    assert(pdfBuffer.toString("utf-8", 0, 5) === "%PDF-", "PDF buffer begins with standard %PDF- header");

    // Student B attempting to download Student A PDF
    const pdfResB = await getReportCardPdf(
      makeRequest(`/api/student/report-cards/${examMidterm._id}/pdf`, tokenB),
      { params: Promise.resolve({ examId: examMidterm._id.toString() }) }
    );
    assert(pdfResB.status === 404, "Student B cannot download Student A PDF (HTTP 404)");

    console.log("\n--- 6. Testing Read-Only Security Enforcement (HTTP 405) ---");
    // Report cards list endpoint
    assert((await postReportCards()).status === 405, "POST /api/student/report-cards rejected with 405");
    assert((await putReportCards()).status === 405, "PUT /api/student/report-cards rejected with 405");
    assert((await patchReportCards()).status === 405, "PATCH /api/student/report-cards rejected with 405");
    assert((await deleteReportCards()).status === 405, "DELETE /api/student/report-cards rejected with 405");

    // Single report card endpoint
    assert((await postRCById()).status === 405, "POST /api/student/report-cards/[id] rejected with 405");
    assert((await putRCById()).status === 405, "PUT /api/student/report-cards/[id] rejected with 405");
    assert((await patchRCById()).status === 405, "PATCH /api/student/report-cards/[id] rejected with 405");
    assert((await deleteRCById()).status === 405, "DELETE /api/student/report-cards/[id] rejected with 405");

    // PDF endpoint
    assert((await postPdf()).status === 405, "POST /api/student/report-cards/[id]/pdf rejected with 405");
    assert((await putPdf()).status === 405, "PUT /api/student/report-cards/[id]/pdf rejected with 405");
    assert((await patchPdf()).status === 405, "PATCH /api/student/report-cards/[id]/pdf rejected with 405");
    assert((await deletePdf()).status === 405, "DELETE /api/student/report-cards/[id]/pdf rejected with 405");

    // Clean up test data
    await Promise.all([
      School.findByIdAndDelete(school1._id),
      AcademicYear.deleteMany({ schoolId: school1._id }),
      Class.deleteMany({ schoolId: school1._id }),
      Section.deleteMany({ schoolId: school1._id }),
      Subject.deleteMany({ schoolId: school1._id }),
      User.deleteMany({ schoolId: school1._id }),
      Student.deleteMany({ schoolId: school1._id }),
      Exam.deleteMany({ schoolId: school1._id }),
      ExamTarget.deleteMany({ schoolId: school1._id }),
      ExamSubject.deleteMany({ schoolId: school1._id }),
      ExamResult.deleteMany({ schoolId: school1._id }),
      Attendance.deleteMany({ schoolId: school1._id }),
    ]);

    console.log("\n============================================================");
    console.log(`📊 S6 TEST SUITE COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log("============================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error("❌ Fatal Error in S6 test suite:", err);
    process.exit(1);
  }
}

runS6TestSuite();
