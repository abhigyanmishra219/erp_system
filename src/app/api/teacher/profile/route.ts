import { NextRequest, NextResponse } from "next/server";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import { getTeacherScope } from "@/lib/auth/teacherScope";
import connectToDatabase from "@/lib/db";
import Teacher from "@/models/Teacher";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const teacherProfileUpdateSchema = z.object({
  phone: z.string().trim().max(20, "Phone number cannot exceed 20 characters").optional(),
  alternatePhone: z.string().trim().max(20, "Alternate phone cannot exceed 20 characters").optional(),
  photo: z.string().trim().optional(),
  qualification: z.string().trim().max(200, "Qualification cannot exceed 200 characters").optional(),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: z.string().optional().nullable(),
  address: z
    .object({
      street: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      postalCode: z.string().trim().optional(),
      country: z.string().trim().optional(),
    })
    .optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { user, teacher, school, schoolId } = auth.context;

  await connectToDatabase();

  const scope = await getTeacherScope({
    schoolId,
    teacherId: teacher._id.toString(),
  });

  return NextResponse.json({
    success: true,
    data: {
      user,
      teacher: {
        _id: teacher._id,
        teacherId: teacher.teacherId,
        employeeId: teacher.employeeId || "",
        firstName: teacher.firstName,
        middleName: teacher.middleName || "",
        lastName: teacher.lastName,
        photo: teacher.photo || "",
        email: teacher.email || "",
        phone: teacher.phone || "",
        alternatePhone: teacher.alternatePhone || "",
        address: teacher.address || {
          street: "",
          city: "",
          state: "",
          postalCode: "",
          country: "India",
        },
        department: teacher.department || "",
        designation: teacher.designation || "Teacher",
        joiningDate: teacher.joiningDate,
        dateOfBirth: teacher.dateOfBirth,
        qualification: teacher.qualification || "",
        gender: teacher.gender || "MALE",
        status: teacher.status,
      },
      school: {
        _id: school._id,
        name: school.name,
        logo: school.logo,
      },
      scope,
    },
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { user, teacher, schoolId } = auth.context;

  try {
    const body = await req.json();

    // Prevent any attempt to overwrite immutable / security fields
    const forbiddenFields = [
      "role",
      "schoolId",
      "teacherId",
      "employeeId",
      "status",
      "userId",
      "joiningDate",
      "department",
      "designation",
      "assignments",
      "assignedClasses",
      "assignedSubjects",
    ];

    for (const field of forbiddenFields) {
      if (body[field] !== undefined) {
        delete body[field];
      }
    }

    const parseResult = teacherProfileUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation error",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const validData = parseResult.data;

    await connectToDatabase();

    const updateFields: Record<string, any> = {
      updatedBy: user.id,
    };

    if (validData.phone !== undefined) updateFields.phone = validData.phone;
    if (validData.alternatePhone !== undefined) updateFields.alternatePhone = validData.alternatePhone;
    if (validData.photo !== undefined) updateFields.photo = validData.photo;
    if (validData.qualification !== undefined) updateFields.qualification = validData.qualification;
    if (validData.gender !== undefined) updateFields.gender = validData.gender;
    if (validData.dateOfBirth !== undefined) {
      updateFields.dateOfBirth = validData.dateOfBirth ? new Date(validData.dateOfBirth) : null;
    }
    if (validData.address) {
      updateFields.address = {
        street: validData.address.street || "",
        city: validData.address.city || "",
        state: validData.address.state || "",
        postalCode: validData.address.postalCode || "",
        country: validData.address.country || "India",
      };
    }

    const updatedTeacher = await Teacher.findByIdAndUpdate(
      teacher._id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).lean();

    if (!updatedTeacher) {
      return NextResponse.json(
        { success: false, error: "Teacher profile not found." },
        { status: 404 }
      );
    }

    // Audit log
    await createAuditLog({
      userId: user.id,
      userRole: "TEACHER",
      action: "TEACHER_UPDATED",
      entityType: "TEACHER",
      entityId: teacher._id.toString(),
      schoolId,
      metadata: {
        actionDetail: "TEACHER_SELF_PROFILE_UPDATED",
        updatedFields: Object.keys(validData),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Teacher profile updated successfully.",
      data: {
        teacher: updatedTeacher,
      },
    });
  } catch (error: any) {
    console.error("Teacher profile update error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update profile." },
      { status: 500 }
    );
  }
}
