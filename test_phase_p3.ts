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

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

function generateToken(payload: { userId: string; role: string; schoolId?: string; email: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
}

function createRequest(url: string, token?: string, method: string = "GET", body?: any) {
  const headers: Record<string, string> = {};
  if (token) {
    headers["authorization"] = `Bearer ${token}`;
    headers["cookie"] = `erp_auth_token=${token}; token=${token}`;
  }
  if (body) {
    headers["content-type"] = "application/json";
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function runTests() {
  console.log("============================================================");
  console.log("P3 — PARENT ASSIGNMENTS TEST SUITE");
  console.log("============================================================");

  const mongoose: any = (await import("mongoose")).default;
  const connectToDatabase: any = (await import("./src/lib/db")).default;
  const User: any = (await import("./src/models/User")).default;
  const Parent: any = (await import("./src/models/Parent")).default;
  const Student: any = (await import("./src/models/Student")).default;
  const StudentParent: any = (await import("./src/models/StudentParent")).default;
  const School: any = (await import("./src/models/School")).default;
  const Class: any = (await import("./src/models/Class")).default;
  const Section: any = (await import("./src/models/Section")).default;
  const AcademicYear: any = (await import("./src/models/AcademicYear")).default;
  const Subject: any = (await import("./src/models/Subject")).default;
  const Assignment: any = (await import("./src/models/Assignment")).default;
  const AssignmentSubmission: any = (await import("./src/models/AssignmentSubmission")).default;
  const {
    GET: getParentAssignments,
    POST: postParentAssignments,
    PUT: putParentAssignments,
    DELETE: deleteParentAssignments,
  } = (await import("./src/app/api/parent/assignments/route")) as any;

  await connectToDatabase();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  const cleanSuffix = `p3_${Date.now().toString().slice(-6)}`;
  const adminId = new mongoose.Types.ObjectId();
  const teacherId = new mongoose.Types.ObjectId();

  // 1. Setup Schools
  const schoolA = await School.create({
    name: `P3 School A ${cleanSuffix}`,
    code: `SCH_A_${cleanSuffix}`,
    status: "ACTIVE",
    enabledModules: ["ASSIGNMENTS"],
    address: "10 Downing Street",
    city: "London",
    state: "Greater London",
    country: "United Kingdom",
    phone: "+44 20 7946 0999",
    email: `p3_schoolA_${cleanSuffix}@example.com`,
    website: "https://example.com/schoolA",
    plan: "STANDARD",
    studentLimit: 500,
    subscriptionStartDate: new Date(),
    subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
    subscriptionStatus: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const schoolB = await School.create({
    name: `P3 School B ${cleanSuffix}`,
    code: `SCH_B_${cleanSuffix}`,
    status: "ACTIVE",
    address: "221B Baker Street",
    city: "London",
    state: "Greater London",
    country: "United Kingdom",
    phone: "+44 20 7946 0888",
    email: `p3_schoolB_${cleanSuffix}@example.com`,
    website: "https://example.com/schoolB",
    plan: "STANDARD",
    studentLimit: 500,
    subscriptionStartDate: new Date(),
    subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
    subscriptionStatus: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Setup Academic Structure for School A
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
    type: "PRACTICAL",
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

  // 2. Setup Parent A in School A
  const parentUserA = await User.create({
    email: `parentA_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "PARENT",
    schoolId: schoolA._id,
    isActive: true,
    name: "Suresh Gupta",
  });

  const parentDocA = await Parent.create({
    schoolId: schoolA._id,
    userId: parentUserA._id,
    firstName: "Suresh",
    lastName: "Gupta",
    email: parentUserA.email,
    phone: "9876543210",
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 3. Setup Children for Parent A:
  // Child 1: Rohan Gupta (Class 10-A)
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
    lastName: "Gupta",
    classId: class10._id,
    sectionId: section10A._id,
    academicYearId: ayA._id,
    status: "ACTIVE",
    gender: "MALE",
    dateOfBirth: new Date("2011-04-15"),
    admissionDate: new Date("2024-04-01"),
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Child 2: Riya Gupta (Class 8-B)
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
    rollNumber: "202",
    firstName: "Riya",
    lastName: "Gupta",
    classId: class8._id,
    sectionId: section8B._id,
    academicYearId: ayA._id,
    status: "ACTIVE",
    gender: "FEMALE",
    dateOfBirth: new Date("2013-09-20"),
    admissionDate: new Date("2024-04-01"),
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Link Student 1 & Student 2 to Parent A
  await StudentParent.create([
    {
      schoolId: schoolA._id,
      parentId: parentDocA._id,
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
      parentId: parentDocA._id,
      studentId: student2._id,
      relationship: "FATHER",
      isPrimaryGuardian: true,
      isEmergencyContact: true,
      canPickup: true,
      createdBy: adminId,
      updatedBy: adminId,
    },
  ]);

  // 4. Setup Unlinked Student in School A
  const studentUserUnlinked = await User.create({
    email: `unlinked_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "STUDENT",
    schoolId: schoolA._id,
    isActive: true,
  });

  const studentUnlinked = await Student.create({
    schoolId: schoolA._id,
    userId: studentUserUnlinked._id,
    studentId: `STU_UNLINKED_${cleanSuffix}`,
    admissionNumber: `ADM_UNLINKED_${cleanSuffix}`,
    firstName: "Varun",
    lastName: "Dhawan",
    classId: class10._id,
    sectionId: section10A._id,
    academicYearId: ayA._id,
    status: "ACTIVE",
    gender: "MALE",
    dateOfBirth: new Date("2011-06-10"),
    admissionDate: new Date("2024-04-01"),
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 5. Setup Student in School B
  const studentUserB = await User.create({
    email: `schoolb_${cleanSuffix}@example.com`,
    password: "Password@123",
    role: "STUDENT",
    schoolId: schoolB._id,
    isActive: true,
  });

  const ayB = await AcademicYear.create({
    schoolId: schoolB._id,
    name: `2026-2027 B ${cleanSuffix}`,
    startDate: new Date("2026-04-01"),
    endDate: new Date("2027-03-31"),
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const classB = await Class.create({
    schoolId: schoolB._id,
    academicYearId: ayB._id,
    name: "Grade 9",
    code: `G9_${cleanSuffix}`,
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const sectionB = await Section.create({
    schoolId: schoolB._id,
    classId: classB._id,
    academicYearId: ayB._id,
    name: "A",
    capacity: 30,
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const studentSchoolB = await Student.create({
    schoolId: schoolB._id,
    userId: studentUserB._id,
    studentId: `STU_B_${cleanSuffix}`,
    admissionNumber: `ADM_B_${cleanSuffix}`,
    firstName: "Dev",
    lastName: "Anand",
    classId: classB._id,
    sectionId: sectionB._id,
    academicYearId: ayB._id,
    status: "ACTIVE",
    gender: "MALE",
    dateOfBirth: new Date("2012-01-05"),
    admissionDate: new Date("2024-04-01"),
    createdBy: adminId,
    updatedBy: adminId,
  });

  // 6. Setup Assignments & Submissions
  // Assignment 1: Class 10-A, Math, Due Future, Student 1 Submitted
  const assign1 = await Assignment.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    classId: class10._id,
    sectionId: section10A._id,
    subjectId: subjectMath._id,
    teacherId,
    title: "Quadratic Equations Problem Set",
    description: "Solve problems 1 to 20 from chapter 4",
    assignedDate: new Date("2026-09-01"),
    dueDate: new Date(Date.now() + 86400000 * 5),
    maximumMarks: 50,
    status: "PUBLISHED",
    isActive: true,
    createdBy: teacherId,
    updatedBy: teacherId,
  });

  await AssignmentSubmission.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    classId: class10._id,
    sectionId: section10A._id,
    studentId: student1._id,
    assignmentId: assign1._id,
    status: "SUBMITTED",
    submittedAt: new Date("2026-09-03"),
    content: "Please find my submitted solution file.",
    createdBy: student1.userId,
    updatedBy: student1.userId,
  });

  // Assignment 2: Class 10-A, Science, Due in Past, Student 1 Has No Submission -> OVERDUE
  const assign2 = await Assignment.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    classId: class10._id,
    sectionId: section10A._id,
    subjectId: subjectScience._id,
    teacherId,
    title: "Optics Lab Report",
    description: "Write report on concave mirror reflection",
    assignedDate: new Date("2026-08-10"),
    dueDate: new Date("2026-08-20"),
    maximumMarks: 25,
    status: "PUBLISHED",
    isActive: true,
    createdBy: teacherId,
    updatedBy: teacherId,
  });

  // Assignment 3: Class 10-A, Math, Graded / Reviewed
  const assign3 = await Assignment.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    classId: class10._id,
    sectionId: section10A._id,
    subjectId: subjectMath._id,
    teacherId,
    title: "Trigonometry Basics",
    description: "Complete exercises 8.1",
    assignedDate: new Date("2026-08-01"),
    dueDate: new Date("2026-08-10"),
    maximumMarks: 100,
    status: "PUBLISHED",
    isActive: true,
    createdBy: teacherId,
    updatedBy: teacherId,
  });

  await AssignmentSubmission.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    classId: class10._id,
    sectionId: section10A._id,
    studentId: student1._id,
    assignmentId: assign3._id,
    status: "REVIEWED",
    submittedAt: new Date("2026-08-09"),
    content: "Attached answers for trigonometry.",
    marks: 95,
    feedback: "Excellent work! Clear geometric proofs.",
    reviewedAt: new Date("2026-08-12"),
    reviewedBy: teacherId,
    createdBy: student1.userId,
    updatedBy: teacherId,
  });

  // Assignment 4: Class 8-B (Student 2's class), History, Due Future -> PENDING
  const assign4 = await Assignment.create({
    schoolId: schoolA._id,
    academicYearId: ayA._id,
    classId: class8._id,
    sectionId: section8B._id,
    subjectId: subjectHistory._id,
    teacherId,
    title: "Ancient Egypt Civilisation Project",
    description: "Prepare a 3-page chart about Pharaohs and Pyramids",
    assignedDate: new Date("2026-09-10"),
    dueDate: new Date(Date.now() + 86400000 * 7),
    maximumMarks: 50,
    status: "PUBLISHED",
    isActive: true,
    createdBy: teacherId,
    updatedBy: teacherId,
  });

  // Tokens
  const parentAToken = generateToken({
    userId: parentUserA._id.toString(),
    role: "PARENT",
    schoolId: schoolA._id.toString(),
    email: parentUserA.email,
  });

  console.log("\n--- TEST GROUP 1: Default Selected Child Assignments (Student 1) ---");
  {
    const req = createRequest("http://localhost:3000/api/parent/assignments", parentAToken);
    const res = await getParentAssignments(req);
    const data = await res.json();

    assert(res.status === 200, "GET /api/parent/assignments returns 200 OK");
    assert(data.success === true, "Response reports success: true");
    assert(data.selectedStudentId === student1._id.toString(), "Defaults to Student 1 (Rohan)");
    assert(data.data.student.fullName === "Rohan Gupta", "Student full name is Rohan Gupta");
    assert(data.data.summary.total === 3, "Student 1 has exactly 3 class assignments");
    assert(data.data.summary.submitted === 1, "Submitted count is 1");
    assert(data.data.summary.overdue === 1, "Overdue count is 1");
    assert(data.data.summary.reviewed === 1, "Reviewed count is 1");
    assert(data.data.assignments.length === 3, "Assignments list has 3 items");
  }

  console.log("\n--- TEST GROUP 2: Explicit Child Switch to Student 2 ---");
  {
    const req = createRequest(
      `http://localhost:3000/api/parent/assignments?studentId=${student2._id.toString()}`,
      parentAToken
    );
    const res = await getParentAssignments(req);
    const data = await res.json();

    assert(res.status === 200, "Assignments returns 200 OK for Student 2");
    assert(data.selectedStudentId === student2._id.toString(), "Selected student is Student 2");
    assert(data.data.student.fullName === "Riya Gupta", "Student name is Riya Gupta");
    assert(data.data.summary.total === 1, "Student 2 has exactly 1 assignment (Class 8-B)");
    assert(data.data.summary.pending === 1, "Student 2 has 1 pending assignment");
    assert(data.data.assignments[0].title === "Ancient Egypt Civilisation Project", "Assignment title matches Class 8-B coursework");
    assert(data.data.assignments[0].submissionStatus === "PENDING", "Submission status is PENDING");
  }

  console.log("\n--- TEST GROUP 3: Filter by Status & Subject ---");
  {
    // Filter by REVIEWED
    const reqReviewed = createRequest(
      `http://localhost:3000/api/parent/assignments?studentId=${student1._id.toString()}&status=REVIEWED`,
      parentAToken
    );
    const resReviewed = await getParentAssignments(reqReviewed);
    const dataReviewed = await resReviewed.json();

    assert(resReviewed.status === 200, "Status filter returns 200 OK");
    assert(dataReviewed.data.assignments.length === 1, "Only 1 reviewed assignment returned");
    assert(dataReviewed.data.assignments[0].submission.marks === 95, "Score is 95 marks");
    assert(dataReviewed.data.assignments[0].submission.feedback === "Excellent work! Clear geometric proofs.", "Teacher feedback is displayed");

    // Filter by Subject
    const reqSubject = createRequest(
      `http://localhost:3000/api/parent/assignments?studentId=${student1._id.toString()}&subjectId=${subjectScience._id.toString()}`,
      parentAToken
    );
    const resSubject = await getParentAssignments(reqSubject);
    const dataSubject = await resSubject.json();

    assert(resSubject.status === 200, "Subject filter returns 200 OK");
    assert(dataSubject.data.assignments.length === 1, "1 Science assignment returned");
    assert(dataSubject.data.assignments[0].submissionStatus === "OVERDUE", "Science assignment is OVERDUE");
  }

  console.log("\n--- TEST GROUP 4: Security - Unlinked Student in Same School ---");
  {
    const req = createRequest(
      `http://localhost:3000/api/parent/assignments?studentId=${studentUnlinked._id.toString()}`,
      parentAToken
    );
    const res = await getParentAssignments(req);
    const data = await res.json();

    assert(res.status === 403, "Access to unlinked student rejected with 403 Forbidden");
    assert(data.success === false, "Success is false");
    assert(
      data.error?.code === "FORBIDDEN_CHILD_ACCESS",
      "Error code is FORBIDDEN_CHILD_ACCESS"
    );
  }

  console.log("\n--- TEST GROUP 5: Security - Student in Another School Tenant ---");
  {
    const req = createRequest(
      `http://localhost:3000/api/parent/assignments?studentId=${studentSchoolB._id.toString()}`,
      parentAToken
    );
    const res = await getParentAssignments(req);
    const data = await res.json();

    assert(res.status === 403, "Access to other school student rejected with 403 Forbidden");
    assert(data.success === false, "Cross-school student access blocked");
  }

  console.log("\n--- TEST GROUP 6: Read-Only Immutability Verification ---");
  {
    const reqPost = createRequest("http://localhost:3000/api/parent/assignments", parentAToken, "POST", { title: "New Assignment" });
    const resPost = await postParentAssignments();
    assert(resPost.status === 405, "POST is rejected with 405 Method Not Allowed");

    const resPut = await putParentAssignments();
    assert(resPut.status === 405, "PUT is rejected with 405 Method Not Allowed");

    const resDelete = await deleteParentAssignments();
    assert(resDelete.status === 405, "DELETE is rejected with 405 Method Not Allowed");
  }

  console.log("\n--- TEST GROUP 7: Role Protection ---");
  {
    const stuToken = generateToken({
      userId: studentUser1._id.toString(),
      role: "STUDENT",
      schoolId: schoolA._id.toString(),
      email: studentUser1.email,
    });
    const reqStu = createRequest("http://localhost:3000/api/parent/assignments", stuToken);
    const resStu = await getParentAssignments(reqStu);
    assert(resStu.status === 403, "STUDENT role rejected with 403 Forbidden");

    const teacherUser = await User.create({
      email: `teacher_${cleanSuffix}@example.com`,
      password: "Password@123",
      role: "TEACHER",
      schoolId: schoolA._id,
      isActive: true,
    });
    const teacherToken = generateToken({
      userId: teacherUser._id.toString(),
      role: "TEACHER",
      schoolId: schoolA._id.toString(),
      email: teacherUser.email,
    });
    const reqTeacher = createRequest("http://localhost:3000/api/parent/assignments", teacherToken);
    const resTeacher = await getParentAssignments(reqTeacher);
    assert(resTeacher.status === 403, "TEACHER role rejected with 403 Forbidden");
  }

  console.log("\n============================================================");
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("============================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
