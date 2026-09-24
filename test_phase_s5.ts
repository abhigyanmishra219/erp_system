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

async function runS5TestSuite() {
  console.log("============================================================");
  console.log("🧪 STARTING S5: STUDENT EXAMS + RESULTS TEST SUITE");
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

  const { createToken } = await import("./src/lib/jwt");
  const { GET: getStudentExams, POST: postStudentExams, PUT: putStudentExams, DELETE: deleteStudentExams, PATCH: patchStudentExams } = (await import("./src/app/api/student/exams/route")) as any;
  const { GET: getStudentExamById, POST: postExamById, PUT: putExamById, DELETE: deleteExamById, PATCH: patchExamById } = (await import("./src/app/api/student/exams/[examId]/route")) as any;
  const { GET: getStudentResults, POST: postStudentResults, PUT: putStudentResults, DELETE: deleteStudentResults, PATCH: patchStudentResults } = (await import("./src/app/api/student/results/route")) as any;
  const { GET: getStudentResultByExamId, POST: postResultByExamId, PUT: putResultByExamId, DELETE: deleteResultByExamId, PATCH: patchResultByExamId } = (await import("./src/app/api/student/results/[examId]/route")) as any;

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
      name: `S5 Academy ${timestamp}`,
      code: `S5_${timestamp}`,
      status: "ACTIVE",
      address: "500 Exam Ave",
      city: "Bangalore",
      state: "Karnataka",
      country: "India",
      phone: "1234567890",
      email: `s5_school1_${timestamp}@example.com`,
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

    // School 2 (For multi-tenant isolation testing)
    const school2 = await School.create({
      name: `S5 Academy Other ${timestamp}`,
      code: `S5B_${timestamp}`,
      status: "ACTIVE",
      address: "600 Other Ave",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      phone: "9876543210",
      email: `s5_school2_${timestamp}@example.com`,
      plan: "STANDARD",
      studentLimit: 500,
      subscriptionStartDate: new Date(),
      subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
      subscriptionStatus: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Class 10-A in School 1
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

    // Class 9-B in School 1 (for class scope isolation)
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

    // Subjects in School 1
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
      email: `teacher_s5_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "TEACHER",
      schoolId: school1._id,
      status: "ACTIVE",
    });

    // Student A in Class 10-A
    const userA = await User.create({
      email: `studentA_s5_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "STUDENT",
      schoolId: school1._id,
      status: "ACTIVE",
    });

    const studentA = await Student.create({
      schoolId: school1._id,
      userId: userA._id,
      admissionNumber: `ADM-S5A-${timestamp}`.slice(0, 15),
      studentId: `STU-S5A-${timestamp}`.slice(0, 15),
      firstName: "Hermione",
      lastName: "Granger",
      dateOfBirth: new Date("2010-09-19"),
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
      email: `studentB_s5_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "STUDENT",
      schoolId: school1._id,
      status: "ACTIVE",
    });

    const studentB = await Student.create({
      schoolId: school1._id,
      userId: userB._id,
      admissionNumber: `ADM-S5B-${timestamp}`.slice(0, 15),
      studentId: `STU-S5B-${timestamp}`.slice(0, 15),
      firstName: "Harry",
      lastName: "Potter",
      dateOfBirth: new Date("2011-07-31"),
      gender: "MALE",
      academicYearId: academicYear1._id,
      classId: class9B._id,
      sectionId: section9B._id,
      admissionDate: new Date("2024-04-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Student C in Class 10-A (Peer of Student A)
    const userC = await User.create({
      email: `studentC_s5_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "STUDENT",
      schoolId: school1._id,
      status: "ACTIVE",
    });

    const studentC = await Student.create({
      schoolId: school1._id,
      userId: userC._id,
      admissionNumber: `ADM-S5C-${timestamp}`.slice(0, 15),
      studentId: `STU-S5C-${timestamp}`.slice(0, 15),
      firstName: "Neville",
      lastName: "Longbottom",
      dateOfBirth: new Date("2010-07-30"),
      gender: "MALE",
      academicYearId: academicYear1._id,
      classId: class10A._id,
      sectionId: section10A._id,
      admissionDate: new Date("2024-04-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // 2. Create Exams
    // Exam 1: Midterm Examination (Targeted to Class 10-A only)
    const examMidterm = await Exam.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      name: `Midterm Examination ${timestamp}`,
      description: "Comprehensive mid-semester examination.",
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

    // ExamSubjects for Midterm (Math, Science, English)
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

    // Exam 2: Unit Test (Targeted to Class 9-B only)
    const examUnitTest = await Exam.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      name: `Class 9 Unit Test ${timestamp}`,
      description: "Class 9 specific unit test.",
      startDate: new Date("2026-11-01"),
      endDate: new Date("2026-11-05"),
      status: "SCHEDULED",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    await ExamTarget.create({
      schoolId: school1._id,
      examId: examUnitTest._id,
      academicYearId: academicYear1._id,
      classId: class9B._id,
      sectionId: section9B._id,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Exam 3: Final Examination (Class 10-A, but results in DRAFT / REVIEWED state)
    const examFinal = await Exam.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      name: `Final Examination ${timestamp}`,
      description: "End of year final exam.",
      startDate: new Date("2027-02-15"),
      endDate: new Date("2027-02-28"),
      status: "ONGOING",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    await ExamTarget.create({
      schoolId: school1._id,
      examId: examFinal._id,
      academicYearId: academicYear1._id,
      classId: class10A._id,
      sectionId: section10A._id,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    const esFinalMath = await ExamSubject.create({
      schoolId: school1._id,
      examId: examFinal._id,
      academicYearId: academicYear1._id,
      classId: class10A._id,
      subjectId: subjectMath._id,
      examDate: new Date("2027-02-16"),
      maximumMarks: 100,
      passingMarks: 40,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });

    // 3. Setup Results & Workflow
    // Midterm Results for Student A (Hermione): PUBLISHED (Math: 95, Science: 92, English: 88)
    // Hermione aggregate: (95 + 92 + 88) / 300 = 275 / 300 = 91.67% -> A+, Passed
    await ExamResult.create({
      schoolId: school1._id,
      examId: examMidterm._id,
      examSubjectId: esMath._id,
      academicYearId: academicYear1._id,
      studentId: studentA._id,
      classId: class10A._id,
      sectionId: section10A._id,
      subjectId: subjectMath._id,
      marks: 95,
      grade: "A+",
      isPassed: true,
      remarks: "Outstanding algebraic intuition.",
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
      marks: 92,
      grade: "A+",
      isPassed: true,
      remarks: "Excellent theoretical understanding.",
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
      marks: 88,
      grade: "A",
      isPassed: true,
      remarks: "Very articulate essays.",
      status: "PUBLISHED",
      enteredBy: teacherUser._id,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      publishedAt: new Date(),
    });

    // Midterm Results for Student C (Neville): PUBLISHED (Math: 45, Science: 55, English: 50)
    await ExamResult.create({
      schoolId: school1._id,
      examId: examMidterm._id,
      examSubjectId: esMath._id,
      academicYearId: academicYear1._id,
      studentId: studentC._id,
      classId: class10A._id,
      sectionId: section10A._id,
      subjectId: subjectMath._id,
      marks: 45,
      grade: "D",
      isPassed: true,
      remarks: "Passed, needs more practice.",
      status: "PUBLISHED",
      enteredBy: teacherUser._id,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      publishedAt: new Date(),
    });

    // UNPUBLISHED Results: Final Exam for Student A (Hermione)
    // Teacher entered marks (98 in Math), but status is DRAFT / REVIEWED -> NOT PUBLISHED!
    await ExamResult.create({
      schoolId: school1._id,
      examId: examFinal._id,
      examSubjectId: esFinalMath._id,
      academicYearId: academicYear1._id,
      studentId: studentA._id,
      classId: class10A._id,
      sectionId: section10A._id,
      subjectId: subjectMath._id,
      marks: 98,
      grade: "A+",
      isPassed: true,
      remarks: "Draft entered by teacher, not yet published.",
      status: "DRAFT", // Teacher entered marks, not published
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

    const tokenC = createToken({
      userId: userC._id.toString(),
      email: userC.email,
      role: "STUDENT",
    });

    console.log("--- 1. Testing PART A: Student A Exams & Schedule (/api/student/exams) ---");
    const examsResA = await getStudentExams(makeRequest("/api/student/exams", tokenA));
    const examsDataA = await examsResA.json();

    assert(examsResA.status === 200, "Student A exams API returns HTTP 200");
    assert(examsDataA.success === true, "Response success flag is true");
    assert(examsDataA.data.academicContext.class._id === class10A._id.toString(), "Academic context matches Student A's Class 10");
    assert(examsDataA.data.academicContext.section._id === section10A._id.toString(), "Academic context matches Section A");
    assert(examsDataA.data.summary.total === 2, "Student A has 2 exams targeted (Midterm and Final)");
    assert(examsDataA.data.exams.length === 2, "2 exams returned in list");

    const midtermExamObj = examsDataA.data.exams.find((e: any) => e._id === examMidterm._id.toString());
    assert(midtermExamObj !== undefined, "Midterm Exam is present in Student A list");
    assert(midtermExamObj.name.includes("Midterm Examination"), "Exam name matches");
    assert(midtermExamObj.schedule.length === 3, "Midterm exam has 3 scheduled subjects in datesheet");

    const mathSchedule = midtermExamObj.schedule.find((s: any) => s.subjectId === subjectMath._id.toString());
    assert(mathSchedule !== undefined, "Math is scheduled in Midterm");
    assert(mathSchedule.maximumMarks === 100, "Math maximum marks is 100");
    assert(mathSchedule.passingMarks === 40, "Math passing marks is 40");
    assert(mathSchedule.examDate !== null, "Math examDate is specified");

    console.log("\n--- 2. Testing PART A: Class Scoping & Isolation ---");
    // Student B in Class 9-B accesses /api/student/exams
    const examsResB = await getStudentExams(makeRequest("/api/student/exams", tokenB));
    const examsDataB = await examsResB.json();

    assert(examsResB.status === 200, "Student B exams API returns HTTP 200");
    assert(examsDataB.data.summary.total === 1, "Student B only sees 1 exam (Class 9 Unit Test)");
    assert(examsDataB.data.exams[0]._id === examUnitTest._id.toString(), "Student B sees Unit Test targeted to Class 9-B");
    assert(!examsDataB.data.exams.some((e: any) => e._id === examMidterm._id.toString()), "Class 10 Midterm is NOT visible to Student B");

    console.log("\n--- 3. Testing PART A: Single Exam Details (/api/student/exams/[examId]) ---");
    const singleExamResA = await getStudentExamById(
      makeRequest(`/api/student/exams/${examMidterm._id}`, tokenA),
      { params: Promise.resolve({ examId: examMidterm._id.toString() }) }
    );
    const singleExamDataA = await singleExamResA.json();
    assert(singleExamResA.status === 200, "Student A can view targeted exam details (HTTP 200)");
    assert(singleExamDataA.data.name.includes("Midterm"), "Exam details match Midterm");
    assert(singleExamDataA.data.schedule.length === 3, "Datesheet contains 3 subjects");

    // Student B attempts to access Class 10 Midterm -> Should return 404
    const singleExamResB = await getStudentExamById(
      makeRequest(`/api/student/exams/${examMidterm._id}`, tokenB),
      { params: Promise.resolve({ examId: examMidterm._id.toString() }) }
    );
    assert(singleExamResB.status === 404, "Student B cannot view Class 10 Midterm (HTTP 404 Not Found)");

    console.log("\n--- 4. Testing PART B: Published Results & Calculation Engine (/api/student/results) ---");
    const resultsResA = await getStudentResults(makeRequest("/api/student/results", tokenA));
    const resultsDataA = await resultsResA.json();

    assert(resultsResA.status === 200, "Student A results API returns HTTP 200");
    assert(resultsDataA.success === true, "Results response success is true");
    assert(resultsDataA.data.summary.totalPublishedExams === 1, "Student A has exactly 1 published exam result (Midterm)");
    assert(resultsDataA.data.examResults.length === 1, "1 exam result returned");

    const midtermResult = resultsDataA.data.examResults[0];
    assert(midtermResult.exam._id === examMidterm._id.toString(), "Published result is for Midterm");
    assert(midtermResult.totalObtainedMarks === 275, "Total obtained marks is 275 (95 + 92 + 88)");
    assert(midtermResult.totalMaximumMarks === 300, "Total maximum marks is 300");
    assert(midtermResult.percentage === 91.67, "Percentage calculated accurately: 91.67%");
    assert(midtermResult.overallGrade === "A+", "Overall grade calculated via ResultCalculationService: A+");
    assert(midtermResult.isPassed === true, "isPassed is true");
    assert(midtermResult.statusText === "PASSED", "statusText is PASSED");
    assert(midtermResult.subjects.length === 3, "All 3 evaluated subjects present");

    const mathSub = midtermResult.subjects.find((s: any) => s.subjectId === subjectMath._id.toString());
    assert(mathSub.marks === 95, "Math marks is 95");
    assert(mathSub.maximumMarks === 100, "Math maximum marks is 100");
    assert(mathSub.percentage === 95, "Math percentage is 95%");
    assert(mathSub.grade === "A+", "Math grade is A+");
    assert(mathSub.isPassed === true, "Math pass/fail is true");
    assert(mathSub.remarks === "Outstanding algebraic intuition.", "Remarks are displayed");

    console.log("\n--- 5. Testing PART B & RULE 3: Publication Rule (DRAFT/UNPUBLISHED Results are Hidden) ---");
    // Hermione took Final Exam, teacher entered 98 in Math, but status is DRAFT.
    // Ensure Final Exam is NOT present in student results list.
    assert(
      !resultsDataA.data.examResults.some((r: any) => r.exam._id === examFinal._id.toString()),
      "Final Exam (DRAFT marks) is NOT visible to student in /api/student/results"
    );

    // Attempting direct single exam result fetch for unpublished Final Exam
    const finalResultResA = await getStudentResultByExamId(
      makeRequest(`/api/student/results/${examFinal._id}`, tokenA),
      { params: Promise.resolve({ examId: examFinal._id.toString() }) }
    );
    assert(finalResultResA.status === 404, "Direct fetch for unpublished result returns HTTP 404");

    console.log("\n--- 6. Testing PART B: Single Published Result Statement (/api/student/results/[examId]) ---");
    const singleResultResA = await getStudentResultByExamId(
      makeRequest(`/api/student/results/${examMidterm._id}`, tokenA),
      { params: Promise.resolve({ examId: examMidterm._id.toString() }) }
    );
    const singleResultDataA = await singleResultResA.json();
    assert(singleResultResA.status === 200, "Student A can view own published Midterm statement (HTTP 200)");
    assert(singleResultDataA.data.totalObtainedMarks === 275, "Marks statement has 275 total obtained");
    assert(singleResultDataA.data.overallGrade === "A+", "Letter grade is A+");
    assert(singleResultDataA.data.subjects.length === 3, "3 subjects present in marks statement");

    console.log("\n--- 7. Testing SECURITY: Student A cannot access Student B / C Results ---");
    // Student B (Harry) attempts to fetch published Midterm results
    const resultsResB = await getStudentResults(makeRequest("/api/student/results", tokenB));
    const resultsDataB = await resultsResB.json();
    assert(resultsDataB.data.summary.totalPublishedExams === 0, "Student B has 0 published results (Student A results not leaked)");
    assert(resultsDataB.data.examResults.length === 0, "Student B examResults is empty");

    // Student B attempts direct fetch of Student A Midterm exam results
    const singleResultResB = await getStudentResultByExamId(
      makeRequest(`/api/student/results/${examMidterm._id}`, tokenB),
      { params: Promise.resolve({ examId: examMidterm._id.toString() }) }
    );
    assert(singleResultResB.status === 404, "Student B gets 404 trying to access Midterm result statement");

    // Student C (Neville) fetches his own results -> Sees his own marks (45 in Math, not Hermione's 95)
    const singleResultResC = await getStudentResultByExamId(
      makeRequest(`/api/student/results/${examMidterm._id}`, tokenC),
      { params: Promise.resolve({ examId: examMidterm._id.toString() }) }
    );
    const singleResultDataC = await singleResultResC.json();
    assert(singleResultResC.status === 200, "Student C gets HTTP 200 for own result");
    const nevMath = singleResultDataC.data.subjects.find((s: any) => s.subjectId === subjectMath._id.toString());
    assert(nevMath.marks === 45, "Student C sees his own score (45 marks), NOT Student A's (95 marks)");
    assert(nevMath.grade === "D", "Student C sees his own grade (D)");

    console.log("\n--- 8. Testing SECURITY: Read-Only Immutability Enforcement (HTTP 405) ---");
    // Exams endpoint
    const postExamsRes = await postStudentExams();
    assert(postExamsRes.status === 405, "Student POST /api/student/exams rejected with 405");
    const putExamsRes = await putStudentExams();
    assert(putExamsRes.status === 405, "Student PUT /api/student/exams rejected with 405");
    const patchExamsRes = await patchStudentExams();
    assert(patchExamsRes.status === 405, "Student PATCH /api/student/exams rejected with 405");
    const delExamsRes = await deleteStudentExams();
    assert(delExamsRes.status === 405, "Student DELETE /api/student/exams rejected with 405");

    // Exam by ID endpoint
    const postExamIdRes = await postExamById();
    assert(postExamIdRes.status === 405, "Student POST /api/student/exams/[id] rejected with 405");
    const putExamIdRes = await putExamById();
    assert(putExamIdRes.status === 405, "Student PUT /api/student/exams/[id] rejected with 405");
    const patchExamIdRes = await patchExamById();
    assert(patchExamIdRes.status === 405, "Student PATCH /api/student/exams/[id] rejected with 405");
    const delExamIdRes = await deleteExamById();
    assert(delExamIdRes.status === 405, "Student DELETE /api/student/exams/[id] rejected with 405");

    // Results endpoint
    const postResultsRes = await postStudentResults();
    assert(postResultsRes.status === 405, "Student POST /api/student/results rejected with 405");
    const putResultsRes = await putStudentResults();
    assert(putResultsRes.status === 405, "Student PUT /api/student/results rejected with 405");
    const patchResultsRes = await patchStudentResults();
    assert(patchResultsRes.status === 405, "Student PATCH /api/student/results rejected with 405");
    const delResultsRes = await deleteStudentResults();
    assert(delResultsRes.status === 405, "Student DELETE /api/student/results rejected with 405");

    // Results by Exam ID endpoint
    const postResultIdRes = await postResultByExamId();
    assert(postResultIdRes.status === 405, "Student POST /api/student/results/[id] rejected with 405");
    const putResultIdRes = await putResultByExamId();
    assert(putResultIdRes.status === 405, "Student PUT /api/student/results/[id] rejected with 405");
    const patchResultIdRes = await patchResultByExamId();
    assert(patchResultIdRes.status === 405, "Student PATCH /api/student/results/[id] rejected with 405");
    const delResultIdRes = await deleteResultByExamId();
    assert(delResultIdRes.status === 405, "Student DELETE /api/student/results/[id] rejected with 405");

    // Clean up test data
    await Promise.all([
      School.findByIdAndDelete(school1._id),
      School.findByIdAndDelete(school2._id),
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
    ]);

    console.log("\n============================================================");
    console.log(`📊 S5 TEST SUITE COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log("============================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error("❌ Fatal Error in S5 test suite:", err);
    process.exit(1);
  }
}

runS5TestSuite();
