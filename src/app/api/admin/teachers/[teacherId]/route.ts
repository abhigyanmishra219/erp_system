import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Teacher from "@/models/Teacher";
import TeacherAssignment from "@/models/TeacherAssignment";
import AuditLog from "@/models/AuditLog";
import { updateTeacherSchema } from "@/lib/validation/teacher";
import { normalizeEmail } from "@/lib/utils/email";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { teacherId } = await params;

  try {
    await connectToDatabase();

    const teacher = await Teacher.findOne({ _id: teacherId, schoolId })
      .populate("userId", "email isActive mustChangePassword createdAt")
      .lean();

    if (!teacher) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Teacher not found" },
        },
        { status: 404 }
      );
    }

    // Fetch active and historical academic assignments
    const assignments = await TeacherAssignment.find({
      schoolId,
      teacherId: teacher._id,
    })
      .populate("academicYearId", "name status startDate endDate")
      .populate("classId", "name code")
      .populate("sectionId", "name capacity")
      .populate("subjectId", "name code subjectType")
      .sort({ isActive: -1, createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        teacher: {
          id: teacher._id.toString(),
          teacherId: teacher.teacherId,
          employeeId: teacher.employeeId || "",
          firstName: teacher.firstName,
          middleName: teacher.middleName || "",
          lastName: teacher.lastName,
          fullName: [teacher.firstName, teacher.middleName, teacher.lastName].filter(Boolean).join(" "),
          photo: teacher.photo || "",
          dateOfBirth: teacher.dateOfBirth,
          gender: teacher.gender,
          phone: teacher.phone || "",
          email: teacher.email || "",
          alternatePhone: teacher.alternatePhone || "",
          address: teacher.address,
          qualification: teacher.qualification || "",
          department: teacher.department || "",
          designation: teacher.designation || "",
          joiningDate: teacher.joiningDate,
          status: teacher.status,
          user: teacher.userId,
          hasLoginAccount: !!teacher.userId,
          createdAt: teacher.createdAt,
          updatedAt: teacher.updatedAt,
        },
        assignments: assignments.map((a) => ({
          id: a._id.toString(),
          academicYear: a.academicYearId,
          class: a.classId,
          section: a.sectionId,
          subject: a.subjectId,
          assignmentType: a.assignmentType,
          isClassTeacher: a.isClassTeacher,
          isActive: a.isActive,
          createdAt: a.createdAt,
        })),
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/teachers/[teacherId] error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to fetch teacher profile" },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { teacherId } = await params;

  try {
    const body = await req.json();
    const validatedData = updateTeacherSchema.parse(body);

    await connectToDatabase();

    const teacher = await Teacher.findOne({ _id: teacherId, schoolId });

    if (!teacher) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Teacher not found" },
        },
        { status: 404 }
      );
    }

    // Check teacherId uniqueness if changed
    if (validatedData.teacherId && validatedData.teacherId !== teacher.teacherId) {
      const conflict = await Teacher.findOne({
        schoolId,
        _id: { $ne: teacher._id },
        teacherId: {
          $regex: new RegExp(`^${validatedData.teacherId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        },
      });
      if (conflict) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_TEACHER_ID",
              message: `Teacher ID '${validatedData.teacherId}' is already in use.`,
            },
          },
          { status: 409 }
        );
      }
      teacher.teacherId = validatedData.teacherId;
    }

    // Check employeeId uniqueness if changed
    if (validatedData.employeeId !== undefined && validatedData.employeeId !== teacher.employeeId) {
      if (validatedData.employeeId) {
        const conflict = await Teacher.findOne({
          schoolId,
          _id: { $ne: teacher._id },
          employeeId: {
            $regex: new RegExp(`^${validatedData.employeeId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
          },
        });
        if (conflict) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "DUPLICATE_EMPLOYEE_ID",
                message: `Employee ID '${validatedData.employeeId}' is already in use.`,
              },
            },
            { status: 409 }
          );
        }
      }
      teacher.employeeId = validatedData.employeeId;
    }

    // Check email uniqueness if changed
    if (validatedData.email !== undefined) {
      const normalizedNewEmail = normalizeEmail(validatedData.email);
      if (normalizedNewEmail !== teacher.email) {
        if (normalizedNewEmail) {
          const conflict = await Teacher.findOne({
            schoolId,
            _id: { $ne: teacher._id },
            email: normalizedNewEmail,
          });
          if (conflict) {
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
        }
        teacher.email = normalizedNewEmail;
      }
    }

    // Update standard fields
    if (validatedData.firstName !== undefined) teacher.firstName = validatedData.firstName;
    if (validatedData.middleName !== undefined) teacher.middleName = validatedData.middleName;
    if (validatedData.lastName !== undefined) teacher.lastName = validatedData.lastName;
    if (validatedData.photo !== undefined) teacher.photo = validatedData.photo;
    if (validatedData.dateOfBirth !== undefined) {
      teacher.dateOfBirth = validatedData.dateOfBirth ? new Date(validatedData.dateOfBirth) : undefined;
    }
    if (validatedData.gender !== undefined) teacher.gender = validatedData.gender;
    if (validatedData.phone !== undefined) teacher.phone = validatedData.phone;
    if (validatedData.alternatePhone !== undefined) teacher.alternatePhone = validatedData.alternatePhone;
    if (validatedData.qualification !== undefined) teacher.qualification = validatedData.qualification;
    if (validatedData.department !== undefined) teacher.department = validatedData.department;
    if (validatedData.designation !== undefined) teacher.designation = validatedData.designation;
    if (validatedData.joiningDate !== undefined) {
      teacher.joiningDate = validatedData.joiningDate ? new Date(validatedData.joiningDate) : undefined;
    }
    if (validatedData.status !== undefined) teacher.status = validatedData.status;

    if (validatedData.address) {
      teacher.address = { ...teacher.address, ...validatedData.address };
    }

    teacher.updatedBy = user.id;
    await teacher.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "TEACHER_UPDATED",
      entityType: "TEACHER",
      entityId: teacher._id.toString(),
      schoolId,
      metadata: {
        teacherId: teacher._id.toString(),
        customTeacherId: teacher.teacherId,
        name: `${teacher.firstName} ${teacher.lastName}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        teacher: {
          id: teacher._id.toString(),
          teacherId: teacher.teacherId,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          status: teacher.status,
        },
      },
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/teachers/[teacherId] error:", err);

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
        error: { code: "SERVER_ERROR", message: "Failed to update teacher" },
      },
      { status: 500 }
    );
  }
}
