import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Student from "@/models/Student";
import Parent from "@/models/Parent";
import StudentParent from "@/models/StudentParent";
import User from "@/models/User";
import AcademicYear from "@/models/AcademicYear";
import Class from "@/models/Class";
import Section from "@/models/Section";
import AuditLog from "@/models/AuditLog";
import { createStudentSchema } from "@/lib/validation/studentParent";
import { generateTemporaryPassword } from "@/lib/tempPassword";
import { normalizeEmail } from "@/lib/utils/email";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "10", 10)));
    const search = (url.searchParams.get("search") || "").trim();
    const academicYearId = url.searchParams.get("academicYearId") || "";
    const classId = url.searchParams.get("classId") || "";
    const sectionId = url.searchParams.get("sectionId") || "";
    const status = url.searchParams.get("status") || "ALL";
    const gender = url.searchParams.get("gender") || "ALL";
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") === "asc" ? 1 : -1;

    await connectToDatabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { schoolId };

    if (status !== "ALL") {
      filter.status = status;
    }

    if (gender !== "ALL") {
      filter.gender = gender;
    }

    if (academicYearId) {
      filter.academicYearId = academicYearId;
    }

    if (classId) {
      filter.classId = classId;
    }

    if (sectionId) {
      filter.sectionId = sectionId;
    }

    if (search) {
      const searchRegex = new RegExp(
        search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { admissionNumber: searchRegex },
        { rollNumber: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { studentId: searchRegex },
      ];
    }

    const skip = (page - 1) * limit;

    const [total, students] = await Promise.all([
      Student.countDocuments(filter),
      Student.find(filter)
        .populate("academicYearId", "name status")
        .populate("classId", "name code")
        .populate("sectionId", "name")
        .populate("userId", "email isActive")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      data: {
        students: students.map((s) => ({
          id: s._id.toString(),
          admissionNumber: s.admissionNumber,
          studentId: s.studentId,
          rollNumber: s.rollNumber,
          firstName: s.firstName,
          lastName: s.lastName,
          fullName: `${s.firstName} ${s.lastName}`.trim(),
          email: s.email,
          phone: s.phone,
          dateOfBirth: s.dateOfBirth,
          gender: s.gender,
          bloodGroup: s.bloodGroup,
          avatarUrl: s.avatarUrl,
          academicYear: s.academicYearId,
          class: s.classId,
          section: s.sectionId,
          status: s.status,
          hasLoginAccount: !!s.userId,
          user: s.userId,
          admissionDate: s.admissionDate,
          createdAt: s.createdAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/students error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to fetch students" },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;

  try {
    const body = await req.json();
    const validatedData = createStudentSchema.parse(body);

    await connectToDatabase();

    // 0. Enforce Subscription Student Capacity Limit
    const targetStatus = validatedData.status || "ACTIVE";
    if (targetStatus === "ACTIVE") {
      const { checkStudentCapacity } = await import("@/lib/subscription-guard");
      const capacityCheck = await checkStudentCapacity(schoolId, 1);
      if (!capacityCheck.allowed && capacityCheck.errorResponse) {
        return capacityCheck.errorResponse;
      }
    }

    // 1. Check duplicate admission number within same school
    const existingAdmission = await Student.findOne({
      schoolId,
      admissionNumber: {
        $regex: new RegExp(`^${validatedData.admissionNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      },
    });

    if (existingAdmission) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_ADMISSION_NUMBER",
            message: `Student with admission number '${validatedData.admissionNumber}' already exists in your school.`,
          },
        },
        { status: 409 }
      );
    }

    // 2. Check duplicate email within same school if provided
    const normalizedStudentEmail = normalizeEmail(validatedData.email);
    if (normalizedStudentEmail) {
      const existingEmail = await Student.findOne({
        schoolId,
        email: normalizedStudentEmail,
      });

      if (existingEmail) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_EMAIL",
              message: "A student with this email address already exists in your school.",
            },
          },
          { status: 409 }
        );
      }
    }

    // 3. Validate Academic Year, Class, and Section belong to school
    const [academicYear, classDoc, sectionDoc] = await Promise.all([
      AcademicYear.findOne({ _id: validatedData.academicYearId, schoolId }),
      Class.findOne({ _id: validatedData.classId, schoolId }),
      Section.findOne({ _id: validatedData.sectionId, schoolId, classId: validatedData.classId }),
    ]);

    if (!academicYear) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_ACADEMIC_YEAR", message: "Selected Academic Year is invalid or does not belong to your school." },
        },
        { status: 400 }
      );
    }

    if (!classDoc) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_CLASS", message: "Selected Class is invalid or does not belong to your school." },
        },
        { status: 400 }
      );
    }

    if (!sectionDoc) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_SECTION", message: "Selected Section is invalid or does not belong to the chosen class." },
        },
        { status: 400 }
      );
    }

    // 4. Create Student record
    const initialHistory = [
      {
        academicYearId: academicYear._id,
        classId: classDoc._id,
        sectionId: sectionDoc._id,
        rollNumber: validatedData.rollNumber || "",
        yearName: academicYear.name,
        className: classDoc.name,
        sectionName: sectionDoc.name,
        status: validatedData.status || "ACTIVE",
        startDate: validatedData.admissionDate ? new Date(validatedData.admissionDate) : new Date(),
      },
    ];

    const newStudent = new Student({
      schoolId,
      admissionNumber: validatedData.admissionNumber,
      studentId: validatedData.studentId || validatedData.admissionNumber,
      rollNumber: validatedData.rollNumber || "",
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: normalizedStudentEmail,
      phone: validatedData.phone || "",
      dateOfBirth: new Date(validatedData.dateOfBirth),
      gender: validatedData.gender,
      bloodGroup: validatedData.bloodGroup || "",
      avatarUrl: validatedData.avatarUrl || "",
      academicYearId: academicYear._id,
      classId: classDoc._id,
      sectionId: sectionDoc._id,
      admissionDate: validatedData.admissionDate ? new Date(validatedData.admissionDate) : new Date(),
      status: validatedData.status || "ACTIVE",
      address: validatedData.address,
      emergencyContact: validatedData.emergencyContact,
      medicalInfo: validatedData.medicalInfo,
      academicHistory: initialHistory,
      createdBy: user.id,
      updatedBy: user.id,
    });

    await newStudent.save();

    let studentCredentials = null;
    let parentCredentials = null;

    // 5. Optional: Create Student Login Account
    const studentLoginEmail = normalizeEmail(validatedData.loginEmail || validatedData.email);
    if (validatedData.createLoginAccount && studentLoginEmail) {
      const existingUser = await User.findOne({ email: studentLoginEmail });
      if (existingUser) {
        if (existingUser.role !== "STUDENT" || (existingUser.studentId && existingUser.studentId.toString() !== newStudent._id.toString())) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "USER_EMAIL_EXISTS",
                message: `The login email '${studentLoginEmail}' is already associated with another user account.`,
              },
            },
            { status: 409 }
          );
        }
        if (!existingUser.studentId) {
          existingUser.studentId = newStudent._id;
          await existingUser.save();
          newStudent.userId = existingUser._id;
          await newStudent.save();
        }
      } else {
        const rawPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const studentUser = new User({
          name: `${validatedData.firstName} ${validatedData.lastName}`.trim(),
          email: studentLoginEmail,
          password: hashedPassword,
          role: "STUDENT",
          schoolId,
          studentId: newStudent._id,
          mustChangePassword: true,
          isActive: true,
        });

        await studentUser.save();
        newStudent.userId = studentUser._id;
        await newStudent.save();

        studentCredentials = {
          email: studentUser.email,
          temporaryPassword: rawPassword,
          role: "STUDENT",
          name: studentUser.name,
        };

        await AuditLog.create({
          userId: user.id,
          userRole: user.role,
          action: "STUDENT_ACCOUNT_CREATED",
          entityType: "USER",
          entityId: studentUser._id.toString(),
          schoolId,
          metadata: {
            studentId: newStudent._id.toString(),
            userId: studentUser._id.toString(),
            email: studentUser.email,
          },
        });
      }
    }

    // 5. Optional: Parent Creation and Linking
    let parentDoc = null;
    if (validatedData.parent && validatedData.parent.firstName && validatedData.parent.email) {
      const parentData = validatedData.parent;
      const normalizedParentEmail = parentData.email.toLowerCase().trim();

      parentDoc = await Parent.findOne({
        schoolId,
        email: normalizedParentEmail,
      });

      if (!parentDoc) {
        parentDoc = new Parent({
          schoolId,
          firstName: parentData.firstName,
          lastName: parentData.lastName,
          email: normalizedParentEmail,
          phone: parentData.phone,
          relationship: parentData.relationship || "FATHER",
          occupation: parentData.occupation || "",
          status: "ACTIVE",
          createdBy: user.id,
          updatedBy: user.id,
        });
        await parentDoc.save();

        await AuditLog.create({
          userId: user.id,
          userRole: user.role,
          action: "PARENT_CREATED",
          entityType: "PARENT",
          entityId: parentDoc._id.toString(),
          schoolId,
          metadata: {
            parentId: parentDoc._id.toString(),
            email: parentDoc.email,
            name: `${parentDoc.firstName} ${parentDoc.lastName}`,
          },
        });
      }

      // Link Student to Parent
      const studentParentLink = new StudentParent({
        schoolId,
        studentId: newStudent._id,
        parentId: parentDoc._id,
        relationship: parentData.relationship || "GUARDIAN",
        isPrimaryGuardian: parentData.isPrimaryGuardian ?? true,
        isEmergencyContact: parentData.isEmergencyContact ?? true,
        canPickup: true,
        createdBy: user.id,
        updatedBy: user.id,
      });
      await studentParentLink.save();

      await AuditLog.create({
        userId: user.id,
        userRole: user.role,
        action: "STUDENT_PARENT_LINKED",
        entityType: "STUDENT",
        entityId: newStudent._id.toString(),
        schoolId,
        metadata: {
          studentId: newStudent._id.toString(),
          parentId: parentDoc._id.toString(),
          relationship: parentData.relationship,
          isPrimaryGuardian: parentData.isPrimaryGuardian,
        },
      });

      // Optional: Parent login account
      if (parentData.createLoginAccount && normalizedParentEmail) {
        const existingParentUser = await User.findOne({ email: normalizedParentEmail });
        if (!existingParentUser) {
          const rawPassword = generateTemporaryPassword();
          const hashedPassword = await bcrypt.hash(rawPassword, 10);

          const parentUser = new User({
            name: `${parentData.firstName} ${parentData.lastName}`.trim(),
            email: normalizedParentEmail,
            password: hashedPassword,
            role: "PARENT",
            schoolId,
            parentId: parentDoc._id,
            mustChangePassword: true,
            isActive: true,
          });

          await parentUser.save();
          parentDoc.userId = parentUser._id;
          await parentDoc.save();

          parentCredentials = {
            email: parentUser.email,
            temporaryPassword: rawPassword,
            role: "PARENT",
            name: parentUser.name,
          };

          await AuditLog.create({
            userId: user.id,
            userRole: user.role,
            action: "PARENT_ACCOUNT_CREATED",
            entityType: "USER",
            entityId: parentUser._id.toString(),
            schoolId,
            metadata: {
              parentId: parentDoc._id.toString(),
              userId: parentUser._id.toString(),
              email: parentUser.email,
            },
          });
        }
      }
    }

    // Audit Log for Student Creation
    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "STUDENT_CREATED",
      entityType: "STUDENT",
      entityId: newStudent._id.toString(),
      schoolId,
      metadata: {
        studentId: newStudent._id.toString(),
        admissionNumber: newStudent.admissionNumber,
        name: `${newStudent.firstName} ${newStudent.lastName}`,
        classId: classDoc._id.toString(),
        className: classDoc.name,
        sectionId: sectionDoc._id.toString(),
        sectionName: sectionDoc.name,
        academicYearId: academicYear._id.toString(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          student: {
            id: newStudent._id.toString(),
            admissionNumber: newStudent.admissionNumber,
            studentId: newStudent.studentId,
            firstName: newStudent.firstName,
            lastName: newStudent.lastName,
            status: newStudent.status,
          },
          credentials: {
            student: studentCredentials,
            parent: parentCredentials,
          },
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/admin/students error:", err);

    if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
      const mongoErr = err as { keyPattern?: Record<string, number>; message?: string };
      if (mongoErr.keyPattern?.email || mongoErr.message?.includes("email")) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_EMAIL",
              message: "Email address is already used by another student in this school.",
            },
          },
          { status: 409 }
        );
      }
      if (mongoErr.keyPattern?.admissionNumber || mongoErr.message?.includes("admissionNumber")) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_ADMISSION_NUMBER",
              message: "Student with this admission number already exists in your school.",
            },
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_ENTRY",
            message: "A duplicate record exists in your school.",
          },
        },
        { status: 409 }
      );
    }

    if (err && typeof err === "object" && "issues" in err) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: (err as { issues: unknown[] }).issues,
          },
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to create student" },
      },
      { status: 500 }
    );
  }
}
