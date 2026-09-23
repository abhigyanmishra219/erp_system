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
  console.log("STARTING T7 TEST SUITE: TEACHER TIMETABLE & SECURITY");
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
  const TimetableEntry = (await import("./src/models/TimetableEntry")).default;
  const { createToken } = await import("./src/lib/jwt");
  const { NextRequest } = await import("next/server");

  const {
    GET: getTeacherTimetable,
    POST: postTeacherTimetable,
    PUT: putTeacherTimetable,
    PATCH: patchTeacherTimetable,
    DELETE: deleteTeacherTimetable,
  } = await import("./src/app/api/teacher/timetable/route");

  await connectToDatabase();

  const cleanupIds: { [key: string]: any[] } = {
    schools: [],
    users: [],
    academicYears: [],
    classes: [],
    sections: [],
    subjects: [],
    teachers: [],
    timetableEntries: [],
  };

  const runId = Date.now().toString().slice(-6);

  try {
    const adminId = new mongoose.Types.ObjectId();

    // 1. Seed School & Academic Year
    const school = await School.create({
      name: `T7 Timetable Academy ${runId}`,
      code: `T7S_${runId}`,
      address: "Timetable Ave",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      email: `t7_${runId}@school.com`,
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

    // 2. Seed Admin User
    const adminUser = await User.create({
      schoolId: school._id,
      email: `admin_t7_${runId}@school.edu`,
      password: "Password123!",
      role: "ADMIN",
      name: "Timetable Administrator",
    });
    cleanupIds.users.push(adminUser._id);

    // 3. Seed Teachers 1 & 2
    const userTeacher1 = await User.create({
      schoolId: school._id,
      email: `teacher1_t7_${runId}@school.edu`,
      password: "Password123!",
      role: "TEACHER",
      name: "Dr. Physics Newton",
    });
    cleanupIds.users.push(userTeacher1._id);

    const teacher1 = await Teacher.create({
      schoolId: school._id,
      userId: userTeacher1._id,
      teacherId: `TID-1-${runId}`,
      firstName: "Physics",
      lastName: "Newton",
      employeeId: `EMP_T7_01_${runId}`,
      email: userTeacher1.email,
      gender: "MALE",
      joiningDate: new Date("2024-01-01"),
      status: "ACTIVE",
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    cleanupIds.teachers.push(teacher1._id);

    const userTeacher2 = await User.create({
      schoolId: school._id,
      email: `teacher2_t7_${runId}@school.edu`,
      password: "Password123!",
      role: "TEACHER",
      name: "Prof. Math Gauss",
    });
    cleanupIds.users.push(userTeacher2._id);

    const teacher2 = await Teacher.create({
      schoolId: school._id,
      userId: userTeacher2._id,
      teacherId: `TID-2-${runId}`,
      firstName: "Math",
      lastName: "Gauss",
      employeeId: `EMP_T7_02_${runId}`,
      email: userTeacher2.email,
      gender: "MALE",
      joiningDate: new Date("2024-01-01"),
      status: "ACTIVE",
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    cleanupIds.teachers.push(teacher2._id);

    // 4. Seed Classes & Sections
    const class10 = await Class.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      name: `Grade 10 ${runId}`,
      code: `G10_${runId}`,
      displayOrder: 10,
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    cleanupIds.classes.push(class10._id);

    const sec10A = await Section.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: class10._id,
      name: "Section A",
      capacity: 30,
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    cleanupIds.sections.push(sec10A._id);

    const class11 = await Class.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      name: `Grade 11 ${runId}`,
      code: `G11_${runId}`,
      displayOrder: 11,
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    cleanupIds.classes.push(class11._id);

    const sec11B = await Section.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: class11._id,
      name: "Section B",
      capacity: 30,
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    cleanupIds.sections.push(sec11B._id);

    // 5. Seed Subjects
    const subPhysics = await Subject.create({
      schoolId: school._id,
      name: "Physics",
      code: `PHY_${runId}`,
      subjectType: "CORE",
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    cleanupIds.subjects.push(subPhysics._id);

    const subMath = await Subject.create({
      schoolId: school._id,
      name: "Mathematics",
      code: `MTH_${runId}`,
      subjectType: "CORE",
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    cleanupIds.subjects.push(subMath._id);

    const subChemistry = await Subject.create({
      schoolId: school._id,
      name: "Chemistry",
      code: `CHM_${runId}`,
      subjectType: "ELECTIVE",
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    cleanupIds.subjects.push(subChemistry._id);

    // 6. Seed Timetable Entries for Teacher 1 (5 periods)
    const t1_1 = await TimetableEntry.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: class10._id,
      sectionId: sec10A._id,
      subjectId: subPhysics._id,
      teacherId: teacher1._id,
      dayOfWeek: "MONDAY",
      startTime: "09:00",
      endTime: "10:00",
      room: "Physics Lab 1",
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    const t1_2 = await TimetableEntry.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: class10._id,
      sectionId: sec10A._id,
      subjectId: subPhysics._id,
      teacherId: teacher1._id,
      dayOfWeek: "MONDAY",
      startTime: "10:15",
      endTime: "11:15",
      room: "Room 101",
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    const t1_3 = await TimetableEntry.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: class11._id,
      sectionId: sec11B._id,
      subjectId: subPhysics._id,
      teacherId: teacher1._id,
      dayOfWeek: "TUESDAY",
      startTime: "09:00",
      endTime: "10:00",
      room: "Physics Lab 1",
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    const t1_4 = await TimetableEntry.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: class10._id,
      sectionId: sec10A._id,
      subjectId: subPhysics._id,
      teacherId: teacher1._id,
      dayOfWeek: "WEDNESDAY",
      startTime: "11:30",
      endTime: "12:30",
      room: "Room 101",
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    const t1_5 = await TimetableEntry.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: class11._id,
      sectionId: sec11B._id,
      subjectId: subPhysics._id,
      teacherId: teacher1._id,
      dayOfWeek: "FRIDAY",
      startTime: "14:00",
      endTime: "15:00",
      room: "Room 205",
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    [t1_1, t1_2, t1_3, t1_4, t1_5].forEach((e) => cleanupIds.timetableEntries.push(e._id));

    // 7. Seed Timetable Entries for Teacher 2 (3 periods)
    const t2_1 = await TimetableEntry.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: class11._id,
      sectionId: sec11B._id,
      subjectId: subMath._id,
      teacherId: teacher2._id,
      dayOfWeek: "MONDAY",
      startTime: "09:00",
      endTime: "10:00",
      room: "Math Room 204",
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    const t2_2 = await TimetableEntry.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: class10._id,
      sectionId: sec10A._id,
      subjectId: subChemistry._id,
      teacherId: teacher2._id,
      dayOfWeek: "WEDNESDAY",
      startTime: "09:00",
      endTime: "10:00",
      room: "Chemistry Lab",
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    const t2_3 = await TimetableEntry.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      classId: class11._id,
      sectionId: sec11B._id,
      subjectId: subMath._id,
      teacherId: teacher2._id,
      dayOfWeek: "THURSDAY",
      startTime: "10:00",
      endTime: "11:00",
      room: "Math Room 204",
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    [t2_1, t2_2, t2_3].forEach((e) => cleanupIds.timetableEntries.push(e._id));

    // Generate JWT Tokens
    const teacher1Token = createToken({
      userId: userTeacher1._id.toString(),
      email: userTeacher1.email,
      role: "TEACHER",
    });

    const teacher2Token = createToken({
      userId: userTeacher2._id.toString(),
      email: userTeacher2.email,
      role: "TEACHER",
    });

    // =========================================================================
    // TEST 1: Teacher 1 Personal Timetable Isolation
    // =========================================================================
    console.log("\n--- TEST 1: Teacher 1 Personal Timetable Isolation ---");
    {
      const req = new NextRequest("http://localhost:3000/api/teacher/timetable", {
        headers: { Authorization: `Bearer ${teacher1Token}` },
      });
      const res = await getTeacherTimetable(req);
      const json = await res.json();

      assert(res.status === 200, "Teacher 1 timetable GET returns HTTP 200");
      assert(json.success === true, "Response reports success = true");
      assert(json.data.allEntries.length === 5, "Teacher 1 receives exactly 5 total weekly entries");

      // Verify no Teacher 2 entries are returned
      const hasMath = json.data.allEntries.some((e: any) => e.subjectName === "Mathematics");
      const hasChemistry = json.data.allEntries.some((e: any) => e.subjectName === "Chemistry");
      assert(!hasMath && !hasChemistry, "Teacher 1 NEVER sees Teacher 2's Mathematics or Chemistry entries");

      // Verify weekly grouping
      assert(json.data.weekly.MONDAY.length === 2, "Monday has 2 periods for Teacher 1");
      assert(json.data.weekly.TUESDAY.length === 1, "Tuesday has 1 period for Teacher 1");
      assert(json.data.weekly.WEDNESDAY.length === 1, "Wednesday has 1 period for Teacher 1");
      assert(json.data.weekly.THURSDAY.length === 0, "Thursday has 0 periods for Teacher 1");
      assert(json.data.weekly.FRIDAY.length === 1, "Friday has 1 period for Teacher 1");
      assert(json.data.weekly.SATURDAY.length === 0, "Saturday has 0 periods for Teacher 1");
    }

    // =========================================================================
    // TEST 2: Teacher 2 Personal Timetable Isolation
    // =========================================================================
    console.log("\n--- TEST 2: Teacher 2 Personal Timetable Isolation ---");
    {
      const req = new NextRequest("http://localhost:3000/api/teacher/timetable", {
        headers: { Authorization: `Bearer ${teacher2Token}` },
      });
      const res = await getTeacherTimetable(req);
      const json = await res.json();

      assert(res.status === 200, "Teacher 2 timetable GET returns HTTP 200");
      assert(json.data.allEntries.length === 3, "Teacher 2 receives exactly 3 total weekly entries");

      const hasPhysics = json.data.allEntries.some((e: any) => e.subjectName === "Physics");
      assert(!hasPhysics, "Teacher 2 NEVER sees Teacher 1's Physics entries");

      assert(json.data.weekly.MONDAY.length === 1, "Monday has 1 period for Teacher 2");
      assert(json.data.weekly.WEDNESDAY.length === 1, "Wednesday has 1 period for Teacher 2");
      assert(json.data.weekly.THURSDAY.length === 1, "Thursday has 1 period for Teacher 2");
    }

    // =========================================================================
    // TEST 3: Security - Spoofing Prevention via Query Parameters
    // =========================================================================
    console.log("\n--- TEST 3: Spoofing Prevention ---");
    {
      // Teacher 1 attempts to pass ?teacherId=<Teacher 2 ID>
      const spoofUrl = `http://localhost:3000/api/teacher/timetable?teacherId=${teacher2._id.toString()}`;
      const req = new NextRequest(spoofUrl, {
        headers: { Authorization: `Bearer ${teacher1Token}` },
      });
      const res = await getTeacherTimetable(req);
      const json = await res.json();

      assert(res.status === 200, "Spoofed query request returns HTTP 200");
      assert(json.data.allEntries.length === 5, "Spoofed teacherId is ignored; returns Teacher 1's 5 entries");
      const hasMath = json.data.allEntries.some((e: any) => e.subjectName === "Mathematics");
      assert(!hasMath, "Spoofing attempt fails to reveal Teacher 2's schedule");
    }

    // =========================================================================
    // TEST 4: Data Payload Field Integrity
    // =========================================================================
    console.log("\n--- TEST 4: Data Payload Field Integrity ---");
    {
      const req = new NextRequest("http://localhost:3000/api/teacher/timetable", {
        headers: { Authorization: `Bearer ${teacher1Token}` },
      });
      const res = await getTeacherTimetable(req);
      const json = await res.json();
      const firstEntry = json.data.allEntries[0];

      assert(Boolean(firstEntry.dayOfWeek), "Entry contains dayOfWeek");
      assert(Boolean(firstEntry.startTime && firstEntry.endTime), "Entry contains startTime and endTime");
      assert(Boolean(firstEntry.className), "Entry contains populated className");
      assert(Boolean(firstEntry.sectionName), "Entry contains populated sectionName");
      assert(Boolean(firstEntry.subjectName && firstEntry.subjectCode), "Entry contains populated subjectName & subjectCode");
      assert(Boolean(firstEntry.room), "Entry contains room/lab designation");
    }

    // =========================================================================
    // TEST 5: Summary Metrics Calculation
    // =========================================================================
    console.log("\n--- TEST 5: Summary Metrics Calculation ---");
    {
      const req = new NextRequest("http://localhost:3000/api/teacher/timetable", {
        headers: { Authorization: `Bearer ${teacher1Token}` },
      });
      const res = await getTeacherTimetable(req);
      const json = await res.json();
      const summary = json.data.summary;

      assert(summary.totalWeeklyPeriods === 5, "summary.totalWeeklyPeriods is 5");
      assert(summary.distinctClassesCount === 2, "summary.distinctClassesCount is 2 (Grade 10 & Grade 11)");
      assert(summary.distinctSubjectsCount === 1, "summary.distinctSubjectsCount is 1 (Physics)");
      assert(summary.distinctRoomsCount === 3, "summary.distinctRoomsCount is 3 (Physics Lab 1, Room 101, Room 205)");
    }

    // =========================================================================
    // TEST 6: Read-Only Enforcement (405 Method Not Allowed)
    // =========================================================================
    console.log("\n--- TEST 6: Read-Only Enforcement ---");
    {
      const postRes = await postTeacherTimetable();
      assert(postRes.status === 405, "POST /api/teacher/timetable returns HTTP 405");

      const putRes = await putTeacherTimetable();
      assert(putRes.status === 405, "PUT /api/teacher/timetable returns HTTP 405");

      const patchRes = await patchTeacherTimetable();
      assert(patchRes.status === 405, "PATCH /api/teacher/timetable returns HTTP 405");

      const deleteRes = await deleteTeacherTimetable();
      assert(deleteRes.status === 405, "DELETE /api/teacher/timetable returns HTTP 405");
    }

    // =========================================================================
    // TEST 7: Authentication & Role Guard Enforcement
    // =========================================================================
    console.log("\n--- TEST 7: Authentication & Role Guard Enforcement ---");
    {
      // No token
      const unauthReq = new NextRequest("http://localhost:3000/api/teacher/timetable");
      const unauthRes = await getTeacherTimetable(unauthReq);
      assert(unauthRes.status === 401, "Unauthenticated request returns HTTP 401");

      // Admin token on teacher route
      const adminToken = createToken({
        userId: adminUser._id.toString(),
        email: adminUser.email,
        role: "ADMIN",
      });
      const adminReq = new NextRequest("http://localhost:3000/api/teacher/timetable", {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const adminRes = await getTeacherTimetable(adminReq);
      assert(adminRes.status === 403, "Non-teacher role returns HTTP 403");
    }
  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    // Cleanup seeded data
    console.log("\n--- Cleaning up Test Artifacts ---");
    const TimetableEntryModel = (await import("./src/models/TimetableEntry")).default;
    const TeacherModel = (await import("./src/models/Teacher")).default;
    const SubjectModel = (await import("./src/models/Subject")).default;
    const SectionModel = (await import("./src/models/Section")).default;
    const ClassModel = (await import("./src/models/Class")).default;
    const AcademicYearModel = (await import("./src/models/AcademicYear")).default;
    const UserModel = (await import("./src/models/User")).default;
    const SchoolModel = (await import("./src/models/School")).default;

    if (cleanupIds.timetableEntries.length) {
      await TimetableEntryModel.deleteMany({ _id: { $in: cleanupIds.timetableEntries } });
    }
    if (cleanupIds.teachers.length) {
      await TeacherModel.deleteMany({ _id: { $in: cleanupIds.teachers } });
    }
    if (cleanupIds.subjects.length) {
      await SubjectModel.deleteMany({ _id: { $in: cleanupIds.subjects } });
    }
    if (cleanupIds.sections.length) {
      await SectionModel.deleteMany({ _id: { $in: cleanupIds.sections } });
    }
    if (cleanupIds.classes.length) {
      await ClassModel.deleteMany({ _id: { $in: cleanupIds.classes } });
    }
    if (cleanupIds.academicYears.length) {
      await AcademicYearModel.deleteMany({ _id: { $in: cleanupIds.academicYears } });
    }
    if (cleanupIds.users.length) {
      await UserModel.deleteMany({ _id: { $in: cleanupIds.users } });
    }
    if (cleanupIds.schools.length) {
      await SchoolModel.deleteMany({ _id: { $in: cleanupIds.schools } });
    }
    console.log("Cleanup complete.");
  }

  console.log("\n============================================================");
  console.log(`T7 RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("============================================================\n");

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
