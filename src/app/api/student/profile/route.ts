import { NextRequest, NextResponse } from "next/server";
import { requireStudent } from "@/lib/auth/requireStudent";
import connectToDatabase from "@/lib/db";
import Student from "@/models/Student";
import Class from "@/models/Class";
import Section from "@/models/Section";
import AcademicYear from "@/models/AcademicYear";
import StudentParent from "@/models/StudentParent";
import Parent from "@/models/Parent";
import { createAuditLog } from "@/lib/audit";
import { z } from "zod";

const studentProfileUpdateSchema = z.object({
  phone: z.string().trim().max(20, "Phone number cannot exceed 20 characters").optional(),
  dateOfBirth: z.string().optional().nullable(),
  bloodGroup: z.string().trim().max(10, "Blood group cannot exceed 10 characters").optional(),
  avatarUrl: z.string().trim().optional(),
  address: z
    .object({
      street: z.string().trim().optional(),
      city: z.string().trim().optional(),
      state: z.string().trim().optional(),
      postalCode: z.string().trim().optional(),
      country: z.string().trim().optional(),
    })
    .optional(),
  emergencyContact: z
    .object({
      name: z.string().trim().optional(),
      relationship: z.string().trim().optional(),
      phone: z.string().trim().optional(),
    })
    .optional(),
  medicalInfo: z
    .object({
      allergies: z.array(z.string().trim()).optional(),
      conditions: z.array(z.string().trim()).optional(),
      medications: z.array(z.string().trim()).optional(),
      notes: z.string().trim().optional(),
    })
    .optional(),
});

export async function GET(req: NextRequest) {
  const auth = await requireStudent(req);
  if (!auth.success) return auth.response;

  const { user, student, school, schoolId } = auth.context;

  await connectToDatabase();

  const [classDoc, sectionDoc, academicYearDoc, linkedParents] = await Promise.all([
    Class.findById(student.classId).select("name code").lean(),
    Section.findById(student.sectionId).select("name capacity").lean(),
    AcademicYear.findById(student.academicYearId).select("name startDate endDate status").lean(),
    StudentParent.find({ schoolId, studentId: student._id })
      .populate({
        path: "parentId",
        model: Parent,
        select: "firstName lastName email phone occupation address",
      })
      .lean(),
  ]);

  const parents = linkedParents.map((lp: any) => ({
    _id: lp._id.toString(),
    relationship: lp.relationship,
    isPrimaryGuardian: lp.isPrimaryGuardian,
    isEmergencyContact: lp.isEmergencyContact,
    canPickup: lp.canPickup,
    notes: lp.notes || "",
    parent: lp.parentId
      ? {
          _id: lp.parentId._id.toString(),
          firstName: lp.parentId.firstName,
          lastName: lp.parentId.lastName,
          fullName: `${lp.parentId.firstName} ${lp.parentId.lastName}`.trim(),
          email: lp.parentId.email || "",
          phone: lp.parentId.phone || "",
          occupation: lp.parentId.occupation || "",
        }
      : null,
  }));

  return NextResponse.json({
    success: true,
    data: {
      user: {
        _id: user._id.toString(),
        email: user.email,
        role: user.role,
        status: user.isActive ? "ACTIVE" : "INACTIVE",
      },
      student: {
        _id: student._id.toString(),
        studentId: student.studentId || "",
        admissionNumber: student.admissionNumber,
        rollNumber: student.rollNumber || "",
        firstName: student.firstName,
        lastName: student.lastName,
        fullName: `${student.firstName} ${student.lastName}`.trim(),
        email: student.email || user.email,
        phone: student.phone || "",
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        bloodGroup: student.bloodGroup || "",
        avatarUrl: student.avatarUrl || "",
        admissionDate: student.admissionDate,
        status: student.status,
        address: student.address || {
          street: "",
          city: "",
          state: "",
          postalCode: "",
          country: "",
        },
        emergencyContact: student.emergencyContact || {
          name: "",
          relationship: "",
          phone: "",
        },
        medicalInfo: student.medicalInfo || {
          allergies: [],
          conditions: [],
          medications: [],
          notes: "",
        },
      },
      academic: {
        class: {
          _id: student.classId.toString(),
          name: classDoc?.name || "N/A",
          code: classDoc?.code || "",
        },
        section: {
          _id: student.sectionId.toString(),
          name: sectionDoc?.name || "N/A",
        },
        academicYear: {
          _id: student.academicYearId.toString(),
          name: academicYearDoc?.name || "N/A",
          status: academicYearDoc?.status || "ACTIVE",
        },
      },
      parents,
      school: {
        _id: school._id.toString(),
        name: school.name,
        code: school.code,
        logo: school.logo || "",
        address: school.address || "",
        phone: school.phone || "",
        email: school.email || "",
      },
    },
  });
}

