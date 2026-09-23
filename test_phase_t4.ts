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
  console.log("STARTING T4 TEST SUITE: TEACHER ASSIGNMENTS & EVALUATION");
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
  const Assignment = (await import("./src/models/Assignment")).default;
  const AssignmentSubmission = (await import("./src/models/AssignmentSubmission")).default;
  const AuditLog = (await import("./src/models/AuditLog")).default;
  const { createToken } = await import("./src/lib/jwt");
  const { NextRequest } = await import("next/server");

  const { GET: getAssignments, POST: postAssignment } = await import("./src/app/api/teacher/assignments/route");
  const { GET: getAssignmentDetail, PATCH: patchAssignment, DELETE: deleteAssignment } = await import("./src/app/api/teacher/assignments/[assignmentId]/route");
  const { GET: getSubmissions } = await import("./src/app/api/teacher/assignments/[assignmentId]/submissions/route");
  const { PATCH: patchSubmission } = await import("./src/app/api/teacher/assignments/[assignmentId]/submissions/[submissionId]/route");

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
    assignments: [],
    submissions: [],
    auditLogs: [],
  };

  const runId = Date.now().toString().slice(-6);

  try {
    const adminId = new mongoose.Types.ObjectId();

    // 1. Create School & Academic Year
    const school = await School.create({
      name: `Test Academy T4 ${runId}`,
      code: `TA4_${runId}`,
      address: "Assignment Street",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      email: `t4_${runId}@school.com`,
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

    // 4. Create Teacher A and Teacher B
    const userA = await User.create({
      name: "Alice Teacher",
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
      employeeId: `EMP-T4A-${runId}`,
      firstName: "Alice",
      lastName: "MathTeacher",
      email: `teacher.a.${runId}@test.com`,
      gender: "FEMALE",
      phone: "1112223333",
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.teachers.push(teacherA._id);

    const userB = await User.create({
      name: "Bob Teacher",
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
      employeeId: `EMP-T4B-${runId}`,
      firstName: "Bob",
      lastName: "ScienceTeacher",
      email: `teacher.b.${runId}@test.com`,
      gender: "MALE",
      phone: "4445556666",
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.teachers.push(teacherB._id);

    // 5. TeacherAssignment allocations:
    // Teacher A -> Grade 9 Sec A (Math)
    // Teacher B -> Grade 10 Sec A (Science)
    const allocA = await TeacherAssignment.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      teacherId: teacherA._id,
      classId: class1._id,
      sectionId: sec1A._id,
      subjectId: mathSub._id,
      assignmentType: "SUBJECT_TEACHER",
      isClassTeacher: false,
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
      isClassTeacher: false,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.teacherAssignments.push(allocB._id);

    // 6. Create Students for Grade 9 Sec A
    const userStud1 = await User.create({
      name: "Charlie Brown",
      schoolId: school._id,
      email: `stud1.t4.${runId}@test.com`,
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
      admissionNumber: `ADM-T4-1-${runId}`,
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
      name: "Diana Prince",
      schoolId: school._id,
      email: `stud2.t4.${runId}@test.com`,
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
      admissionNumber: `ADM-T4-2-${runId}`,
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

    console.log("\n--- Test 1: Assignment Scope Validation & Creation ---");
    
    // 1A: Teacher A attempts to create assignment for Class 2 (Unauthorized) -> 403
    const reqUnauthorizedClass = new NextRequest("http://localhost:3000/api/teacher/assignments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherA}`,
      },
      body: JSON.stringify({
        academicYearId: academicYear._id.toString(),
        title: "Algebra Homework",
        description: "Solve chapter 1",
        classId: class2._id.toString(),
        sectionId: sec2A._id.toString(),
        subjectId: mathSub._id.toString(),
        assignedDate: "2026-09-20",
        dueDate: "2026-09-25",
        maximumMarks: 50,
      }),
    });
    const resUnauthorizedClass = await postAssignment(reqUnauthorizedClass);
    assert(resUnauthorizedClass.status === 403, "Teacher A cannot create assignment for unauthorized Class 2 (HTTP 403)");

    // 1B: Teacher A attempts to create assignment for Science subject in Class 1 (Unauthorized subject) -> 403
    const reqUnauthorizedSubject = new NextRequest("http://localhost:3000/api/teacher/assignments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherA}`,
      },
      body: JSON.stringify({
        academicYearId: academicYear._id.toString(),
        title: "Biology Project",
        description: "Plant cells",
        classId: class1._id.toString(),
        sectionId: sec1A._id.toString(),
        subjectId: scienceSub._id.toString(),
        assignedDate: "2026-09-20",
        dueDate: "2026-09-25",
        maximumMarks: 50,
      }),
    });
    const resUnauthorizedSubject = await postAssignment(reqUnauthorizedSubject);
    assert(resUnauthorizedSubject.status === 403, "Teacher A cannot create assignment for unauthorized Subject (HTTP 403)");

    // 1C: Teacher A creates valid Math assignment for Grade 9 Sec A -> 201
    const reqValidCreate = new NextRequest("http://localhost:3000/api/teacher/assignments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherA}`,
      },
      body: JSON.stringify({
        academicYearId: academicYear._id.toString(),
        title: "Quadratic Equations Exercise",
        description: "Complete problems 1-15 on page 42",
        classId: class1._id.toString(),
        sectionId: sec1A._id.toString(),
        subjectId: mathSub._id.toString(),
        assignedDate: "2026-09-20",
        dueDate: "2026-09-28",
        maximumMarks: 100,
        attachments: [{ name: "worksheet.pdf", url: "https://files.school.com/worksheet.pdf", type: "FILE" }],
      }),
    });
    const resValidCreate = await postAssignment(reqValidCreate);
    const validCreateJson = await resValidCreate.json();
    assert(resValidCreate.status === 201 && validCreateJson.success, "Teacher A successfully creates Math assignment (HTTP 201)");
    const assignmentAId = validCreateJson.data?._id;
    if (assignmentAId) {
      cleanupIds.assignments.push(new mongoose.Types.ObjectId(assignmentAId));
    }

    console.log("\n--- Test 2: Audit Logging on Creation ---");
    const createAudit = await AuditLog.findOne({
      schoolId: school._id,
      action: "ASSIGNMENT_CREATED",
      entityId: assignmentAId,
    });
    assert(!!createAudit, "AuditLog generated for ASSIGNMENT_CREATED");
    if (createAudit) cleanupIds.auditLogs.push(createAudit._id);

    console.log("\n--- Test 3: Assignment Listing & Metrics ---");
    const reqList = new NextRequest("http://localhost:3000/api/teacher/assignments", {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenTeacherA}` },
    });
    const resList = await getAssignments(reqList);
    const listJson = await resList.json();
    assert(resList.status === 200 && listJson.success, "Assignment list fetched successfully");
    assert(listJson.data.assignments.length === 1, "List contains only Teacher A assignments");
    assert(listJson.data.assignments[0].submissionsSummary.total === 0, "Initial submission total is 0");
    assert(listJson.data.assignments[0].title === "Quadratic Equations Exercise", "Assignment title matches created title");

    console.log("\n--- Test 4: Submissions View & Merging ---");
    // Create one submission for Student 1
    const submission1: any = await AssignmentSubmission.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: class1._id,
      sectionId: sec1A._id,
      assignmentId: new mongoose.Types.ObjectId(assignmentAId),
      studentId: student1._id,
      status: "SUBMITTED",
      submittedAt: new Date(),
      content: "Here is my solved worksheet attachment.",
      attachments: [{ name: "charlie_answers.pdf", url: "https://files.school.com/charlie.pdf", type: "FILE" }],
    });
    cleanupIds.submissions.push(submission1._id);

    // Fetch submissions as Teacher A
    const reqSubmissions = new NextRequest(`http://localhost:3000/api/teacher/assignments/${assignmentAId}/submissions`, {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenTeacherA}` },
    });
    const resSubmissions = await getSubmissions(reqSubmissions, { params: Promise.resolve({ assignmentId: assignmentAId }) });
    const subJson = await resSubmissions.json();
    assert(resSubmissions.status === 200 && subJson.success, "Submissions retrieved successfully");
    assert(subJson.data.submissions.length === 2, "Merged roster returns all 2 enrolled students");
    const charlieSub = subJson.data.submissions.find((s: any) => s.admissionNumber.includes("ADM-T4-1"));
    const dianaSub = subJson.data.submissions.find((s: any) => s.admissionNumber.includes("ADM-T4-2"));
    assert(charlieSub?.submission?.status === "SUBMITTED" && !!charlieSub.submission._id, "Student 1 shows SUBMITTED status with submissionId");
    assert(!dianaSub?.submission, "Student 2 has no submission record (unsubmitted)");

    console.log("\n--- Test 5: Teacher Grading & Evaluation ---");
    // Teacher A grades Student 1 submission
    const reqGrade = new NextRequest(`http://localhost:3000/api/teacher/assignments/${assignmentAId}/submissions/${submission1._id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherA}`,
      },
      body: JSON.stringify({
        marks: 95,
        feedback: "Excellent work! Clear step-by-step solutions.",
      }),
    });
    const resGrade = await patchSubmission(reqGrade, {
      params: Promise.resolve({ assignmentId: assignmentAId, submissionId: submission1._id.toString() }),
    });
    const gradeJson = await resGrade.json();
    assert(resGrade.status === 200 && gradeJson.success, "Submission evaluated and graded successfully");
    assert(gradeJson.data.status === "REVIEWED", "Submission status changed to REVIEWED");
    assert(gradeJson.data.marks === 95, "Marks recorded correctly");

    // Check SUBMISSION_REVIEWED audit log
    const reviewAudit = await AuditLog.findOne({
      schoolId: school._id,
      action: "SUBMISSION_REVIEWED",
      entityId: submission1._id.toString(),
    });
    assert(!!reviewAudit, "AuditLog generated for SUBMISSION_REVIEWED");
    if (reviewAudit) cleanupIds.auditLogs.push(reviewAudit._id);

    // Test exceeding maximum marks
    const reqExceedMarks = new NextRequest(`http://localhost:3000/api/teacher/assignments/${assignmentAId}/submissions/${submission1._id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherA}`,
      },
      body: JSON.stringify({
        marks: 150, // Max is 100
        feedback: "Too high marks",
      }),
    });
    const resExceedMarks = await patchSubmission(reqExceedMarks, {
      params: Promise.resolve({ assignmentId: assignmentAId, submissionId: submission1._id.toString() }),
    });
    assert(resExceedMarks.status === 400, "Rejects marks exceeding maximum marks (HTTP 400)");

    console.log("\n--- Test 6: Cross-Teacher Isolation & Security ---");
    // Teacher B attempts to view Teacher A's assignment detail
    const reqCrossDetail = new NextRequest(`http://localhost:3000/api/teacher/assignments/${assignmentAId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenTeacherB}` },
    });
    const resCrossDetail = await getAssignmentDetail(reqCrossDetail, {
      params: Promise.resolve({ assignmentId: assignmentAId }),
    });
    assert(resCrossDetail.status === 403 || resCrossDetail.status === 404, "Teacher B cannot view Teacher A assignment (Forbidden/NotFound)");

    // Teacher B attempts to view Teacher A assignment submissions
    const reqCrossSubs = new NextRequest(`http://localhost:3000/api/teacher/assignments/${assignmentAId}/submissions`, {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenTeacherB}` },
    });
    const resCrossSubs = await getSubmissions(reqCrossSubs, {
      params: Promise.resolve({ assignmentId: assignmentAId }),
    });
    assert(resCrossSubs.status === 403 || resCrossSubs.status === 404, "Teacher B cannot view submissions for Teacher A assignment");

    // Teacher B attempts to grade Teacher A assignment submission
    const reqCrossGrade = new NextRequest(`http://localhost:3000/api/teacher/assignments/${assignmentAId}/submissions/${submission1._id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherB}`,
      },
      body: JSON.stringify({
        marks: 0,
        feedback: "Hacked",
      }),
    });
    const resCrossGrade = await patchSubmission(reqCrossGrade, {
      params: Promise.resolve({ assignmentId: assignmentAId, submissionId: submission1._id.toString() }),
    });
    assert(resCrossGrade.status === 403 || resCrossGrade.status === 404, "Teacher B cannot grade Teacher A assignment submissions");

    console.log("\n--- Test 7: Assignment Update & Deletion ---");
    // Update assignment
    const reqUpdate = new NextRequest(`http://localhost:3000/api/teacher/assignments/${assignmentAId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherA}`,
      },
      body: JSON.stringify({
        title: "Quadratic Equations Exercise - Revised",
        description: "Complete problems 1-20",
      }),
    });
    const resUpdate = await patchAssignment(reqUpdate, {
      params: Promise.resolve({ assignmentId: assignmentAId }),
    });
    const updateJson = await resUpdate.json();
    assert(resUpdate.status === 200 && updateJson.data.title.includes("Revised"), "Teacher A updates assignment successfully");

    // Delete assignment
    const reqDelete = new NextRequest(`http://localhost:3000/api/teacher/assignments/${assignmentAId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenTeacherA}` },
    });
    const resDelete = await deleteAssignment(reqDelete, {
      params: Promise.resolve({ assignmentId: assignmentAId }),
    });
    assert(resDelete.status === 200, "Teacher A deletes assignment successfully");

    const deleteAudit = await AuditLog.findOne({
      schoolId: school._id,
      action: "ASSIGNMENT_DELETED",
      entityId: assignmentAId,
    });
    assert(!!deleteAudit, "AuditLog generated for ASSIGNMENT_DELETED");
    if (deleteAudit) cleanupIds.auditLogs.push(deleteAudit._id);

  } catch (err) {
    console.error("Test execution exception:", err);
    failed++;
  } finally {
    // Cleanup test data
    console.log("\n--- Cleaning up test records ---");
    for (const id of cleanupIds.auditLogs) await AuditLog.findByIdAndDelete(id);
    for (const id of cleanupIds.submissions) await AssignmentSubmission.findByIdAndDelete(id);
    for (const id of cleanupIds.assignments) await Assignment.findByIdAndDelete(id);
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
