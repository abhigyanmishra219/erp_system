import fs from "fs";
import path from "path";
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
} catch (e) {
  console.error("Failed to load .env.local", e);
}

function makeToken(user: any, schoolId: string, jwt: any) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: "PARENT",
      schoolId: schoolId.toString(),
      email: user.email,
    },
    process.env.JWT_SECRET || "your-secret-key"
  );
}

function makeRequest(url: string, method: string, token: string, body?: any) {
  const reqInit: any = {
    method,
    headers: {
      cookie: `erp_auth_token=${token}; token=${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body) {
    reqInit.body = JSON.stringify(body);
  }
  return new NextRequest(url, reqInit);
}

async function runTests() {
  console.log("============================================================");
  console.log("STARTING PHASE P7 INTEGRATION & SECURITY TESTS");
  console.log("============================================================");

  const connectToDatabase: any = (await import("./src/lib/db")).default;
  const User: any = (await import("./src/models/User")).default;
  const School: any = (await import("./src/models/School")).default;
  const AcademicYear: any = (await import("./src/models/AcademicYear")).default;
  const Class: any = (await import("./src/models/Class")).default;
  const Section: any = (await import("./src/models/Section")).default;
  const Student: any = (await import("./src/models/Student")).default;
  const Parent: any = (await import("./src/models/Parent")).default;
  const StudentParent: any = (await import("./src/models/StudentParent")).default;
  const Notice: any = (await import("./src/models/Notice")).default;
  const LeaveRequest: any = (await import("./src/models/LeaveRequest")).default;
  const Notification: any = (await import("./src/models/Notification")).default;
  const jwt: any = (await import("jsonwebtoken")).default;
  const mongoose: any = (await import("mongoose")).default;

  const { GET: getNotices, POST: postNotices } = await import("./src/app/api/parent/notices/route");
  const { GET: getLeave, POST: postLeave, PUT: putLeave } = await import("./src/app/api/parent/leave/route");
  const { GET: getNotifications } = await import("./src/app/api/parent/notifications/route");
  const { GET: getUnreadCount } = await import("./src/app/api/parent/notifications/unread-count/route");
  const { POST: postReadAll } = await import("./src/app/api/parent/notifications/read-all/route");
  const { PATCH: patchNotification, DELETE: deleteNotification } = await import("./src/app/api/parent/notifications/[notificationId]/route");

  await connectToDatabase();

  const timestamp = Date.now().toString().slice(-6);
  const adminId = new mongoose.Types.ObjectId();

  // 1. Create School & Academic Year
  const school1 = await School.create({
    name: `P7 School ${timestamp}`,
    code: `P7_${timestamp}`,
    status: "ACTIVE",
    address: "100 P7 Way",
    city: "London",
    state: "London",
    country: "United Kingdom",
    phone: "+44 20 7946 0999",
    email: `p7_${timestamp}@example.com`,
    website: "https://example.com/p7",
    plan: "STANDARD",
    studentLimit: 500,
    subscriptionStartDate: new Date(),
    subscriptionExpiryDate: new Date(Date.now() + 86400000 * 365),
    subscriptionStatus: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });
  const schoolId = school1._id.toString();

  const ay1 = await AcademicYear.create({
    schoolId: school1._id,
    name: `2026-2027 ${timestamp}`,
    startDate: new Date("2026-04-01"),
    endDate: new Date("2027-03-31"),
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const class1 = await Class.create({
    schoolId: school1._id,
    name: `Grade 10 ${timestamp}`,
    code: `G10_${timestamp}`.slice(0, 10),
    academicYearId: ay1._id,
    createdBy: adminId,
    updatedBy: adminId,
  });

  const section1 = await Section.create({
    schoolId: school1._id,
    classId: class1._id,
    academicYearId: ay1._id,
    name: `A`,
    capacity: 40,
    createdBy: adminId,
    updatedBy: adminId,
  });

  const studentUser = await User.create({
    schoolId: school1._id,
    name: `Student P7 ${timestamp}`,
    email: `student_${timestamp}@example.com`,
    password: "password123",
    role: "STUDENT",
    status: "ACTIVE",
  });

  const testStudent = await Student.create({
    schoolId: school1._id,
    userId: studentUser._id,
    admissionNumber: `ADM_${timestamp}`,
    rollNumber: `R_${timestamp}`,
    firstName: "Alice",
    lastName: `P7-${timestamp}`,
    gender: "FEMALE",
    dateOfBirth: new Date("2010-05-15"),
    bloodGroup: "O+",
    classId: class1._id,
    sectionId: section1._id,
    academicYearId: ay1._id,
    status: "ACTIVE",
    createdBy: adminId,
    updatedBy: adminId,
  });

  const parentUser = await User.create({
    schoolId: school1._id,
    name: `Parent A ${timestamp}`,
    email: `parentA_${timestamp}@example.com`,
    password: "password123",
    role: "PARENT",
    status: "ACTIVE",
  });


  const parentDoc = await Parent.create({
    schoolId: school1._id,
    userId: parentUser._id,
    firstName: "John",
    lastName: `Parent-${timestamp}`,
    email: parentUser.email,
    phone: "+44 20 7946 0123",
    relationship: "FATHER",
    children: [
      {
        studentId: testStudent._id,
        relationship: "FATHER",
        isPrimaryContact: true,
        canPickup: true,
      },
    ],
    createdBy: adminId,
    updatedBy: adminId,
  });

  const studentParentLink = await StudentParent.create({
    schoolId: school1._id,
    studentId: testStudent._id,
    parentId: parentDoc._id,
    relationship: "FATHER",
    isPrimaryGuardian: true,
    isEmergencyContact: true,
    canPickup: true,
    createdBy: adminId,
    updatedBy: adminId,
  });

  const linkedStudentId = testStudent._id.toString();
  console.log(`Created Test Parent: ${parentUser.name} (${parentUser.email})`);
  console.log(`Created Linked Child: ${testStudent.firstName} ${testStudent.lastName} (ID: ${linkedStudentId})`);

  const parentToken = makeToken(parentUser, schoolId, jwt);

  // ------------------------------------------------------------
  // TEST 1: NOTICES
  // ------------------------------------------------------------
  console.log("\n--- TEST 1: NOTICES (Audience Scoping & Read-Only) ---");

  const dummyOtherClassId = new mongoose.Types.ObjectId();
  const [schoolNotice, parentNotice, classNotice, otherNotice] = await Promise.all([
    Notice.create({
      schoolId: school1._id,
      title: "Test School-wide Circular " + timestamp,
      description: "Annual sports day announcement for all.",
      targetType: "SCHOOL",
      targetRoles: ["PARENT", "STUDENT", "TEACHER"],
      publishedAt: new Date(),
      status: "PUBLISHED",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    }),
    Notice.create({
      schoolId: school1._id,
      title: "Test Parent Circular " + timestamp,
      description: "Parent Teacher Meeting notice.",
      targetType: "PARENTS",
      targetRoles: ["PARENT"],
      publishedAt: new Date(),
      status: "PUBLISHED",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    }),
    Notice.create({
      schoolId: school1._id,
      title: "Test Class Circular " + timestamp,
      description: "Field trip for current class.",
      targetType: "CLASS",
      targetClassId: testStudent.classId,
      targetRoles: ["PARENT", "STUDENT"],
      publishedAt: new Date(),
      status: "PUBLISHED",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    }),
    Notice.create({
      schoolId: school1._id,
      title: "Test Other Class Circular " + timestamp,
      description: "Only for another class.",
      targetType: "CLASS",
      targetClassId: dummyOtherClassId,
      targetRoles: ["PARENT", "STUDENT"],
      publishedAt: new Date(),
      status: "PUBLISHED",
      isActive: true,
      createdBy: adminId,
      updatedBy: adminId,
    }),
  ]);

  // Fetch notices for linked student
  const noticeReq = makeRequest(
    `http://localhost:3000/api/parent/notices?studentId=${linkedStudentId}`,
    "GET",
    parentToken
  );
  const noticeRes = await getNotices(noticeReq);
  const noticeData = await noticeRes.json();

  console.log("GET /api/parent/notices Status:", noticeRes.status);
  console.log("Notices Count:", noticeData.data?.notices?.length);

  const foundTitles = (noticeData.data?.notices || []).map((n: any) => n.title);
  const hasSchool = foundTitles.includes(schoolNotice.title);
  const hasParent = foundTitles.includes(parentNotice.title);
  const hasClass = foundTitles.includes(classNotice.title);
  const hasOther = foundTitles.includes(otherNotice.title);

  console.log("  Includes School Notice:", hasSchool);
  console.log("  Includes Parent Notice:", hasParent);
  console.log("  Includes Child's Class Notice:", hasClass);
  console.log("  Excludes Other Class Notice:", !hasOther);

  if (!hasSchool || !hasParent || !hasClass || hasOther) {
    throw new Error("FAIL: Notices audience filtering did not match expected scope!");
  }

  // Verify Read-Only (Parent cannot create/edit/delete notices)
  const postNoticeRes = await postNotices();
  console.log("POST /api/parent/notices Status (Expect 405):", postNoticeRes.status);
  if (postNoticeRes.status !== 405) {
    throw new Error("FAIL: Parent notices endpoint must reject POST with 405 Method Not Allowed!");
  }

  // ------------------------------------------------------------
  // TEST 2: LEAVE SUBMISSION & ISOLATION
  // ------------------------------------------------------------
  console.log("\n--- TEST 2: LEAVE MANAGEMENT & SECURITY ---");

  // 1. Submit leave for linked child
  const validLeaveReq = makeRequest("http://localhost:3000/api/parent/leave", "POST", parentToken, {
    studentId: linkedStudentId,
    fromDate: "2026-10-01",
    toDate: "2026-10-03",
    reason: "Family wedding trip in home town.",
    attachments: [{ name: "Invitation.pdf", url: "https://example.com/invitation.pdf" }],
  });
  const validLeaveRes = await postLeave(validLeaveReq);
  const validLeaveData = await validLeaveRes.json();

  console.log("POST /api/parent/leave (Linked Child) Status:", validLeaveRes.status);
  console.log("Leave Created Status:", validLeaveData.data?.leave?.status);

  if (validLeaveRes.status !== 201 || validLeaveData.data?.leave?.status !== "PENDING") {
    throw new Error("FAIL: Valid leave submission failed or status is not PENDING!");
  }

  const createdLeaveId = validLeaveData.data.leave._id;

  // 2. Attempt submit leave for UNLINKED child
  const dummyUnlinkedStudentId = new mongoose.Types.ObjectId().toString();
  const unlinkedLeaveReq = makeRequest("http://localhost:3000/api/parent/leave", "POST", parentToken, {
    studentId: dummyUnlinkedStudentId,
    fromDate: "2026-10-01",
    toDate: "2026-10-03",
    reason: "Unauthorized leave attempt",
  });
  const unlinkedLeaveRes = await postLeave(unlinkedLeaveReq);
  console.log("POST /api/parent/leave (Unlinked Child) Status (Expect 403):", unlinkedLeaveRes.status);
  if (unlinkedLeaveRes.status !== 403) {
    throw new Error("FAIL: Submitting leave for unlinked student did not return 403 Forbidden!");
  }

  // 3. GET Leave history for linked child
  const getLeaveReq = makeRequest(
    `http://localhost:3000/api/parent/leave?studentId=${linkedStudentId}`,
    "GET",
    parentToken
  );
  const getLeaveRes = await getLeave(getLeaveReq);
  const getLeaveData = await getLeaveRes.json();

  console.log("GET /api/parent/leave Status:", getLeaveRes.status);
  const foundLeave = (getLeaveData.data?.leaves || []).find((l: any) => l._id === createdLeaveId);
  console.log("Found Created Leave in History:", !!foundLeave);

  if (!foundLeave || foundLeave.status !== "PENDING") {
    throw new Error("FAIL: Created leave not found in parent leave history!");
  }

  // 4. Verify unpermitted methods on leave endpoint
  const putLeaveRes = await putLeave();
  console.log("PUT /api/parent/leave Status (Expect 405):", putLeaveRes.status);
  if (putLeaveRes.status !== 405) {
    throw new Error("FAIL: PUT on leave endpoint must return 405!");
  }

  // ------------------------------------------------------------
  // TEST 3: NOTIFICATIONS & USER ISOLATION
  // ------------------------------------------------------------
  console.log("\n--- TEST 3: NOTIFICATIONS & USER ISOLATION ---");

  // Create another dummy parent user to test isolation
  const parentBUser = await User.create({
    schoolId: school1._id,
    name: "Parent B Test " + timestamp,
    email: `parentB_${timestamp}@example.com`,
    password: "password123",
    role: "PARENT",
    status: "ACTIVE",
  });
  const parentBToken = makeToken(parentBUser, schoolId, jwt);

  // Seed notification for Parent A
  const notifA = await Notification.create({
    schoolId: school1._id,
    recipientUserId: parentUser._id,
    recipientRole: "PARENT",
    title: "Fee Reminder for Parent A",
    message: "Tuition fee due for term 2",
    type: "FEE",
    isRead: false,
    channel: "IN_APP",
    status: "SENT",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Seed notification for Parent B
  const notifB = await Notification.create({
    schoolId: school1._id,
    recipientUserId: parentBUser._id,
    recipientRole: "PARENT",
    title: "Fee Reminder for Parent B",
    message: "Tuition fee due for Parent B child",
    type: "FEE",
    isRead: false,
    channel: "IN_APP",
    status: "SENT",
    createdBy: adminId,
    updatedBy: adminId,
  });

  // Parent A gets notifications
  const notifReqA = makeRequest("http://localhost:3000/api/parent/notifications", "GET", parentToken);
  const notifResA = await getNotifications(notifReqA);
  const notifDataA = await notifResA.json();

  const parentANotifIds = (notifDataA.data?.notifications || []).map((n: any) => n._id);
  console.log("Parent A Notifications list contains notifA:", parentANotifIds.includes(notifA._id.toString()));
  console.log("Parent A Notifications list EXCLUDES notifB:", !parentANotifIds.includes(notifB._id.toString()));

  if (!parentANotifIds.includes(notifA._id.toString()) || parentANotifIds.includes(notifB._id.toString())) {
    throw new Error("FAIL: Parent A received notifications belonging to another user!");
  }

  // Unread Count
  const countReq = makeRequest("http://localhost:3000/api/parent/notifications/unread-count", "GET", parentToken);
  const countRes = await getUnreadCount(countReq);
  const countData = await countRes.json();
  console.log("Parent A Unread Count:", countData.data?.count);
  if (countData.data?.count < 1) {
    throw new Error("FAIL: Unread count should be at least 1!");
  }

  // Mark single as read
  const patchReq = makeRequest(
    `http://localhost:3000/api/parent/notifications/${notifA._id}`,
    "PATCH",
    parentToken
  );
  const patchRes = await patchNotification(patchReq, {
    params: Promise.resolve({ notificationId: notifA._id.toString() }),
  });
  console.log("PATCH /api/parent/notifications/[id] Status:", patchRes.status);
  if (patchRes.status !== 200) {
    throw new Error("FAIL: Marking single notification as read failed!");
  }

  // Delete notification
  const delReq = makeRequest(
    `http://localhost:3000/api/parent/notifications/${notifA._id}`,
    "DELETE",
    parentToken
  );
  const delRes = await deleteNotification(delReq, {
    params: Promise.resolve({ notificationId: notifA._id.toString() }),
  });
  console.log("DELETE /api/parent/notifications/[id] Status:", delRes.status);
  if (delRes.status !== 200) {
    throw new Error("FAIL: Deleting notification failed!");
  }

  // Clean up dummy test data
  await Promise.all([
    Notice.deleteMany({ _id: { $in: [schoolNotice._id, parentNotice._id, classNotice._id, otherNotice._id] } }),
    LeaveRequest.deleteOne({ _id: createdLeaveId }),
    Notification.deleteMany({ _id: { $in: [notifA._id, notifB._id] } }),
    User.deleteMany({ _id: { $in: [parentUser._id, parentBUser._id, studentUser._id] } }),
    StudentParent.deleteOne({ _id: studentParentLink._id }),
    Parent.deleteOne({ _id: parentDoc._id }),
    Student.deleteOne({ _id: testStudent._id }),
    Class.deleteOne({ _id: class1._id }),
    Section.deleteOne({ _id: section1._id }),
    AcademicYear.deleteOne({ _id: ay1._id }),
    School.deleteOne({ _id: school1._id }),
  ]);

  console.log("\n============================================================");
  console.log("ALL PHASE P7 INTEGRATION & SECURITY TESTS PASSED SUCCESSFULLY!");
  console.log("============================================================");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
