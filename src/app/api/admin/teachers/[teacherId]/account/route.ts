import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Teacher from "@/models/Teacher";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import { createTeacherAccountSchema } from "@/lib/validation/teacher";
import { generateTemporaryPassword } from "@/lib/tempPassword";
import { normalizeEmail } from "@/lib/utils/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { teacherId } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const validatedData = createTeacherAccountSchema.parse(body);

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

    const email = normalizeEmail(validatedData.email || teacher.email);

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMAIL_REQUIRED",
            message: "Teacher email is required to create a portal account. Please provide an email.",
          },
        },
        { status: 400 }
      );
    }

    // Check teacher email conflict within same school
    const teacherConflict = await Teacher.findOne({
      schoolId,
      _id: { $ne: teacher._id },
      email,
    });
    if (teacherConflict) {
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

    const rawPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // If teacher already has a linked userId:
    if (teacher.userId) {
      const existingUser = await User.findOne({ _id: teacher.userId });
      if (existingUser) {
        if (existingUser.email !== email) {
          const userConflict = await User.findOne({ email, _id: { $ne: existingUser._id } });
          if (userConflict) {
            return NextResponse.json(
              {
                success: false,
                error: {
                  code: "USER_EMAIL_EXISTS",
                  message: `The email '${email}' is already associated with another portal account.`,
                },
              },
              { status: 409 }
            );
          }
          existingUser.email = email;
        }

        existingUser.password = hashedPassword;
        existingUser.mustChangePassword = true;
        existingUser.isActive = teacher.status === "ACTIVE";
        existingUser.teacherId = teacher._id;
        existingUser.schoolId = schoolId;
        await existingUser.save();

        if (teacher.email !== email) {
          teacher.email = email;
          await teacher.save();
        }

        await AuditLog.create({
          userId: user.id,
          userRole: user.role,
          action: "PASSWORD_CHANGED",
          entityType: "USER",
          entityId: existingUser._id.toString(),
          schoolId,
          metadata: {
            teacherId: teacher._id.toString(),
            userId: existingUser._id.toString(),
            email: existingUser.email,
          },
        });

        return NextResponse.json({
          success: true,
          data: {
            credentials: {
              email: existingUser.email,
              temporaryPassword: rawPassword,
              role: "TEACHER",
              name: `${teacher.firstName} ${teacher.lastName}`.trim(),
              isReset: true,
            },
          },
        });
      }
    }

    // If teacher has no linked userId yet:
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (
        existingUser.role !== "TEACHER" ||
        (existingUser.teacherId && existingUser.teacherId.toString() !== teacher._id.toString())
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "USER_EMAIL_EXISTS",
              message: `The email '${email}' is already associated with another portal account.`,
            },
          },
          { status: 409 }
        );
      }

      existingUser.password = hashedPassword;
      existingUser.mustChangePassword = true;
      existingUser.isActive = teacher.status === "ACTIVE";
      existingUser.teacherId = teacher._id;
      existingUser.schoolId = schoolId;
      await existingUser.save();

      teacher.userId = existingUser._id;
      if (teacher.email !== email) {
        teacher.email = email;
      }
      await teacher.save();

      await AuditLog.create({
        userId: user.id,
        userRole: user.role,
        action: "PASSWORD_CHANGED",
        entityType: "USER",
        entityId: existingUser._id.toString(),
        schoolId,
        metadata: {
          teacherId: teacher._id.toString(),
          userId: existingUser._id.toString(),
          email: existingUser.email,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          credentials: {
            email: existingUser.email,
            temporaryPassword: rawPassword,
            role: "TEACHER",
            name: `${teacher.firstName} ${teacher.lastName}`.trim(),
            isReset: true,
          },
        },
      });
    }

    // Create new teacher login user
    const newUser = new User({
      name: `${teacher.firstName} ${teacher.lastName}`.trim(),
      email,
      password: hashedPassword,
      role: "TEACHER",
      schoolId,
      teacherId: teacher._id,
      mustChangePassword: true,
      isActive: teacher.status === "ACTIVE",
    });

    await newUser.save();

    teacher.userId = newUser._id;
    if (teacher.email !== email) {
      teacher.email = email;
    }
    await teacher.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "TEACHER_ACCOUNT_CREATED",
      entityType: "USER",
      entityId: newUser._id.toString(),
      schoolId,
      metadata: {
        teacherId: teacher._id.toString(),
        userId: newUser._id.toString(),
        email: newUser.email,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          credentials: {
            email: newUser.email,
            temporaryPassword: rawPassword,
            role: "TEACHER",
            name: newUser.name,
            isReset: false,
          },
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/admin/teachers/[teacherId]/account error:", err);

    if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_EMAIL",
            message: "Email address is already associated with another portal account.",
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to create/reset teacher login account" },
      },
      { status: 500 }
    );
  }
}
