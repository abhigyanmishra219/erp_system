import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Student from "@/models/Student";
import StudentParent from "@/models/StudentParent";
import Class from "@/models/Class";
import Section from "@/models/Section";
import AcademicYear from "@/models/AcademicYear";
import AuditLog from "@/models/AuditLog";
import { updateStudentSchema } from "@/lib/validation/studentParent";
import { normalizeEmail } from "@/lib/utils/email";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { studentId } = await params;

  try {
    await connectToDatabase();

    const student = await Student.findOne({ _id: studentId, schoolId })
      .populate("academicYearId", "name status startDate endDate")
      .populate("classId", "name code")
      .populate("sectionId", "name capacity")
      .populate("userId", "email isActive mustChangePassword createdAt")
      .lean();

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Student not found" },
        },
        { status: 404 }
      );
    }

    // Fetch linked parents
    const linkedParents = await StudentParent.find({
      schoolId,
      studentId: student._id,
    })
      .populate({
        path: "parentId",
        populate: { path: "userId", select: "email isActive createdAt" },
      })
      .sort({ isPrimaryGuardian: -1, createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student._id.toString(),
          admissionNumber: student.admissionNumber,
          studentId: student.studentId,
          rollNumber: student.rollNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          fullName: `${student.firstName} ${student.lastName}`.trim(),
          email: student.email,
          phone: student.phone,
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          bloodGroup: student.bloodGroup,
          avatarUrl: student.avatarUrl,
          academicYear: student.academicYearId,
          class: student.classId,
          section: student.sectionId,
          admissionDate: student.admissionDate,
          status: student.status,
          address: student.address,
          emergencyContact: student.emergencyContact,
          medicalInfo: student.medicalInfo,
          academicHistory: student.academicHistory || [],
          transferDetails: student.transferDetails,
          user: student.userId,
          hasLoginAccount: !!student.userId,
          createdAt: student.createdAt,
          updatedAt: student.updatedAt,
        },
        parents: linkedParents.map((lp) => ({
          linkId: lp._id.toString(),
          relationship: lp.relationship,
          isPrimaryGuardian: lp.isPrimaryGuardian,
          isEmergencyContact: lp.isEmergencyContact,
          canPickup: lp.canPickup,
          notes: lp.notes,
          parent: lp.parentId,
        })),
      },
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/students/[studentId] error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to fetch student profile" },
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { studentId } = await params;

  try {
    const body = await req.json();
    const validatedData = updateStudentSchema.parse(body);

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

    // Check admission number conflict if changed
    if (
      validatedData.admissionNumber &&
      validatedData.admissionNumber.toUpperCase() !== student.admissionNumber
    ) {
      const conflict = await Student.findOne({
        schoolId,
        _id: { $ne: student._id },
        admissionNumber: {
          $regex: new RegExp(`^${validatedData.admissionNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        },
      });
      if (conflict) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_ADMISSION_NUMBER",
              message: `Admission number '${validatedData.admissionNumber}' is already in use.`,
            },
          },
          { status: 409 }
        );
      }
      student.admissionNumber = validatedData.admissionNumber.toUpperCase();
    }

    // Check academic placement updates
    let placementChanged = false;
    let newAcademicYearDoc = null;
    let newClassDoc = null;
    let newSectionDoc = null;

    if (
      validatedData.academicYearId ||
      validatedData.classId ||
      validatedData.sectionId
    ) {
      const targetAyId = validatedData.academicYearId || student.academicYearId;
      const targetClassId = validatedData.classId || student.classId;
      const targetSectionId = validatedData.sectionId || student.sectionId;

      const [ay, cl, sec] = await Promise.all([
        AcademicYear.findOne({ _id: targetAyId, schoolId }),
        Class.findOne({ _id: targetClassId, schoolId }),
        Section.findOne({ _id: targetSectionId, schoolId, classId: targetClassId }),
      ]);

      if (!ay || !cl || !sec) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_PLACEMENT",
              message: "Invalid academic year, class, or section placement.",
            },
          },
          { status: 400 }
        );
      }

      if (
        student.academicYearId.toString() !== ay._id.toString() ||
        student.classId.toString() !== cl._id.toString() ||
        student.sectionId.toString() !== sec._id.toString()
      ) {
        placementChanged = true;
        newAcademicYearDoc = ay;
        newClassDoc = cl;
        newSectionDoc = sec;

        student.academicYearId = ay._id;
        student.classId = cl._id;
        student.sectionId = sec._id;
      }
    }

    // Update email with normalization and uniqueness check
    if (validatedData.email !== undefined) {
      const normalizedNewEmail = normalizeEmail(validatedData.email);
      if (normalizedNewEmail !== student.email) {
        if (normalizedNewEmail) {
          const emailConflict = await Student.findOne({
            schoolId,
            _id: { $ne: student._id },
            email: normalizedNewEmail,
          });
          if (emailConflict) {
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
        }
        student.email = normalizedNewEmail;
      }
    }

    // Update standard fields
    if (validatedData.firstName !== undefined) student.firstName = validatedData.firstName;
    if (validatedData.lastName !== undefined) student.lastName = validatedData.lastName;
    if (validatedData.studentId !== undefined) student.studentId = validatedData.studentId;
    if (validatedData.rollNumber !== undefined) student.rollNumber = validatedData.rollNumber;
    if (validatedData.phone !== undefined) student.phone = validatedData.phone;
    if (validatedData.dateOfBirth !== undefined) student.dateOfBirth = new Date(validatedData.dateOfBirth);
    if (validatedData.gender !== undefined) student.gender = validatedData.gender;
    if (validatedData.bloodGroup !== undefined) student.bloodGroup = validatedData.bloodGroup;
    if (validatedData.avatarUrl !== undefined) student.avatarUrl = validatedData.avatarUrl;
    if (validatedData.status !== undefined) {
      if (validatedData.status === "ACTIVE" && student.status !== "ACTIVE") {
        const { checkStudentCapacity } = await import("@/lib/subscription-guard");
        const capacityCheck = await checkStudentCapacity(schoolId, 1);
        if (!capacityCheck.allowed && capacityCheck.errorResponse) {
          return capacityCheck.errorResponse;
        }
      }
      student.status = validatedData.status;
    }

    if (validatedData.address) {
      student.address = { ...student.address, ...validatedData.address };
    }
    if (validatedData.emergencyContact) {
      student.emergencyContact = { ...student.emergencyContact, ...validatedData.emergencyContact };
    }
    if (validatedData.medicalInfo) {
      student.medicalInfo = { ...student.medicalInfo, ...validatedData.medicalInfo };
    }
    if (validatedData.transferDetails) {
      student.transferDetails = {
        ...student.transferDetails,
        ...validatedData.transferDetails,
        transferDate: validatedData.transferDetails.transferDate
          ? new Date(validatedData.transferDetails.transferDate)
          : undefined,
      };
    }

    if (placementChanged && newAcademicYearDoc && newClassDoc && newSectionDoc) {
      student.academicHistory.push({
        academicYearId: newAcademicYearDoc._id,
        classId: newClassDoc._id,
        sectionId: newSectionDoc._id,
        rollNumber: student.rollNumber || "",
        yearName: newAcademicYearDoc.name,
        className: newClassDoc.name,
        sectionName: newSectionDoc.name,
        status: student.status,
        startDate: new Date(),
      });
    }

    student.updatedBy = user.id;
    await student.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "STUDENT_UPDATED",
      entityType: "STUDENT",
      entityId: student._id.toString(),
      schoolId,
      metadata: {
        studentId: student._id.toString(),
        admissionNumber: student.admissionNumber,
        name: `${student.firstName} ${student.lastName}`,
        placementChanged,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: student._id.toString(),
          admissionNumber: student.admissionNumber,
          firstName: student.firstName,
          lastName: student.lastName,
          status: student.status,
        },
      },
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/students/[studentId] error:", err);

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
        error: { code: "SERVER_ERROR", message: "Failed to update student" },
      },
      { status: 500 }
    );
  }
}
