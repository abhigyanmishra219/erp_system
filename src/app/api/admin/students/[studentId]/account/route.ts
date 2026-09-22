import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Student from "@/models/Student";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";
import { createAccountSchema } from "@/lib/validation/studentParent";
import { generateTemporaryPassword } from "@/lib/tempPassword";
import { normalizeEmail } from "@/lib/utils/email";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { studentId } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const validatedData = createAccountSchema.parse(body);

    await connectToDatabase();

    const student = await Student.findOne({ _id: studentId, schoolId });

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Student not found" },
        },
        { status: 404 }
      );
    }

    const email = normalizeEmail(validatedData.email || student.email);

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "EMAIL_REQUIRED",
            message: "Student email is required to create a login account. Please provide an email.",
          },
        },
        { status: 400 }
      );
    }

    // Check student email conflict within same school
    const studentConflict = await Student.findOne({
      schoolId,
      _id: { $ne: student._id },
      email,
    });
    if (studentConflict) {
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

    const rawPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    // Check if user already exists
    if (student.userId) {
      const existingUser = await User.findOne({ _id: student.userId });
      if (existingUser) {
        if (existingUser.email !== email) {
          const userConflict = await User.findOne({ email, _id: { $ne: existingUser._id } });
          if (userConflict) {
            return NextResponse.json(
              {
                success: false,
                error: {
                  code: "USER_EMAIL_EXISTS",
                  message: `The email '${email}' is already associated with another user account.`,
                },
              },
              { status: 409 }
            );
          }
          existingUser.email = email;
        }

        existingUser.password = hashedPassword;
        existingUser.mustChangePassword = true;
        existingUser.isActive = student.status === "ACTIVE";
        existingUser.studentId = student._id;
        existingUser.schoolId = schoolId;
        await existingUser.save();

        if (student.email !== email) {
          student.email = email;
          await student.save();
        }

        await AuditLog.create({
          userId: user.id,
          userRole: user.role,
          action: "PASSWORD_CHANGED",
          entityType: "USER",
          entityId: existingUser._id.toString(),
          schoolId,
          metadata: {
            studentId: student._id.toString(),
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
              role: "STUDENT",
              name: `${student.firstName} ${student.lastName}`.trim(),
              isReset: true,
            },
          },
        });
      }
    }

    // When student has no userId linked yet:
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (
        existingUser.role !== "STUDENT" ||
        (existingUser.studentId && existingUser.studentId.toString() !== student._id.toString())
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "USER_EMAIL_EXISTS",
              message: `The email '${email}' is already associated with another user account.`,
            },
          },
          { status: 409 }
        );
      }

      existingUser.password = hashedPassword;
      existingUser.mustChangePassword = true;
      existingUser.isActive = student.status === "ACTIVE";
      existingUser.studentId = student._id;
      existingUser.schoolId = schoolId;
      await existingUser.save();

      student.userId = existingUser._id;
      if (student.email !== email) {
        student.email = email;
      }
      await student.save();

      await AuditLog.create({
        userId: user.id,
        userRole: user.role,
        action: "PASSWORD_CHANGED",
        entityType: "USER",
        entityId: existingUser._id.toString(),
        schoolId,
        metadata: {
          studentId: student._id.toString(),
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
            role: "STUDENT",
            name: `${student.firstName} ${student.lastName}`.trim(),
            isReset: true,
          },
        },
      });
    }

    // Create new student login user
    const newUser = new User({
      name: `${student.firstName} ${student.lastName}`.trim(),
      email,
      password: hashedPassword,
      role: "STUDENT",
      schoolId,
      studentId: student._id,
      mustChangePassword: true,
      isActive: student.status === "ACTIVE",
    });

    await newUser.save();

    student.userId = newUser._id;
    if (student.email !== email) {
      student.email = email;
    }
    await student.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "STUDENT_ACCOUNT_CREATED",
      entityType: "USER",
      entityId: newUser._id.toString(),
      schoolId,
      metadata: {
        studentId: student._id.toString(),
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
            role: "STUDENT",
            name: newUser.name,
            isReset: false,
          },
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    console.error("POST /api/admin/students/[studentId]/account error:", err);

    if (err && typeof err === "object" && "code" in err && (err as { code: number }).code === 11000) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "DUPLICATE_EMAIL",
            message: "Email address is already associated with another account.",
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to create/reset student login account" },
      },
      { status: 500 }
    );
  }
}
