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
  console.log("STARTING P4: PARENT RESULTS & REPORT CARD TEST SUITE");
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
  const Subject: any = (await import("./src/models/Subject")).default;
  const Exam: any = (await import("./src/models/Exam")).default;
  const ExamSubject: any = (await import("./src/models/ExamSubject")).default;
  const ExamResult: any = (await import("./src/models/ExamResult")).default;

  const { GET: getResults, POST: postResults, PUT: putResults, PATCH: patchResults, DELETE: deleteResults } = await import("./src/app/api/parent/results/route");
  const { GET: getReportCards, POST: postReportCards } = await import("./src/app/api/parent/results/report-cards/route");
  const { GET: getSingleReportCard, POST: postSingleReportCard } = await import("./src/app/api/parent/results/report-cards/[examId]/route");
  const { GET: getPdfReportCard, POST: postPdfReportCard } = await import("./src/app/api/parent/results/report-cards/[examId]/pdf/route");

  await connectToDatabase();

  const secret = process.env.JWT_SECRET || "your-secret-key";
  const cleanSuffix = `p4_${Date.now().toString().slice(-6)}`;
  const adminId = new mongoose.Types.ObjectId();

  // 1. Setup Test School
  const schoolA = await School.create({
    name: `P4 School A ${cleanSuffix}`,
    code: `SCH_P4_${cleanSuffix}`,
    status: "ACTIVE",
    address: "123 Academic Way",
    city: "New Delhi",
    state: "Delhi",
    country: "India",
    phone: "9876543210",
    email: `p4_school_${cleanSuffix}@example.com`,
    plan: "STANDARD",
    studentLimit: 500,
    subscriptionStartDate: new Date(),
    subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
    subscriptionStatus: "ACTIVE",
    gradingSettings: {
      system: "PERCENTAGE",
      scales: [
        { grade: "A+", minPercentage: 90, maxPercentage: 100, description: "Outstanding" },
        { grade: "A", minPercentage: 80, maxPercentage: 89.99, description: "Excellent" },
        { grade: "B", minPercentage: 70, maxPercentage: 79.99, description: "Good" },
        { grade: "C", minPercentage: 50, maxPercentage: 69.99, description: "Average" },
        { grade: "F", minPercentage: 0, maxPercentage: 49.99, description: "Fail" },
      ],
    },
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

  const subjectMath = await Subject.create({
    schoolId: schoolA._id,
    name: "Mathematics",
    code: `MATH_${cleanSuffix}`,
    type: "THEORY",
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const subjectScience = await Subject.create({
    schoolId: schoolA._id,
    name: "Science",
    code: `SCI_${cleanSuffix}`,
    type: "THEORY",
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 2. Setup Parent User & Parent Record
  const parentUser = await User.create({
    email: `parent_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "PARENT",
    schoolId: schoolA._id,
    isActive: true,
    name: "Rajesh Mishra",
  });

  const parentDoc = await Parent.create({
    schoolId: schoolA._id,
    userId: parentUser._id,
    firstName: "Rajesh",
    lastName: "Mishra",
    email: parentUser.email,
    phone: "9876543210",
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 3. Setup Children: Student 1 (Abhigyan) & Student 2 (Aarav) linked to Parent
  const studentUser1 = await User.create({
    email: `abhigyan_${cleanSuffix}@example.com`,
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
    firstName: "Abhigyan",
    lastName: "Mishra",
    classId: class10._id,
    sectionId: section10A._id,
    academicYearId: ayA._id,
    status: "ACTIVE",
    gender: "MALE",
    dateOfBirth: new Date("2010-05-15"),
    admissionDate: new Date("2024-04-01"),
    createdBy: adminId,
    updatedBy: adminId,
  });

  const studentUser2 = await User.create({
    email: `aarav_${cleanSuffix}@example.com`,
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
    firstName: "Aarav",
    lastName: "Mishra",
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
    email: `stranger_${cleanSuffix}@example.com`,
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

  // 5. Setup Published and Unpublished Exams & Results
  const publishedExam = await Exam.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    name: "Mid-Term Examination 2026",
    startDate: new Date("2026-09-01"),
    endDate: new Date("2026-09-10"),
    status: "PUBLISHED",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const unpublishedExam = await Exam.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    name: "Draft Unit Test (Secret)",
    startDate: new Date("2026-10-01"),
    endDate: new Date("2026-10-05"),
    status: "DRAFT",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const examSubMath = await ExamSubject.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    examId: publishedExam._id,
    classId: class10._id,
    subjectId: subjectMath._id,
    maximumMarks: 100,
    passingMarks: 40,
    isActive: true,
    createdBy: adminId,
    updatedBy: adminId,
  });

  const examSubScience = await ExamSubject.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    examId: publishedExam._id,
    classId: class10._id,
    subjectId: subjectScience._id,
    maximumMarks: 100,
    passingMarks: 40,
    isActive: true,
    createdBy: adminId,
    updatedBy: adminId,
  });

  const draftExamSubMath = await ExamSubject.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    examId: unpublishedExam._id,
    classId: class10._id,
    subjectId: subjectMath._id,
    maximumMarks: 100,
    passingMarks: 40,
    isActive: true,
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Results for Student 1 (Abhigyan):
  // Math: 92/100 (PUBLISHED)
  // Science: 84/100 (PUBLISHED)
  // Draft Math: 50/100 (DRAFT - NOT PUBLISHED)
  await ExamResult.create([
    {
      schoolId: schoolA._id,
      studentId: student1._id,
      examId: publishedExam._id,
      examSubjectId: examSubMath._id,
      subjectId: subjectMath._id,
      academicYearId: ayA._id,
      classId: class10._id,
      sectionId: section10A._id,
      marks: 92,
      grade: "A+",
      isPassed: true,
      status: "PUBLISHED",
      remarks: "Outstanding mathematical ability",
      publishedAt: new Date(),
      enteredBy: adminId,
    },
    {
      schoolId: schoolA._id,
      studentId: student1._id,
      examId: publishedExam._id,
      examSubjectId: examSubScience._id,
      subjectId: subjectScience._id,
      academicYearId: ayA._id,
      classId: class10._id,
      sectionId: section10A._id,
      marks: 84,
      grade: "A",
      isPassed: true,
      status: "PUBLISHED",
      remarks: "Great practical skills",
      publishedAt: new Date(),
      enteredBy: adminId,
    },
    {
      schoolId: schoolA._id,
      studentId: student1._id,
      examId: unpublishedExam._id,
      examSubjectId: draftExamSubMath._id,
      subjectId: subjectMath._id,
      academicYearId: ayA._id,
      classId: class10._id,
      sectionId: section10A._id,
      marks: 50,
      grade: "C",
      isPassed: true,
      status: "DRAFT",
      remarks: "Teacher draft only",
      enteredBy: adminId,
    },
  ]);

  // Results for Student 2 (Aarav):
  // Math: 76/100 (PUBLISHED)
  // Science: 72/100 (PUBLISHED)
  await ExamResult.create([
    {
      schoolId: schoolA._id,
      studentId: student2._id,
      examId: publishedExam._id,
      examSubjectId: examSubMath._id,
      subjectId: subjectMath._id,
      academicYearId: ayA._id,
      classId: class10._id,
      sectionId: section10A._id,
      marks: 76,
      grade: "B",
      isPassed: true,
      status: "PUBLISHED",
      remarks: "Solid performance",
      publishedAt: new Date(),
      enteredBy: adminId,
    },
    {
      schoolId: schoolA._id,
      studentId: student2._id,
      examId: publishedExam._id,
      examSubjectId: examSubScience._id,
      subjectId: subjectScience._id,
      academicYearId: ayA._id,
      classId: class10._id,
      sectionId: section10A._id,
      marks: 72,
      grade: "B",
      isPassed: true,
      status: "PUBLISHED",
      remarks: "Good understanding",
      publishedAt: new Date(),
      enteredBy: adminId,
    },
  ]);

  // Results for Student 3 (Stranger/Unlinked):
  await ExamResult.create({
    schoolId: schoolA._id,
    studentId: studentUnlinked._id,
    examId: publishedExam._id,
    examSubjectId: examSubMath._id,
    subjectId: subjectMath._id,
    academicYearId: ayA._id,
    classId: class10._id,
    sectionId: section10A._id,
    marks: 99,
    grade: "A+",
    isPassed: true,
    status: "PUBLISHED",
    publishedAt: new Date(),
    enteredBy: adminId,
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

  // TEST 1: Default child (Student 1) results scoping
  console.log("\n--- TEST GROUP 1: Default Child Results Scoping ---");
  {
    const req = createParentReq("http://localhost:3000/api/parent/results");
    const res = await getResults(req);
    assert(res.status === 200, "GET /api/parent/results returns 200 OK");
    const json = await res.json();
    assert(json.success === true, "Response reports success = true");
    assert(json.data.academicContext.student._id === student1._id.toString(), "Defaults to linked Student 1 (Abhigyan)");
    assert(json.data.examResults.length === 1, "Exactly 1 published exam found");
    assert(json.data.examResults[0].exam._id === publishedExam._id.toString(), "Published exam matches");
    assert(json.data.examResults[0].percentage === 88, "Calculated percentage is (92+84)/200 = 88%");
    assert(json.data.examResults[0].overallGrade === "A", "Calculated overall grade is 'A'");
    assert(json.data.examResults[0].isPassed === true, "Student 1 isPassed = true");
    assert(json.data.examResults[0].subjects.length === 2, "2 evaluated subjects");
  }

  // TEST 2: Strict Publication Rule (Unpublished draft must NOT appear)
  console.log("\n--- TEST GROUP 2: Strict Publication Rule ---");
  {
    const req = createParentReq("http://localhost:3000/api/parent/results");
    const res = await getResults(req);
    const json = await res.json();
    const draftExamFound = json.data.examResults.some((e: any) => e.exam.name.includes("Draft"));
    assert(!draftExamFound, "Draft/unpublished exam is strictly hidden from parent");
  }

  // TEST 3: Switching to linked Student 2 (Aarav)
  console.log("\n--- TEST GROUP 3: Multi-Child Switching (Student 2) ---");
  {
    const req = createParentReq(`http://localhost:3000/api/parent/results?studentId=${student2._id.toString()}`);
    const res = await getResults(req);
    assert(res.status === 200, "GET /api/parent/results?studentId=Student2 returns 200 OK");
    const json = await res.json();
    assert(json.data.academicContext.student._id === student2._id.toString(), "Correctly scoped to Student 2 (Aarav)");
    assert(json.data.examResults.length === 1, "Student 2 has 1 published exam");
    assert(json.data.examResults[0].percentage === 74, "Student 2 percentage is (76+72)/200 = 74%");
    assert(json.data.examResults[0].overallGrade === "B", "Student 2 overall grade is 'B'");
  }

  // TEST 4: Security - Accessing unlinked Student 3 must be rejected with 403
  console.log("\n--- TEST GROUP 4: Security & Isolation (Unlinked Child Rejection) ---");
  {
    const req = createParentReq(`http://localhost:3000/api/parent/results?studentId=${studentUnlinked._id.toString()}`);
    const res = await getResults(req);
    assert(res.status === 403, "Accessing unlinked Student 3 returns 403 Forbidden");
    const json = await res.json();
    assert(json.error.code === "FORBIDDEN_CHILD_ACCESS", "Error code is FORBIDDEN_CHILD_ACCESS");
  }

  // TEST 5: Report Cards List API (`/api/parent/results/report-cards`)
  console.log("\n--- TEST GROUP 5: Parent Report Cards List Endpoint ---");
  {
    const reqA = createParentReq(`http://localhost:3000/api/parent/results/report-cards?studentId=${student1._id.toString()}`);
    const resA = await getReportCards(reqA);
    assert(resA.status === 200, "GET /api/parent/results/report-cards returns 200 OK");
    const jsonA = await resA.json();
    assert(jsonA.success === true, "Report cards success = true");
    assert(jsonA.data.reportCards.length === 1, "Student 1 has 1 published report card");
    assert(jsonA.data.reportCards[0].examId === publishedExam._id.toString(), "Report card examId matches");
    assert(jsonA.data.reportCards[0].percentage === 88, "Report card percentage matches 88%");
    assert(jsonA.data.reportCards[0].resultStatus === "PUBLISHED", "Report card status is PUBLISHED");

    // Unlinked Student 3 check on report cards
    const reqC = createParentReq(`http://localhost:3000/api/parent/results/report-cards?studentId=${studentUnlinked._id.toString()}`);
    const resC = await getReportCards(reqC);
    assert(resC.status === 403, "Unlinked child report cards list returns 403 Forbidden");
  }

  // TEST 6: Single Report Card Detail API (`/api/parent/results/report-cards/[examId]`)
  console.log("\n--- TEST GROUP 6: Single Report Card Detail Modal Endpoint ---");
  {
    const req = createParentReq(`http://localhost:3000/api/parent/results/report-cards/${publishedExam._id.toString()}?studentId=${student1._id.toString()}`);
    const res = await getSingleReportCard(req, { params: Promise.resolve({ examId: publishedExam._id.toString() }) });
    assert(res.status === 200, "GET /api/parent/results/report-cards/[examId] returns 200 OK");
    const json = await res.json();
    assert(json.success === true, "Single report card success = true");
    assert(json.data.reportCard.student.name === "Abhigyan Mishra", "Student name matches");
    assert(json.data.reportCard.exam.name === "Mid-Term Examination 2026", "Exam name matches");
    assert(json.data.reportCard.academic.percentage === 88, "Academic percentage matches 88%");

    // Unlinked child rejection on single report card
    const reqUnlinked = createParentReq(`http://localhost:3000/api/parent/results/report-cards/${publishedExam._id.toString()}?studentId=${studentUnlinked._id.toString()}`);
    const resUnlinked = await getSingleReportCard(reqUnlinked, { params: Promise.resolve({ examId: publishedExam._id.toString() }) });
    assert(resUnlinked.status === 403, "Unlinked child single report card returns 403 Forbidden");

    // Unpublished exam rejection
    const reqDraft = createParentReq(`http://localhost:3000/api/parent/results/report-cards/${unpublishedExam._id.toString()}?studentId=${student1._id.toString()}`);
    const resDraft = await getSingleReportCard(reqDraft, { params: Promise.resolve({ examId: unpublishedExam._id.toString() }) });
    assert(resDraft.status === 404, "Draft/unpublished exam report card returns 404 (not published)");
  }

  // TEST 7: Report Card PDF Download API (`/api/parent/results/report-cards/[examId]/pdf`)
  console.log("\n--- TEST GROUP 7: Report Card PDF Download Endpoint ---");
  {
    const req = createParentReq(`http://localhost:3000/api/parent/results/report-cards/${publishedExam._id.toString()}/pdf?studentId=${student1._id.toString()}`);
    const res = await getPdfReportCard(req, { params: Promise.resolve({ examId: publishedExam._id.toString() }) });
    assert(res.status === 200, "GET /api/parent/results/report-cards/[examId]/pdf returns 200 OK");
    assert(res.headers.get("Content-Type") === "application/pdf", "Content-Type is application/pdf");
    assert(!!res.headers.get("Content-Disposition")?.includes("attachment"), "Content-Disposition is attachment");
    
    const arrayBuffer = await res.arrayBuffer();
    assert(arrayBuffer.byteLength > 1000, "PDF buffer is non-empty and generated successfully");

    // Unlinked child rejection on PDF download
    const reqUnlinked = createParentReq(`http://localhost:3000/api/parent/results/report-cards/${publishedExam._id.toString()}/pdf?studentId=${studentUnlinked._id.toString()}`);
    const resUnlinked = await getPdfReportCard(reqUnlinked, { params: Promise.resolve({ examId: publishedExam._id.toString() }) });
    assert(resUnlinked.status === 403, "Unlinked child PDF download returns 403 Forbidden");
  }

  // TEST 8: Read-Only Security Protection (405 Method Not Allowed)
  console.log("\n--- TEST GROUP 8: Read-Only HTTP Method Enforcement ---");
  {
    assert((await postResults()).status === 405, "POST /api/parent/results returns 405 Method Not Allowed");
    assert((await putResults()).status === 405, "PUT /api/parent/results returns 405 Method Not Allowed");
    assert((await patchResults()).status === 405, "PATCH /api/parent/results returns 405 Method Not Allowed");
    assert((await deleteResults()).status === 405, "DELETE /api/parent/results returns 405 Method Not Allowed");
    assert((await postReportCards()).status === 405, "POST /api/parent/results/report-cards returns 405");
    assert((await postSingleReportCard()).status === 405, "POST /api/parent/results/report-cards/[examId] returns 405");
    assert((await postPdfReportCard()).status === 405, "POST /api/parent/results/report-cards/[examId]/pdf returns 405");
  }

  console.log("\n============================================================");
  console.log(`ALL TESTS PASSED! (${testsPassed}/${testsTotal})`);
  console.log("============================================================");

  // Cleanup test artifacts
  await Promise.all([
    School.deleteOne({ _id: schoolA._id }),
    AcademicYear.deleteOne({ _id: ayA._id }),
    Class.deleteOne({ _id: class10._id }),
    Section.deleteOne({ _id: section10A._id }),
    Subject.deleteMany({ _id: { $in: [subjectMath._id, subjectScience._id] } }),
    Exam.deleteMany({ _id: { $in: [publishedExam._id, unpublishedExam._id] } }),
    ExamSubject.deleteMany({ _id: { $in: [examSubMath._id, examSubScience._id, draftExamSubMath._id] } }),
    ExamResult.deleteMany({ schoolId: schoolA._id }),
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
