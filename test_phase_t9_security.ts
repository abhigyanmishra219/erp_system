import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";

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
  console.log("STARTING T9 MASTER SECURITY, HARDENING & INTEGRATION AUDIT");
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
  const StudyMaterial = (await import("./src/models/StudyMaterial")).default;
  const Exam = (await import("./src/models/Exam")).default;
  const ExamTarget = (await import("./src/models/ExamTarget")).default;
  const ExamSubject = (await import("./src/models/ExamSubject")).default;
  const ExamResult = (await import("./src/models/ExamResult")).default;
  const TimetableEntry = (await import("./src/models/TimetableEntry")).default;
  const LeaveRequest = (await import("./src/models/LeaveRequest")).default;
  const Notice = (await import("./src/models/Notice")).default;
  const Notification = (await import("./src/models/Notification")).default;
  const AuditLog = (await import("./src/models/AuditLog")).default;

  const { createToken } = await import("./src/lib/jwt");
  const { NextRequest } = await import("next/server");

  // Route Handlers
  const { POST: postLogin } = await import("./src/app/api/auth/login/route");
  const { GET: getDashboard } = await import("./src/app/api/teacher/dashboard/route");
  const { GET: getStudents } = await import("./src/app/api/teacher/students/route");
  const { POST: postAttendance } = await import("./src/app/api/teacher/attendance/route");
  const { GET: getAssignments, POST: postAssignment } = await import(
    "./src/app/api/teacher/assignments/route"
  );
  const { PATCH: gradeSubmission } = await import(
    "./src/app/api/teacher/assignments/[assignmentId]/submissions/[submissionId]/route"
  );
  const { GET: getStudyMaterials, POST: postStudyMaterial } = await import(
    "./src/app/api/teacher/study-material/route"
  );
  const { PATCH: patchStudyMaterial } = await import(
    "./src/app/api/teacher/study-material/[materialId]/route"
  );
  const { GET: getExams } = await import("./src/app/api/teacher/exams/route");
  const { POST: postMarks } = await import(
    "./src/app/api/teacher/exams/[examId]/marks/route"
  );
  const timetableRoute = await import("./src/app/api/teacher/timetable/route");
  const getTimetable = timetableRoute.GET;
  const { GET: getLeaves, POST: postLeave } = await import(
    "./src/app/api/teacher/leave/route"
  );
  const { POST: cancelLeave } = await import(
    "./src/app/api/teacher/leave/[leaveId]/cancel/route"
  );
  const { GET: getNotices } = await import(
    "./src/app/api/teacher/notices/route"
  );
  const { GET: getNotifications } = await import(
    "./src/app/api/teacher/notifications/route"
  );

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
    assignmentSubmissions: [],
    studyMaterials: [],
    exams: [],
    examTargets: [],
    examSubjects: [],
    examResults: [],
    timetableEntries: [],
    leaveRequests: [],
    notices: [],
    notifications: [],
    auditLogs: [],
  };

  const runId = Date.now().toString().slice(-6);

  try {
    const adminId = new mongoose.Types.ObjectId();
    const defaultHashedPassword = await bcrypt.hash("Password123!", 10);

    // =========================================================================
    // SEED TENANTS: School A and School B
    // =========================================================================
    const schoolA = await School.create({
      name: `School Alpha ${runId}`,
      code: `SCH_A_${runId}`,
      address: "Alpha Street",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      email: `alpha_${runId}@school.com`,
      plan: "STANDARD",
      studentLimit: 500,
      subscriptionStartDate: new Date(),
      subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
      subscriptionStatus: "ACTIVE",
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.schools.push(schoolA._id);

    const schoolB = await School.create({
      name: `School Beta ${runId}`,
      code: `SCH_B_${runId}`,
      address: "Beta Road",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      email: `beta_${runId}@school.com`,
      plan: "STANDARD",
      studentLimit: 500,
      subscriptionStartDate: new Date(),
      subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
      subscriptionStatus: "ACTIVE",
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.schools.push(schoolB._id);

    // Academic Years
    const yearA = await AcademicYear.create({
      schoolId: schoolA._id,
      name: `2026-2027 ${runId}`,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.academicYears.push(yearA._id);

    const yearB = await AcademicYear.create({
      schoolId: schoolB._id,
      name: `2026-2027 ${runId}`,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.academicYears.push(yearB._id);

    // School A: Class 1 (Sec A), Class 2 (Sec B), Subjects (Math, Science)
    const classA1 = await Class.create({
      schoolId: schoolA._id,
      academicYearId: yearA._id,
      name: "Class 1",
      code: `C1_${runId}`,
      displayOrder: 1,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.classes.push(classA1._id);

    const secA1 = await Section.create({
      schoolId: schoolA._id,
      academicYearId: yearA._id,
      classId: classA1._id,
      name: "Section A",
      capacity: 30,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.sections.push(secA1._id);

    const classA2 = await Class.create({
      schoolId: schoolA._id,
      academicYearId: yearA._id,
      name: "Class 2",
      code: `C2_${runId}`,
      displayOrder: 2,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.classes.push(classA2._id);

    const secA2 = await Section.create({
      schoolId: schoolA._id,
      academicYearId: yearA._id,
      classId: classA2._id,
      name: "Section B",
      capacity: 30,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.sections.push(secA2._id);

    const subMathA = await Subject.create({
      schoolId: schoolA._id,
      name: "Mathematics",
      code: `MATH_${runId}`,
      subjectType: "CORE",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.subjects.push(subMathA._id);

    const subSciA = await Subject.create({
      schoolId: schoolA._id,
      name: "Science",
      code: `SCI_${runId}`,
      subjectType: "CORE",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.subjects.push(subSciA._id);

    // School B: Class 10 (Sec B) & Student in School B
    const classB1 = await Class.create({
      schoolId: schoolB._id,
      academicYearId: yearB._id,
      name: "Class 10 Beta",
      code: `CB1_${runId}`,
      displayOrder: 10,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.classes.push(classB1._id);

    const secB1 = await Section.create({
      schoolId: schoolB._id,
      academicYearId: yearB._id,
      classId: classB1._id,
      name: "Section B",
      capacity: 30,
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.sections.push(secB1._id);

    const studentB = await Student.create({
      schoolId: schoolB._id,
      academicYearId: yearB._id,
      classId: classB1._id,
      sectionId: secB1._id,
      admissionNumber: `ADM_B_${runId}`,
      studentId: `SID_B_${runId}`,
      rollNumber: "1",
      firstName: "Beta",
      lastName: "Student",
      dateOfBirth: new Date("2010-01-01"),
      gender: "MALE",
      admissionDate: new Date("2024-04-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.students.push(studentB._id);

    // School A: Students
    const studentA1 = await Student.create({
      schoolId: schoolA._id,
      academicYearId: yearA._id,
      classId: classA1._id,
      sectionId: secA1._id,
      admissionNumber: `ADM_A1_${runId}`,
      studentId: `SID_A1_${runId}`,
      rollNumber: "1",
      firstName: "Alice",
      lastName: "Alpha",
      dateOfBirth: new Date("2010-01-01"),
      gender: "FEMALE",
      admissionDate: new Date("2024-04-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.students.push(studentA1._id);

    const studentA2 = await Student.create({
      schoolId: schoolA._id,
      academicYearId: yearA._id,
      classId: classA2._id,
      sectionId: secA2._id,
      admissionNumber: `ADM_A2_${runId}`,
      studentId: `SID_A2_${runId}`,
      rollNumber: "2",
      firstName: "Alex",
      lastName: "OutScope",
      dateOfBirth: new Date("2010-02-02"),
      gender: "MALE",
      admissionDate: new Date("2024-04-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.students.push(studentA2._id);

    // Users & Teachers
    // Teacher A: School A, assigned to Class 1 Sec A Math
    const userA = await User.create({
      schoolId: schoolA._id,
      email: `teachera_${runId}@schoola.edu`,
      password: defaultHashedPassword,
      role: "TEACHER",
      name: "Teacher Alpha",
      isActive: true,
    });
    cleanupIds.users.push(userA._id);

    const teacherA = await Teacher.create({
      schoolId: schoolA._id,
      userId: userA._id,
      teacherId: `TID_A_${runId}`,
      firstName: "Teacher",
      lastName: "Alpha",
      employeeId: `EMP_A_${runId}`,
      email: userA.email,
      gender: "FEMALE",
      joiningDate: new Date("2024-01-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.teachers.push(teacherA._id);

    // Allocation: Teacher A -> Class 1 Sec A Math
    const allocA = await TeacherAssignment.create({
      schoolId: schoolA._id,
      academicYearId: yearA._id,
      teacherId: teacherA._id,
      classId: classA1._id,
      sectionId: secA1._id,
      subjectId: subMathA._id,
      assignmentType: "SUBJECT_TEACHER",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.teacherAssignments.push(allocA._id);

    // Teacher B: School B
    const userB = await User.create({
      schoolId: schoolB._id,
      email: `teacherb_${runId}@schoolb.edu`,
      password: defaultHashedPassword,
      role: "TEACHER",
      name: "Teacher Beta",
      isActive: true,
    });
    cleanupIds.users.push(userB._id);

    const teacherB = await Teacher.create({
      schoolId: schoolB._id,
      userId: userB._id,
      teacherId: `TID_B_${runId}`,
      firstName: "Teacher",
      lastName: "Beta",
      employeeId: `EMP_B_${runId}`,
      email: userB.email,
      gender: "MALE",
      joiningDate: new Date("2024-01-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.teachers.push(teacherB._id);

    // Non-teacher role accounts
    const userAdmin = await User.create({
      schoolId: schoolA._id,
      email: `admin_${runId}@schoola.edu`,
      password: defaultHashedPassword,
      role: "ADMIN",
      name: "Admin Alpha",
      isActive: true,
    });
    cleanupIds.users.push(userAdmin._id);

    const userStudent = await User.create({
      schoolId: schoolA._id,
      email: `student_${runId}@schoola.edu`,
      password: defaultHashedPassword,
      role: "STUDENT",
      name: "Student Alpha",
      isActive: true,
    });
    cleanupIds.users.push(userStudent._id);

    const userParent = await User.create({
      schoolId: schoolA._id,
      email: `parent_${runId}@schoola.edu`,
      password: defaultHashedPassword,
      role: "PARENT",
      name: "Parent Alpha",
      isActive: true,
    });
    cleanupIds.users.push(userParent._id);

    // Inactive Teacher
    const userInactive = await User.create({
      schoolId: schoolA._id,
      email: `inactive_${runId}@schoola.edu`,
      password: defaultHashedPassword,
      role: "TEACHER",
      name: "Inactive Teacher",
      isActive: false, // Account disabled
    });
    cleanupIds.users.push(userInactive._id);

    const teacherInactive = await Teacher.create({
      schoolId: schoolA._id,
      userId: userInactive._id,
      teacherId: `TID_INACT_${runId}`,
      firstName: "Inactive",
      lastName: "User",
      employeeId: `EMP_INACT_${runId}`,
      email: userInactive.email,
      gender: "OTHER",
      status: "INACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.teachers.push(teacherInactive._id);

    // Tokens
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

    const tokenAdmin = createToken({
      userId: userAdmin._id.toString(),
      email: userAdmin.email,
      role: "ADMIN",
    });

    const tokenStudent = createToken({
      userId: userStudent._id.toString(),
      email: userStudent.email,
      role: "STUDENT",
    });

    const tokenParent = createToken({
      userId: userParent._id.toString(),
      email: userParent.email,
      role: "PARENT",
    });

    const tokenInactive = createToken({
      userId: userInactive._id.toString(),
      email: userInactive.email,
      role: "TEACHER",
    });

    // =========================================================================
    // 1. AUTHENTICATION & SESSION INTEGRITY AUDIT
    // =========================================================================
    console.log("\n--- Vector 1: Authentication & Session Integrity ---");
    {
      // Valid login
      const reqLogin = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userA.email,
          password: "Password123!",
        }),
      });
      const resLogin = await postLogin(reqLogin);
      assert(resLogin.status === 200, "Valid teacher credentials return HTTP 200");

      // Invalid password
      const reqBadPass = new NextRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userA.email,
          password: "WrongPassword!",
        }),
      });
      const resBadPass = await postLogin(reqBadPass);
      assert(resBadPass.status === 401, "Invalid password returns HTTP 401");

      // Tampered / Corrupted JWT
      const reqTampered = new NextRequest("http://localhost:3000/api/teacher/dashboard", {
        headers: { Authorization: `Bearer ${tokenTeacherA}tampered_signature` },
      });
      const resTampered = await getDashboard(reqTampered);
      assert(resTampered.status === 401, "Tampered JWT signature returns HTTP 401");

      // Inactive teacher account
      const reqInactive = new NextRequest("http://localhost:3000/api/teacher/dashboard", {
        headers: { Authorization: `Bearer ${tokenInactive}` },
      });
      const resInactive = await getDashboard(reqInactive);
      assert(resInactive.status === 403, "Inactive teacher account returns HTTP 403 Forbidden");
    }

    // =========================================================================
    // 2. RBAC ROLE SECURITY MATRIX AUDIT
    // =========================================================================
    console.log("\n--- Vector 2: RBAC Role Security Matrix ---");
    {
      const endpoints = [
        { name: "Teacher Dashboard", handler: getDashboard, path: "http://localhost:3000/api/teacher/dashboard" },
        { name: "Teacher Students", handler: getStudents, path: "http://localhost:3000/api/teacher/students" },
        { name: "Teacher Timetable", handler: getTimetable, path: "http://localhost:3000/api/teacher/timetable" },
        { name: "Teacher Leaves", handler: getLeaves, path: "http://localhost:3000/api/teacher/leave" },
      ];

      for (const ep of endpoints) {
        // Admin
        const resAdmin = await ep.handler(
          new NextRequest(ep.path, { headers: { Authorization: `Bearer ${tokenAdmin}` } })
        );
        assert(resAdmin.status === 403, `${ep.name} strictly rejects ADMIN role (HTTP 403)`);

        // Student
        const resStudent = await ep.handler(
          new NextRequest(ep.path, { headers: { Authorization: `Bearer ${tokenStudent}` } })
        );
        assert(resStudent.status === 403, `${ep.name} strictly rejects STUDENT role (HTTP 403)`);

        // Parent
        const resParent = await ep.handler(
          new NextRequest(ep.path, { headers: { Authorization: `Bearer ${tokenParent}` } })
        );
        assert(resParent.status === 403, `${ep.name} strictly rejects PARENT role (HTTP 403)`);
      }
    }

    // =========================================================================
    // 3. TENANT ISOLATION AUDIT (School A vs School B)
    // =========================================================================
    console.log("\n--- Vector 3: Multi-Tenant Cross-School Isolation ---");
    {
      // Teacher A attempts to query School B Student
      const reqCrossStudent = new NextRequest(
        `http://localhost:3000/api/teacher/students?classId=${classB1._id.toString()}`,
        { headers: { Authorization: `Bearer ${tokenTeacherA}` } }
      );
      const resCrossStudent = await getStudents(reqCrossStudent);
      const jsonCrossStudent = await resCrossStudent.json();
      assert(jsonCrossStudent.data.students.length === 0, "Teacher A receives 0 students from School B");

      // Teacher A attempts to submit attendance for School B section
      const reqCrossAtt = new NextRequest("http://localhost:3000/api/teacher/attendance", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenTeacherA}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: yearA._id.toString(),
          classId: classB1._id.toString(),
          sectionId: secB1._id.toString(),
          date: new Date().toISOString().split("T")[0],
          records: [{ studentId: studentB._id.toString(), status: "PRESENT" }],
        }),
      });
      const resCrossAtt = await postAttendance(reqCrossAtt);
      assert(resCrossAtt.status === 403, "Teacher A is strictly REJECTED (HTTP 403) from marking School B attendance");
    }

    // =========================================================================
    // 4. ACADEMIC ASSIGNMENT SCOPE ENFORCEMENT
    // =========================================================================
    console.log("\n--- Vector 4: Teacher Academic Scope Enforcement ---");
    {
      // Teacher A attempts to query Class 2 (Unassigned)
      const reqOutScopeStudent = new NextRequest(
        `http://localhost:3000/api/teacher/students?classId=${classA2._id.toString()}`,
        { headers: { Authorization: `Bearer ${tokenTeacherA}` } }
      );
      const resOutScopeStudent = await getStudents(reqOutScopeStudent);
      const jsonOutScopeStudent = await resOutScopeStudent.json();
      assert(jsonOutScopeStudent.data.students.length === 0, "Teacher A cannot view students from unassigned Class 2");

      // Teacher A attempts to mark attendance for Class 2 Section B
      const reqOutScopeAtt = new NextRequest("http://localhost:3000/api/teacher/attendance", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenTeacherA}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: yearA._id.toString(),
          classId: classA2._id.toString(),
          sectionId: secA2._id.toString(),
          date: new Date().toISOString().split("T")[0],
          records: [{ studentId: studentA2._id.toString(), status: "PRESENT" }],
        }),
      });
      const resOutScopeAtt = await postAttendance(reqOutScopeAtt);
      assert(resOutScopeAtt.status === 403, "Teacher A rejected (HTTP 403) from unassigned Class 2 attendance");

      // Teacher A attempts to create assignment for Class 2 Section B
      const reqOutScopeAsgn = new NextRequest("http://localhost:3000/api/teacher/assignments", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenTeacherA}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: yearA._id.toString(),
          title: "Unauthorized Homework",
          description: "Testing out-of-scope creation",
          classId: classA2._id.toString(),
          sectionId: secA2._id.toString(),
          subjectId: subSciA._id.toString(),
          assignedDate: new Date().toISOString().split("T")[0],
          dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
          maximumMarks: 100,
        }),
      });
      const resOutScopeAsgn = await postAssignment(reqOutScopeAsgn);
      assert(resOutScopeAsgn.status === 403, "Teacher A rejected (HTTP 403) from unassigned Class 2 assignment creation");
    }

    // =========================================================================
    // 5. ATTENDANCE IDEMPOTENCY & AUDIT LOGGING
    // =========================================================================
    console.log("\n--- Vector 5: Attendance Idempotency & Audit Logging ---");
    {
      const todayStr = new Date().toISOString().split("T")[0];

      // Submit valid attendance for assigned Class 1 Sec A
      const reqValidAtt = new NextRequest("http://localhost:3000/api/teacher/attendance", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenTeacherA}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: yearA._id.toString(),
          classId: classA1._id.toString(),
          sectionId: secA1._id.toString(),
          date: todayStr,
          records: [{ studentId: studentA1._id.toString(), status: "PRESENT" }],
        }),
      });
      const resValidAtt = await postAttendance(reqValidAtt);
      assert(resValidAtt.status === 200, "Assigned Class 1 Sec A attendance submitted successfully (HTTP 200)");

      // Re-submit (Edit attendance on same date - Idempotent Upsert)
      const reqEditAtt = new NextRequest("http://localhost:3000/api/teacher/attendance", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenTeacherA}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: yearA._id.toString(),
          classId: classA1._id.toString(),
          sectionId: secA1._id.toString(),
          date: todayStr,
          records: [{ studentId: studentA1._id.toString(), status: "LATE" }],
        }),
      });
      const resEditAtt = await postAttendance(reqEditAtt);
      assert(resEditAtt.status === 200, "Attendance update on same date is idempotent (HTTP 200)");

      // Verify AuditLog
      const auditAtt = await AuditLog.findOne({
        schoolId: schoolA._id,
        action: { $in: ["ATTENDANCE_BULK_CREATED", "ATTENDANCE_BULK_UPDATED"] },
        userId: userA._id,
      }).lean();
      assert(!!auditAtt, "AuditLog recorded for attendance submission");
    }

    // =========================================================================
    // 6. ASSIGNMENTS, GRADING BOUNDS & CROSS-TEACHER PROTECTION
    // =========================================================================
    console.log("\n--- Vector 6: Assignments, Grading Bounds & Cross-Teacher Protection ---");
    let asgnIdA: string = "";
    let subIdA: string = "";
    {
      // Create valid assignment
      const reqCreateAsgn = new NextRequest("http://localhost:3000/api/teacher/assignments", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenTeacherA}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: yearA._id.toString(),
          title: "Math Homework 1",
          description: "Complete exercises 1 to 10",
          classId: classA1._id.toString(),
          sectionId: secA1._id.toString(),
          subjectId: subMathA._id.toString(),
          assignedDate: new Date().toISOString().split("T")[0],
          dueDate: new Date(Date.now() + 86400000 * 4).toISOString().split("T")[0],
          maximumMarks: 50,
        }),
      });
      const resCreateAsgn = await postAssignment(reqCreateAsgn);
      const jsonCreateAsgn = await resCreateAsgn.json();
      assert(resCreateAsgn.status === 201, "Teacher A creates Math assignment (HTTP 201)");
      asgnIdA = jsonCreateAsgn.data._id;
      cleanupIds.assignments.push(asgnIdA);

      // Seed a submission
      const sub: any = await AssignmentSubmission.create({
        schoolId: schoolA._id,
        assignmentId: asgnIdA,
        studentId: studentA1._id,
        academicYearId: yearA._id,
        classId: classA1._id,
        sectionId: secA1._id,
        submittedAt: new Date(),
        status: "SUBMITTED",
        attachments: [{ name: "Answer.pdf", url: "https://school.edu/answer.pdf" }],
        createdBy: userStudent._id,
        updatedBy: userStudent._id,
      } as any);
      subIdA = sub._id.toString();
      cleanupIds.assignmentSubmissions.push(sub._id);

      // Out-of-bounds grading: Marks exceed max marks (55 > 50)
      const reqOverMarks = new NextRequest(
        `http://localhost:3000/api/teacher/assignments/${asgnIdA}/submissions/${subIdA}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${tokenTeacherA}`, "Content-Type": "application/json" },
          body: JSON.stringify({ marks: 55, feedback: "Great work" }),
        }
      );
      const resOverMarks = await gradeSubmission(reqOverMarks, {
        params: Promise.resolve({ assignmentId: asgnIdA, submissionId: subIdA }),
      });
      assert(resOverMarks.status === 400, "Marks exceeding maximum marks rejected with HTTP 400");

      // Negative marks rejection (-5)
      const reqNegMarks = new NextRequest(
        `http://localhost:3000/api/teacher/assignments/${asgnIdA}/submissions/${subIdA}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${tokenTeacherA}`, "Content-Type": "application/json" },
          body: JSON.stringify({ marks: -5, feedback: "Negative score" }),
        }
      );
      const resNegMarks = await gradeSubmission(reqNegMarks, {
        params: Promise.resolve({ assignmentId: asgnIdA, submissionId: subIdA }),
      });
      assert(resNegMarks.status === 400, "Negative marks rejected with HTTP 400");

      // Teacher B attempts to grade Teacher A's submission
      const reqCrossGrade = new NextRequest(
        `http://localhost:3000/api/teacher/assignments/${asgnIdA}/submissions/${subIdA}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${tokenTeacherB}`, "Content-Type": "application/json" },
          body: JSON.stringify({ marks: 45, feedback: "Illegal grade" }),
        }
      );
      const resCrossGrade = await gradeSubmission(reqCrossGrade, {
        params: Promise.resolve({ assignmentId: asgnIdA, submissionId: subIdA }),
      });
      assert(resCrossGrade.status === 404 || resCrossGrade.status === 403, "Teacher B cannot grade Teacher A submission");

      // Teacher A successfully grades submission
      const reqValidGrade = new NextRequest(
        `http://localhost:3000/api/teacher/assignments/${asgnIdA}/submissions/${subIdA}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${tokenTeacherA}`, "Content-Type": "application/json" },
          body: JSON.stringify({ marks: 48, feedback: "Excellent clarity" }),
        }
      );
      const resValidGrade = await gradeSubmission(reqValidGrade, {
        params: Promise.resolve({ assignmentId: asgnIdA, submissionId: subIdA }),
      });
      assert(resValidGrade.status === 200, "Teacher A grades submission successfully (HTTP 200)");
    }

    // =========================================================================
    // 7. STUDY MATERIAL AUTHORSHIP & MUTATION PRIVILEGES
    // =========================================================================
    console.log("\n--- Vector 7: Study Material Authorship & Ownership ---");
    let matIdA: string = "";
    {
      const reqPostMat = new NextRequest("http://localhost:3000/api/teacher/study-material", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenTeacherA}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: yearA._id.toString(),
          classId: classA1._id.toString(),
          subjectId: subMathA._id.toString(),
          topic: "Algebra Basics",
          title: "Algebra Notes",
          description: "Chapter 1 Formulas",
          type: "PDF",
          url: "https://school.edu/notes.pdf",
          fileName: "AlgebraNotes.pdf",
        }),
      });
      const resPostMat = await postStudyMaterial(reqPostMat);
      const jsonPostMat = await resPostMat.json();
      assert(resPostMat.status === 201, "Teacher A uploads study material (HTTP 201)");
      matIdA = jsonPostMat.data._id;
      cleanupIds.studyMaterials.push(matIdA);

      // Teacher B attempts to update Teacher A's material
      const reqCrossEditMat = new NextRequest(
        `http://localhost:3000/api/teacher/study-material/${matIdA}`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${tokenTeacherB}`, "Content-Type": "application/json" },
          body: JSON.stringify({ title: "Hacked Title", topic: "Hacked Topic" }),
        }
      );
      const resCrossEditMat = await patchStudyMaterial(reqCrossEditMat, {
        params: Promise.resolve({ materialId: matIdA }),
      });
      assert(
        resCrossEditMat.status === 403 || resCrossEditMat.status === 404,
        "Non-author teacher rejected from modifying study material (HTTP 403/404)"
      );
    }

    // =========================================================================
    // 8. EXAM MARKS ENTRY & STRICT PUBLICATION LOCKING
    // =========================================================================
    console.log("\n--- Vector 8: Exam Marks & Strict Publication Locking ---");
    let examIdA: string = "";
    let examSubIdA: string = "";
    {
      // Create Exam, Target & ExamSubject for Class 1 Math
      const exam: any = await Exam.create({
        schoolId: schoolA._id,
        academicYearId: yearA._id,
        name: `Midterm Exam ${runId}`,
        startDate: new Date("2026-10-01"),
        endDate: new Date("2026-10-15"),
        status: "DRAFT",
        isActive: true,
        createdBy: adminId,
        updatedBy: adminId,
      } as any);
      examIdA = exam._id.toString();
      cleanupIds.exams.push(exam._id);

      const target: any = await ExamTarget.create({
        schoolId: schoolA._id,
        academicYearId: yearA._id,
        examId: exam._id,
        classId: classA1._id,
        sectionId: secA1._id,
        isActive: true,
        createdBy: adminId,
        updatedBy: adminId,
      });
      cleanupIds.examTargets.push(target._id);

      const examSub: any = await ExamSubject.create({
        schoolId: schoolA._id,
        academicYearId: yearA._id,
        examId: exam._id,
        classId: classA1._id,
        subjectId: subMathA._id,
        maximumMarks: 100,
        passingMarks: 40,
        examDate: new Date("2026-10-05"),
        isActive: true,
        createdBy: adminId,
        updatedBy: adminId,
      } as any);
      examSubIdA = examSub._id.toString();
      cleanupIds.examSubjects.push(examSub._id);

      // Teacher A submits valid marks before publication
      const reqEnterMarks = new NextRequest(
        `http://localhost:3000/api/teacher/exams/${examIdA}/marks`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${tokenTeacherA}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            examSubjectId: examSubIdA,
            classId: classA1._id.toString(),
            sectionId: secA1._id.toString(),
            subjectId: subMathA._id.toString(),
            entries: [{ studentId: studentA1._id.toString(), marks: 88, remarks: "Excellent" }],
          }),
        }
      );
      const resEnterMarks = await postMarks(reqEnterMarks, {
        params: Promise.resolve({ examId: examIdA }),
      });
      assert(resEnterMarks.status === 200, "Teacher A records marks when exam is DRAFT (HTTP 200)");

      // Admin publishes the Exam Results (Locking Results)
      exam.status = "PUBLISHED";
      await exam.save();

      // Teacher A attempts to modify marks post-publication
      const reqLockedMarks = new NextRequest(
        `http://localhost:3000/api/teacher/exams/${examIdA}/marks`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${tokenTeacherA}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            examSubjectId: examSubIdA,
            classId: classA1._id.toString(),
            sectionId: secA1._id.toString(),
            subjectId: subMathA._id.toString(),
            entries: [{ studentId: studentA1._id.toString(), marks: 95 }],
          }),
        }
      );
      const resLockedMarks = await postMarks(reqLockedMarks, {
        params: Promise.resolve({ examId: examIdA }),
      });
      assert(resLockedMarks.status === 403, "Post-publication marks modification is strictly DENIED (HTTP 403 Forbidden)");
    }

    // =========================================================================
    // 9. TIMETABLE READ-ONLY SECURITY
    // =========================================================================
    console.log("\n--- Vector 9: Timetable Read-Only Security ---");
    {
      const resPostTT = await timetableRoute.POST();
      assert(resPostTT.status === 405, "Teacher timetable mutation returns HTTP 405 Method Not Allowed");
    }

    // =========================================================================
    // 10. LEAVE MANAGEMENT & SELF-APPROVAL PREVENTION
    // =========================================================================
    console.log("\n--- Vector 10: Leave Management & Self-Approval Prevention ---");
    let leaveIdA: string = "";
    {
      const reqPostLeave = new NextRequest("http://localhost:3000/api/teacher/leave", {
        method: "POST",
        headers: { Authorization: `Bearer ${tokenTeacherA}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate: "2026-11-01",
          toDate: "2026-11-03",
          reason: "Medical Checkup",
        }),
      });
      const resPostLeave = await postLeave(reqPostLeave);
      const jsonPostLeave = await resPostLeave.json();
      assert(resPostLeave.status === 201, "Teacher A submits leave request (HTTP 201)");
      leaveIdA = jsonPostLeave.data._id;
      cleanupIds.leaveRequests.push(leaveIdA);

      // Teacher B attempts to cancel Teacher A's leave
      const reqCancelByB = new NextRequest(
        `http://localhost:3000/api/teacher/leave/${leaveIdA}/cancel`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${tokenTeacherB}` },
        }
      );
      const resCancelByB = await cancelLeave(reqCancelByB, {
        params: Promise.resolve({ leaveId: leaveIdA }),
      });
      assert(resCancelByB.status === 400, "Teacher B cannot cancel Teacher A leave (HTTP 400)");

      // Teacher A cancels own leave
      const reqCancelByA = new NextRequest(
        `http://localhost:3000/api/teacher/leave/${leaveIdA}/cancel`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${tokenTeacherA}` },
        }
      );
      const resCancelByA = await cancelLeave(reqCancelByA, {
        params: Promise.resolve({ leaveId: leaveIdA }),
      });
      assert(resCancelByA.status === 200, "Teacher A cancels own leave request (HTTP 200)");
    }
  } catch (err) {
    console.error("Audit Test Error:", err);
    failed++;
  } finally {
    // Cleanup seeded data
    console.log("\n--- Cleaning up Master Audit Artifacts ---");
    const TimetableEntryModel = (await import("./src/models/TimetableEntry")).default;
    const LeaveRequestModel = (await import("./src/models/LeaveRequest")).default;
    const NoticeModel = (await import("./src/models/Notice")).default;
    const NotificationModel = (await import("./src/models/Notification")).default;
    const AuditLogModel = (await import("./src/models/AuditLog")).default;
    const ExamResultModel = (await import("./src/models/ExamResult")).default;
    const ExamSubjectModel = (await import("./src/models/ExamSubject")).default;
    const ExamTargetModel = (await import("./src/models/ExamTarget")).default;
    const ExamModel = (await import("./src/models/Exam")).default;
    const StudyMaterialModel = (await import("./src/models/StudyMaterial")).default;
    const AssignmentSubmissionModel = (await import("./src/models/AssignmentSubmission")).default;
    const AssignmentModel = (await import("./src/models/Assignment")).default;
    const TeacherAssignmentModel = (await import("./src/models/TeacherAssignment")).default;
    const StudentModel = (await import("./src/models/Student")).default;
    const TeacherModel = (await import("./src/models/Teacher")).default;
    const SubjectModel = (await import("./src/models/Subject")).default;
    const SectionModel = (await import("./src/models/Section")).default;
    const ClassModel = (await import("./src/models/Class")).default;
    const AcademicYearModel = (await import("./src/models/AcademicYear")).default;
    const UserModel = (await import("./src/models/User")).default;
    const SchoolModel = (await import("./src/models/School")).default;

    if (cleanupIds.leaveRequests.length) await LeaveRequestModel.deleteMany({ _id: { $in: cleanupIds.leaveRequests } });
    if (cleanupIds.examResults.length) await ExamResultModel.deleteMany({ _id: { $in: cleanupIds.examResults } });
    if (cleanupIds.examSubjects.length) await ExamSubjectModel.deleteMany({ _id: { $in: cleanupIds.examSubjects } });
    if (cleanupIds.examTargets.length) await ExamTargetModel.deleteMany({ _id: { $in: cleanupIds.examTargets } });
    if (cleanupIds.exams.length) await ExamModel.deleteMany({ _id: { $in: cleanupIds.exams } });
    if (cleanupIds.studyMaterials.length) await StudyMaterialModel.deleteMany({ _id: { $in: cleanupIds.studyMaterials } });
    if (cleanupIds.assignmentSubmissions.length) await AssignmentSubmissionModel.deleteMany({ _id: { $in: cleanupIds.assignmentSubmissions } });
    if (cleanupIds.assignments.length) await AssignmentModel.deleteMany({ _id: { $in: cleanupIds.assignments } });
    if (cleanupIds.teacherAssignments.length) await TeacherAssignmentModel.deleteMany({ _id: { $in: cleanupIds.teacherAssignments } });
    if (cleanupIds.students.length) await StudentModel.deleteMany({ _id: { $in: cleanupIds.students } });
    if (cleanupIds.teachers.length) await TeacherModel.deleteMany({ _id: { $in: cleanupIds.teachers } });
    if (cleanupIds.subjects.length) await SubjectModel.deleteMany({ _id: { $in: cleanupIds.subjects } });
    if (cleanupIds.sections.length) await SectionModel.deleteMany({ _id: { $in: cleanupIds.sections } });
    if (cleanupIds.classes.length) await ClassModel.deleteMany({ _id: { $in: cleanupIds.classes } });
    if (cleanupIds.academicYears.length) await AcademicYearModel.deleteMany({ _id: { $in: cleanupIds.academicYears } });
    if (cleanupIds.users.length) {
      await NotificationModel.deleteMany({ recipientUserId: { $in: cleanupIds.users } });
      await AuditLogModel.deleteMany({ userId: { $in: cleanupIds.users.map((u) => u.toString()) } });
      await UserModel.deleteMany({ _id: { $in: cleanupIds.users } });
    }
    if (cleanupIds.schools.length) await SchoolModel.deleteMany({ _id: { $in: cleanupIds.schools } });

    console.log("Cleanup complete.");
  }

  console.log("\n============================================================");
  console.log(`T9 AUDIT RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
