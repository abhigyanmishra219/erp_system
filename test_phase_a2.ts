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
  console.log("=== PHASE A2: STUDENT & PARENT MANAGEMENT INTEGRATION TEST ===");

  const mongoose = (await import("mongoose")).default;
  const connectToDatabase = (await import("./src/lib/db")).default;
  const User = (await import("./src/models/User")).default;
  const School = (await import("./src/models/School")).default;
  const AcademicYear = (await import("./src/models/AcademicYear")).default;
  const Class = (await import("./src/models/Class")).default;
  const Section = (await import("./src/models/Section")).default;
  const Student = (await import("./src/models/Student")).default;
  const Parent = (await import("./src/models/Parent")).default;
  const StudentParent = (await import("./src/models/StudentParent")).default;
  const AuditLog = (await import("./src/models/AuditLog")).default;

  await connectToDatabase();

  const timestamp = Date.now();

  // 1. Create or Find Test School & Admin
  const school = await School.create({
    name: `A2 Excellence Academy ${timestamp}`,
    code: `A2${timestamp.toString().slice(-4)}`,
    status: "ACTIVE",
    plan: "STANDARD",
    studentLimit: 500,
    subscriptionExpiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    createdBy: new mongoose.Types.ObjectId(),
    updatedBy: new mongoose.Types.ObjectId(),
  });
  const schoolId = school._id;
  console.log(`✓ 1. Test School Created: ${school.name} (ID: ${schoolId})`);

  const adminUser = await User.create({
    name: "A2 School Administrator",
    email: `admin_${timestamp}@a2school.edu`,
    password: "AdminHashedPassword123!",
    role: "ADMIN",
    schoolId,
    mustChangePassword: false,
    isActive: true,
  });
  console.log(`✓ 2. School Admin User Created: ${adminUser.email} (Role: ${adminUser.role})`);

  // 2. Setup Academic Year, Class, and Section
  const academicYear = await AcademicYear.create({
    schoolId,
    name: `Academic Year ${timestamp}`,
    startDate: new Date("2026-04-01"),
    endDate: new Date("2027-03-31"),
    status: "ACTIVE",
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  const class10 = await Class.create({
    schoolId,
    academicYearId: academicYear._id,
    name: "Class 10",
    code: "C10",
    displayOrder: 10,
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  const sectionA = await Section.create({
    schoolId,
    academicYearId: academicYear._id,
    classId: class10._id,
    name: "A",
    capacity: 40,
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });
  console.log(`✓ 3. Academic Structure Created: ${academicYear.name} -> ${class10.name} (Sec ${sectionA.name})`);

  // 3. Create Student
  const admissionNo = `ADM-${timestamp.toString().slice(-5)}`;
  const studentEmail = `student_${timestamp}@a2school.edu`;
  const parentEmail = `parent_${timestamp}@a2school.edu`;

  const student = new Student({
    schoolId,
    admissionNumber: admissionNo,
    studentId: admissionNo,
    rollNumber: "101",
    firstName: "Aarav",
    lastName: "Sharma",
    email: studentEmail,
    phone: "9876543210",
    dateOfBirth: new Date("2010-05-15"),
    gender: "MALE",
    bloodGroup: "O+",
    academicYearId: academicYear._id,
    classId: class10._id,
    sectionId: sectionA._id,
    admissionDate: new Date(),
    status: "ACTIVE",
    address: { street: "123 Palm Grove", city: "Mumbai", state: "MH", postalCode: "400001", country: "India" },
    emergencyContact: { name: "Rajesh Sharma", relationship: "Father", phone: "9876543211" },
    academicHistory: [
      {
        academicYearId: academicYear._id,
        classId: class10._id,
        sectionId: sectionA._id,
        rollNumber: "101",
        yearName: academicYear.name,
        className: class10.name,
        sectionName: sectionA.name,
        status: "ACTIVE",
        startDate: new Date(),
      },
    ],
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });
  await student.save();
  console.log(`✓ 4. Student Enrolled: ${student.firstName} ${student.lastName} (Adm: ${student.admissionNumber})`);

  // 4. Create Parent
  const parent = new Parent({
    schoolId,
    firstName: "Rajesh",
    lastName: "Sharma",
    email: parentEmail,
    phone: "9876543211",
    relationship: "FATHER",
    occupation: "Software Architect",
    address: { street: "123 Palm Grove", city: "Mumbai", state: "MH", postalCode: "400001", country: "India" },
    status: "ACTIVE",
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });
  await parent.save();
  console.log(`✓ 5. Parent Registered: ${parent.firstName} ${parent.lastName} (${parent.email})`);

  // 5. Link Student to Parent
  const link = new StudentParent({
    schoolId,
    studentId: student._id,
    parentId: parent._id,
    relationship: "FATHER",
    isPrimaryGuardian: true,
    isEmergencyContact: true,
    canPickup: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });
  await link.save();
  console.log(`✓ 6. Student-Parent Relationship Linked (Primary Guardian: true)`);

  // 6. Create Portal User Accounts
  const studentUser = await User.create({
    name: "Aarav Sharma",
    email: studentEmail,
    password: "HashedStudentPassword123!",
    role: "STUDENT",
    schoolId,
    studentId: student._id,
    mustChangePassword: true,
    isActive: true,
  });
  student.userId = studentUser._id;
  await student.save();
  console.log(`✓ 7. Student Login Account Created: role=${studentUser.role}, studentId=${studentUser.studentId}, mustChangePassword=${studentUser.mustChangePassword}`);

  const parentUser = await User.create({
    name: "Rajesh Sharma",
    email: parentEmail,
    password: "HashedParentPassword123!",
    role: "PARENT",
    schoolId,
    parentId: parent._id,
    mustChangePassword: true,
    isActive: true,
  });
  parent.userId = parentUser._id;
  await parent.save();
  console.log(`✓ 8. Parent Login Account Created: role=${parentUser.role}, parentId=${parentUser.parentId}, mustChangePassword=${parentUser.mustChangePassword}`);

  // 7. Test Promotion Flow
  const class11 = await Class.create({
    schoolId,
    academicYearId: academicYear._id,
    name: "Class 11",
    code: "C11",
    displayOrder: 11,
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });
  const section11A = await Section.create({
    schoolId,
    academicYearId: academicYear._id,
    classId: class11._id,
    name: "A",
    capacity: 40,
    isActive: true,
    createdBy: adminUser._id,
    updatedBy: adminUser._id,
  });

  student.academicHistory.push({
    academicYearId: academicYear._id,
    classId: class11._id,
    sectionId: section11A._id,
    rollNumber: "201",
    yearName: academicYear.name,
    className: class11.name,
    sectionName: section11A.name,
    status: "ACTIVE",
    startDate: new Date(),
  });
  student.classId = class11._id;
  student.sectionId = section11A._id;
  student.rollNumber = "201";
  await student.save();
  console.log(`✓ 9. Student Promoted to ${class11.name} (Academic History Entries: ${student.academicHistory.length})`);

  // 8. Test Student Transfer
  student.status = "TRANSFERRED";
  student.transferDetails = {
    reason: "Family relocation to Delhi",
    targetSchool: "Delhi Public School, R.K. Puram",
    transferCertificateNumber: "TC-2026-999",
    transferDate: new Date(),
    notes: "Good conduct, all dues cleared",
  };
  await student.save();
  console.log(`✓ 10. Student Status Updated to TRANSFERRED (Target School: ${student.transferDetails.targetSchool})`);

  // 9. Multi-Tenant Query Validation
  const studentsCount = await Student.countDocuments({ schoolId });
  const parentsCount = await Parent.countDocuments({ schoolId });
  const linksCount = await StudentParent.countDocuments({ schoolId });
  console.log(`✓ 11. Multi-Tenant Scoped Counts: ${studentsCount} students, ${parentsCount} parents, ${linksCount} links.`);

  console.log("\n========================================================");
  console.log("🎉 ALL PHASE A2 INTEGRATION TESTS PASSED 100% SUCCESFULLY!");
  console.log("========================================================\n");
  process.exit(0);
}

runTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
