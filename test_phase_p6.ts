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
  console.log("STARTING P6: PARENT TIMETABLE & EXAMS TEST SUITE");
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
  const Teacher: any = (await import("./src/models/Teacher")).default;
  const TimetableEntry: any = (await import("./src/models/TimetableEntry")).default;
  const Exam: any = (await import("./src/models/Exam")).default;
  const ExamTarget: any = (await import("./src/models/ExamTarget")).default;
  const ExamSubject: any = (await import("./src/models/ExamSubject")).default;

  const { GET: getTimetable, POST: postTimetable, PUT: putTimetable, PATCH: patchTimetable, DELETE: deleteTimetable } = await import("./src/app/api/parent/timetable/route");
  const { GET: getExams, POST: postExams, PUT: putExams, PATCH: patchExams, DELETE: deleteExams } = await import("./src/app/api/parent/exams/route");

  await connectToDatabase();

  const secret = process.env.JWT_SECRET || "your-secret-key";
  const cleanSuffix = `p6_${Date.now().toString().slice(-6)}`;
  const adminId = new mongoose.Types.ObjectId();

  // 1. Setup Test School
  const schoolA = await School.create({
    name: `P6 School A ${cleanSuffix}`,
    code: `SCH_P6_${cleanSuffix}`,
    status: "ACTIVE",
    address: "77 Education Way",
    city: "Bengaluru",
    state: "Karnataka",
    country: "India",
    phone: "9876543210",
    email: `p6_school_${cleanSuffix}@example.com`,
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

  // Class 10 for Child 1
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

  // Class 8 for Child 2
  const class8 = await Class.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    name: "Class 8",
    code: `C8_${cleanSuffix}`,
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const section8B = await Section.create({
    schoolId: schoolA._id,
    classId: class8._id,
    academicYearId: ayA._id,
    name: "B",
    capacity: 35,
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Subjects
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

  const subjectHistory = await Subject.create({
    schoolId: schoolA._id,
    name: "History",
    code: `HIST_${cleanSuffix}`,
    type: "THEORY",
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Teacher User & Doc
  const teacherUser = await User.create({
    email: `teacher_p6_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "TEACHER",
    schoolId: schoolA._id,
    isActive: true,
    name: "Dr. Vikram Seth",
  });

  const teacherDoc = await Teacher.create({
    schoolId: schoolA._id,
    userId: teacherUser._id,
    teacherId: `TCH_${cleanSuffix}`,
    firstName: "Vikram",
    lastName: "Seth",
    email: teacherUser.email,
    phone: "9876543210",
    gender: "MALE",
    employeeId: `EMP_${cleanSuffix}`,
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 2. Setup Parent User & Parent Record
  const parentUser = await User.create({
    email: `parent_p6_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "PARENT",
    schoolId: schoolA._id,
    isActive: true,
    name: "Sunil Verma",
  });

  const parentDoc = await Parent.create({
    schoolId: schoolA._id,
    userId: parentUser._id,
    firstName: "Sunil",
    lastName: "Verma",
    email: parentUser.email,
    phone: "9876543210",
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 3. Setup Children: Student 1 (Rohan, Class 10-A) & Student 2 (Riya, Class 8-B)
  const studentUser1 = await User.create({
    email: `rohan_${cleanSuffix}@example.com`,
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
    firstName: "Rohan",
    lastName: "Verma",
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
    email: `riya_${cleanSuffix}@example.com`,
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
    firstName: "Riya",
    lastName: "Verma",
    classId: class8._id,
    sectionId: section8B._id,
    academicYearId: ayA._id,
    status: "ACTIVE",
    gender: "FEMALE",
    dateOfBirth: new Date("2012-08-20"),
    admissionDate: new Date("2024-04-01"),
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 4. Setup Unlinked Student 3 (Stranger, Class 10-A)
  const studentUser3 = await User.create({
    email: `stranger_p6_${cleanSuffix}@example.com`,
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
    lastName: "Student",
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

  // 5. Setup Timetable Entries
  // For Class 10-A (Student 1): Monday Math & Science
  await TimetableEntry.create([
    {
      schoolId: schoolA._id,
      academicYearId: ayA._id,
      classId: class10._id,
      sectionId: section10A._id,
      subjectId: subjectMath._id,
      teacherId: teacherDoc._id,
      dayOfWeek: "MONDAY",
      startTime: "09:00",
      endTime: "10:00",
      room: "Room 101",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    },
    {
      schoolId: schoolA._id,
      academicYearId: ayA._id,
      classId: class10._id,
      sectionId: section10A._id,
      subjectId: subjectScience._id,
      teacherId: teacherDoc._id,
      dayOfWeek: "MONDAY",
      startTime: "10:00",
      endTime: "11:00",
      room: "Science Lab A",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    },
  ]);

  // For Class 8-B (Student 2): Monday History
  await TimetableEntry.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    classId: class8._id,
    sectionId: section8B._id,
    subjectId: subjectHistory._id,
    teacherId: teacherDoc._id,
    dayOfWeek: "MONDAY",
    startTime: "11:00",
    endTime: "12:00",
    room: "Room 202",
    isActive: true,
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 6. Setup Examinations, ExamTargets, and ExamSubjects
  // Exam 1: Mid-Term Examination 2026 (Target: Class 10-A)
  const exam1 = await Exam.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    name: "Mid-Term Examination 2026",
    startDate: new Date("2026-10-15"),
    endDate: new Date("2026-10-25"),
    status: "SCHEDULED",
    isActive: true,
    createdBy: adminId,
    updatedBy: adminId,
  });

  await ExamTarget.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    examId: exam1._id,
    classId: class10._id,
    sectionId: section10A._id,
    isActive: true,
    createdBy: adminId,
    updatedBy: adminId,
  });

  await ExamSubject.create([
    {
      schoolId: schoolA._id,
      academicYearId: ayA._id,
      examId: exam1._id,
      classId: class10._id,
      subjectId: subjectMath._id,
      examDate: new Date("2026-10-16"),
      maximumMarks: 100,
      passingMarks: 40,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    },
    {
      schoolId: schoolA._id,
      academicYearId: ayA._id,
      examId: exam1._id,
      classId: class10._id,
      subjectId: subjectScience._id,
      examDate: new Date("2026-10-18"),
      maximumMarks: 100,
      passingMarks: 40,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    },
  ]);

  // Exam 2: Junior Quarterly Assessment (Target: Class 8-B)
  const exam2 = await Exam.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    name: "Junior Quarterly Assessment",
    startDate: new Date("2026-10-20"),
    endDate: new Date("2026-10-28"),
    status: "SCHEDULED",
    isActive: true,
    createdBy: adminId,
    updatedBy: adminId,
  });

  await ExamTarget.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    examId: exam2._id,
    classId: class8._id,
    sectionId: section8B._id,
    isActive: true,
    createdBy: adminId,
    updatedBy: adminId,
  });

  await ExamSubject.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    examId: exam2._id,
    classId: class8._id,
    subjectId: subjectHistory._id,
    examDate: new Date("2026-10-21"),
    maximumMarks: 50,
    passingMarks: 20,
    isActive: true,
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

  // --- PART A: TIMETABLE TESTS ---
  console.log("\n--- TEST GROUP 1: Timetable Default Child Scoping ---");
  {
    const req = createParentReq("http://localhost:3000/api/parent/timetable");
    const res = await getTimetable(req);
    assert(res.status === 200, "GET /api/parent/timetable returns 200 OK");
    const json = await res.json();
    assert(json.success === true, "Response reports success = true");
    assert(json.data.student._id === student1._id.toString(), "Defaults to linked Student 1 (Rohan)");
    assert(json.data.class.name === "Class 10", "Class is Class 10");
    assert(json.data.section.name === "A", "Section is A");
    assert(json.data.entries.length === 2, "2 timetable entries found for Class 10-A");
    assert(json.data.entries[0].subject.name === "Mathematics", "First subject is Mathematics");
    assert(json.data.entries[0].room === "Room 101", "Room matches Room 101");
  }

  console.log("\n--- TEST GROUP 2: Timetable Multi-Child Switching ---");
  {
    const req = createParentReq(`http://localhost:3000/api/parent/timetable?studentId=${student2._id.toString()}`);
    const res = await getTimetable(req);
    assert(res.status === 200, "GET /api/parent/timetable?studentId=Student2 returns 200 OK");
    const json = await res.json();
    assert(json.data.student._id === student2._id.toString(), "Scoped to Student 2 (Riya)");
    assert(json.data.class.name === "Class 8", "Class is Class 8");
    assert(json.data.section.name === "B", "Section is B");
    assert(json.data.entries.length === 1, "1 timetable entry found for Class 8-B");
    assert(json.data.entries[0].subject.name === "History", "Subject is History");
    assert(json.data.entries[0].room === "Room 202", "Room matches Room 202");
  }

  console.log("\n--- TEST GROUP 3: Timetable Security & Unlinked Child Rejection ---");
  {
    const req = createParentReq(`http://localhost:3000/api/parent/timetable?studentId=${studentUnlinked._id.toString()}`);
    const res = await getTimetable(req);
    assert(res.status === 403, "Accessing unlinked Student 3 timetable returns 403 Forbidden");
    const json = await res.json();
    assert(json.error.code === "FORBIDDEN_CHILD_ACCESS", "Error code is FORBIDDEN_CHILD_ACCESS");
  }

  // --- PART B: EXAMS TESTS ---
  console.log("\n--- TEST GROUP 4: Exams Default Child Scoping & Datesheet ---");
  {
    const req = createParentReq("http://localhost:3000/api/parent/exams");
    const res = await getExams(req);
    assert(res.status === 200, "GET /api/parent/exams returns 200 OK");
    const json = await res.json();
    assert(json.success === true, "Response reports success = true");
    assert(json.data.academicContext.student._id === student1._id.toString(), "Defaults to linked Student 1 (Rohan)");
    assert(json.data.exams.length === 1, "Exactly 1 exam scheduled for Class 10-A");
    assert(json.data.exams[0].name === "Mid-Term Examination 2026", "Exam name matches Mid-Term");
    assert(json.data.exams[0].schedule.length === 2, "Datesheet contains 2 subject papers");
    assert(json.data.exams[0].schedule[0].subjectName === "Mathematics", "Paper 1 is Mathematics");
    assert(json.data.exams[0].schedule[0].maximumMarks === 100, "Maximum marks is 100");
  }

  console.log("\n--- TEST GROUP 5: Exams Multi-Child Switching ---");
  {
    const req = createParentReq(`http://localhost:3000/api/parent/exams?studentId=${student2._id.toString()}`);
    const res = await getExams(req);
    assert(res.status === 200, "GET /api/parent/exams?studentId=Student2 returns 200 OK");
    const json = await res.json();
    assert(json.data.academicContext.student._id === student2._id.toString(), "Scoped to Student 2 (Riya)");
    assert(json.data.exams.length === 1, "Exactly 1 exam scheduled for Class 8-B");
    assert(json.data.exams[0].name === "Junior Quarterly Assessment", "Exam name matches Junior Quarterly");
    assert(json.data.exams[0].schedule.length === 1, "Datesheet contains 1 subject paper");
    assert(json.data.exams[0].schedule[0].subjectName === "History", "Paper is History");
    assert(json.data.exams[0].schedule[0].maximumMarks === 50, "Max marks is 50");
  }

  console.log("\n--- TEST GROUP 6: Exams Security & Unlinked Child Rejection ---");
  {
    const req = createParentReq(`http://localhost:3000/api/parent/exams?studentId=${studentUnlinked._id.toString()}`);
    const res = await getExams(req);
    assert(res.status === 403, "Accessing unlinked Student 3 exams returns 403 Forbidden");
    const json = await res.json();
    assert(json.error.code === "FORBIDDEN_CHILD_ACCESS", "Error code is FORBIDDEN_CHILD_ACCESS");
  }

  // --- PART C: READ-ONLY ENFORCEMENT ---
  console.log("\n--- TEST GROUP 7: Read-Only HTTP Method Enforcement ---");
  {
    assert((await postTimetable()).status === 405, "POST /api/parent/timetable returns 405");
    assert((await putTimetable()).status === 405, "PUT /api/parent/timetable returns 405");
    assert((await patchTimetable()).status === 405, "PATCH /api/parent/timetable returns 405");
    assert((await deleteTimetable()).status === 405, "DELETE /api/parent/timetable returns 405");
    assert((await postExams()).status === 405, "POST /api/parent/exams returns 405");
    assert((await putExams()).status === 405, "PUT /api/parent/exams returns 405");
    assert((await patchExams()).status === 405, "PATCH /api/parent/exams returns 405");
    assert((await deleteExams()).status === 405, "DELETE /api/parent/exams returns 405");
  }

  console.log("\n============================================================");
  console.log(`ALL TESTS PASSED! (${testsPassed}/${testsTotal})`);
  console.log("============================================================");

  // Cleanup test artifacts
  await Promise.all([
    School.deleteOne({ _id: schoolA._id }),
    AcademicYear.deleteOne({ _id: ayA._id }),
    Class.deleteMany({ _id: { $in: [class10._id, class8._id] } }),
    Section.deleteMany({ _id: { $in: [section10A._id, section8B._id] } }),
    Subject.deleteMany({ _id: { $in: [subjectMath._id, subjectScience._id, subjectHistory._id] } }),
    Teacher.deleteOne({ _id: teacherDoc._id }),
    TimetableEntry.deleteMany({ schoolId: schoolA._id }),
    Exam.deleteMany({ _id: { $in: [exam1._id, exam2._id] } }),
    ExamTarget.deleteMany({ schoolId: schoolA._id }),
    ExamSubject.deleteMany({ schoolId: schoolA._id }),
    StudentParent.deleteMany({ schoolId: schoolA._id }),
    Parent.deleteOne({ _id: parentDoc._id }),
    Student.deleteMany({ _id: { $in: [student1._id, student2._id, studentUnlinked._id] } }),
    User.deleteMany({ _id: { $in: [studentUser1._id, studentUser2._id, studentUser3._id, parentUser._id, teacherUser._id] } }),
  ]);

  process.exit(0);
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
