import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { updateClassSchema } from "@/lib/validation/adminSetup";
import Class from "@/models/Class";
import Section from "@/models/Section";
import ClassSubject from "@/models/ClassSubject";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { classId } = await params;

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid class ID" } },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const classDoc = await Class.findOne({ _id: classId, schoolId })
    .populate("academicYearId", "name status startDate endDate")
    .lean();

  if (!classDoc) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Class not found" } },
      { status: 404 }
    );
  }

  // Fetch sections for this class
  const sections = await Section.find({
    schoolId,
    classId,
    isActive: true,
  })
    .sort({ name: 1 })
    .lean();

  // Fetch class subjects mapped to this class
  const classSubjects = await ClassSubject.find({
    schoolId,
    classId,
    isActive: true,
  })
    .populate("subjectId", "name code subjectType")
    .lean();

  return NextResponse.json({
    success: true,
    data: {
      class: {
        id: classDoc._id.toString(),
        name: classDoc.name,
        code: classDoc.code || "",
        displayOrder: classDoc.displayOrder,
        academicYear: classDoc.academicYearId,
        isActive: classDoc.isActive,
      },
      sections: sections.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        code: s.code || "",
        capacity: s.capacity,
        isActive: s.isActive,
      })),
      subjects: classSubjects.map((cs) => ({
        id: cs._id.toString(),
        subjectId: (cs.subjectId as any)?._id?.toString() || cs.subjectId.toString(),
        name: (cs.subjectId as any)?.name || "Unknown Subject",
        code: (cs.subjectId as any)?.code || "",
        subjectType: (cs.subjectId as any)?.subjectType || "CORE",
        maximumMarks: cs.maximumMarks,
        passingMarks: cs.passingMarks,
        isActive: cs.isActive,
      })),
    },
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { classId } = await params;

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid class ID" } },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const validatedData = updateClassSchema.parse(body);

    await connectToDatabase();

    const existing = await Class.findOne({ _id: classId, schoolId });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Class not found" } },
        { status: 404 }
      );
    }

    if (validatedData.name && validatedData.name !== existing.name) {
      const duplicate = await Class.findOne({
        _id: { $ne: classId },
        schoolId,
        academicYearId: existing.academicYearId,
        name: { $regex: new RegExp(`^${validatedData.name}$`, "i") },
      });
      if (duplicate) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "DUPLICATE_CLASS",
              message: `A class named '${validatedData.name}' already exists in this academic year.`,
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
    if (validatedData.displayOrder !== undefined) updateDoc.displayOrder = validatedData.displayOrder;
    if (validatedData.isActive !== undefined) updateDoc.isActive = validatedData.isActive;

    const updated = await Class.findByIdAndUpdate(
      classId,
      { $set: updateDoc },
      { new: true }
    );

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "CLASS_UPDATED",
      entityType: "CLASS",
      entityId: classId,
      schoolId,
      metadata: {
        updatedFields: Object.keys(validatedData),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Class updated successfully",
      data: {
        id: updated!._id.toString(),
        name: updated!.name,
        code: updated!.code,
        displayOrder: updated!.displayOrder,
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
          message: error instanceof Error ? error.message : "Failed to update class",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { classId } = await params;

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid class ID" } },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const classDoc = await Class.findOne({ _id: classId, schoolId });
  if (!classDoc) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Class not found" } },
      { status: 404 }
    );
  }

  // Soft deactivation of class
  classDoc.isActive = false;
  classDoc.updatedBy = user.id;
  await classDoc.save();

  // Also soft deactivate its sections and class-subjects
  await Section.updateMany(
    { schoolId, classId },
    { $set: { isActive: false, updatedBy: user.id } }
  );

  await ClassSubject.updateMany(
    { schoolId, classId },
    { $set: { isActive: false, updatedBy: user.id } }
  );

  await AuditLog.create({
    userId: user.id,
    userRole: user.role,
    action: "CLASS_DEACTIVATED",
    entityType: "CLASS",
    entityId: classId,
    schoolId,
    metadata: {
      name: classDoc.name,
    },
  });

  return NextResponse.json({
    success: true,
    message: `Class '${classDoc.name}' and associated sections have been deactivated.`,
  });
}
