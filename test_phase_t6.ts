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

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n============================================================");
  console.log("STARTING T6 TEST SUITE: TEACHER EXAMS, MARKS & LOCKING");
  console.log("============================================================\n");

  const mongoose = (await import("mongoose")).default;
  const connectToDatabase = (await import("./src/lib/db")).default;
  const School = (await import("./src/models/School")).default;
  const User = (await import("./src/models/User")).default;
  const AcademicYear = (await import("./src/models/AcademicYear")).default;
  const Class = (await import("./src/models/Class")).default;
  const Section = (await import("./src/models/Section")).default;
  const Subject = (await import("./src/models/Subject")).default;
  const Teacher = (await import("./src/models/Teacher")).default;
  const Student = (await import("./src/models/Student")).default;
  const TeacherAssignment = (await import("./src/models/TeacherAssignment")).default;
  const Exam = (await import("./src/models/Exam")).default;
  const ExamTarget = (await import("./src/models/ExamTarget")).default;
  const ExamSubject = (await import("./src/models/ExamSubject")).default;
  const ExamResult = (await import("./src/models/ExamResult")).default;
  const AuditLog = (await import("./src/models/AuditLog")).default;
  const { createToken } = await import("./src/lib/jwt");
  const { NextRequest } = await import("next/server");

  const { GET: getTeacherExams } = await import("./src/app/api/teacher/exams/route");
  const { GET: getExamMarks, POST: postExamMarks } = await import("./src/app/api/teacher/exams/[examId]/marks/route");
  const { POST: postAdminExam } = await import("./src/app/api/admin/exams/route");

  await connectToDatabase();

  const cleanupIds: { [key: string]: any[] } = {
    schools: [],
    users: [],
    academicYears: [],
    classes: [],
    sections: [],
    subjects: [],
    teachers: [],
    students: [],
    teacherAssignments: [],
    exams: [],
    examTargets: [],
    examSubjects: [],
    examResults: [],
    auditLogs: [],
  };

  const runId = Date.now().toString().slice(-6);

  try {
    const adminId = new mongoose.Types.ObjectId();

    // 1. Create School & Academic Year
    const school = await School.create({
      name: `Test Academy T6 ${runId}`,
      code: `TA6_${runId}`,
      address: "Exam Center St",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      email: `t6_${runId}@school.com`,
      plan: "STANDARD",
      studentLimit: 500,
      subscriptionStartDate: new Date(),
      subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
      subscriptionStatus: "ACTIVE",
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.schools.push(school._id);

    const academicYear = await AcademicYear.create({
      schoolId: school._id,
      name: `2026-2027 ${runId}`,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.academicYears.push(academicYear._id);

    // 2. Create Classes and Sections
    const class1 = await Class.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      name: `Grade 9 ${runId}`,
      code: `G9_${runId}`,
      displayOrder: 9,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.classes.push(class1._id);

    const sec1A = await Section.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: class1._id,
      name: "Section A",
      capacity: 30,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.sections.push(sec1A._id);

    const class2 = await Class.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      name: `Grade 10 ${runId}`,
      code: `G10_${runId}`,
      displayOrder: 10,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.classes.push(class2._id);

    const sec2A = await Section.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: class2._id,
      name: "Section A",
      capacity: 30,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.sections.push(sec2A._id);

    // 3. Create Subjects
    const mathSub = await Subject.create({
      schoolId: school._id,
      name: "Mathematics",
      code: `MATH_${runId}`,
      subjectType: "CORE",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.subjects.push(mathSub._id);

    const scienceSub = await Subject.create({
      schoolId: school._id,
      name: "Science",
      code: `SCI_${runId}`,
      subjectType: "CORE",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.subjects.push(scienceSub._id);

    // 4. Create Teachers:
    // Teacher A: Grade 9 Sec A Math
    // Teacher B: Grade 10 Sec A Science
    const userA = await User.create({
      name: "Teacher Alice",
      schoolId: school._id,
      email: `teacher.a.${runId}@test.com`,
      password: "Password123!",
      role: "TEACHER",
      isActive: true,
    });
    cleanupIds.users.push(userA._id);

    const teacherA = await Teacher.create({
      schoolId: school._id,
      userId: userA._id,
      teacherId: `TID-A-${runId}`,
      employeeId: `EMP-A-${runId}`,
      firstName: "Alice",
      lastName: "Math",
      email: userA.email,
      gender: "FEMALE",
      phone: "1112223333",
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.teachers.push(teacherA._id);

    const userB = await User.create({
      name: "Teacher Bob",
      schoolId: school._id,
      email: `teacher.b.${runId}@test.com`,
      password: "Password123!",
      role: "TEACHER",
      isActive: true,
    });
    cleanupIds.users.push(userB._id);

    const teacherB = await Teacher.create({
      schoolId: school._id,
      userId: userB._id,
      teacherId: `TID-B-${runId}`,
      employeeId: `EMP-B-${runId}`,
      firstName: "Bob",
      lastName: "Science",
      email: userB.email,
      gender: "MALE",
      phone: "4445556666",
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.teachers.push(teacherB._id);

    // Allocations
    const allocA = await TeacherAssignment.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      teacherId: teacherA._id,
      classId: class1._id,
      sectionId: sec1A._id,
      subjectId: mathSub._id,
      assignmentType: "SUBJECT_TEACHER",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.teacherAssignments.push(allocA._id);

    const allocB = await TeacherAssignment.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      teacherId: teacherB._id,
      classId: class2._id,
      sectionId: sec2A._id,
      subjectId: scienceSub._id,
      assignmentType: "SUBJECT_TEACHER",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.teacherAssignments.push(allocB._id);

    // 5. Create Students in Grade 9 Sec A
    const userStud1 = await User.create({
      name: "Student One",
      schoolId: school._id,
      email: `s1.${runId}@test.com`,
      password: "Password123!",
      role: "STUDENT",
      isActive: true,
    });
    cleanupIds.users.push(userStud1._id);

    const student1 = await Student.create({
      schoolId: school._id,
      userId: userStud1._id,
      academicYearId: academicYear._id,
      classId: class1._id,
      sectionId: sec1A._id,
      admissionNumber: `ADM-T6-1-${runId}`,
      rollNumber: "101",
      firstName: "Charlie",
      lastName: "Brown",
      dateOfBirth: new Date("2010-01-01"),
      admissionDate: new Date("2024-04-01"),
      gender: "MALE",
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.students.push(student1._id);

    const userStud2 = await User.create({
      name: "Student Two",
      schoolId: school._id,
      email: `s2.${runId}@test.com`,
      password: "Password123!",
      role: "STUDENT",
      isActive: true,
    });
    cleanupIds.users.push(userStud2._id);

    const student2 = await Student.create({
      schoolId: school._id,
      userId: userStud2._id,
      academicYearId: academicYear._id,
      classId: class1._id,
      sectionId: sec1A._id,
      admissionNumber: `ADM-T6-2-${runId}`,
      rollNumber: "102",
      firstName: "Diana",
      lastName: "Prince",
      dateOfBirth: new Date("2010-05-15"),
      admissionDate: new Date("2024-04-01"),
      gender: "FEMALE",
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.students.push(student2._id);

    // 6. Admin creates Exam, ExamTargets, and ExamSubjects
    const exam1 = await Exam.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      name: `Mid-Term Examination ${runId}`,
      description: "Half yearly evaluation 2026",
      startDate: new Date("2026-10-01"),
      endDate: new Date("2026-10-15"),
      status: "SCHEDULED",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.exams.push(exam1._id);

    // ExamTarget for Class 1 Sec 1A
    const target1 = await ExamTarget.create({
      schoolId: school._id,
      examId: exam1._id,
      academicYearId: academicYear._id,
      classId: class1._id,
      sectionId: sec1A._id,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.examTargets.push(target1._id);

    // ExamTarget for Class 2 Sec 2A
    const target2 = await ExamTarget.create({
      schoolId: school._id,
      examId: exam1._id,
      academicYearId: academicYear._id,
      classId: class2._id,
      sectionId: sec2A._id,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.examTargets.push(target2._id);

    // ExamSubject Math for Class 1 (Max: 100, Pass: 40)
    const examSubMath = await ExamSubject.create({
      schoolId: school._id,
      examId: exam1._id,
      academicYearId: academicYear._id,
      classId: class1._id,
      subjectId: mathSub._id,
      maximumMarks: 100,
      passingMarks: 40,
      examDate: new Date("2026-10-05"),
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.examSubjects.push(examSubMath._id);

    // ExamSubject Science for Class 2 (Max: 50, Pass: 20)
    const examSubSci = await ExamSubject.create({
      schoolId: school._id,
      examId: exam1._id,
      academicYearId: academicYear._id,
      classId: class2._id,
      subjectId: scienceSub._id,
      maximumMarks: 50,
      passingMarks: 20,
      examDate: new Date("2026-10-08"),
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.examSubjects.push(examSubSci._id);

    // Auth Tokens
    const tokenTeacherA = createToken({
      userId: userA._id.toString(),
      email: userA.email,
      role: "TEACHER",
    });

    const tokenTeacherB = createToken({
      userId: userB._id.toString(),
      email: userB.email,
      role: "TEACHER",
    });

    console.log("\n--- Test 1: Scope Enforcement on Teacher Exam Schedule Viewing ---");
    // Teacher A views assigned exams
    const reqExamsA = new NextRequest("http://localhost:3000/api/teacher/exams", {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenTeacherA}` },
    });
    const resExamsA = await getTeacherExams(reqExamsA);
    const examsAJson = await resExamsA.json();
    assert(resExamsA.status === 200 && examsAJson.success, "Teacher A fetches assigned exam schedules successfully");
    assert(examsAJson.data.exams.length === 1, "Teacher A sees exactly 1 assigned exam schedule");
    assert(
      examsAJson.data.exams[0].subjectName === "Mathematics" && examsAJson.data.exams[0].className.includes("Grade 9"),
      "Teacher A schedule matches Grade 9 Mathematics"
    );

    // Teacher B views assigned exams
    const reqExamsB = new NextRequest("http://localhost:3000/api/teacher/exams", {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenTeacherB}` },
    });
    const resExamsB = await getTeacherExams(reqExamsB);
    const examsBJson = await resExamsB.json();
    assert(examsBJson.data.exams.length === 1, "Teacher B sees exactly 1 assigned exam schedule");
    assert(
      examsBJson.data.exams[0].subjectName === "Science" && examsBJson.data.exams[0].className.includes("Grade 10"),
      "Teacher B schedule matches Grade 10 Science"
    );

    console.log("\n--- Test 2: Teacher Cannot Create or Delete Exams (Admin Responsibility) ---");
    const reqCreateExamAsTeacher = new NextRequest("http://localhost:3000/api/admin/exams", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherA}`,
      },
      body: JSON.stringify({
        academicYearId: academicYear._id.toString(),
        name: "Unauthorized Exam Attempt",
        startDate: "2026-11-01",
        endDate: "2026-11-10",
      }),
    });
    const resCreateExamAsTeacher = await postAdminExam(reqCreateExamAsTeacher);
    assert(resCreateExamAsTeacher.status === 403, "Teacher token cannot create exams via admin API (HTTP 403 Forbidden)");

    console.log("\n--- Test 3: Marks Validation on Entry ---");
    // 3A: Teacher A attempts to enter marks for Class 2 (Unauthorized scope) -> 403
    const reqUnauthClassMarks = new NextRequest(`http://localhost:3000/api/teacher/exams/${exam1._id}/marks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherA}`,
      },
      body: JSON.stringify({
        examSubjectId: examSubSci._id.toString(),
        classId: class2._id.toString(),
        sectionId: sec2A._id.toString(),
        subjectId: scienceSub._id.toString(),
        entries: [{ studentId: student1._id.toString(), marks: 45 }],
      }),
    });
    const resUnauthClassMarks = await postExamMarks(reqUnauthClassMarks, { params: Promise.resolve({ examId: exam1._id.toString() }) });
    assert(resUnauthClassMarks.status === 403, "Teacher A cannot enter marks for unauthorized Class 2 (HTTP 403 Forbidden)");

    // 3B: Teacher A attempts to enter negative marks -> 400
    const reqNegativeMarks = new NextRequest(`http://localhost:3000/api/teacher/exams/${exam1._id}/marks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherA}`,
      },
      body: JSON.stringify({
        examSubjectId: examSubMath._id.toString(),
        classId: class1._id.toString(),
        sectionId: sec1A._id.toString(),
        subjectId: mathSub._id.toString(),
        entries: [{ studentId: student1._id.toString(), marks: -5 }],
      }),
    });
    const resNegativeMarks = await postExamMarks(reqNegativeMarks, { params: Promise.resolve({ examId: exam1._id.toString() }) });
    assert(resNegativeMarks.status === 400, "Rejects negative marks entry (HTTP 400 Bad Request)");

    // 3C: Teacher A attempts to enter marks exceeding maximum marks (105 > 100) -> 400
    const reqExceedMarks = new NextRequest(`http://localhost:3000/api/teacher/exams/${exam1._id}/marks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherA}`,
      },
      body: JSON.stringify({
        examSubjectId: examSubMath._id.toString(),
        classId: class1._id.toString(),
        sectionId: sec1A._id.toString(),
        subjectId: mathSub._id.toString(),
        entries: [{ studentId: student1._id.toString(), marks: 105 }],
      }),
    });
    const resExceedMarks = await postExamMarks(reqExceedMarks, { params: Promise.resolve({ examId: exam1._id.toString() }) });
    assert(resExceedMarks.status === 400, "Rejects marks exceeding maximum marks (HTTP 400 Bad Request)");

    // 3D: Teacher A enters valid marks for Student 1 (92) and Student 2 (35) -> 200 OK
    const reqValidMarks = new NextRequest(`http://localhost:3000/api/teacher/exams/${exam1._id}/marks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherA}`,
      },
      body: JSON.stringify({
        examSubjectId: examSubMath._id.toString(),
        classId: class1._id.toString(),
        sectionId: sec1A._id.toString(),
        subjectId: mathSub._id.toString(),
        entries: [
          { studentId: student1._id.toString(), marks: 92, remarks: "Outstanding performance" },
          { studentId: student2._id.toString(), marks: 35, remarks: "Needs improvement" },
        ],
      }),
    });
    const resValidMarks = await postExamMarks(reqValidMarks, { params: Promise.resolve({ examId: exam1._id.toString() }) });
    const validMarksJson = await resValidMarks.json();
    assert(resValidMarks.status === 200 && validMarksJson.success, "Teacher A successfully records marks for class roster (HTTP 200 OK)");

    console.log("\n--- Test 4: Automatic Grade & Pass/Fail Calculation ---");
    const result1 = await ExamResult.findOne({
      schoolId: school._id,
      examId: exam1._id,
      studentId: student1._id,
      subjectId: mathSub._id,
    });
    assert(result1?.marks === 92 && result1?.grade === "A+" && result1?.isPassed === true, "Student 1 auto-calculated: 92 marks -> Grade A+ -> PASS");

    const result2 = await ExamResult.findOne({
      schoolId: school._id,
      examId: exam1._id,
      studentId: student2._id,
      subjectId: mathSub._id,
    });
    assert(result2?.marks === 35 && result2?.grade === "F" && result2?.isPassed === false, "Student 2 auto-calculated: 35 marks -> Grade F -> FAIL");

    console.log("\n--- Test 5: Audit Logging ---");
    const auditEntered = await AuditLog.findOne({
      schoolId: school._id,
      action: "MARKS_ENTERED",
      entityId: exam1._id.toString(),
    });
    assert(!!auditEntered, "AuditLog generated for MARKS_ENTERED");
    if (auditEntered) cleanupIds.auditLogs.push(auditEntered._id);

    console.log("\n--- Test 6: Edit Marks Before Publication & Audit Update ---");
    const reqUpdateMarks = new NextRequest(`http://localhost:3000/api/teacher/exams/${exam1._id}/marks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherA}`,
      },
      body: JSON.stringify({
        examSubjectId: examSubMath._id.toString(),
        classId: class1._id.toString(),
        sectionId: sec1A._id.toString(),
        subjectId: mathSub._id.toString(),
        entries: [
          { studentId: student1._id.toString(), marks: 95, remarks: "Revised score" },
          { studentId: student2._id.toString(), marks: 42, remarks: "Re-evaluation passed" },
        ],
      }),
    });
    const resUpdateMarks = await postExamMarks(reqUpdateMarks, { params: Promise.resolve({ examId: exam1._id.toString() }) });
    assert(resUpdateMarks.status === 200, "Teacher A can update marks before publication");

    const auditUpdated = await AuditLog.findOne({
      schoolId: school._id,
      action: "MARKS_UPDATED",
      entityId: exam1._id.toString(),
    });
    assert(!!auditUpdated, "AuditLog generated for MARKS_UPDATED");
    if (auditUpdated) cleanupIds.auditLogs.push(auditUpdated._id);

    console.log("\n--- Test 7: Strict Publication Locking (Post-Publication Modification Denial) ---");
    // Admin publishes the exam
    exam1.status = "PUBLISHED";
    await exam1.save();

    // Teacher A attempts to modify marks after publication -> 403 Forbidden
    const reqPostPubEdit = new NextRequest(`http://localhost:3000/api/teacher/exams/${exam1._id}/marks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherA}`,
      },
      body: JSON.stringify({
        examSubjectId: examSubMath._id.toString(),
        classId: class1._id.toString(),
        sectionId: sec1A._id.toString(),
        subjectId: mathSub._id.toString(),
        entries: [{ studentId: student1._id.toString(), marks: 100 }],
      }),
    });
    const resPostPubEdit = await postExamMarks(reqPostPubEdit, { params: Promise.resolve({ examId: exam1._id.toString() }) });
    assert(resPostPubEdit.status === 403, "Teacher cannot modify marks after results have been published (HTTP 403 Forbidden)");

    // Roster query reports isLocked = true
    const reqMarksRoster = new NextRequest(
      `http://localhost:3000/api/teacher/exams/${exam1._id}/marks?classId=${class1._id}&sectionId=${sec1A._id}&subjectId=${mathSub._id}&examSubjectId=${examSubMath._id}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${tokenTeacherA}` },
      }
    );
    const resMarksRoster = await getExamMarks(reqMarksRoster, { params: Promise.resolve({ examId: exam1._id.toString() }) });
    const rosterJson = await resMarksRoster.json();
    assert(rosterJson.data.isLocked === true, "Marks roster reports isLocked = true when exam is published");

  } catch (err) {
    console.error("Test execution exception:", err);
    failed++;
  } finally {
    // Cleanup test data
    console.log("\n--- Cleaning up test records ---");
    for (const id of cleanupIds.auditLogs) await AuditLog.findByIdAndDelete(id);
    for (const id of cleanupIds.examResults) await ExamResult.findByIdAndDelete(id);
    await ExamResult.deleteMany({ schoolId: cleanupIds.schools[0] });
    for (const id of cleanupIds.examSubjects) await ExamSubject.findByIdAndDelete(id);
    for (const id of cleanupIds.examTargets) await ExamTarget.findByIdAndDelete(id);
    for (const id of cleanupIds.exams) await Exam.findByIdAndDelete(id);
    for (const id of cleanupIds.teacherAssignments) await TeacherAssignment.findByIdAndDelete(id);
    for (const id of cleanupIds.students) await Student.findByIdAndDelete(id);
    for (const id of cleanupIds.teachers) await Teacher.findByIdAndDelete(id);
    for (const id of cleanupIds.subjects) await Subject.findByIdAndDelete(id);
    for (const id of cleanupIds.sections) await Section.findByIdAndDelete(id);
    for (const id of cleanupIds.classes) await Class.findByIdAndDelete(id);
    for (const id of cleanupIds.academicYears) await AcademicYear.findByIdAndDelete(id);
    for (const id of cleanupIds.users) await User.findByIdAndDelete(id);
    for (const id of cleanupIds.schools) await School.findByIdAndDelete(id);

    console.log(`\n========================================`);
    console.log(`Results: ${passed} PASSED, ${failed} FAILED`);
    console.log(`========================================`);

    process.exit(failed > 0 ? 1 : 0);
  }
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
