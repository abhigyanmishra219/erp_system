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
  console.log("STARTING T8 TEST SUITE: TEACHER LEAVE, NOTICES & ALERTS");
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
  const LeaveRequest = (await import("./src/models/LeaveRequest")).default;
  const Notice = (await import("./src/models/Notice")).default;
  const Notification = (await import("./src/models/Notification")).default;
  const AuditLog = (await import("./src/models/AuditLog")).default;
  const { LeaveService } = await import("./src/lib/services/leaveService");
  const { createToken } = await import("./src/lib/jwt");
  const { NextRequest } = await import("next/server");

  const { GET: getTeacherLeaves, POST: postTeacherLeave } = await import(
    "./src/app/api/teacher/leave/route"
  );
  const { POST: cancelTeacherLeave } = await import(
    "./src/app/api/teacher/leave/[leaveId]/cancel/route"
  );
  const {
    GET: getTeacherNotices,
    POST: postTeacherNotice,
    DELETE: deleteTeacherNotice,
  } = await import("./src/app/api/teacher/notices/route");
  const { GET: getTeacherNotifications } = await import(
    "./src/app/api/teacher/notifications/route"
  );
  const { POST: markNotificationRead } = await import(
    "./src/app/api/teacher/notifications/[notificationId]/read/route"
  );
  const { POST: markAllNotificationsRead } = await import(
    "./src/app/api/teacher/notifications/read-all/route"
  );
  const { POST: approveAdminLeave } = await import(
    "./src/app/api/admin/leaves/[leaveId]/approve/route"
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
    teacherAssignments: [],
    leaveRequests: [],
    notices: [],
    notifications: [],
    auditLogs: [],
  };

  const runId = Date.now().toString().slice(-6);

  try {
    const adminId = new mongoose.Types.ObjectId();

    // 1. Create School & Academic Year
    const school = await School.create({
      name: `T8 Academy ${runId}`,
      code: `T8S_${runId}`,
      address: "Leave Avenue",
      city: "Delhi",
      state: "Delhi",
      country: "India",
      email: `t8_${runId}@school.com`,
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

    // 2. Create Admin User
    const adminUser = await User.create({
      schoolId: school._id,
      email: `admin_t8_${runId}@school.edu`,
      password: "Password123!",
      role: "ADMIN",
      name: "Principal Anderson",
    });
    cleanupIds.users.push(adminUser._id);

    // 3. Create Teachers 1 & 2
    const userA = await User.create({
      schoolId: school._id,
      email: `teacher.a.${runId}@test.com`,
      password: "Password123!",
      role: "TEACHER",
      name: "Teacher Alice",
    });
    cleanupIds.users.push(userA._id);

    const teacherA = await Teacher.create({
      schoolId: school._id,
      userId: userA._id,
      teacherId: `TID-A-${runId}`,
      firstName: "Alice",
      lastName: "Leave",
      employeeId: `EMP-A-${runId}`,
      email: userA.email,
      gender: "FEMALE",
      joiningDate: new Date("2024-01-01"),
      status: "ACTIVE",
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    cleanupIds.teachers.push(teacherA._id);

    const userB = await User.create({
      schoolId: school._id,
      email: `teacher.b.${runId}@test.com`,
      password: "Password123!",
      role: "TEACHER",
      name: "Teacher Bob",
    });
    cleanupIds.users.push(userB._id);

    const teacherB = await Teacher.create({
      schoolId: school._id,
      userId: userB._id,
      teacherId: `TID-B-${runId}`,
      firstName: "Bob",
      lastName: "Notice",
      employeeId: `EMP-B-${runId}`,
      email: userB.email,
      gender: "MALE",
      joiningDate: new Date("2024-01-01"),
      status: "ACTIVE",
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    cleanupIds.teachers.push(teacherB._id);

    // 4. Create Classes, Sections & Subjects
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

    const mathSub = await Subject.create({
      schoolId: school._id,
      name: "Mathematics",
      code: `MTH_${runId}`,
      subjectType: "CORE",
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    cleanupIds.subjects.push(mathSub._id);

    // Teacher A assigned to Class 10 Sec A Math
    const allocA = await TeacherAssignment.create({
      schoolId: school._id,
      academicYearId: academicYear._id,
      teacherId: teacherA._id,
      classId: class10._id,
      sectionId: sec10A._id,
      subjectId: mathSub._id,
      assignmentType: "SUBJECT_TEACHER",
      isActive: true,
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
    });
    cleanupIds.teacherAssignments.push(allocA._id);

    // Tokens
    const teacherAToken = createToken({
      userId: userA._id.toString(),
      email: userA.email,
      role: "TEACHER",
    });

    const teacherBToken = createToken({
      userId: userB._id.toString(),
      email: userB.email,
      role: "TEACHER",
    });

    const adminToken = createToken({
      userId: adminUser._id.toString(),
      email: adminUser.email,
      role: "ADMIN",
    });

    // =========================================================================
    // PART A: LEAVE TESTS
    // =========================================================================
    console.log("\n--- PART A: Teacher Leave Tests ---");

    let leaveIdA: string = "";

    // Test 1: Submit valid leave request
    {
      const req = new NextRequest("http://localhost:3000/api/teacher/leave", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${teacherAToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromDate: "2026-10-05",
          toDate: "2026-10-07",
          reason: "Attending National Mathematics Conference",
          attachments: [
            {
              name: "Invitation.pdf",
              url: "https://school.edu/files/invitation.pdf",
            },
          ],
        }),
      });

      const res = await postTeacherLeave(req);
      const json = await res.json();
      if (res.status !== 201) {
        console.error("Test 1 error response:", res.status, json);
      }

      assert(res.status === 201, "Teacher A leave submission returns HTTP 201");
      assert(json.success === true, "Leave submission reports success = true");
      assert(json.data?.status === "PENDING", "Initial leave status is PENDING");
      leaveIdA = json.data._id;
      cleanupIds.leaveRequests.push(leaveIdA);

      // Verify AuditLog
      const audit = await AuditLog.findOne({
        schoolId: school._id,
        action: "LEAVE_REQUESTED",
        entityId: leaveIdA,
      }).lean();
      assert(!!audit, "AuditLog recorded for LEAVE_REQUESTED");
    }

    // Test 2: Overlapping leave request rejected
    {
      const req = new NextRequest("http://localhost:3000/api/teacher/leave", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${teacherAToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromDate: "2026-10-06",
          toDate: "2026-10-08",
          reason: "Another leave overlapping with existing dates",
        }),
      });

      const res = await postTeacherLeave(req);
      assert(res.status === 400, "Overlapping leave request is rejected with HTTP 400");
    }

    // Test 3: Invalid dates (toDate < fromDate) rejected
    {
      const req = new NextRequest("http://localhost:3000/api/teacher/leave", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${teacherAToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromDate: "2026-11-10",
          toDate: "2026-11-05",
          reason: "Invalid date sequence",
        }),
      });

      const res = await postTeacherLeave(req);
      assert(res.status === 400, "Invalid date range is rejected with HTTP 400");
    }

    // Test 4: Personal Leave Isolation
    {
      const reqA = new NextRequest("http://localhost:3000/api/teacher/leave", {
        headers: { Authorization: `Bearer ${teacherAToken}` },
      });
      const resA = await getTeacherLeaves(reqA);
      const jsonA = await resA.json();

      assert(resA.status === 200, "Teacher A GET leaves returns HTTP 200");
      assert(jsonA.data.leaves.length === 1, "Teacher A sees exactly 1 leave request");
      assert(jsonA.data.summary.pendingCount === 1, "Teacher A summary reports pendingCount = 1");

      const reqB = new NextRequest("http://localhost:3000/api/teacher/leave", {
        headers: { Authorization: `Bearer ${teacherBToken}` },
      });
      const resB = await getTeacherLeaves(reqB);
      const jsonB = await resB.json();

      assert(resB.status === 200, "Teacher B GET leaves returns HTTP 200");
      assert(jsonB.data.leaves.length === 0, "Teacher B sees 0 leave requests (Personal Isolation verified)");
    }

    // Test 5: Teacher cannot approve own leave
    {
      // Teacher attempts to call admin approve endpoint
      const req = new NextRequest(
        `http://localhost:3000/api/admin/leaves/${leaveIdA}/approve`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${teacherAToken}` },
        }
      );
      const res = await approveAdminLeave(req, {
        params: Promise.resolve({ leaveId: leaveIdA }),
      });
      assert(res.status === 403, "Teacher cannot approve leave (HTTP 403 Forbidden)");
    }

    // Test 6: Admin approves Teacher A's leave and notification is dispatched
    {
      const req = new NextRequest(
        `http://localhost:3000/api/admin/leaves/${leaveIdA}/approve`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${adminToken}` },
        }
      );
      const res = await approveAdminLeave(req, {
        params: Promise.resolve({ leaveId: leaveIdA }),
      });
      const json = await res.json();

      assert(res.status === 200, "Admin approves Teacher A's leave with HTTP 200");
      const approvedStatus = json.data?.leave?.status || json.data?.status;
      assert(approvedStatus === "APPROVED", "Leave status changed to APPROVED");

      // Verify leave status in teacher view
      const reqA = new NextRequest("http://localhost:3000/api/teacher/leave", {
        headers: { Authorization: `Bearer ${teacherAToken}` },
      });
      const resA = await getTeacherLeaves(reqA);
      const jsonA = await resA.json();
      assert(jsonA.data.summary.approvedCount === 1, "Teacher A summary now reports approvedCount = 1");
      assert(jsonA.data.leaves[0].reviewedBy.name === "Principal Anderson", "Reviewer info populated with admin name");
    }

    // Test 7: Teacher A submits a second leave and cancels it
    let leaveIdA2: string = "";
    {
      const submitReq = new NextRequest("http://localhost:3000/api/teacher/leave", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${teacherAToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fromDate: "2026-12-01",
          toDate: "2026-12-02",
          reason: "Personal appointment",
        }),
      });
      const submitRes = await postTeacherLeave(submitReq);
      const submitJson = await submitRes.json();
      leaveIdA2 = submitJson.data._id;
      cleanupIds.leaveRequests.push(leaveIdA2);

      // Teacher B attempts to cancel Teacher A's leave
      const cancelByB = new NextRequest(
        `http://localhost:3000/api/teacher/leave/${leaveIdA2}/cancel`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${teacherBToken}` },
        }
      );
      const resB = await cancelTeacherLeave(cancelByB, {
        params: Promise.resolve({ leaveId: leaveIdA2 }),
      });
      assert(resB.status === 400, "Teacher B cannot cancel Teacher A's leave (HTTP 400)");

      // Teacher A cancels own leave
      const cancelByA = new NextRequest(
        `http://localhost:3000/api/teacher/leave/${leaveIdA2}/cancel`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${teacherAToken}` },
        }
      );
      const resA = await cancelTeacherLeave(cancelByA, {
        params: Promise.resolve({ leaveId: leaveIdA2 }),
      });
      const jsonA = await resA.json();

      assert(resA.status === 200, "Teacher A successfully cancels own leave (HTTP 200)");
      assert(jsonA.data.status === "CANCELLED", "Cancelled leave status is CANCELLED");
    }

    // =========================================================================
    // PART B: NOTICES TESTS
    // =========================================================================
    console.log("\n--- PART B: Teacher Notices Tests ---");

    // Seed Notices
    const noticeSchool = await Notice.create({
      schoolId: school._id,
      title: "Annual Sports Meet 2026",
      description: "All staff and students are invited to the annual sports meet.",
      targetType: "SCHOOL",
      status: "PUBLISHED",
      publishedAt: new Date(),
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
      isActive: true,
    });
    cleanupIds.notices.push(noticeSchool._id);

    const noticeTeachers = await Notice.create({
      schoolId: school._id,
      title: "Faculty Staff Meeting",
      description: "Monthly staff review meeting in Conference Room 1.",
      targetType: "TEACHERS",
      status: "PUBLISHED",
      publishedAt: new Date(),
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
      isActive: true,
    });
    cleanupIds.notices.push(noticeTeachers._id);

    const noticeClass10 = await Notice.create({
      schoolId: school._id,
      title: "Grade 10 Curriculum Update",
      description: "Notice regarding Grade 10 board preparations.",
      targetType: "CLASS",
      targetClassId: class10._id,
      status: "PUBLISHED",
      publishedAt: new Date(),
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
      isActive: true,
    });
    cleanupIds.notices.push(noticeClass10._id);

    const noticeClass11 = await Notice.create({
      schoolId: school._id,
      title: "Grade 11 Field Trip",
      description: "Field trip guidelines for Grade 11.",
      targetType: "CLASS",
      targetClassId: class11._id,
      status: "PUBLISHED",
      publishedAt: new Date(),
      createdBy: adminUser._id,
      updatedBy: adminUser._id,
      isActive: true,
    });
    cleanupIds.notices.push(noticeClass11._id);

    // Test 9: Teacher A Notices Scope (School + Teachers + Class 10, NOT Class 11)
    {
      const req = new NextRequest("http://localhost:3000/api/teacher/notices", {
        headers: { Authorization: `Bearer ${teacherAToken}` },
      });
      const res = await getTeacherNotices(req);
      const json = await res.json();

      assert(res.status === 200, "Teacher A GET notices returns HTTP 200");
      assert(json.data.notices.length === 3, "Teacher A receives exactly 3 scoped notices");

      const titles = json.data.notices.map((n: any) => n.title);
      assert(titles.includes("Annual Sports Meet 2026"), "Notice includes School-wide announcement");
      assert(titles.includes("Faculty Staff Meeting"), "Notice includes Faculty announcement");
      assert(titles.includes("Grade 10 Curriculum Update"), "Notice includes assigned Class 10 notice");
      assert(!titles.includes("Grade 11 Field Trip"), "Notice strictly EXCLUDES unassigned Class 11 notice");
    }

    // Test 10: Teacher B Notices Scope (School + Teachers, NOT Class 10/11)
    {
      const req = new NextRequest("http://localhost:3000/api/teacher/notices", {
        headers: { Authorization: `Bearer ${teacherBToken}` },
      });
      const res = await getTeacherNotices(req);
      const json = await res.json();

      assert(res.status === 200, "Teacher B GET notices returns HTTP 200");
      assert(json.data.notices.length === 2, "Teacher B receives exactly 2 notices (School + Faculty)");
      const titles = json.data.notices.map((n: any) => n.title);
      assert(!titles.includes("Grade 10 Curriculum Update"), "Teacher B cannot see Class 10 notice");
    }

    // Test 11: Teacher cannot create or delete notices (Read-Only 405)
    {
      const postRes = await postTeacherNotice();
      assert(postRes.status === 405, "POST /api/teacher/notices returns HTTP 405");

      const deleteRes = await deleteTeacherNotice();
      assert(deleteRes.status === 405, "DELETE /api/teacher/notices returns HTTP 405");
    }

    // =========================================================================
    // PART C: NOTIFICATIONS TESTS
    // =========================================================================
    console.log("\n--- PART C: Teacher Alerts & Notifications Tests ---");

    // Test 12: Teacher A retrieves in-app notifications
    let notifIdA: string = "";
    {
      const req = new NextRequest("http://localhost:3000/api/teacher/notifications", {
        headers: { Authorization: `Bearer ${teacherAToken}` },
      });
      const res = await getTeacherNotifications(req);
      const json = await res.json();

      assert(res.status === 200, "Teacher A GET notifications returns HTTP 200");
      assert(json.data.notifications.length >= 1, "Teacher A has at least 1 notification from leave approval");
      assert(json.data.unreadCount >= 1, "Unread count is at least 1");
      notifIdA = json.data.notifications[0]._id;
    }

    // Test 13: Mark individual notification as read
    {
      const req = new NextRequest(
        `http://localhost:3000/api/teacher/notifications/${notifIdA}/read`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${teacherAToken}` },
        }
      );
      const res = await markNotificationRead(req, {
        params: Promise.resolve({ notificationId: notifIdA }),
      });
      assert(res.status === 200, "Mark notification read returns HTTP 200");

      const notifDoc = await Notification.findById(notifIdA).lean();
      assert(notifDoc?.isRead === true, "Notification record marked isRead = true");
    }

    // Test 14: Mark all notifications as read
    {
      const req = new NextRequest("http://localhost:3000/api/teacher/notifications/read-all", {
        method: "POST",
        headers: { Authorization: `Bearer ${teacherAToken}` },
      });
      const res = await markAllNotificationsRead(req);
      assert(res.status === 200, "Mark all notifications read returns HTTP 200");
    }
  } catch (err) {
    console.error("Test execution error:", err);
    failed++;
  } finally {
    // Cleanup seeded records
    console.log("\n--- Cleaning up Test Artifacts ---");
    const SchoolModel = (await import("./src/models/School")).default;
    const UserModel = (await import("./src/models/User")).default;
    const AcademicYearModel = (await import("./src/models/AcademicYear")).default;
    const ClassModel = (await import("./src/models/Class")).default;
    const SectionModel = (await import("./src/models/Section")).default;
    const SubjectModel = (await import("./src/models/Subject")).default;
    const TeacherModel = (await import("./src/models/Teacher")).default;
    const TeacherAssignmentModel = (await import("./src/models/TeacherAssignment")).default;
    const LeaveRequestModel = (await import("./src/models/LeaveRequest")).default;
    const NoticeModel = (await import("./src/models/Notice")).default;
    const NotificationModel = (await import("./src/models/Notification")).default;
    const AuditLogModel = (await import("./src/models/AuditLog")).default;

    if (cleanupIds.leaveRequests.length) {
      await LeaveRequestModel.deleteMany({ _id: { $in: cleanupIds.leaveRequests } });
    }
    if (cleanupIds.notices.length) {
      await NoticeModel.deleteMany({ _id: { $in: cleanupIds.notices } });
    }
    if (cleanupIds.teacherAssignments.length) {
      await TeacherAssignmentModel.deleteMany({ _id: { $in: cleanupIds.teacherAssignments } });
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
      await NotificationModel.deleteMany({ recipientUserId: { $in: cleanupIds.users } });
      await AuditLogModel.deleteMany({ userId: { $in: cleanupIds.users.map((u) => u.toString()) } });
      await UserModel.deleteMany({ _id: { $in: cleanupIds.users } });
    }
    if (cleanupIds.schools.length) {
      await SchoolModel.deleteMany({ _id: { $in: cleanupIds.schools } });
    }
    console.log("Cleanup complete.");
  }

  console.log("\n============================================================");
  console.log(`T8 RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("============================================================\n");

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
