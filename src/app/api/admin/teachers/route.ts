import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Teacher from "@/models/Teacher";
import TeacherAssignment from "@/models/TeacherAssignment";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import { createTeacherSchema } from "@/lib/validation/teacher";
import { normalizeEmail } from "@/lib/utils/email";
import { generateTemporaryPassword } from "@/lib/tempPassword";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "10", 10)));
    const search = (url.searchParams.get("search") || "").trim();
    const status = url.searchParams.get("status") || "ALL";
    const department = url.searchParams.get("department") || "ALL";
    const qualification = (url.searchParams.get("qualification") || "").trim();
    const academicYearId = url.searchParams.get("academicYearId") || "";
    const classId = url.searchParams.get("classId") || "";
    const sectionId = url.searchParams.get("sectionId") || "";
    const subjectId = url.searchParams.get("subjectId") || "";
    const sortBy = url.searchParams.get("sortBy") || "createdAt";
    const sortOrder = url.searchParams.get("sortOrder") === "asc" ? 1 : -1;

    await connectToDatabase();

    // Base filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { schoolId };

    if (status !== "ALL") {
      filter.status = status;
    }

    if (department !== "ALL") {
      filter.department = department;
    }

    if (qualification) {
      filter.qualification = { $regex: new RegExp(qualification.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") };
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { firstName: searchRegex },
        { lastName: searchRegex },
        { teacherId: searchRegex },
        { employeeId: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { department: searchRegex },
        { designation: searchRegex },
      ];
    }

    // Filter by academic assignment if specified
    if (academicYearId || classId || sectionId || subjectId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const assignFilter: Record<string, any> = { schoolId, isActive: true };
      if (academicYearId) assignFilter.academicYearId = academicYearId;
      if (classId) assignFilter.classId = classId;
      if (sectionId) assignFilter.sectionId = sectionId;
      if (subjectId) assignFilter.subjectId = subjectId;

      const matchingAssignments = await TeacherAssignment.find(assignFilter).select("teacherId").lean();
      const teacherIds = matchingAssignments.map((a) => a.teacherId);
      filter._id = { $in: teacherIds };
    }

    const skip = (page - 1) * limit;

    const [total, teachers] = await Promise.all([
      Teacher.countDocuments(filter),
      Teacher.find(filter)
        .populate("userId", "email isActive mustChangePassword createdAt")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    // Aggregate active assignment counts for each teacher
    const teacherObjectIds = teachers.map((t) => t._id);
    const assignmentCounts = await TeacherAssignment.aggregate([
      {
        $match: {
          schoolId: new mongoose.Types.ObjectId(schoolId),
          teacherId: { $in: teacherObjectIds },
          isActive: true,
        },
      },
      {
        $group: {
          _id: "$teacherId",
          totalAssignments: { $sum: 1 },
          classTeacherCount: {
            $sum: { $cond: [{ $eq: ["$isClassTeacher", true] }, 1, 0] },
          },
        },
      },
    ]);

    const countMap = new Map(
      assignmentCounts.map((ac) => [
        ac._id.toString(),
        { total: ac.totalAssignments, classTeacher: ac.classTeacherCount },
      ])
    );

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      data: {
        teachers: teachers.map((t) => {
          const counts = countMap.get(t._id.toString()) || { total: 0, classTeacher: 0 };
          return {
            id: t._id.toString(),
            teacherId: t.teacherId,
            employeeId: t.employeeId || "",
            firstName: t.firstName,
            middleName: t.middleName || "",
            lastName: t.lastName,
            fullName: [t.firstName, t.middleName, t.lastName].filter(Boolean).join(" "),
            photo: t.photo || "",
            gender: t.gender,
            dateOfBirth: t.dateOfBirth,
            email: t.email || "",
            phone: t.phone || "",
            department: t.department || "",
            designation: t.designation || "",
            qualification: t.qualification || "",
            joiningDate: t.joiningDate,
            status: t.status,
            hasLoginAccount: !!t.userId,
            user: t.userId,
            assignmentsCount: counts.total,
            isClassTeacher: counts.classTeacher > 0,
            createdAt: t.createdAt,
          };
        }),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/teachers error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to fetch teachers" },
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
    const validatedData = createTeacherSchema.parse(body);

    await connectToDatabase();

    // 1. Check duplicate teacherId within school
    const existingTeacherId = await Teacher.findOne({
      schoolId,
      teacherId: {
        $regex: new RegExp(`^${validatedData.teacherId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      },
    });

    if (existingTeacherId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_TEACHER_ID",
            message: `Teacher ID '${validatedData.teacherId}' already exists in your school.`,
          },
        },
        { status: 409 }
      );
    }

    // 2. Check duplicate employeeId within school if provided
    if (validatedData.employeeId) {
      const existingEmployeeId = await Teacher.findOne({
        schoolId,
        employeeId: {
          $regex: new RegExp(`^${validatedData.employeeId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        },
      });

      if (existingEmployeeId) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_EMPLOYEE_ID",
              message: `Employee ID '${validatedData.employeeId}' already exists in your school.`,
            },
          },
          { status: 409 }
        );
      }
    }

    // 3. Check duplicate email within school if provided
    const normalizedTeacherEmail = normalizeEmail(validatedData.email);
    if (normalizedTeacherEmail) {
      const existingEmail = await Teacher.findOne({
        schoolId,
        email: normalizedTeacherEmail,
      });

      if (existingEmail) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_EMAIL",
              message: "A teacher with this email address already exists in your school.",
            },
          },
          { status: 409 }
        );
      }
    }

    // 4. Create Teacher document
    const newTeacher = new Teacher({
      schoolId,
      teacherId: validatedData.teacherId,
      employeeId: validatedData.employeeId || "",
      firstName: validatedData.firstName,
      middleName: validatedData.middleName || "",
      lastName: validatedData.lastName,
      photo: validatedData.photo || "",
      dateOfBirth: validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : undefined,
      gender: validatedData.gender,
      phone: validatedData.phone || "",
      email: normalizedTeacherEmail,
      alternatePhone: validatedData.alternatePhone || "",
      address: validatedData.address,
      qualification: validatedData.qualification || "",
      department: validatedData.department || "",
      designation: validatedData.designation || "Teacher",
      joiningDate: validatedData.joiningDate ? new Date(validatedData.joiningDate) : new Date(),
      status: validatedData.status || "ACTIVE",
      createdBy: user.id,
      updatedBy: user.id,
    });

    await newTeacher.save();

    let teacherCredentials = null;

    // 5. Optional: Create Teacher Login Account
    const loginEmail = normalizeEmail(validatedData.loginEmail || validatedData.email);
    if (validatedData.createLoginAccount && loginEmail) {
      const existingUser = await User.findOne({ email: loginEmail });
      if (existingUser) {
        if (
          existingUser.role !== "TEACHER" ||
          (existingUser.teacherId && existingUser.teacherId.toString() !== newTeacher._id.toString())
        ) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "USER_EMAIL_EXISTS",
                message: `The email '${loginEmail}' is already associated with another portal account.`,
              },
            },
            { status: 409 }
          );
        }

        if (!existingUser.teacherId) {
          existingUser.teacherId = newTeacher._id;
          await existingUser.save();
          newTeacher.userId = existingUser._id;
          await newTeacher.save();
        }
      } else {
        const rawPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(rawPassword, 10);

        const teacherUser = new User({
          name: `${validatedData.firstName} ${validatedData.lastName}`.trim(),
          email: loginEmail,
          password: hashedPassword,
          role: "TEACHER",
          schoolId,
          teacherId: newTeacher._id,
          mustChangePassword: true,
          isActive: newTeacher.status === "ACTIVE",
        });

        await teacherUser.save();
        newTeacher.userId = teacherUser._id;
        await newTeacher.save();

        teacherCredentials = {
          email: teacherUser.email,
          temporaryPassword: rawPassword,
          role: "TEACHER",
          name: teacherUser.name,
        };

        await AuditLog.create({
          userId: user.id,
          userRole: user.role,
          action: "TEACHER_ACCOUNT_CREATED",
          entityType: "USER",
          entityId: teacherUser._id.toString(),
          schoolId,
          metadata: {
            teacherId: newTeacher._id.toString(),
            userId: teacherUser._id.toString(),
            email: teacherUser.email,
          },
        });
      }
    }

    // 6. Audit Log
    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "TEACHER_CREATED",
      entityType: "TEACHER",
      entityId: newTeacher._id.toString(),
      schoolId,
      metadata: {
        teacherId: newTeacher._id.toString(),
        customTeacherId: newTeacher.teacherId,
        employeeId: newTeacher.employeeId,
        name: `${newTeacher.firstName} ${newTeacher.lastName}`,
        department: newTeacher.department,
        designation: newTeacher.designation,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          teacher: {
            id: newTeacher._id.toString(),
            teacherId: newTeacher.teacherId,
            employeeId: newTeacher.employeeId,
            firstName: newTeacher.firstName,
            lastName: newTeacher.lastName,
            status: newTeacher.status,
          },
          credentials: teacherCredentials,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/admin/teachers error:", err);

    if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
      const mongoErr = err as { keyPattern?: Record<string, number>; message?: string };
      if (mongoErr.keyPattern?.email || mongoErr.message?.includes("email")) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_EMAIL",
              message: "Email address is already used by another teacher in this school.",
            },
          },
          { status: 409 }
        );
      }
      if (mongoErr.keyPattern?.teacherId || mongoErr.message?.includes("teacherId")) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_TEACHER_ID",
              message: "Teacher ID already exists in your school.",
            },
          },
          { status: 409 }
        );
      }
      if (mongoErr.keyPattern?.employeeId || mongoErr.message?.includes("employeeId")) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_EMPLOYEE_ID",
              message: "Employee ID already exists in your school.",
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
        error: { code: "SERVER_ERROR", message: "Failed to create teacher" },
      },
      { status: 500 }
    );
  }
}
