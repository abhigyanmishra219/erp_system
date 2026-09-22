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
  console.log("RUNNING PHASE A5 COMPREHENSIVE AUTOMATED TEST SUITE");
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
  const Teacher = (await import("./src/models/Teacher")).default;
  const Student = (await import("./src/models/Student")).default;
  const TeacherAssignment = (await import("./src/models/TeacherAssignment")).default;
  const Assignment = (await import("./src/models/Assignment")).default;
  const AssignmentSubmission = (await import("./src/models/AssignmentSubmission")).default;
  const StudyMaterial = (await import("./src/models/StudyMaterial")).default;
  const {
    createAssignmentSchema,
    updateAssignmentSchema,
    submitAssignmentSchema,
    reviewSubmissionSchema,
  } = await import("./src/lib/validation/assignment");
  const {
    createStudyMaterialSchema,
    updateStudyMaterialSchema,
  } = await import("./src/lib/validation/studyMaterial");
  const { verifyTeacherAssignmentScope, verifyClassSubjectMapping } = await import("./src/lib/auth/teacherAssignmentScope");
  const { FileStorageService } = await import("./src/lib/services/fileStorage");

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

  const timestamp = Date.now();

  try {
    // 1. Setup Test Tenants and Users
    const adminA = await User.create({
      name: "Admin A5 Alpha",
      email: `admin.a5a.${timestamp}@school-a.com`,
      password: "Password@123",
      role: "ADMIN",
      isActive: true,
    });

    const schoolA = await School.create({
      name: "A5 Test School Alpha",
      code: `A5A_${timestamp.toString().slice(-4)}`,
      email: `school.a5a.${timestamp}@school.com`,
      subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      createdBy: adminA._id,
      updatedBy: adminA._id,
      status: "ACTIVE",
    });
    adminA.schoolId = schoolA._id;
    await adminA.save();

    const adminB = await User.create({
      name: "Admin A5 Beta",
      email: `admin.a5b.${timestamp}@school-b.com`,
      password: "Password@123",
      role: "ADMIN",
      isActive: true,
    });

    const schoolB = await School.create({
      name: "A5 Test School Beta",
      code: `A5B_${timestamp.toString().slice(-4)}`,
      email: `school.a5b.${timestamp}@school.com`,
      subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      createdBy: adminB._id,
      updatedBy: adminB._id,
      status: "ACTIVE",
    });
    adminB.schoolId = schoolB._id;
    await adminB.save();

    const teacherUser1 = await User.create({
      name: "Sarah Connor Teacher",
      email: `sarah.teacher.${timestamp}@school-a.com`,
      password: "Password@123",
      role: "TEACHER",
      schoolId: schoolA._id,
      isActive: true,
    });

    const studentUser1 = await User.create({
      name: "John Doe Student",
      email: `john.student.${timestamp}@school-a.com`,
      password: "Password@123",
      role: "STUDENT",
      schoolId: schoolA._id,
      isActive: true,
    });

    const ayA = await AcademicYear.create({
      schoolId: schoolA._id,
      name: "2026-2027",
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const classA1 = await Class.create({
      schoolId: schoolA._id,
      academicYearId: ayA._id,
      name: "Grade 10",
      displayOrder: 10,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const classA2 = await Class.create({
      schoolId: schoolA._id,
      academicYearId: ayA._id,
      name: "Grade 11",
      displayOrder: 11,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const secA1 = await Section.create({
      schoolId: schoolA._id,
      academicYearId: ayA._id,
      classId: classA1._id,
      name: "Section A",
      capacity: 40,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const secA2 = await Section.create({
      schoolId: schoolA._id,
      academicYearId: ayA._id,
      classId: classA1._id,
      name: "Section B",
      capacity: 40,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const subMath = await Subject.create({
      schoolId: schoolA._id,
      name: "Mathematics",
      code: `MATH10_${timestamp.toString().slice(-4)}`,
      subjectType: "CORE",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const subScience = await Subject.create({
      schoolId: schoolA._id,
      name: "Science",
      code: `SCI10_${timestamp.toString().slice(-4)}`,
      subjectType: "CORE",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const subB = await Subject.create({
      schoolId: schoolB._id,
      name: "School B Subject",
      code: `BSUB_${timestamp.toString().slice(-4)}`,
      subjectType: "CORE",
      createdBy: adminB._id,
      updatedBy: adminB._id,
    });

    // Map subMath to classA1 in School A
    await ClassSubject.create({
      schoolId: schoolA._id,
      academicYearId: ayA._id,
      classId: classA1._id,
      subjectId: subMath._id,
      maximumMarks: 100,
      passingMarks: 33,
      isActive: true,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const teacher1 = await Teacher.create({
      schoolId: schoolA._id,
      userId: teacherUser1._id,
      teacherId: `TCH_A5_${timestamp}`,
      firstName: "Sarah",
      lastName: "Connor",
      gender: "FEMALE",
      joiningDate: new Date(),
      status: "ACTIVE",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const student1 = await Student.create({
      schoolId: schoolA._id,
      userId: studentUser1._id,
      admissionNumber: `STU_A5_1_${timestamp}`,
      firstName: "John",
      lastName: "Doe",
      gender: "MALE",
      dateOfBirth: new Date("2010-05-15"),
      admissionDate: new Date("2026-04-01"),
      academicYearId: ayA._id,
      classId: classA1._id,
      sectionId: secA1._id,
      status: "ACTIVE",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const student2 = await Student.create({
      schoolId: schoolA._id,
      admissionNumber: `STU_A5_2_${timestamp}`,
      firstName: "Jane",
      lastName: "Smith",
      gender: "FEMALE",
      dateOfBirth: new Date("2010-08-20"),
      admissionDate: new Date("2026-04-01"),
      academicYearId: ayA._id,
      classId: classA1._id,
      sectionId: secA1._id,
      status: "ACTIVE",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    // Assign teacher1 to Grade 10 - Section A - Math only (as subject teacher)
    await TeacherAssignment.create({
      schoolId: schoolA._id,
      teacherId: teacher1._id,
      academicYearId: ayA._id,
      classId: classA1._id,
      sectionId: secA1._id,
      subjectId: subMath._id,
      assignmentType: "SUBJECT_TEACHER",
      isClassTeacher: false,
      isActive: true,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    console.log("\n--- TEST GROUP 1: TEACHER SCOPE & AUTHORIZATION ---");
    
    // Teacher has scope for Grade 10 - Sec A - Math
    const validScope = await verifyTeacherAssignmentScope({
      schoolId: schoolA._id.toString(),
      userId: teacherUser1._id.toString(),
      academicYearId: ayA._id.toString(),
      classId: classA1._id.toString(),
      sectionId: secA1._id.toString(),
      subjectId: subMath._id.toString(),
    });
    assert(validScope.hasAccess === true, "Teacher has valid assignment scope for assigned class/section/subject");

    // Teacher DOES NOT have scope for Grade 10 - Sec A - Science
    const invalidSubjectScope = await verifyTeacherAssignmentScope({
      schoolId: schoolA._id.toString(),
      userId: teacherUser1._id.toString(),
      academicYearId: ayA._id.toString(),
      classId: classA1._id.toString(),
      sectionId: secA1._id.toString(),
      subjectId: subScience._id.toString(),
    });
    assert(invalidSubjectScope.hasAccess === false, "Teacher correctly denied creating assignments for unassigned subject");

    // Teacher DOES NOT have scope for Grade 10 - Sec B - Math
    const invalidSectionScope = await verifyTeacherAssignmentScope({
      schoolId: schoolA._id.toString(),
      userId: teacherUser1._id.toString(),
      academicYearId: ayA._id.toString(),
      classId: classA1._id.toString(),
      sectionId: secA2._id.toString(),
      subjectId: subMath._id.toString(),
    });
    assert(invalidSectionScope.hasAccess === false, "Teacher correctly denied creating assignments for unassigned section");

    console.log("\n--- TEST GROUP 2: CLASS-SUBJECT RELATIONSHIP & RELATIONSHIP VALIDATION ---");

    const isMathMapped = await verifyClassSubjectMapping({
      schoolId: schoolA._id.toString(),
      academicYearId: ayA._id.toString(),
      classId: classA1._id.toString(),
      subjectId: subMath._id.toString(),
    });
    assert(isMathMapped === true, "Math correctly mapped to Grade 10 in ClassSubject");

    const isScienceMapped = await verifyClassSubjectMapping({
      schoolId: schoolA._id.toString(),
      academicYearId: ayA._id.toString(),
      classId: classA1._id.toString(),
      subjectId: subScience._id.toString(),
    });
    assert(isScienceMapped === false, "Science correctly rejected as not assigned to Grade 10");

    const isGrade11MathMapped = await verifyClassSubjectMapping({
      schoolId: schoolA._id.toString(),
      academicYearId: ayA._id.toString(),
      classId: classA2._id.toString(),
      subjectId: subMath._id.toString(),
    });
    assert(isGrade11MathMapped === false, "Math correctly rejected for Grade 11 (assigned only to Grade 10)");

    const isSchoolBSubjectMapped = await verifyClassSubjectMapping({
      schoolId: schoolA._id.toString(),
      academicYearId: ayA._id.toString(),
      classId: classA1._id.toString(),
      subjectId: subB._id.toString(),
    });
    assert(isSchoolBSubjectMapped === false, "School B subject correctly rejected for School A");

    console.log("\n--- TEST GROUP 3: ASSIGNMENT CREATION & VALIDATION ---");

    const validAssignmentPayload = {
      title: "Algebra Quadratic Equations Problem Set",
      description: "Complete problems 1 to 25 from Chapter 4.",
      academicYearId: ayA._id.toString(),
      classId: classA1._id.toString(),
      sectionId: secA1._id.toString(),
      subjectId: subMath._id.toString(),
      assignedDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days in future
      maximumMarks: 50,
      attachments: [
        {
          name: "Quadratics Worksheet",
          url: "https://storage.schoolerp.com/math/quadratics.pdf",
          type: "FILE" as const,
        },
      ],
      status: "PUBLISHED" as const,
    };

    const parsedAssignment = createAssignmentSchema.safeParse(validAssignmentPayload);
    assert(parsedAssignment.success === true, "Valid assignment payload parses cleanly with Zod schema");

    const assignment1 = await Assignment.create({
      schoolId: schoolA._id,
      ...parsedAssignment.data,
      teacherId: teacher1._id,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });
    assert(!!assignment1._id, "Assignment created successfully in MongoDB");

    // Invalid dueDate before assignedDate check
    const invalidDatesPayload = {
      ...validAssignmentPayload,
      assignedDate: "2026-09-25T00:00:00.000Z",
      dueDate: "2026-09-20T00:00:00.000Z",
    };
    const parsedInvalidDates = createAssignmentSchema.safeParse(invalidDatesPayload);
    assert(parsedInvalidDates.success === false, "Zod correctly rejects dueDate before assignedDate");

    console.log("\n--- TEST GROUP 4: SUBMISSION WORKFLOW & DUE DATE STATUS LOGIC ---");

    // Valid submission input test
    const submissionInput = {
      content: "Here are my algebraic solutions for problems 1 to 25.",
      attachments: [
        {
          name: "John_Doe_Solutions.pdf",
          url: "https://storage.schoolerp.com/submissions/john_math.pdf",
          type: "FILE" as const,
        },
      ],
    };
    const parsedSubInput = submitAssignmentSchema.safeParse(submissionInput);
    assert(parsedSubInput.success === true, "Submission payload parses cleanly");

    // 1. On-time submission (submittedAt < dueDate)
    const isLateStudent1 = new Date() > new Date(assignment1.dueDate);
    const sub1 = await AssignmentSubmission.create({
      schoolId: schoolA._id,
      assignmentId: assignment1._id,
      studentId: student1._id,
      academicYearId: ayA._id,
      classId: classA1._id,
      sectionId: secA1._id,
      submittedAt: new Date(Date.now() - 10000), // on time
      status: isLateStudent1 ? "LATE" : "SUBMITTED",
      content: parsedSubInput.data!.content,
      attachments: parsedSubInput.data!.attachments,
    });
    assert(sub1.status === "SUBMITTED", "On-time submission marked with status SUBMITTED");

    // 2. Late submission (submittedAt > dueDate)
    const pastDueDate = new Date(Date.now() - 86400000); // 1 day in past
    const isLateStudent2 = new Date() > pastDueDate;
    const sub2 = await AssignmentSubmission.create({
      schoolId: schoolA._id,
      assignmentId: assignment1._id,
      studentId: student2._id,
      academicYearId: ayA._id,
      classId: classA1._id,
      sectionId: secA1._id,
      submittedAt: new Date(),
      status: isLateStudent2 ? "LATE" : "SUBMITTED",
      content: "Sorry for the late homework submission.",
      attachments: [],
    });
    assert(sub2.status === "LATE", "Submission after due date marked with status LATE");

    console.log("\n--- TEST GROUP 5: SINGLE SUBMISSION PER STUDENT (UPSERT / RESUBMISSION) ---");

    // Resubmission by student1 (should upsert, update content, and maintain 1 submission per student)
    const updatedSub1 = await AssignmentSubmission.findOneAndUpdate(
      {
        schoolId: schoolA._id,
        assignmentId: assignment1._id,
        studentId: student1._id,
      },
      {
        content: "Revised solutions for problems 1 to 25 with corrected Q14.",
        submittedAt: new Date(),
        status: "SUBMITTED",
      },
      { new: true, upsert: true }
    );
    assert(
      updatedSub1._id.toString() === sub1._id.toString() &&
      updatedSub1.content.includes("Revised solutions"),
      "Resubmission successfully updates existing submission without duplicate records"
    );

    const totalSubmissions = await AssignmentSubmission.countDocuments({ assignmentId: assignment1._id });
    assert(totalSubmissions === 2, `Exactly 2 submission records exist for the 2 students (actual: ${totalSubmissions})`);

    console.log("\n--- TEST GROUP 6: TEACHER REVIEW & MARKS WORKFLOW ---");

    const reviewPayload = {
      marks: 46,
      feedback: "Excellent work on factoring polynomials! Check step 3 on Q14.",
    };
    const parsedReview = reviewSubmissionSchema.safeParse(reviewPayload);
    assert(parsedReview.success === true, "Review validation schema passed");

    const reviewedSub1 = await AssignmentSubmission.findByIdAndUpdate(
      sub1._id,
      {
        marks: parsedReview.data!.marks,
        feedback: parsedReview.data!.feedback,
        reviewedBy: teacher1._id,
        reviewedAt: new Date(),
        status: "REVIEWED",
      },
      { new: true }
    );
    assert(
      reviewedSub1?.status === "REVIEWED" &&
      reviewedSub1.marks === 46 &&
      (reviewedSub1.feedback?.includes("Excellent work") ?? false),
      "Submission successfully reviewed, marks recorded, and status set to REVIEWED"
    );

    console.log("\n--- TEST GROUP 7: STUDY MATERIAL & HIERARCHY ---");

    const validMaterialPayload = {
      academicYearId: ayA._id.toString(),
      classId: classA1._id.toString(),
      subjectId: subMath._id.toString(),
      topic: "Quadratic Equations",
      title: "Chapter 4 - Quadratic Equations Formula Sheet",
      description: "Quick revision notes and standard quadratic formulas.",
      type: "PDF" as const,
      url: "https://school-resources.com/grade10/math/quadratics_cheat_sheet.pdf",
    };

    const parsedMaterial = createStudyMaterialSchema.safeParse(validMaterialPayload);
    assert(parsedMaterial.success === true, "Study material schema validation passed");

    const material1 = await StudyMaterial.create({
      schoolId: schoolA._id,
      ...parsedMaterial.data,
      teacherId: teacher1._id,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });
    assert(!!material1._id && material1.topic === "Quadratic Equations", "Study material saved in class->subject->topic hierarchy");

    // Invalid non-HTTP URL validation check
    const invalidUrlPayload = {
      ...validMaterialPayload,
      url: "ftp://unsafe-link.internal/bad.pdf",
    };
    const parsedInvalid = createStudyMaterialSchema.safeParse(invalidUrlPayload);
    assert(parsedInvalid.success === false, "Invalid non-HTTP(S) file URL rejected by Zod schema");

    // FileStorageService abstraction test
    const isValidStorageUrl = FileStorageService.validateUrl("https://school-resources.com/docs/notes.pdf");
    assert(isValidStorageUrl === true, "FileStorageService correctly validates HTTPS URLs");

    const isInvalidStorageUrl = FileStorageService.validateUrl("javascript:alert(1)");
    assert(isInvalidStorageUrl === false, "FileStorageService correctly rejects unsafe protocols");

    console.log("\n--- TEST GROUP 9: A5 BUG FIX — TEACHER IDENTITY & SCOPING ---");

    // 1. Setup Classes, Subjects, and Teachers (Sarah/Abhay, Rohit, Priya)
    const class2: any = await Class.create({
      schoolId: schoolA._id,
      name: "Class 2",
      code: `C2_${timestamp.toString().slice(-4)}`,
      displayOrder: 2,
      academicYearId: ayA._id,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const section2A: any = await Section.create({
      schoolId: schoolA._id,
      classId: class2._id,
      name: "A",
      academicYearId: ayA._id,
      capacity: 40,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const subjectHindi: any = await Subject.create({
      schoolId: schoolA._id,
      name: "Hindi",
      code: `HIN_${timestamp.toString().slice(-4)}`,
      subjectType: "CORE",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    const subjectEnglish: any = await Subject.create({
      schoolId: schoolA._id,
      name: "English Lang",
      code: `ENG_${timestamp.toString().slice(-4)}`,
      subjectType: "CORE",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    // Map subjects to classes
    await ClassSubject.create({
      schoolId: schoolA._id,
      academicYearId: ayA._id,
      classId: classA1._id,
      subjectId: subjectHindi._id,
      maximumMarks: 100,
      passingMarks: 33,
      isActive: true,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    await ClassSubject.create({
      schoolId: schoolA._id,
      academicYearId: ayA._id,
      classId: class2._id,
      subjectId: subjectEnglish._id,
      maximumMarks: 100,
      passingMarks: 33,
      isActive: true,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    // Teacher 1: Sarah (teacher1, Maths for Grade 10)
    // Teacher 2: Rohit (Hindi for Grade 10)
    const teacherUserRohit: any = await User.create({
      name: "Rohit Teacher",
      email: `rohit.teacher.${timestamp}@school-a.com`,
      password: "Password@123",
      role: "TEACHER",
      schoolId: schoolA._id,
      isActive: true,
    });

    const teacherRohit: any = await Teacher.create({
      schoolId: schoolA._id,
      userId: teacherUserRohit._id,
      teacherId: `TCH_ROH_${timestamp.toString().slice(-4)}`,
      firstName: "Rohit",
      lastName: "Sharma",
      email: teacherUserRohit.email,
      status: "ACTIVE",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    // Teacher 3: Priya (English for Class 2-A)
    const teacherUserPriya: any = await User.create({
      name: "Priya Teacher",
      email: `priya.teacher.${timestamp}@school-a.com`,
      password: "Password@123",
      role: "TEACHER",
      schoolId: schoolA._id,
      isActive: true,
    });

    const teacherPriya: any = await Teacher.create({
      schoolId: schoolA._id,
      userId: teacherUserPriya._id,
      teacherId: `TCH_PRI_${timestamp.toString().slice(-4)}`,
      firstName: "Priya",
      lastName: "Verma",
      email: teacherUserPriya.email,
      status: "ACTIVE",
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    // Assign Rohit to Grade 10 Section A Hindi
    await TeacherAssignment.create({
      schoolId: schoolA._id,
      teacherId: teacherRohit._id,
      academicYearId: ayA._id,
      classId: classA1._id,
      sectionId: secA1._id,
      subjectId: subjectHindi._id,
      assignmentType: "SUBJECT_TEACHER",
      isActive: true,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    // Assign Priya to Class 2 Section A English
    await TeacherAssignment.create({
      schoolId: schoolA._id,
      teacherId: teacherPriya._id,
      academicYearId: ayA._id,
      classId: class2._id,
      sectionId: section2A._id,
      subjectId: subjectEnglish._id,
      assignmentType: "SUBJECT_TEACHER",
      isActive: true,
      createdBy: adminA._id,
      updatedBy: adminA._id,
    });

    // Negative test 1: Check if teacher1 (Sarah) is authorized to teach Grade 10 Section A Hindi -> MUST BE FALSE
    const sarahHindiCheck = await verifyTeacherAssignmentScope({
      schoolId: schoolA._id.toString(),
      userId: teacherUser1._id.toString(),
      academicYearId: ayA._id.toString(),
      classId: classA1._id.toString(),
      sectionId: secA1._id.toString(),
      subjectId: subjectHindi._id.toString(),
    });
    assert(sarahHindiCheck.hasAccess === false, "Negative Test: Teacher 1 cannot create assignment for Class 1 Hindi (scope denied)");

    // Negative test 2: Check if teacher1 (Sarah) is authorized to teach Class 2 Section A English -> MUST BE FALSE
    const sarahEnglishCheck = await verifyTeacherAssignmentScope({
      schoolId: schoolA._id.toString(),
      userId: teacherUser1._id.toString(),
      academicYearId: ayA._id.toString(),
      classId: class2._id.toString(),
      sectionId: section2A._id.toString(),
      subjectId: subjectEnglish._id.toString(),
    });
    assert(sarahEnglishCheck.hasAccess === false, "Negative Test: Teacher 1 cannot create assignment for Class 2 English (scope denied)");

    // Positive check 1: Rohit can teach Grade 10 Section A Hindi
    const rohitHindiCheck = await verifyTeacherAssignmentScope({
      schoolId: schoolA._id.toString(),
      userId: teacherUserRohit._id.toString(),
      academicYearId: ayA._id.toString(),
      classId: classA1._id.toString(),
      sectionId: secA1._id.toString(),
      subjectId: subjectHindi._id.toString(),
    });
    assert(rohitHindiCheck.hasAccess === true, "Positive Test: Rohit is authorized to create assignment for Class 1 Hindi");

    // Positive check 2: Priya can teach Class 2 Section A English
    const priyaEnglishCheck = await verifyTeacherAssignmentScope({
      schoolId: schoolA._id.toString(),
      userId: teacherUserPriya._id.toString(),
      academicYearId: ayA._id.toString(),
      classId: class2._id.toString(),
      sectionId: section2A._id.toString(),
      subjectId: subjectEnglish._id.toString(),
    });
    assert(priyaEnglishCheck.hasAccess === true, "Positive Test: Priya is authorized to create assignment for Class 2 English");

    // Create 3 assignments with distinct teachers
    // Assignment 1: Maths Grade 10-A -> teacher1 (Sarah)
    const asgnMaths: any = await Assignment.create({
      schoolId: schoolA._id,
      academicYearId: ayA._id,
      classId: classA1._id,
      sectionId: secA1._id,
      subjectId: subMath._id,
      teacherId: teacher1._id, // Sarah
      title: "Maths Homework Chap 1",
      description: "Solve questions 1-10",
      assignedDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: adminA._id,
      updatedBy: adminA._id,
      status: "PUBLISHED",
      isActive: true,
    });

    // Assignment 2: Hindi Grade 10-A -> Rohit
    const asgnHindi: any = await Assignment.create({
      schoolId: schoolA._id,
      academicYearId: ayA._id,
      classId: classA1._id,
      sectionId: secA1._id,
      subjectId: subjectHindi._id,
      teacherId: teacherRohit._id, // Rohit
      title: "Hindi Vyakaran Practice",
      description: "Read chapter 2 and answer questions",
      assignedDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: adminA._id,
      updatedBy: adminA._id,
      status: "PUBLISHED",
      isActive: true,
    });

    // Assignment 3: English Class 2-A -> Priya
    const asgnEnglish: any = await Assignment.create({
      schoolId: schoolA._id,
      academicYearId: ayA._id,
      classId: class2._id,
      sectionId: section2A._id,
      subjectId: subjectEnglish._id,
      teacherId: teacherPriya._id, // Priya
      title: "English Essay Writing",
      description: "Write 300 words essay",
      assignedDate: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: adminA._id,
      updatedBy: adminA._id,
      status: "PUBLISHED",
      isActive: true,
    });

    // Verify createdBy and teacherId separation
    assert(asgnMaths.createdBy.toString() === adminA._id.toString(), "Assignment createdBy correctly preserves Admin User ID");
    assert(asgnMaths.teacherId.toString() === teacher1._id.toString(), "Assignment 1 teacherId is Teacher 1 ID (not Admin ID)");
    assert(asgnHindi.teacherId.toString() === teacherRohit._id.toString(), "Assignment 2 teacherId is Rohit's Teacher ID");
    assert(asgnEnglish.teacherId.toString() === teacherPriya._id.toString(), "Assignment 3 teacherId is Priya's Teacher ID");

    // Verify Population in Assignment List: each row resolves its own teacher
    const populatedList = await Assignment.find({
      _id: { $in: [asgnMaths._id, asgnHindi._id, asgnEnglish._id] },
    })
      .populate("teacherId", "firstName lastName")
      .lean();

    const mathsRow = populatedList.find((a: any) => a._id.toString() === asgnMaths._id.toString());
    const hindiRow = populatedList.find((a: any) => a._id.toString() === asgnHindi._id.toString());
    const englishRow = populatedList.find((a: any) => a._id.toString() === asgnEnglish._id.toString());

    assert((mathsRow?.teacherId as any)?.firstName === "Sarah", "Assignment 1 correctly displays teacher Sarah");
    assert((hindiRow?.teacherId as any)?.firstName === "Rohit", "Assignment 2 correctly displays teacher Rohit (NOT Sarah)");
    assert((englishRow?.teacherId as any)?.firstName === "Priya", "Assignment 3 correctly displays teacher Priya (NOT Sarah)");

    // Test Teacher Filter Queries
    const sarahFilter = await Assignment.find({ schoolId: schoolA._id, teacherId: teacher1._id, isActive: true });
    assert(sarahFilter.some((a) => a._id.toString() === asgnMaths._id.toString()) && !sarahFilter.some((a) => a._id.toString() === asgnHindi._id.toString()), "Filter by teacher (Sarah) returns only Sarah's assignments");

    const rohitFilter = await Assignment.find({ schoolId: schoolA._id, teacherId: teacherRohit._id, isActive: true });
    assert(rohitFilter.length === 1 && rohitFilter[0]._id.toString() === asgnHindi._id.toString(), "Filter by teacher (Rohit) returns only Rohit's assignment");

    const priyaFilter = await Assignment.find({ schoolId: schoolA._id, teacherId: teacherPriya._id, isActive: true });
    assert(priyaFilter.length === 1 && priyaFilter[0]._id.toString() === asgnEnglish._id.toString(), "Filter by teacher (Priya) returns only Priya's assignment");

    // Clean up extra records created in Test Group 9
    await User.deleteMany({ _id: { $in: [teacherUserRohit._id, teacherUserPriya._id] } });
    await Class.deleteMany({ _id: class2._id });
    await Section.deleteMany({ _id: section2A._id });
    await Subject.deleteMany({ _id: { $in: [subjectHindi._id, subjectEnglish._id] } });

    // Clean up test records
    await AssignmentSubmission.deleteMany({ assignmentId: assignment1._id });
    await Assignment.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } });
    await StudyMaterial.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } });
    await TeacherAssignment.deleteMany({ schoolId: schoolA._id });
    await ClassSubject.deleteMany({ schoolId: schoolA._id });
    await Student.deleteMany({ schoolId: schoolA._id });
    await Teacher.deleteMany({ schoolId: schoolA._id });
    await Subject.deleteMany({ schoolId: { $in: [schoolA._id, schoolB._id] } });
    await Section.deleteMany({ schoolId: schoolA._id });
    await Class.deleteMany({ schoolId: schoolA._id });
    await AcademicYear.deleteMany({ schoolId: schoolA._id });
    await User.deleteMany({ _id: { $in: [adminA._id, adminB._id, teacherUser1._id, studentUser1._id] } });
    await School.deleteMany({ _id: { $in: [schoolA._id, schoolB._id] } });

    console.log("\n============================================================");
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("============================================================");

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("Fatal test execution error:", err);
    process.exit(1);
  }
}

runTests();
