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

async function runS4TestSuite() {
  console.log("============================================================");
  console.log("🧪 STARTING S4: STUDENT STUDY MATERIAL TEST SUITE");
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
  const StudyMaterial: any = (await import("./src/models/StudyMaterial")).default;

  const { createToken } = await import("./src/lib/jwt");
  const { GET: getStudyMaterials, POST: postStudyMaterial, PUT: putStudyMaterial, DELETE: deleteStudyMaterial, PATCH: patchStudyMaterial } = (await import("./src/app/api/student/study-material/route")) as any;
  const { GET: getStudyMaterialById, POST: postMaterialId, PUT: putMaterialId, DELETE: deleteMaterialId, PATCH: patchMaterialId } = (await import("./src/app/api/student/study-material/[materialId]/route")) as any;

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
    // 1. Setup School 1 & Academic Year
    const school1 = await School.create({
      name: `S4 Academy ${timestamp}`,
      code: `S4_${timestamp}`,
      status: "ACTIVE",
      address: "400 Learning Ave",
      city: "Bangalore",
      state: "Karnataka",
      country: "India",
      phone: "1234567890",
      email: `s4_school1_${timestamp}@example.com`,
      plan: "STANDARD",
      studentLimit: 500,
      subscriptionStartDate: new Date(),
      subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
      subscriptionStatus: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    const academicYear1 = await AcademicYear.create({
      schoolId: school1._id,
      name: `2026-2027 ${timestamp}`,
      startDate: new Date("2026-04-01"),
      endDate: new Date("2027-03-31"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // School 2 (Tenant Isolation verification)
    const school2 = await School.create({
      name: `S4 Academy Secondary ${timestamp}`,
      code: `S4B_${timestamp}`,
      status: "ACTIVE",
      address: "500 Other Ave",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      phone: "9876543210",
      email: `s4_school2_${timestamp}@example.com`,
      plan: "STANDARD",
      studentLimit: 500,
      subscriptionStartDate: new Date(),
      subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
      subscriptionStatus: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Class 10-A in School 1
    const class10A = await Class.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      name: `Class 10-${timestamp}`,
      code: `C10_${timestamp}`.slice(0, 10),
      createdBy: adminId,
      updatedBy: adminId,
    });

    const section10A = await Section.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      classId: class10A._id,
      name: "A",
      capacity: 35,
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Class 9-B in School 1 (Class isolation)
    const class9B = await Class.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      name: `Class 9-${timestamp}`,
      code: `C9_${timestamp}`.slice(0, 10),
      createdBy: adminId,
      updatedBy: adminId,
    });

    const section9B = await Section.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      classId: class9B._id,
      name: "B",
      capacity: 30,
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Subjects in School 1
    const subjectMath = await Subject.create({
      schoolId: school1._id,
      name: `Mathematics ${timestamp}`,
      code: `MATH_${timestamp}`.slice(0, 10),
      type: "THEORY",
      createdBy: adminId,
      updatedBy: adminId,
    });

    const subjectPhysics = await Subject.create({
      schoolId: school1._id,
      name: `Physics ${timestamp}`,
      code: `PHY_${timestamp}`.slice(0, 10),
      type: "THEORY",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Teacher
    const teacherUser = await User.create({
      email: `teacher_s4_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "TEACHER",
      schoolId: school1._id,
      status: "ACTIVE",
    });

    const teacherDoc = await Teacher.create({
      schoolId: school1._id,
      userId: teacherUser._id,
      teacherId: `TCH_S4_${timestamp}`,
      firstName: "Albert",
      lastName: "Einstein",
      gender: "MALE",
      joiningDate: new Date(),
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Student A in Class 10-A
    const userA = await User.create({
      email: `studentA_s4_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "STUDENT",
      schoolId: school1._id,
      status: "ACTIVE",
    });

    const studentA = await Student.create({
      schoolId: school1._id,
      userId: userA._id,
      admissionNumber: `ADM-S4A-${timestamp}`.slice(0, 15),
      studentId: `STU-S4A-${timestamp}`.slice(0, 15),
      firstName: "Emma",
      lastName: "Watson",
      dateOfBirth: new Date("2010-04-15"),
      gender: "FEMALE",
      academicYearId: academicYear1._id,
      classId: class10A._id,
      sectionId: section10A._id,
      admissionDate: new Date("2024-04-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // Student B in Class 9-B
    const userB = await User.create({
      email: `studentB_s4_${timestamp}@example.com`,
      password: "HashedPassword123!",
      role: "STUDENT",
      schoolId: school1._id,
      status: "ACTIVE",
    });

    const studentB = await Student.create({
      schoolId: school1._id,
      userId: userB._id,
      admissionNumber: `ADM-S4B-${timestamp}`.slice(0, 15),
      studentId: `STU-S4B-${timestamp}`.slice(0, 15),
      firstName: "Ron",
      lastName: "Weasley",
      dateOfBirth: new Date("2011-03-01"),
      gender: "MALE",
      academicYearId: academicYear1._id,
      classId: class9B._id,
      sectionId: section9B._id,
      admissionDate: new Date("2024-04-01"),
      status: "ACTIVE",
      createdBy: adminId,
      updatedBy: adminId,
    });

    // 2. Create Study Materials for Class 10-A
    // Material 1: PDF in Mathematics -> Topic "Quadratic Equations"
    const mat1 = await StudyMaterial.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      classId: class10A._id,
      subjectId: subjectMath._id,
      topic: "Quadratic Equations",
      title: "Complete Quadratic Formulas & Derivations",
      description: "Formula sheet and step-by-step proofs for quadratic roots.",
      type: "PDF",
      url: "https://example.com/files/quadratic_derivations.pdf",
      fileName: "quadratic_derivations.pdf",
      fileSize: 2048576,
      mimeType: "application/pdf",
      teacherId: teacherDoc._id,
      isActive: true,
      createdBy: teacherUser._id,
      updatedBy: teacherUser._id,
    });

    // Material 2: DOCUMENT in Mathematics -> Topic "Quadratic Equations"
    const mat2 = await StudyMaterial.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      classId: class10A._id,
      subjectId: subjectMath._id,
      topic: "Quadratic Equations",
      title: "Practice Worksheet 100 Problems",
      description: "Comprehensive exercise set for exam prep.",
      type: "DOCUMENT",
      url: "https://example.com/files/quad_worksheet.docx",
      fileName: "quad_worksheet.docx",
      fileSize: 524288,
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      teacherId: teacherDoc._id,
      isActive: true,
      createdBy: teacherUser._id,
      updatedBy: teacherUser._id,
    });

    // Material 3: PRESENTATION in Mathematics -> Topic "Trigonometry"
    const mat3 = await StudyMaterial.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      classId: class10A._id,
      subjectId: subjectMath._id,
      topic: "Trigonometry",
      title: "Unit Circle & Trig Identities Slide Deck",
      description: "Visual slides on sin, cos, and tan ratios.",
      type: "PRESENTATION",
      url: "https://example.com/files/trig_slides.pptx",
      fileName: "trig_slides.pptx",
      fileSize: 4194304,
      mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      teacherId: teacherDoc._id,
      isActive: true,
      createdBy: teacherUser._id,
      updatedBy: teacherUser._id,
    });

    // Material 4: VIDEO in Physics -> Topic "Electromagnetism"
    const mat4 = await StudyMaterial.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      classId: class10A._id,
      subjectId: subjectPhysics._id,
      topic: "Electromagnetism",
      title: "Faraday's Law Video Demonstration",
      description: "Lab recording demonstrating electromagnetic induction.",
      type: "VIDEO",
      url: "https://example.com/videos/faraday_demo.mp4",
      fileName: "faraday_demo.mp4",
      fileSize: 15728640,
      mimeType: "video/mp4",
      teacherId: teacherDoc._id,
      isActive: true,
      createdBy: teacherUser._id,
      updatedBy: teacherUser._id,
    });

    // Material 5: EXTERNAL_LINK in Physics -> Topic "Electromagnetism"
    const mat5 = await StudyMaterial.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      classId: class10A._id,
      subjectId: subjectPhysics._id,
      topic: "Electromagnetism",
      title: "PhET Interactive Magnet Simulation",
      description: "Interactive browser simulation tool.",
      type: "EXTERNAL_LINK",
      url: "https://phet.colorado.edu/sims/html/faradays-law/latest/faradays-law_en.html",
      fileName: "",
      fileSize: null,
      mimeType: "",
      teacherId: teacherDoc._id,
      isActive: true,
      createdBy: teacherUser._id,
      updatedBy: teacherUser._id,
    });

    // Material 6: Inactive Material in Class 10-A (Should be hidden from students)
    const matInactive = await StudyMaterial.create({
      schoolId: school1._id,
      academicYearId: academicYear1._id,
      classId: class10A._id,
      subjectId: subjectMath._id,
      topic: "Draft Chapter",
      title: "Unpublished Draft Notes",
      description: "Draft notes not ready for students",
      type: "PDF",
      url: "https://example.com/files/draft.pdf",
      teacherId: teacherDoc._id,
      isActive: false,
      createdBy: teacherUser._id,
      updatedBy: teacherUser._id,
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

    console.log("--- 1. Testing Student A Study Materials & Hierarchy (/api/student/study-material) ---");
    const listResA = await getStudyMaterials(makeRequest("/api/student/study-material", tokenA));
    const listDataA = await listResA.json();

    assert(listResA.status === 200, "Student A study material API returns HTTP 200");
    assert(listDataA.success === true, "Response success is true");
    assert(listDataA.data.summary.totalCount === 5, "Total active materials for Class 10-A is 5 (inactive excluded)");
    assert(listDataA.data.summary.subjectsCount === 2, "2 subjects present (Math, Physics)");
    assert(listDataA.data.summary.topicsCount === 3, "3 distinct topics present (Quadratic, Trig, Electromagnetism)");
    assert(listDataA.data.summary.byType.PDF === 1, "1 PDF material registered");
    assert(listDataA.data.summary.byType.DOCUMENT === 1, "1 Document material registered");
    assert(listDataA.data.summary.byType.PRESENTATION === 1, "1 Presentation registered");
    assert(listDataA.data.summary.byType.VIDEO === 1, "1 Video registered");
    assert(listDataA.data.summary.byType.EXTERNAL_LINK === 1, "1 External Link registered");

    // Verify Hierarchy Structure: Class -> Subject -> Topic -> Material[]
    const classIdStr = class10A._id.toString();
    const mathSubIdStr = subjectMath._id.toString();
    const physSubIdStr = subjectPhysics._id.toString();

    assert(listDataA.data.hierarchy[classIdStr] !== undefined, "Hierarchy contains Class 10-A node");
    assert(listDataA.data.hierarchy[classIdStr].subjects[mathSubIdStr] !== undefined, "Hierarchy contains Mathematics subject");
    assert(listDataA.data.hierarchy[classIdStr].subjects[physSubIdStr] !== undefined, "Hierarchy contains Physics subject");

    const quadMaterials = listDataA.data.hierarchy[classIdStr].subjects[mathSubIdStr].topics["Quadratic Equations"];
    assert(Array.isArray(quadMaterials) && quadMaterials.length === 2, "Quadratic Equations topic has 2 materials");
    assert(quadMaterials.some((m: any) => m.type === "PDF"), "Quadratic Equations includes PDF");
    assert(quadMaterials.some((m: any) => m.type === "DOCUMENT"), "Quadratic Equations includes Document");

    const trigMaterials = listDataA.data.hierarchy[classIdStr].subjects[mathSubIdStr].topics["Trigonometry"];
    assert(Array.isArray(trigMaterials) && trigMaterials.length === 1, "Trigonometry topic has 1 material");

    const emMaterials = listDataA.data.hierarchy[classIdStr].subjects[physSubIdStr].topics["Electromagnetism"];
    assert(Array.isArray(emMaterials) && emMaterials.length === 2, "Electromagnetism topic has 2 materials");

    console.log("\n--- 2. Testing Subject and Type Filters ---");
    // Filter by Physics
    const filterPhysRes = await getStudyMaterials(makeRequest(`/api/student/study-material?subjectId=${physSubIdStr}`, tokenA));
    const filterPhysData = await filterPhysRes.json();
    assert(filterPhysData.data.materials.length === 2, "Filtering by Physics returns 2 materials");
    assert(filterPhysData.data.materials.every((m: any) => m.subject._id === physSubIdStr), "All filtered items belong to Physics");

    // Filter by Video Type
    const filterVideoRes = await getStudyMaterials(makeRequest(`/api/student/study-material?type=VIDEO`, tokenA));
    const filterVideoData = await filterVideoRes.json();
    assert(filterVideoData.data.materials.length === 1, "Filtering by type=VIDEO returns 1 material");
    assert(filterVideoData.data.materials[0].title.includes("Faraday"), "Video title matches Faraday demo");

    // Search by Keyword
    const searchRes = await getStudyMaterials(makeRequest(`/api/student/study-material?search=worksheet`, tokenA));
    const searchData = await searchRes.json();
    assert(searchData.data.materials.length === 1, "Search for 'worksheet' returns 1 material");
    assert(searchData.data.materials[0].title.includes("Worksheet"), "Matching material is the Worksheet");

    console.log("\n--- 3. Testing Class & Tenant Scope Isolation ---");
    // Student B in Class 9-B accesses materials
    const listResB = await getStudyMaterials(makeRequest("/api/student/study-material", tokenB));
    const listDataB = await listResB.json();
    assert(listResB.status === 200, "Student B gets HTTP 200");
    assert(listDataB.data.summary.totalCount === 0, "Student B has 0 materials (Class 10-A materials isolated)");
    assert(listDataB.data.materials.length === 0, "Student B received empty materials list");

    console.log("\n--- 4. Testing Single Study Material Endpoint (/api/student/study-material/[materialId]) ---");
    const singleResA = await getStudyMaterialById(
      makeRequest(`/api/student/study-material/${mat1._id}`, tokenA),
      { params: Promise.resolve({ materialId: mat1._id.toString() }) }
    );
    const singleDataA = await singleResA.json();
    assert(singleResA.status === 200, "Student A can view valid material details (HTTP 200)");
    assert(singleDataA.data.title === "Complete Quadratic Formulas & Derivations", "Material title matches");
    assert(singleDataA.data.type === "PDF", "Material type is PDF");
    assert(singleDataA.data.teacher.name === "Albert Einstein", "Teacher author is Albert Einstein");

    // Student B attempts to access Class 10-A Material 1
    const singleResB = await getStudyMaterialById(
      makeRequest(`/api/student/study-material/${mat1._id}`, tokenB),
      { params: Promise.resolve({ materialId: mat1._id.toString() }) }
    );
    assert(singleResB.status === 404, "Student B cannot view Class 10-A material (HTTP 404)");

    // Accessing Inactive Material returns 404
    const inactiveRes = await getStudyMaterialById(
      makeRequest(`/api/student/study-material/${matInactive._id}`, tokenA),
      { params: Promise.resolve({ materialId: matInactive._id.toString() }) }
    );
    assert(inactiveRes.status === 404, "Student cannot access inactive/draft material (HTTP 404)");

    console.log("\n--- 5. Testing Read-Only Immutability Enforcement (HTTP 405) ---");
    const postRes = await postStudyMaterial();
    assert(postRes.status === 405, "Student POST /api/student/study-material rejected with 405 Method Not Allowed");

    const putRes = await putStudyMaterial();
    assert(putRes.status === 405, "Student PUT /api/student/study-material rejected with 405 Method Not Allowed");

    const deleteRes = await deleteStudyMaterial();
    assert(deleteRes.status === 405, "Student DELETE /api/student/study-material rejected with 405 Method Not Allowed");

    const patchRes = await patchStudyMaterial();
    assert(patchRes.status === 405, "Student PATCH /api/student/study-material rejected with 405 Method Not Allowed");

    const singlePostRes = await postMaterialId();
    assert(singlePostRes.status === 405, "Student POST /api/student/study-material/[id] rejected with 405 Method Not Allowed");

    const singlePutRes = await putMaterialId();
    assert(singlePutRes.status === 405, "Student PUT /api/student/study-material/[id] rejected with 405 Method Not Allowed");

    const singleDeleteRes = await deleteMaterialId();
    assert(singleDeleteRes.status === 405, "Student DELETE /api/student/study-material/[id] rejected with 405 Method Not Allowed");

    const singlePatchRes = await patchMaterialId();
    assert(singlePatchRes.status === 405, "Student PATCH /api/student/study-material/[id] rejected with 405 Method Not Allowed");

    // Clean up test data
    await Promise.all([
      School.findByIdAndDelete(school1._id),
      School.findByIdAndDelete(school2._id),
      AcademicYear.deleteMany({ schoolId: school1._id }),
      Class.deleteMany({ schoolId: school1._id }),
      Section.deleteMany({ schoolId: school1._id }),
      Subject.deleteMany({ schoolId: school1._id }),
      User.deleteMany({ schoolId: school1._id }),
      Teacher.deleteMany({ schoolId: school1._id }),
      Student.deleteMany({ schoolId: school1._id }),
      StudyMaterial.deleteMany({ schoolId: school1._id }),
    ]);

    console.log("\n============================================================");
    console.log(`📊 S4 TEST SUITE COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log("============================================================\n");

    if (failed > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (err) {
    console.error("❌ Fatal Error in S4 test suite:", err);
    process.exit(1);
  }
}

runS4TestSuite();
