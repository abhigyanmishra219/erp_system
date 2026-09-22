import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { updateSubjectSchema } from "@/lib/validation/adminSetup";
import Subject from "@/models/Subject";
import ClassSubject from "@/models/ClassSubject";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { subjectId } = await params;

  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid subject ID" } },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const subject = await Subject.findOne({ _id: subjectId, schoolId }).lean();
  if (!subject) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Subject not found" } },
      { status: 404 }
    );
  }

  // Get list of assigned classes
  const classMappings = await ClassSubject.find({
    schoolId,
    subjectId,
    isActive: true,
  })
    .populate("classId", "name code")
    .populate("academicYearId", "name")
    .lean();

  return NextResponse.json({
    success: true,
    data: {
      id: subject._id.toString(),
      name: subject.name,
      code: subject.code,
      description: subject.description || "",
      subjectType: subject.subjectType,
      isActive: subject.isActive,
      assignedClasses: classMappings.map((cm) => ({
        classSubjectId: cm._id.toString(),
        classId: (cm.classId as any)?._id?.toString() || cm.classId.toString(),
        className: (cm.classId as any)?.name || "Unknown Class",
        academicYearName: (cm.academicYearId as any)?.name || "Unknown Year",
        maximumMarks: cm.maximumMarks,
        passingMarks: cm.passingMarks,
      })),
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { subjectId } = await params;

  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid subject ID" } },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const validatedData = updateSubjectSchema.parse(body);

    await connectToDatabase();

    const existing = await Subject.findOne({ _id: subjectId, schoolId });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Subject not found" } },
        { status: 404 }
      );
    }

    if (validatedData.code && validatedData.code !== existing.code) {
      const duplicate = await Subject.findOne({
        _id: { $ne: subjectId },
        schoolId,
        code: validatedData.code,
      });
      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_CODE",
              message: `A subject with code '${validatedData.code}' already exists.`,
            },
          },
          { status: 409 }
        );
      }
    }

    const updateDoc: any = {
      updatedBy: user.id,
    };
    if (validatedData.name !== undefined) updateDoc.name = validatedData.name;
    if (validatedData.code !== undefined) updateDoc.code = validatedData.code;
    if (validatedData.description !== undefined) updateDoc.description = validatedData.description;
    if (validatedData.subjectType !== undefined) updateDoc.subjectType = validatedData.subjectType;
    if (validatedData.isActive !== undefined) updateDoc.isActive = validatedData.isActive;

    const updated = await Subject.findByIdAndUpdate(
      subjectId,
      { $set: updateDoc },
      { new: true }
    );

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "SUBJECT_UPDATED",
      entityType: "SUBJECT",
      entityId: subjectId,
      schoolId,
      metadata: {
        updatedFields: Object.keys(validatedData),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Subject updated successfully",
      data: {
        id: updated!._id.toString(),
        name: updated!.name,
        code: updated!.code,
        description: updated!.description,
        subjectType: updated!.subjectType,
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
          message: error instanceof Error ? error.message : "Failed to update subject",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { subjectId } = await params;

  if (!mongoose.Types.ObjectId.isValid(subjectId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid subject ID" } },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const subject = await Subject.findOne({ _id: subjectId, schoolId });
  if (!subject) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Subject not found" } },
      { status: 404 }
    );
  }

  // Soft deactivation
  subject.isActive = false;
  subject.updatedBy = user.id;
  await subject.save();

  // Deactivate class-subject mappings
  await ClassSubject.updateMany(
    { schoolId, subjectId },
    { $set: { isActive: false, updatedBy: user.id } }
  );

  await AuditLog.create({
    userId: user.id,
    userRole: user.role,
    action: "SUBJECT_DEACTIVATED",
    entityType: "SUBJECT",
    entityId: subjectId,
    schoolId,
    metadata: {
      name: subject.name,
      code: subject.code,
    },
  });

  return NextResponse.json({
    success: true,
    message: `Subject '${subject.name}' has been deactivated.`,
  });
}
