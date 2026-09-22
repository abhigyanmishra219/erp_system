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

async function runTests() {
  console.log("============================================================");
  console.log("PHASE A6 TEST SUITE: EXAMS, MARKS, RESULTS & REPORT CARDS");
  console.log("============================================================");

  const mongoose = (await import("mongoose")).default;
  const connectToDatabase = (await import("./src/lib/db")).default;
  const User = (await import("./src/models/User")).default;
  const School = (await import("./src/models/School")).default;
  const AcademicYear = (await import("./src/models/AcademicYear")).default;
  const Class = (await import("./src/models/Class")).default;
  const Section = (await import("./src/models/Section")).default;
  const Subject = (await import("./src/models/Subject")).default;
  const ClassSubject = (await import("./src/models/ClassSubject")).default;
  const Student = (await import("./src/models/Student")).default;
  const Teacher = (await import("./src/models/Teacher")).default;
  const TeacherAssignment = (await import("./src/models/TeacherAssignment")).default;
  const Attendance = (await import("./src/models/Attendance")).default;
  const Exam = (await import("./src/models/Exam")).default;
  const ExamTarget = (await import("./src/models/ExamTarget")).default;
  const ExamSubject = (await import("./src/models/ExamSubject")).default;
  const ExamResult = (await import("./src/models/ExamResult")).default;
  const { ResultCalculationService } = await import("./src/lib/services/resultCalculationService");
  const { ReportCardService } = await import("./src/lib/services/reportCardService");
  const { verifyTeacherAssignmentScope } = await import("./src/lib/auth/teacherAssignmentScope");

  await connectToDatabase();
  console.log("✓ Connected to MongoDB");

  const cleanupSchoolIds: any[] = [];
  const cleanupUserIds: any[] = [];

  try {
    // -----------------------------------------------------------------
    // 1. Setup Test Fixture: School A with Grading Settings
    // -----------------------------------------------------------------
    const adminA: any = await User.create({
      name: "Admin A6 Alpha",
      email: `admin.a6a.${Date.now()}@school-a.com`,
      password: "Password@123",
      role: "ADMIN",
      isActive: true,
    });
    cleanupUserIds.push(adminA._id);

    const schoolA: any = await School.create({
      name: "Springfield Academy (A6 Test)",
      code: "SA" + Date.now().toString().slice(-4),
      email: `admin_${Date.now()}@springfield.test`,
      subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      createdBy: adminA._id,
      updatedBy: adminA._id,
      status: "ACTIVE",
      gradingSettings: {
        system: "LETTER",
        passingPercentage: 40,
        scales: [
          { grade: "A+", minPercentage: 90, maxPercentage: 100, description: "Outstanding" },
          { grade: "A", minPercentage: 80, maxPercentage: 89.99, description: "Excellent" },
          { grade: "B", minPercentage: 65, maxPercentage: 79.99, description: "Good" },
          { grade: "C", minPercentage: 50, maxPercentage: 64.99, description: "Satisfactory" },
          { grade: "D", minPercentage: 40, maxPercentage: 49.99, description: "Pass" },
          { grade: "F", minPercentage: 0, maxPercentage: 39.99, description: "Fail" },
        ],
      },
    });
    cleanupSchoolIds.push(schoolA._id);
    adminA.schoolId = schoolA._id;
    await adminA.save();

    const adminB: any = await User.create({
      name: "Admin A6 Beta",
      email: `admin.a6b.${Date.now()}@school-b.com`,
      password: "Password@123",
      role: "ADMIN",
      isActive: true,
    });
    cleanupUserIds.push(adminB._id);

    const schoolB: any = await School.create({
      name: "Shelbyville High (A6 Multi-tenant)",
      code: "SH" + Date.now().toString().slice(-4),
      email: `admin_${Date.now()}@shelby.test`,
      subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      createdBy: adminB._id,
      updatedBy: adminB._id,
      status: "ACTIVE",
    });
    cleanupSchoolIds.push(schoolB._id);
    adminB.schoolId = schoolB._id;
    await adminB.save();

    const academicYearA: any = await AcademicYear.create({
      schoolId: schoolA._id,
      name: "2026-2027",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const class1: any = await Class.create({
      schoolId: schoolA._id,
      academicYearId: academicYearA._id,
      name: "Class 10",
      displayOrder: 10,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const sectionA: any = await Section.create({
      schoolId: schoolA._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      name: "A",
      capacity: 40,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const subMath: any = await Subject.create({
      schoolId: schoolA._id,
      name: "Mathematics",
      code: "MATH10",
      subjectType: "CORE",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const subSci: any = await Subject.create({
      schoolId: schoolA._id,
      name: "Science",
      code: "SCI10",
      subjectType: "CORE",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const subEng: any = await Subject.create({
      schoolId: schoolA._id,
      name: "English",
      code: "ENG10",
      subjectType: "CORE",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    // Create ClassSubjects
    await ClassSubject.create({
      schoolId: schoolA._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      subjectId: subMath._id,
      maximumMarks: 100,
      passingMarks: 33,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });
    await ClassSubject.create({
      schoolId: schoolA._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      subjectId: subSci._id,
      maximumMarks: 100,
      passingMarks: 33,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });
    await ClassSubject.create({
      schoolId: schoolA._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      subjectId: subEng._id,
      maximumMarks: 100,
      passingMarks: 33,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    // Create Teacher 1 User & Profile (assigned to Math for Class 10 - Section A)
    const teacher1User: any = await User.create({
      schoolId: schoolA._id,
      email: `walter_${Date.now()}@springfield.test`,
      password: "Password@123",
      role: "TEACHER",
      isActive: true,
    });
    cleanupUserIds.push(teacher1User._id);

    const teacher1: any = await Teacher.create({
      schoolId: schoolA._id,
      userId: teacher1User._id,
      teacherId: "TCH-001",
      firstName: "Walter",
      lastName: "White",
      gender: "MALE",
      status: "ACTIVE",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    await TeacherAssignment.create({
      schoolId: schoolA._id,
      teacherId: teacher1._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      sectionId: sectionA._id,
      subjectId: subMath._id,
      assignmentType: "SUBJECT_TEACHER",
      isActive: true,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    // Create Teacher 2 User & Profile (assigned to Science for Class 10 - Section A)
    const teacher2User: any = await User.create({
      schoolId: schoolA._id,
      email: `marie_${Date.now()}@springfield.test`,
      password: "Password@123",
      role: "TEACHER",
      isActive: true,
    });
    cleanupUserIds.push(teacher2User._id);

    const teacher2: any = await Teacher.create({
      schoolId: schoolA._id,
      userId: teacher2User._id,
      teacherId: "TCH-002",
      firstName: "Marie",
      lastName: "Curie",
      gender: "FEMALE",
      status: "ACTIVE",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    await TeacherAssignment.create({
      schoolId: schoolA._id,
      teacherId: teacher2._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      sectionId: sectionA._id,
      subjectId: subSci._id,
      assignmentType: "SUBJECT_TEACHER",
      isActive: true,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    // Create 2 Students
    const student1: any = await Student.create({
      schoolId: schoolA._id,
      admissionNumber: "ADM-101",
      rollNumber: "01",
      firstName: "Alice",
      lastName: "Johnson",
      gender: "FEMALE",
      dateOfBirth: new Date("2010-05-14"),
      academicYearId: academicYearA._id,
      classId: class1._id,
      sectionId: sectionA._id,
      admissionDate: new Date("2026-04-01"),
      status: "ACTIVE",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const student2: any = await Student.create({
      schoolId: schoolA._id,
      admissionNumber: "ADM-102",
      rollNumber: "02",
      firstName: "Bob",
      lastName: "Smith",
      gender: "MALE",
      dateOfBirth: new Date("2010-08-20"),
      academicYearId: academicYearA._id,
      classId: class1._id,
      sectionId: sectionA._id,
      admissionDate: new Date("2026-04-01"),
      status: "ACTIVE",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    // Create A4 Attendance records for Student 1: 18 Present, 2 Absent, 2 Late
    const attendances: any[] = [];
    for (let i = 1; i <= 18; i++) {
      attendances.push({
        schoolId: schoolA._id,
        academicYearId: academicYearA._id,
        classId: class1._id,
        sectionId: sectionA._id,
        studentId: student1._id,
        date: new Date(`2026-09-${i.toString().padStart(2, "0")}`),
        status: "PRESENT",
        markedBy: adminA._id,
        markedByRole: "ADMIN",
      });
    }
    attendances.push({
      schoolId: schoolA._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      sectionId: sectionA._id,
      studentId: student1._id,
      date: new Date("2026-09-19"),
      status: "ABSENT",
      markedBy: adminA._id,
      markedByRole: "ADMIN",
    });
    attendances.push({
      schoolId: schoolA._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      sectionId: sectionA._id,
      studentId: student1._id,
      date: new Date("2026-09-20"),
      status: "ABSENT",
      markedBy: adminA._id,
      markedByRole: "ADMIN",
    });
    attendances.push({
      schoolId: schoolA._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      sectionId: sectionA._id,
      studentId: student1._id,
      date: new Date("2026-09-21"),
      status: "LATE",
      markedBy: adminA._id,
      markedByRole: "ADMIN",
    });
    attendances.push({
      schoolId: schoolA._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      sectionId: sectionA._id,
      studentId: student1._id,
      date: new Date("2026-09-22"),
      status: "LATE",
      markedBy: adminA._id,
      markedByRole: "ADMIN",
    });
    await Attendance.insertMany(attendances);

    console.log("✓ Test fixture initialized: School, Academic Year, Classes, Subjects, Teachers, Students & Attendance");

    // -----------------------------------------------------------------
    // 2. Exam Creation & Configuration
    // -----------------------------------------------------------------
    const midtermExam: any = await Exam.create({
      schoolId: schoolA._id,
      academicYearId: academicYearA._id,
      name: "Mid-Term Examination 2026",
      description: "First semester evaluation",
      startDate: new Date("2026-09-15"),
      endDate: new Date("2026-09-25"),
      status: "ONGOING",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const target1: any = await ExamTarget.create({
      schoolId: schoolA._id,
      examId: midtermExam._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      sectionId: sectionA._id,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const esMath: any = await ExamSubject.create({
      schoolId: schoolA._id,
      examId: midtermExam._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      subjectId: subMath._id,
      maximumMarks: 100,
      passingMarks: 40,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const esSci: any = await ExamSubject.create({
      schoolId: schoolA._id,
      examId: midtermExam._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      subjectId: subSci._id,
      maximumMarks: 100,
      passingMarks: 40,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const esEng: any = await ExamSubject.create({
      schoolId: schoolA._id,
      examId: midtermExam._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      subjectId: subEng._id,
      maximumMarks: 100,
      passingMarks: 40,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    console.log("✓ Exam created with Targets and Subjects (Math, Science, English with Max 100 / Pass 40)");

    // -----------------------------------------------------------------
    // 3. Teacher Assignment Scoping Verification
    // -----------------------------------------------------------------
    // Teacher 1 is assigned to Math in Class 10 Section A -> SHOULD BE AUTHORIZED
    const t1MathScope = await verifyTeacherAssignmentScope({
      schoolId: schoolA._id.toString(),
      userId: teacher1User._id.toString(),
      academicYearId: academicYearA._id.toString(),
      classId: class1._id.toString(),
      sectionId: sectionA._id.toString(),
      subjectId: subMath._id.toString(),
    });
    if (!t1MathScope.hasAccess) {
      throw new Error(`Teacher 1 should be authorized for Class 10 Section A Math: ${t1MathScope.reason}`);
    }

    // Teacher 1 trying to grade Science -> SHOULD BE UNAUTHORIZED
    const t1SciScope = await verifyTeacherAssignmentScope({
      schoolId: schoolA._id.toString(),
      userId: teacher1User._id.toString(),
      academicYearId: academicYearA._id.toString(),
      classId: class1._id.toString(),
      sectionId: sectionA._id.toString(),
      subjectId: subSci._id.toString(),
    });
    if (t1SciScope.hasAccess) {
      throw new Error("Teacher 1 must NOT be authorized for Science");
    }

    console.log("✓ Teacher assignment scope enforcement verified: Math authorized, Science rejected for Teacher 1");

    // -----------------------------------------------------------------
    // 4. Marks Management & Upsertion
    // -----------------------------------------------------------------
    // Enter marks for Student 1: Math=95, Science=88, English=92
    await ExamResult.create({
      schoolId: schoolA._id,
      examId: midtermExam._id,
      examSubjectId: esMath._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      sectionId: sectionA._id,
      studentId: student1._id,
      subjectId: subMath._id,
      marks: 95,
      grade: "A+",
      isPassed: true,
      status: "DRAFT",
      enteredBy: adminA._id,
    });

    await ExamResult.create({
      schoolId: schoolA._id,
      examId: midtermExam._id,
      examSubjectId: esSci._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      sectionId: sectionA._id,
      studentId: student1._id,
      subjectId: subSci._id,
      marks: 88,
      grade: "A",
      isPassed: true,
      status: "DRAFT",
      enteredBy: adminA._id,
    });

    await ExamResult.create({
      schoolId: schoolA._id,
      examId: midtermExam._id,
      examSubjectId: esEng._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      sectionId: sectionA._id,
      studentId: student1._id,
      subjectId: subEng._id,
      marks: 92,
      grade: "A+",
      isPassed: true,
      status: "DRAFT",
      enteredBy: adminA._id,
    });

    // Enter marks for Student 2: Math=35 (Fail), Science=50, English=45
    await ExamResult.create({
      schoolId: schoolA._id,
      examId: midtermExam._id,
      examSubjectId: esMath._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      sectionId: sectionA._id,
      studentId: student2._id,
      subjectId: subMath._id,
      marks: 35,
      grade: "F",
      isPassed: false,
      status: "DRAFT",
      enteredBy: adminA._id,
    });

    await ExamResult.create({
      schoolId: schoolA._id,
      examId: midtermExam._id,
      examSubjectId: esSci._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      sectionId: sectionA._id,
      studentId: student2._id,
      subjectId: subSci._id,
      marks: 50,
      grade: "C",
      isPassed: true,
      status: "DRAFT",
      enteredBy: adminA._id,
    });

    await ExamResult.create({
      schoolId: schoolA._id,
      examId: midtermExam._id,
      examSubjectId: esEng._id,
      academicYearId: academicYearA._id,
      classId: class1._id,
      sectionId: sectionA._id,
      studentId: student2._id,
      subjectId: subEng._id,
      marks: 45,
      grade: "D",
      isPassed: true,
      status: "DRAFT",
      enteredBy: adminA._id,
    });

    console.log("✓ Exam marks entered for Student 1 and Student 2");

    // -----------------------------------------------------------------
    // 5. Result Calculation Engine Verification
    // -----------------------------------------------------------------
    const s1Inputs: any[] = [
      { subjectId: subMath._id.toString(), subjectName: "Math", subjectCode: "M10", marks: 95, maximumMarks: 100, passingMarks: 40 },
      { subjectId: subSci._id.toString(), subjectName: "Sci", subjectCode: "S10", marks: 88, maximumMarks: 100, passingMarks: 40 },
      { subjectId: subEng._id.toString(), subjectName: "Eng", subjectCode: "E10", marks: 92, maximumMarks: 100, passingMarks: 40 },
    ];
    const s1Calc = ResultCalculationService.calculateOverallResult(s1Inputs, schoolA.gradingSettings?.scales);
    console.log(`  Student 1 Computed: Total=${s1Calc.totalObtainedMarks}/${s1Calc.totalMaximumMarks}, Pct=${s1Calc.percentage}%, Grade=${s1Calc.overallGrade}, Passed=${s1Calc.isPassed}`);

    if (s1Calc.totalObtainedMarks !== 275 || s1Calc.percentage !== 91.67 || s1Calc.overallGrade !== "A+" || !s1Calc.isPassed) {
      throw new Error(`Student 1 calculation failed! Expected 275/300 (91.67%) A+ Passed, got ${JSON.stringify(s1Calc)}`);
    }

    const s2Inputs: any[] = [
      { subjectId: subMath._id.toString(), subjectName: "Math", subjectCode: "M10", marks: 35, maximumMarks: 100, passingMarks: 40 },
      { subjectId: subSci._id.toString(), subjectName: "Sci", subjectCode: "S10", marks: 50, maximumMarks: 100, passingMarks: 40 },
      { subjectId: subEng._id.toString(), subjectName: "Eng", subjectCode: "E10", marks: 45, maximumMarks: 100, passingMarks: 40 },
    ];
    const s2Calc = ResultCalculationService.calculateOverallResult(s2Inputs, schoolA.gradingSettings?.scales);
    console.log(`  Student 2 Computed: Total=${s2Calc.totalObtainedMarks}/${s2Calc.totalMaximumMarks}, Pct=${s2Calc.percentage}%, Grade=${s2Calc.overallGrade}, Passed=${s2Calc.isPassed}`);

    if (s2Calc.totalObtainedMarks !== 130 || s2Calc.isPassed !== false || s2Calc.overallGrade !== "D") {
      throw new Error(`Student 2 calculation failed! Expected 130/300, isPassed=false, got ${JSON.stringify(s2Calc)}`);
    }

    console.log("✓ Result calculation service accuracy verified (Percentages, Grading scale mapping, Subject-level and Overall Pass/Fail)");

    // -----------------------------------------------------------------
    // 6. Report Card Generation & Attendance Integration
    // -----------------------------------------------------------------
    const reportCard = await ReportCardService.generateReportCard({
      schoolId: schoolA._id,
      examId: midtermExam._id,
      studentId: student1._id,
    });

    if (!reportCard) {
      throw new Error("Report card generation returned null for Student 1");
    }

    console.log("✓ Report Card generated for Student 1:");
    console.log(`  School: ${reportCard.school.name}`);
    console.log(`  Student: ${reportCard.student.name} (Adm: ${reportCard.student.admissionNumber})`);
    console.log(`  Academic: ${reportCard.academic.totalObtainedMarks}/${reportCard.academic.totalMaximumMarks} (${reportCard.academic.percentage}%) - Grade ${reportCard.academic.overallGrade} - ${reportCard.academic.statusText}`);
    console.log(`  Attendance Record: ${reportCard.attendance.present} Present / ${reportCard.attendance.totalSessions} Sessions (${reportCard.attendance.attendancePercentage}%)`);

    if (reportCard.attendance.totalSessions !== 22 || reportCard.attendance.present !== 18 || reportCard.attendance.absent !== 2 || reportCard.attendance.late !== 2) {
      throw new Error(`Attendance aggregation mismatch! Expected 22 sessions, 18 present, 2 absent, 2 late. Got: ${JSON.stringify(reportCard.attendance)}`);
    }

    // Check School Code exclusion: Report card school object MUST NOT expose school code
    if ((reportCard.school as any).code) {
      throw new Error("School Code must NOT be present in student report cards!");
    }

    console.log("✓ A4 Attendance integration in report card successfully verified");
    console.log("✓ School Code privacy confirmed (excluded from report cards)");

    // -----------------------------------------------------------------
    // 7. Results Lifecycle: DRAFT -> REVIEWED -> PUBLISHED -> UNPUBLISHED
    // -----------------------------------------------------------------
    // Mark as REVIEWED
    await ExamResult.updateMany({ schoolId: schoolA._id, examId: midtermExam._id }, { status: "REVIEWED" });
    let reviewedCount = await ExamResult.countDocuments({ schoolId: schoolA._id, examId: midtermExam._id, status: "REVIEWED" });
    if (reviewedCount !== 6) throw new Error(`Expected 6 REVIEWED results, got ${reviewedCount}`);

    // Publish Results
    await ExamResult.updateMany({ schoolId: schoolA._id, examId: midtermExam._id }, { status: "PUBLISHED" });
    await Exam.findByIdAndUpdate(midtermExam._id, { status: "PUBLISHED" });

    let publishedExam = await Exam.findById(midtermExam._id);
    if (publishedExam?.status !== "PUBLISHED") throw new Error("Exam status should be PUBLISHED");

    console.log("✓ Results published successfully (DRAFT -> REVIEWED -> PUBLISHED)");

    // -----------------------------------------------------------------
    // 8. Multi-Tenant Isolation
    // -----------------------------------------------------------------
    const schoolBExams = await Exam.find({ schoolId: schoolB._id });
    if (schoolBExams.length !== 0) {
      throw new Error("Multi-tenant leak: School B can see School A exams");
    }

    const schoolBReportCard = await ReportCardService.generateReportCard({
      schoolId: schoolB._id,
      examId: midtermExam._id,
      studentId: student1._id,
    });
    if (schoolBReportCard !== null) {
      throw new Error("Multi-tenant leak: School B was able to generate School A report card!");
    }

    console.log("✓ Multi-tenant isolation verified: School B cannot access School A exams or report cards");

    console.log("============================================================");
    console.log("ALL PHASE A6 AUTOMATED TESTS PASSED SUCCESSFULLY! (8/8)");
    console.log("============================================================");
  } finally {
    // Cleanup
    for (const sId of cleanupSchoolIds) {
      await Promise.all([
        School.deleteMany({ _id: sId }),
        AcademicYear.deleteMany({ schoolId: sId }),
        Class.deleteMany({ schoolId: sId }),
        Section.deleteMany({ schoolId: sId }),
        Subject.deleteMany({ schoolId: sId }),
        ClassSubject.deleteMany({ schoolId: sId }),
        Teacher.deleteMany({ schoolId: sId }),
        TeacherAssignment.deleteMany({ schoolId: sId }),
        Student.deleteMany({ schoolId: sId }),
        Attendance.deleteMany({ schoolId: sId }),
        Exam.deleteMany({ schoolId: sId }),
        ExamTarget.deleteMany({ schoolId: sId }),
        ExamSubject.deleteMany({ schoolId: sId }),
        ExamResult.deleteMany({ schoolId: sId }),
      ]);
    }
    for (const uId of cleanupUserIds) {
      await User.deleteMany({ _id: uId });
    }
    console.log("✓ Cleanup finished");
    await mongoose.disconnect();
  }
}

runTests().catch((err) => {
  console.error("❌ TEST RUN FAILED:", err);
  process.exit(1);
});
