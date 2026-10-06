import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Student from "@/models/Student";
import StudentEnrollment from "@/models/StudentEnrollment";
import StudentParent from "@/models/StudentParent";
import Class from "@/models/Class";
import Section from "@/models/Section";
import AcademicYear from "@/models/AcademicYear";
import AuditLog from "@/models/AuditLog";
import { updateStudentSchema } from "@/lib/validation/studentParent";
import { normalizeEmail } from "@/lib/utils/email";
import {
  syncLegacyStudentEnrollments,
  deleteStudentEnrollment,
} from "@/lib/services/studentEnrollmentService";

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

    const isObjectId = mongoose.Types.ObjectId.isValid(studentId);
    if (!isObjectId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Student not found" },
        },
        { status: 404 }
      );
    }

    await syncLegacyStudentEnrollments(schoolId);

    // Look for enrollment first (multi-school architecture)
    const enrollment = await StudentEnrollment.findOne({
      $or: [
        { studentId: new mongoose.Types.ObjectId(studentId) },
        { _id: new mongoose.Types.ObjectId(studentId) },
      ],
      schoolId: new mongoose.Types.ObjectId(schoolId),
      isDeleted: false,
    })
      .populate("academicYearId", "name status startDate endDate")
      .populate("classId", "name code")
      .populate("sectionId", "name capacity")
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "email isActive mustChangePassword createdAt" },
      })
      .lean();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let studentData: Record<string, any> | null = null;
    let globalStudentId: string | null = null;

    if (enrollment && enrollment.studentId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const s = enrollment.studentId as any;
      globalStudentId = s._id.toString();
      studentData = {
        id: s._id.toString(),
        enrollmentId: enrollment._id.toString(),
        admissionNumber: enrollment.admissionNumber,
        studentId: enrollment.studentIdCode || enrollment.admissionNumber,
        rollNumber: enrollment.rollNumber || "",
        firstName: s.firstName,
        lastName: s.lastName,
        fullName: `${s.firstName} ${s.lastName}`.trim(),
        email: s.email || "",
        phone: s.phone || "",
        dateOfBirth: s.dateOfBirth,
        gender: s.gender,
        bloodGroup: s.bloodGroup || "",
        avatarUrl: s.avatarUrl || "",
        academicYear: enrollment.academicYearId,
        class: enrollment.classId,
        section: enrollment.sectionId,
        admissionDate: enrollment.admissionDate,
        status: enrollment.status,
        address: s.address,
        emergencyContact: s.emergencyContact,
        medicalInfo: s.medicalInfo,
        academicHistory: enrollment.academicHistory || s.academicHistory || [],
        transferDetails: enrollment.transferDetails || s.transferDetails,
        user: s.userId,
        hasLoginAccount: !!s.userId,
        createdAt: enrollment.createdAt || s.createdAt,
        updatedAt: enrollment.updatedAt || s.updatedAt,
      };
    } else {
      // Fallback to legacy Student document scoped to this school
      const legacyStudent = await Student.findOne({
        _id: studentId,
        schoolId,
        isDeleted: false,
      })
        .populate("academicYearId", "name status startDate endDate")
        .populate("classId", "name code")
        .populate("sectionId", "name capacity")
        .populate("userId", "email isActive mustChangePassword createdAt")
        .lean();

      if (legacyStudent) {
        globalStudentId = legacyStudent._id.toString();
        studentData = {
          id: legacyStudent._id.toString(),
          admissionNumber: legacyStudent.admissionNumber,
          studentId: legacyStudent.studentId,
          rollNumber: legacyStudent.rollNumber,
          firstName: legacyStudent.firstName,
          lastName: legacyStudent.lastName,
          fullName: `${legacyStudent.firstName} ${legacyStudent.lastName}`.trim(),
          email: legacyStudent.email,
          phone: legacyStudent.phone,
          dateOfBirth: legacyStudent.dateOfBirth,
          gender: legacyStudent.gender,
          bloodGroup: legacyStudent.bloodGroup,
          avatarUrl: legacyStudent.avatarUrl,
          academicYear: legacyStudent.academicYearId,
          class: legacyStudent.classId,
          section: legacyStudent.sectionId,
          admissionDate: legacyStudent.admissionDate,
          status: legacyStudent.status,
          address: legacyStudent.address,
          emergencyContact: legacyStudent.emergencyContact,
          medicalInfo: legacyStudent.medicalInfo,
          academicHistory: legacyStudent.academicHistory || [],
          transferDetails: legacyStudent.transferDetails,
          user: legacyStudent.userId,
          hasLoginAccount: !!legacyStudent.userId,
          createdAt: legacyStudent.createdAt,
          updatedAt: legacyStudent.updatedAt,
        };
      }
    }

    if (!studentData || !globalStudentId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Student not found in this school" },
        },
        { status: 404 }
      );
    }

    // Fetch linked parents scoped to current school
    const linkedParents = await StudentParent.find({
      schoolId,
      studentId: globalStudentId,
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
        student: studentData,
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

    const isObjectId = mongoose.Types.ObjectId.isValid(studentId);
    if (!isObjectId) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Student not found" } },
        { status: 404 }
      );
    }

    await syncLegacyStudentEnrollments(schoolId);

    // Find enrollment for this school
    let enrollment = await StudentEnrollment.findOne({
      $or: [
        { studentId: new mongoose.Types.ObjectId(studentId) },
        { _id: new mongoose.Types.ObjectId(studentId) },
      ],
      schoolId: new mongoose.Types.ObjectId(schoolId),
      isDeleted: false,
    });

    const targetStudentId = enrollment ? enrollment.studentId : new mongoose.Types.ObjectId(studentId);
    const student = await Student.findOne({ _id: targetStudentId, isDeleted: false });

    if (!enrollment && !student) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Student not found in this school" },
        },
        { status: 404 }
      );
    }

    // Check admission number conflict if changed
    const currentAdmissionNumber = enrollment ? enrollment.admissionNumber : student?.admissionNumber;
    if (
      validatedData.admissionNumber &&
      validatedData.admissionNumber.toUpperCase() !== currentAdmissionNumber
    ) {
      const conflict = await StudentEnrollment.findOne({
        schoolId,
        ...(enrollment ? { _id: { $ne: enrollment._id } } : {}),
        admissionNumber: {
          $regex: new RegExp(`^${validatedData.admissionNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        },
        isDeleted: false,
      });

      if (conflict) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_ADMISSION_NUMBER",
              message: `Admission number '${validatedData.admissionNumber}' is already in use in this school.`,
            },
          },
          { status: 409 }
        );
      }

      if (enrollment) {
        enrollment.admissionNumber = validatedData.admissionNumber.toUpperCase();
      }
      if (student) {
        student.admissionNumber = validatedData.admissionNumber.toUpperCase();
      }
    }

    // Academic placement updates
    let placementChanged = false;
    let newAcademicYearDoc = null;
    let newClassDoc = null;
    let newSectionDoc = null;

    if (
      validatedData.academicYearId ||
      validatedData.classId ||
      validatedData.sectionId
    ) {
      const targetAyId =
        validatedData.academicYearId ||
        (enrollment ? enrollment.academicYearId : student?.academicYearId);
      const targetClassId =
        validatedData.classId || (enrollment ? enrollment.classId : student?.classId);
      const targetSectionId =
        validatedData.sectionId || (enrollment ? enrollment.sectionId : student?.sectionId);

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

      const prevAy = enrollment ? enrollment.academicYearId?.toString() : student?.academicYearId?.toString();
      const prevCl = enrollment ? enrollment.classId?.toString() : student?.classId?.toString();
      const prevSec = enrollment ? enrollment.sectionId?.toString() : student?.sectionId?.toString();

      if (
        prevAy !== ay._id.toString() ||
        prevCl !== cl._id.toString() ||
        prevSec !== sec._id.toString()
      ) {
        placementChanged = true;
        newAcademicYearDoc = ay;
        newClassDoc = cl;
        newSectionDoc = sec;

        if (enrollment) {
          enrollment.academicYearId = ay._id;
          enrollment.classId = cl._id;
          enrollment.sectionId = sec._id;
        }
        if (student) {
          student.academicYearId = ay._id;
          student.classId = cl._id;
          student.sectionId = sec._id;
        }
      }
    }

    // Update global student email with normalization and global uniqueness check
    if (student && validatedData.email !== undefined) {
      const normalizedNewEmail = normalizeEmail(validatedData.email);
      if (normalizedNewEmail !== student.email) {
        if (normalizedNewEmail) {
          const emailConflict = await Student.findOne({
            _id: { $ne: student._id },
            email: normalizedNewEmail,
            isDeleted: false,
          });
          if (emailConflict) {
            return NextResponse.json(
              {
                success: false,
                error: {
                  code: "DUPLICATE_EMAIL",
                  message: "Email address is already used by another student.",
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
    if (student) {
      if (validatedData.firstName !== undefined) student.firstName = validatedData.firstName;
      if (validatedData.lastName !== undefined) student.lastName = validatedData.lastName;
      if (validatedData.phone !== undefined) student.phone = validatedData.phone;
      if (validatedData.dateOfBirth !== undefined) student.dateOfBirth = new Date(validatedData.dateOfBirth);
      if (validatedData.gender !== undefined) student.gender = validatedData.gender;
      if (validatedData.bloodGroup !== undefined) student.bloodGroup = validatedData.bloodGroup;
      if (validatedData.avatarUrl !== undefined) student.avatarUrl = validatedData.avatarUrl;
      if (validatedData.address) {
        student.address = { ...student.address, ...validatedData.address };
      }
      if (validatedData.emergencyContact) {
        student.emergencyContact = { ...student.emergencyContact, ...validatedData.emergencyContact };
      }
      if (validatedData.medicalInfo) {
        student.medicalInfo = { ...student.medicalInfo, ...validatedData.medicalInfo };
      }
    }

    // Status and capacity checking
    if (validatedData.status !== undefined) {
      const currentStatus = enrollment ? enrollment.status : student?.status;
      if (validatedData.status === "ACTIVE" && currentStatus !== "ACTIVE") {
        const { checkStudentCapacity } = await import("@/lib/subscription-guard");
        const capacityCheck = await checkStudentCapacity(schoolId, 1);
        if (!capacityCheck.allowed && capacityCheck.errorResponse) {
          return capacityCheck.errorResponse;
        }
      }
      if (enrollment) enrollment.status = validatedData.status;
      if (student) student.status = validatedData.status;
    }

    if (validatedData.rollNumber !== undefined) {
      if (enrollment) enrollment.rollNumber = validatedData.rollNumber;
      if (student) student.rollNumber = validatedData.rollNumber;
    }

    if (placementChanged && newAcademicYearDoc && newClassDoc && newSectionDoc) {
      const historyItem = {
        academicYearId: newAcademicYearDoc._id,
        classId: newClassDoc._id,
        sectionId: newSectionDoc._id,
        rollNumber: (enrollment ? enrollment.rollNumber : student?.rollNumber) || "",
        yearName: newAcademicYearDoc.name,
        className: newClassDoc.name,
        sectionName: newSectionDoc.name,
        status: (enrollment ? enrollment.status : student?.status) || "ACTIVE",
        startDate: new Date(),
      };
      if (enrollment) {
        enrollment.academicHistory.push(historyItem);
      }
      if (student) {
        student.academicHistory.push(historyItem);
      }
    }

    if (student) {
      student.updatedBy = user.id;
      await student.save();
    }
    if (enrollment) {
      enrollment.updatedBy = user.id;
      await enrollment.save();
    }

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "STUDENT_UPDATED",
      entityType: "STUDENT",
      entityId: (student ? student._id : enrollment?.studentId)?.toString(),
      schoolId,
      metadata: {
        studentId: (student ? student._id : enrollment?.studentId)?.toString(),
        admissionNumber: enrollment?.admissionNumber || student?.admissionNumber,
        name: student ? `${student.firstName} ${student.lastName}` : "",
        placementChanged,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        student: {
          id: (student ? student._id : enrollment?.studentId)?.toString(),
          admissionNumber: enrollment?.admissionNumber || student?.admissionNumber,
          firstName: student?.firstName,
          lastName: student?.lastName,
          status: enrollment?.status || student?.status,
        },
      },
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/students/[studentId] error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to update student" },
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/students/:studentId
 * Soft-deletes ONLY the student's enrollment for the authenticated school.
 * Preserves the global student identity and enrollments in other schools.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId, user } = auth.context;
  const { studentId } = await params;

  try {
    await connectToDatabase();

    const result = await deleteStudentEnrollment(schoolId, studentId, user);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: { code: result.code || "NOT_FOUND", message: result.message },
        },
        { status: result.code === "NOT_FOUND" ? 404 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      data: {
        remainingActiveEnrollments: result.remainingActiveEnrollments,
      },
    });
  } catch (err: unknown) {
    console.error("DELETE /api/admin/students/[studentId] error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to delete student from this school" },
      },
      { status: 500 }
    );
  }
}
