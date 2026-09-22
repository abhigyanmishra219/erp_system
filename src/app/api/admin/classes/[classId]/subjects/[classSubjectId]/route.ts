import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { updateClassSubjectSchema } from "@/lib/validation/adminSetup";
import ClassSubject from "@/models/ClassSubject";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; classSubjectId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { classId, classSubjectId } = await params;

  if (
    !mongoose.Types.ObjectId.isValid(classId) ||
    !mongoose.Types.ObjectId.isValid(classSubjectId)
  ) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid ID format" } },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const validatedData = updateClassSubjectSchema.parse(body);

    await connectToDatabase();

    const existing = await ClassSubject.findOne({
      _id: classSubjectId,
      classId,
      schoolId,
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Class-subject assignment not found" } },
        { status: 404 }
      );
    }

    const updateDoc: any = {
      updatedBy: user.id,
    };
    if (validatedData.maximumMarks !== undefined) updateDoc.maximumMarks = validatedData.maximumMarks;
    if (validatedData.passingMarks !== undefined) updateDoc.passingMarks = validatedData.passingMarks;
    if (validatedData.isActive !== undefined) updateDoc.isActive = validatedData.isActive;

    const updated = await ClassSubject.findByIdAndUpdate(
      classSubjectId,
      { $set: updateDoc },
      { new: true }
    );

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "CLASS_SUBJECT_UPDATED",
      entityType: "CLASS_SUBJECT",
      entityId: classSubjectId,
      schoolId,
      metadata: {
        updatedFields: Object.keys(validatedData),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Subject marks configuration updated",
      data: {
        id: updated!._id.toString(),
        maximumMarks: updated!.maximumMarks,
        passingMarks: updated!.passingMarks,
        isActive: updated!.isActive,
      },
    });
  } catch (error) {
    if ((error as any).name === "ZodError") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: (error as any).errors,
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to update subject configuration",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; classSubjectId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { classId, classSubjectId } = await params;

  if (
    !mongoose.Types.ObjectId.isValid(classId) ||
    !mongoose.Types.ObjectId.isValid(classSubjectId)
  ) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid ID format" } },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const mapping = await ClassSubject.findOne({
    _id: classSubjectId,
    classId,
    schoolId,
  });

  if (!mapping) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Class subject mapping not found" } },
      { status: 404 }
    );
  }

  mapping.isActive = false;
  mapping.updatedBy = user.id;
  await mapping.save();

  await AuditLog.create({
    userId: user.id,
    userRole: user.role,
    action: "CLASS_SUBJECT_REMOVED",
    entityType: "CLASS_SUBJECT",
    entityId: classSubjectId,
    schoolId,
    metadata: {
      classId,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Subject removed from class.",
  });
}
