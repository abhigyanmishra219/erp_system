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

async function runS3TestSuite() {
  console.log("============================================================");
  console.log("🧪 STARTING S3: STUDENT ASSIGNMENTS TEST SUITE");
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
  const Assignment: any = (await import("./src/models/Assignment")).default;
  const AssignmentSubmission: any = (await import("./src/models/AssignmentSubmission")).default;
  const AuditLog: any = (await import("./src/models/AuditLog")).default;

  const { createToken } = await import("./src/lib/jwt");
  const { GET: getStudentAssignments } = (await import("./src/app/api/student/assignments/route")) as any;
  const { GET: getStudentAssignmentById } = (await import("./src/app/api/student/assignments/[assignmentId]/route")) as any;
  const { POST: submitStudentAssignment } = (await import("./src/app/api/student/assignments/[assignmentId]/submit/route")) as any;

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
    // 1. Setup School & Academic Year
    const school = await School.create({
      name: `S3 Academy ${timestamp}`,
      code: `S3_${timestamp}`,
      status: "ACTIVE",
      address: "300 Assignment Blvd",
      city: "Bangalore",
      state: "Karnataka",
      country: "India",
      phone: "1234567890",
      email: `s3_school_${timestamp}@example.com`,
      plan: "STANDARD",
      studentLimit: 500,
      subscriptionStartDate: new Date(),
      subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
      subscriptionStatus: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    const academicYear = await AcademicYear.create({
      schoolId: school._id,
      name: `2026-2027 ${timestamp}`,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Class 10-A
    const classA = await Class.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      name: `Class 10-${timestamp}`,
      code: `C10_${timestamp}`.slice(0, 10),
      createdBy: adminId,
      updatedBy: adminId,
    });

    const sectionA = await Section.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: classA._id,
      name: "A",
      capacity: 35,
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Class 9-B (Isolated class)
    const classB = await Class.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      name: `Class 9-${timestamp}`,
      code: `C9_${timestamp}`.slice(0, 10),
      createdBy: adminId,
      updatedBy: adminId,
    });

    const sectionB = await Section.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: classB._id,
      name: "B",
      capacity: 30,
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Subject
    const subjectMath = await Subject.create({
      schoolId: school._id,
      name: `Mathematics ${timestamp}`,
      code: `MATH_${timestamp}`.slice(0, 10),
      type: "THEORY",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Teacher
    const teacherUser = await User.create({
      email: `teacher_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "TEACHER",
      schoolId: school._id,
      status: "ACTIVE",
    });

    const teacherDoc = await Teacher.create({
      schoolId: school._id,
      userId: teacherUser._id,
      teacherId: `TCH_${timestamp}`,
      firstName: "Isaac",
      lastName: "Newton",
      gender: "MALE",
      joiningDate: new Date(),
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Student A (in Class 10-A)
    const userA = await User.create({
      email: `studentA_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "STUDENT",
      schoolId: school._id,
      status: "ACTIVE",
    });

    const studentA = await Student.create({
      schoolId: school._id,
      userId: userA._id,
      admissionNumber: `ADM-A-${timestamp}`.slice(0, 15),
      studentId: `STU-A-${timestamp}`.slice(0, 15),
      firstName: "Alice",
      lastName: "Johnson",
      dateOfBirth: new Date("2010-01-01"),
      gender: "FEMALE",
      academicYearId: academicYear._id,
      classId: classA._id,
      sectionId: sectionA._id,
      admissionDate: new Date("2024-04-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Student B (in Class 9-B)
    const userB = await User.create({
      email: `studentB_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "STUDENT",
      schoolId: school._id,
      status: "ACTIVE",
    });

    const studentB = await Student.create({
      schoolId: school._id,
      userId: userB._id,
      admissionNumber: `ADM-B-${timestamp}`.slice(0, 15),
      studentId: `STU-B-${timestamp}`.slice(0, 15),
      firstName: "Bob",
      lastName: "Williams",
      dateOfBirth: new Date("2011-01-01"),
      gender: "MALE",
      academicYearId: academicYear._id,
      classId: classB._id,
      sectionId: sectionB._id,
      admissionDate: new Date("2024-04-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // 2. Create Assignments for Class 10-A
    // Assignment 1: Active & Future Due Date (for on-time submission testing)
    const assignment1 = await Assignment.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: classA._id,
      sectionId: sectionA._id,
      subjectId: subjectMath._id,
      teacherId: teacherDoc._id,
      title: "Calculus Limits & Continuity",
      description: "Complete all questions from Section 2.3",
      assignedDate: new Date(),
      dueDate: new Date(Date.now() + 86400000 * 7), // 7 days in future
      maximumMarks: 50,
      attachments: [
        {
          name: "Calculus_Worksheet.pdf",
          url: "https://example.com/files/Calculus_Worksheet.pdf",
          type: "FILE",
        },
      ],
      status: "PUBLISHED",
      isActive: true,
      createdBy: teacherUser._id,
      updatedBy: teacherUser._id,
    });

    // Assignment 2: Past Due Date (for Late submission testing)
    const assignment2 = await Assignment.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: classA._id,
      sectionId: sectionA._id,
      subjectId: subjectMath._id,
      teacherId: teacherDoc._id,
      title: "Algebraic Quadratic Equations",
      description: "Solve the set of 10 quadratic word problems",
      assignedDate: new Date(Date.now() - 86400000 * 5),
      dueDate: new Date(Date.now() - 86400000 * 2), // 2 days in past
      maximumMarks: 20,
      attachments: [],
      status: "PUBLISHED",
      isActive: true,
      createdBy: teacherUser._id,
      updatedBy: teacherUser._id,
    });

    // Assignment 3: Graded Assignment (for teacher review & feedback testing)
    const assignment3 = await Assignment.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: classA._id,
      sectionId: sectionA._id,
      subjectId: subjectMath._id,
      teacherId: teacherDoc._id,
      title: "Geometry Proofs Assignment",
      description: "Prove Theorem 4.1 to 4.5",
      assignedDate: new Date(Date.now() - 86400000 * 10),
      dueDate: new Date(Date.now() - 86400000 * 3),
      maximumMarks: 30,
      attachments: [],
      status: "PUBLISHED",
      isActive: true,
      createdBy: teacherUser._id,
      updatedBy: teacherUser._id,
    });

    // Pre-create reviewed submission for Assignment 3
    await AssignmentSubmission.create({
      schoolId: school._id,
      assignmentId: assignment3._id,
      studentId: studentA._id,
      academicYearId: academicYear._id,
      classId: classA._id,
      sectionId: sectionA._id,
      submittedAt: new Date(Date.now() - 86400000 * 4),
      status: "REVIEWED",
      content: "Here are all step-by-step proofs for Theorem 4.1 to 4.5.",
      attachments: [],
      marks: 28,
      feedback: "Excellent proofs, very clear deductive steps!",
      reviewedBy: teacherUser._id,
      reviewedAt: new Date(),
    });

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

    console.log("--- 1. Testing Student A Assignment List (/api/student/assignments) ---");
    const listResA = await getStudentAssignments(makeRequest("/api/student/assignments", tokenA));
    const listDataA = await listResA.json();

    assert(listResA.status === 200, "Student A assignments API returns HTTP 200");
    assert(listDataA.success === true, "Response success is true");
    assert(listDataA.data.summary.total === 3, "Student A has 3 assignments in Class 10-A");
    assert(listDataA.data.summary.reviewed === 1, "1 assignment is reviewed & graded");
    assert(listDataA.data.summary.pending === 2, "2 assignments are pending");

    const asg1 = listDataA.data.assignments.find((a: any) => a._id === assignment1._id.toString());
    assert(asg1 !== undefined, "Assignment 1 exists in list");
    assert(asg1.submissionStatus === "PENDING", "Assignment 1 status is PENDING");
    assert(asg1.attachmentCount === 1, "Assignment 1 has 1 attachment");
    assert(asg1.attachments[0].name === "Calculus_Worksheet.pdf", "Attachment name matches");

    const asg2 = listDataA.data.assignments.find((a: any) => a._id === assignment2._id.toString());
    assert(asg2 !== undefined, "Assignment 2 exists in list");
    assert(asg2.submissionStatus === "OVERDUE", "Assignment 2 (past due, not submitted) status is OVERDUE");

    const asg3 = listDataA.data.assignments.find((a: any) => a._id === assignment3._id.toString());
    assert(asg3 !== undefined, "Assignment 3 exists in list");
    assert(asg3.submissionStatus === "REVIEWED", "Assignment 3 status is REVIEWED");
    assert(asg3.submission.marks === 28, "Assignment 3 marks is 28");
    assert(asg3.submission.feedback.includes("Excellent"), "Assignment 3 feedback is visible");

    console.log("\n--- 2. Testing Class & Tenant Scope Isolation (Student B in Class 9-B) ---");
    const listResB = await getStudentAssignments(makeRequest("/api/student/assignments", tokenB));
    const listDataB = await listResB.json();

    assert(listResB.status === 200, "Student B assignments API returns HTTP 200");
    assert(listDataB.data.summary.total === 0, "Student B has 0 assignments (Class 10-A assignments isolated)");
    assert(listDataB.data.assignments.length === 0, "Student B receives empty assignment array");

    console.log("\n--- 3. Testing Single Assignment Details Endpoint ---");
    const singleResA = await getStudentAssignmentById(
      makeRequest(`/api/student/assignments/${assignment1._id}`, tokenA),
      { params: Promise.resolve({ assignmentId: assignment1._id.toString() }) }
    );
    const singleDataA = await singleResA.json();

    assert(singleResA.status === 200, "Student A can view Assignment 1 details");
    assert(singleDataA.data.title === "Calculus Limits & Continuity", "Assignment title matches");
    assert(singleDataA.data.teacher.name === "Isaac Newton", "Teacher name matches");

    // Student B attempting to access Class 10-A Assignment 1
    const singleResB = await getStudentAssignmentById(
      makeRequest(`/api/student/assignments/${assignment1._id}`, tokenB),
      { params: Promise.resolve({ assignmentId: assignment1._id.toString() }) }
    );
    assert(singleResB.status === 404, "Student B receives HTTP 404 when attempting to access Class 10-A assignment");

    console.log("\n--- 4. Testing On-Time Submission (Assignment 1) ---");
    const submitOnTimeRes = await submitStudentAssignment(
      makeRequest(`/api/student/assignments/${assignment1._id}/submit`, tokenA, "POST", {
        content: "Here are all my solutions for Chapter 2.3",
        attachments: [
          {
            name: "My_Solutions.pdf",
            url: "https://example.com/student/My_Solutions.pdf",
            type: "FILE",
          },
        ],
      }),
      { params: Promise.resolve({ assignmentId: assignment1._id.toString() }) }
    );
    const submitOnTimeData = await submitOnTimeRes.json();

    assert(submitOnTimeRes.status === 200, "On-time submission returns HTTP 200");
    assert(submitOnTimeData.success === true, "Submission success is true");
    assert(submitOnTimeData.data.status === "SUBMITTED", "Submission status is SUBMITTED (on-time)");

    // Verify in database
    const sub1InDb = await AssignmentSubmission.findOne({
      schoolId: school._id,
      assignmentId: assignment1._id,
      studentId: studentA._id,
    });
    assert(sub1InDb !== null, "Submission record exists in DB");
    assert(sub1InDb?.status === "SUBMITTED", "DB submission status is SUBMITTED");

    // Verify Audit Log
    const audit1 = await AuditLog.findOne({
      schoolId: school._id.toString(),
      userId: userA._id.toString(),
      entityType: "ASSIGNMENT_SUBMISSION",
      entityId: sub1InDb?._id.toString(),
    });
    assert(audit1 !== null, "AuditLog recorded for on-time submission");

    console.log("\n--- 5. Testing Late Submission (Assignment 2 - Past Due Date) ---");
    const submitLateRes = await submitStudentAssignment(
      makeRequest(`/api/student/assignments/${assignment2._id}/submit`, tokenA, "POST", {
        content: "Completed quadratic word problems 1-10.",
        attachments: [],
      }),
      { params: Promise.resolve({ assignmentId: assignment2._id.toString() }) }
    );
    const submitLateData = await submitLateRes.json();

    assert(submitLateRes.status === 200, "Late submission returns HTTP 200");
    assert(submitLateData.data.status === "LATE", "Submission status is marked as LATE");

    const sub2InDb = await AssignmentSubmission.findOne({
      schoolId: school._id,
      assignmentId: assignment2._id,
      studentId: studentA._id,
    });
    assert(sub2InDb?.status === "LATE", "DB submission status is LATE");

    console.log("\n--- 6. Testing Graded Assignment Resubmission Protection (Assignment 3) ---");
    const submitReviewedRes = await submitStudentAssignment(
      makeRequest(`/api/student/assignments/${assignment3._id}/submit`, tokenA, "POST", {
        content: "Attempting to overwrite already graded assignment",
        attachments: [],
      }),
      { params: Promise.resolve({ assignmentId: assignment3._id.toString() }) }
    );
    assert(submitReviewedRes.status === 400, "Resubmission on already graded/reviewed assignment is blocked (HTTP 400)");

    console.log("\n--- 7. Security: Tampering & Cross-Student Submission Protection ---");
    // Student B attempting to submit for Student A's assignment
    const tamperedSubmitRes = await submitStudentAssignment(
      makeRequest(`/api/student/assignments/${assignment1._id}/submit`, tokenB, "POST", {
        content: "Hacker trying to submit for another class assignment",
        attachments: [],
      }),
      { params: Promise.resolve({ assignmentId: assignment1._id.toString() }) }
    );
    assert(tamperedSubmitRes.status === 404, "Student B cannot submit to Class 10-A assignment (HTTP 404)");

    // Clean up test data
    await Promise.all([
      School.findByIdAndDelete(school._id),
      AcademicYear.deleteMany({ schoolId: school._id }),
      Class.deleteMany({ schoolId: school._id }),
      Section.deleteMany({ schoolId: school._id }),
      Subject.deleteMany({ schoolId: school._id }),
      User.deleteMany({ schoolId: school._id }),
      Teacher.deleteMany({ schoolId: school._id }),
      Student.deleteMany({ schoolId: school._id }),
      Assignment.deleteMany({ schoolId: school._id }),
      AssignmentSubmission.deleteMany({ schoolId: school._id }),
      AuditLog.deleteMany({ schoolId: school._id }),
    ]);

    console.log("\n============================================================");
    console.log(`📊 S3 TEST SUITE COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log("============================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Fatal Error in S3 test suite:", err);
    process.exit(1);
  }
}

runS3TestSuite();
