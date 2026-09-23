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
  console.log("STARTING T5 TEST SUITE: TEACHER STUDY MATERIAL & SCOPE SECURITY");
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
  const TeacherAssignment = (await import("./src/models/TeacherAssignment")).default;
  const StudyMaterial = (await import("./src/models/StudyMaterial")).default;
  const AuditLog = (await import("./src/models/AuditLog")).default;
  const { createToken } = await import("./src/lib/jwt");
  const { NextRequest } = await import("next/server");

  const { GET: getMaterials, POST: postMaterial } = await import("./src/app/api/teacher/study-material/route");
  const { GET: getMaterialDetail, PATCH: patchMaterial, DELETE: deleteMaterial } = await import("./src/app/api/teacher/study-material/[materialId]/route");

  await connectToDatabase();

  const cleanupIds: { [key: string]: any[] } = {
    schools: [],
    users: [],
    academicYears: [],
    classes: [],
    sections: [],
    subjects: [],
    teachers: [],
    teacherAssignments: [],
    studyMaterials: [],
    auditLogs: [],
  };

  const runId = Date.now().toString().slice(-6);

  try {
    const adminId = new mongoose.Types.ObjectId();

    // 1. Create School & Academic Year
    const school = await School.create({
      name: `Test Academy T5 ${runId}`,
      code: `TA5_${runId}`,
      address: "Study Material Blvd",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      email: `t5_${runId}@school.com`,
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
    // Teacher A: Class 1 Math
    // Teacher B: Class 2 Science
    // Teacher C: Class 1 Math (Shared)
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

    const userC = await User.create({
      name: "Teacher Charlie",
      schoolId: school._id,
      email: `teacher.c.${runId}@test.com`,
      password: "Password123!",
      role: "TEACHER",
      isActive: true,
    });
    cleanupIds.users.push(userC._id);

    const teacherC = await Teacher.create({
      schoolId: school._id,
      userId: userC._id,
      teacherId: `TID-C-${runId}`,
      employeeId: `EMP-C-${runId}`,
      firstName: "Charlie",
      lastName: "SharedMath",
      email: userC.email,
      gender: "MALE",
      phone: "7778889999",
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.teachers.push(teacherC._id);

    // 5. Allocations
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

    const allocC = await TeacherAssignment.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      teacherId: teacherC._id,
      classId: class1._id,
      sectionId: sec1A._id,
      subjectId: mathSub._id,
      assignmentType: "SUBJECT_TEACHER",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    });
    cleanupIds.teacherAssignments.push(allocC._id);

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

    const tokenTeacherC = createToken({
      userId: userC._id.toString(),
      email: userC.email,
      role: "TEACHER",
    });

    console.log("\n--- Test 1: Scope Enforcement on Study Material Creation ---");

    // 1A: Teacher A attempts to publish material for Class 2 (Unauthorized class) -> 403
    const reqUnauthClass = new NextRequest("http://localhost:3000/api/teacher/study-material", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherA}`,
      },
      body: JSON.stringify({
        academicYearId: academicYear._id.toString(),
        classId: class2._id.toString(),
        subjectId: mathSub._id.toString(),
        topic: "Chapter 1: Foundations",
        title: "Algebra Notes",
        type: "PDF",
        url: "https://files.school.com/algebra.pdf",
      }),
    });
    const resUnauthClass = await postMaterial(reqUnauthClass);
    assert(resUnauthClass.status === 403, "Teacher A cannot publish material for unauthorized Class 2 (HTTP 403)");

    // 1B: Teacher A attempts to publish material for Science subject in Class 1 (Unauthorized subject) -> 403
    const reqUnauthSub = new NextRequest("http://localhost:3000/api/teacher/study-material", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherA}`,
      },
      body: JSON.stringify({
        academicYearId: academicYear._id.toString(),
        classId: class1._id.toString(),
        subjectId: scienceSub._id.toString(),
        topic: "Chapter 2: Physics",
        title: "Motion Notes",
        type: "PDF",
        url: "https://files.school.com/motion.pdf",
      }),
    });
    const resUnauthSub = await postMaterial(reqUnauthSub);
    assert(resUnauthSub.status === 403, "Teacher A cannot publish material for unauthorized Subject (HTTP 403)");

    // 1C: Teacher A publishes valid Math study material for Class 1 -> 201
    const reqValidPost = new NextRequest("http://localhost:3000/api/teacher/study-material", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherA}`,
      },
      body: JSON.stringify({
        academicYearId: academicYear._id.toString(),
        classId: class1._id.toString(),
        subjectId: mathSub._id.toString(),
        topic: "Chapter 1: Real Numbers",
        title: "Formula Cheatsheet & Solved Examples",
        description: "Review formulas for the upcoming unit assessment.",
        type: "PDF",
        url: "https://files.school.com/math_ch1.pdf",
        fileName: "math_ch1.pdf",
        fileSize: 2048576,
      }),
    });
    const resValidPost = await postMaterial(reqValidPost);
    const validPostJson = await resValidPost.json();
    assert(resValidPost.status === 201 && validPostJson.success, "Teacher A successfully publishes study material (HTTP 201)");
    const materialAId = validPostJson.data?._id;
    if (materialAId) cleanupIds.studyMaterials.push(new mongoose.Types.ObjectId(materialAId));

    console.log("\n--- Test 2: Audit Logging on Creation ---");
    const createAudit = await AuditLog.findOne({
      schoolId: school._id,
      action: "STUDY_MATERIAL_CREATED",
      entityId: materialAId,
    });
    assert(!!createAudit, "AuditLog generated for STUDY_MATERIAL_CREATED");
    if (createAudit) cleanupIds.auditLogs.push(createAudit._id);

    console.log("\n--- Test 3: Hierarchy Tree & Filter Options ---");
    const reqList = new NextRequest("http://localhost:3000/api/teacher/study-material", {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenTeacherA}` },
    });
    const resList = await getMaterials(reqList);
    const listJson = await resList.json();
    assert(resList.status === 200 && listJson.success, "Study material list fetched successfully");
    assert(listJson.data.materials.length === 1, "List contains Teacher A authorized materials");
    assert(!!listJson.data.hierarchy[class1._id.toString()], "Hierarchy contains Class 1");
    assert(
      !!listJson.data.hierarchy[class1._id.toString()]?.subjects[mathSub._id.toString()],
      "Hierarchy contains Subject Mathematics under Class 1"
    );
    assert(
      listJson.data.hierarchy[class1._id.toString()]?.subjects[mathSub._id.toString()]?.topics["Chapter 1: Real Numbers"]
        ?.length === 1,
      "Hierarchy contains topic Chapter 1: Real Numbers with 1 material item"
    );

    console.log("\n--- Test 4: Detail View & Shared Access ---");
    // 4A: Teacher A views own material detail
    const reqDetailA = new NextRequest(`http://localhost:3000/api/teacher/study-material/${materialAId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenTeacherA}` },
    });
    const resDetailA = await getMaterialDetail(reqDetailA, { params: Promise.resolve({ materialId: materialAId }) });
    const detailAJson = await resDetailA.json();
    assert(resDetailA.status === 200 && detailAJson.data.isOwner === true, "Teacher A views own material with isOwner = true");

    // 4B: Teacher C (teaching Class 1 Math as well) views material detail (Shared subject scope)
    const reqDetailC = new NextRequest(`http://localhost:3000/api/teacher/study-material/${materialAId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenTeacherC}` },
    });
    const resDetailC = await getMaterialDetail(reqDetailC, { params: Promise.resolve({ materialId: materialAId }) });
    const detailCJson = await resDetailC.json();
    assert(resDetailC.status === 200 && detailCJson.data.isOwner === false, "Teacher C can access shared class/subject material with isOwner = false");

    // 4C: Teacher B (Class 2 Science) attempts to view Teacher A's Class 1 Math material -> 403 Forbidden
    const reqDetailB = new NextRequest(`http://localhost:3000/api/teacher/study-material/${materialAId}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${tokenTeacherB}` },
    });
    const resDetailB = await getMaterialDetail(reqDetailB, { params: Promise.resolve({ materialId: materialAId }) });
    assert(resDetailB.status === 403, "Teacher B cannot view Teacher A's material from different class/subject (HTTP 403 Forbidden)");

    console.log("\n--- Test 5: Edit & Delete Permissions ---");
    // 5A: Teacher C attempts to edit Teacher A's material -> 403 Forbidden
    const reqEditC = new NextRequest(`http://localhost:3000/api/teacher/study-material/${materialAId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherC}`,
      },
      body: JSON.stringify({
        title: "Unauthorized Edit By Charlie",
      }),
    });
    const resEditC = await patchMaterial(reqEditC, { params: Promise.resolve({ materialId: materialAId }) });
    assert(resEditC.status === 403, "Teacher C cannot edit Teacher A's material (HTTP 403 Forbidden)");

    // 5B: Teacher B attempts to delete Teacher A's material -> 403 Forbidden
    const reqDeleteB = new NextRequest(`http://localhost:3000/api/teacher/study-material/${materialAId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenTeacherB}` },
    });
    const resDeleteB = await deleteMaterial(reqDeleteB, { params: Promise.resolve({ materialId: materialAId }) });
    assert(resDeleteB.status === 403, "Teacher B cannot delete Teacher A's material (HTTP 403 Forbidden)");

    // 5C: Teacher A updates own material
    const reqEditA = new NextRequest(`http://localhost:3000/api/teacher/study-material/${materialAId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenTeacherA}`,
      },
      body: JSON.stringify({
        title: "Formula Cheatsheet & Solved Examples - Updated",
        topic: "Chapter 1: Real Numbers (Revised)",
      }),
    });
    const resEditA = await patchMaterial(reqEditA, { params: Promise.resolve({ materialId: materialAId }) });
    const editAJson = await resEditA.json();
    assert(resEditA.status === 200 && editAJson.data.title.includes("Updated"), "Teacher A updates own material successfully");

    const updateAudit = await AuditLog.findOne({
      schoolId: school._id,
      action: "STUDY_MATERIAL_UPDATED",
      entityId: materialAId,
    });
    assert(!!updateAudit, "AuditLog generated for STUDY_MATERIAL_UPDATED");
    if (updateAudit) cleanupIds.auditLogs.push(updateAudit._id);

    // 5D: Teacher A deletes own material
    const reqDeleteA = new NextRequest(`http://localhost:3000/api/teacher/study-material/${materialAId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenTeacherA}` },
    });
    const resDeleteA = await deleteMaterial(reqDeleteA, { params: Promise.resolve({ materialId: materialAId }) });
    assert(resDeleteA.status === 200, "Teacher A deletes own material successfully");

    const deleteAudit = await AuditLog.findOne({
      schoolId: school._id,
      action: "STUDY_MATERIAL_DELETED",
      entityId: materialAId,
    });
    assert(!!deleteAudit, "AuditLog generated for STUDY_MATERIAL_DELETED");
    if (deleteAudit) cleanupIds.auditLogs.push(deleteAudit._id);

  } catch (err) {
    console.error("Test execution exception:", err);
    failed++;
  } finally {
    // Cleanup test data
    console.log("\n--- Cleaning up test records ---");
    for (const id of cleanupIds.auditLogs) await AuditLog.findByIdAndDelete(id);
    for (const id of cleanupIds.studyMaterials) await StudyMaterial.findByIdAndDelete(id);
    for (const id of cleanupIds.teacherAssignments) await TeacherAssignment.findByIdAndDelete(id);
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