export async function PATCH(req: NextRequest) {
  const auth = await requireStudent(req);
  if (!auth.success) return auth.response;

  const { user, student, schoolId } = auth.context;

  try {
    const body = await req.json();

    // Prevent tampering with immutable / admin-controlled fields
    const forbiddenFields = [
      "schoolId",
      "studentId",
      "admissionNumber",
      "rollNumber",
      "classId",
      "sectionId",
      "academicYearId",
      "admissionDate",
      "status",
      "userId",
      "academicHistory",
      "transferDetails",
      "createdBy",
      "updatedBy",
      "role",
    ];

    for (const field of forbiddenFields) {
      if (body[field] !== undefined) {
        return NextResponse.json(
          {
            success: false,
            message: `Modification of field '${field}' is strictly restricted to School Administrators.`,
          },
          { status: 403 }
        );
      }
    }

    const validation = studentProfileUpdateSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Validation failed",
          errors: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    const updateData: Record<string, any> = {
      updatedBy: user._id,
    };

    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.bloodGroup !== undefined) updateData.bloodGroup = data.bloodGroup;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.dateOfBirth !== undefined) {
      updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : student.dateOfBirth;
    }
    if (data.address !== undefined) {
      updateData.address = {
        street: data.address.street ?? student.address?.street ?? "",
        city: data.address.city ?? student.address?.city ?? "",
        state: data.address.state ?? student.address?.state ?? "",
        postalCode: data.address.postalCode ?? student.address?.postalCode ?? "",
        country: data.address.country ?? student.address?.country ?? "",
      };
    }
    if (data.emergencyContact !== undefined) {
      updateData.emergencyContact = {
        name: data.emergencyContact.name ?? student.emergencyContact?.name ?? "",
        relationship: data.emergencyContact.relationship ?? student.emergencyContact?.relationship ?? "",
        phone: data.emergencyContact.phone ?? student.emergencyContact?.phone ?? "",
      };
    }
    if (data.medicalInfo !== undefined) {
      updateData.medicalInfo = {
        allergies: data.medicalInfo.allergies ?? student.medicalInfo?.allergies ?? [],
        conditions: data.medicalInfo.conditions ?? student.medicalInfo?.conditions ?? [],
        medications: data.medicalInfo.medications ?? student.medicalInfo?.medications ?? [],
        notes: data.medicalInfo.notes ?? student.medicalInfo?.notes ?? "",
      };
    }

    await connectToDatabase();

    const updatedStudent = await Student.findOneAndUpdate(
      { _id: student._id, schoolId },
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedStudent) {
      return NextResponse.json(
        { success: false, message: "Student record not found" },
        { status: 404 }
      );
    }

    await createAuditLog({
      schoolId: schoolId.toString(),
      userId: user._id.toString(),
      userRole: "STUDENT",
      action: "UPDATE",
      entityType: "STUDENT",
      entityId: student._id.toString(),
      metadata: {
        action: "STUDENT_SELF_PROFILE_UPDATE",
        updatedFields: Object.keys(updateData).filter((k) => k !== "updatedBy"),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedStudent,
    });
  } catch (error: any) {
    console.error("Student profile update error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update profile" },
      { status: 500 }
    );
  }
}
