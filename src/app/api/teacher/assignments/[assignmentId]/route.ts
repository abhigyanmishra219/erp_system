import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireTeacher } from "@/lib/auth/requireTeacher";
import connectToDatabase from "@/lib/db";
import Assignment from "@/models/Assignment";
import { createAuditLog } from "@/lib/audit";
import { updateAssignmentSchema } from "@/lib/validation/assignment";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ assignmentId: string }> }
) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { teacher, schoolId } = auth.context;
  const { assignmentId } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    return NextResponse.json({ success: false, error: "Invalid assignment ID." }, { status: 400 });
  }

  await connectToDatabase();

  const assignment = await Assignment.findOne({
    _id: assignmentId,
    schoolId,
    teacherId: teacher._id,
    isActive: true,
  })
    .populate("classId", "name code")
    .populate("sectionId", "name")
    .populate("subjectId", "name code")
    .populate("academicYearId", "name")
    .lean();

  if (!assignment) {
    return NextResponse.json(
      { success: false, error: "Assignment not found or access denied." },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: assignment });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ assignmentId: string }> }
) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { user, teacher, schoolId } = auth.context;
  const { assignmentId } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    return NextResponse.json({ success: false, error: "Invalid assignment ID." }, { status: 400 });
  }

  try {
    const body = await req.json();
    const validatedData = updateAssignmentSchema.parse(body);

    await connectToDatabase();

    const existingAssignment = await Assignment.findOne({
      _id: assignmentId,
      schoolId,
      teacherId: teacher._id,
      isActive: true,
    });

    if (!existingAssignment) {
      return NextResponse.json(
        { success: false, error: "Assignment not found or access denied." },
        { status: 404 }
      );
    }

    if (validatedData.title !== undefined) existingAssignment.title = validatedData.title;
    if (validatedData.description !== undefined) existingAssignment.description = validatedData.description;
    if (validatedData.assignedDate !== undefined) existingAssignment.assignedDate = new Date(validatedData.assignedDate);
    if (validatedData.dueDate !== undefined) existingAssignment.dueDate = new Date(validatedData.dueDate);
    if (validatedData.maximumMarks !== undefined) existingAssignment.maximumMarks = validatedData.maximumMarks ?? null;
    if (validatedData.attachments !== undefined) existingAssignment.attachments = validatedData.attachments as any;
    if (validatedData.status !== undefined) existingAssignment.status = validatedData.status;
    if (validatedData.isActive !== undefined) existingAssignment.isActive = validatedData.isActive;

    existingAssignment.updatedBy = user.id;
    await existingAssignment.save();

    await createAuditLog({
      userId: user.id,
      userRole: "TEACHER",
      action: "ASSIGNMENT_UPDATED",
      entityType: "ASSIGNMENT",
      entityId: existingAssignment._id.toString(),
      schoolId,
      metadata: {
        title: existingAssignment.title,
        updatedFields: Object.keys(validatedData),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Assignment updated successfully.",
      data: existingAssignment,
    });
  } catch (error: any) {
    console.error("Update assignment error:", error);
    if (error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: "Validation failed on update payload.", details: error.errors },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update assignment." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ assignmentId: string }> }
) {
  const auth = await requireTeacher(req);
  if (!auth.success) return auth.response;

  const { user, teacher, schoolId } = auth.context;
  const { assignmentId } = await context.params;

  if (!mongoose.Types.ObjectId.isValid(assignmentId)) {
    return NextResponse.json({ success: false, error: "Invalid assignment ID." }, { status: 400 });
  }

  await connectToDatabase();

  const existingAssignment = await Assignment.findOne({
    _id: assignmentId,
    schoolId,
    teacherId: teacher._id,
  });

  if (!existingAssignment) {
    return NextResponse.json(
      { success: false, error: "Assignment not found or access denied." },
      { status: 404 }
    );
  }

  existingAssignment.isActive = false;
  existingAssignment.updatedBy = user.id;
  await existingAssignment.save();

  await createAuditLog({
    userId: user.id,
    userRole: "TEACHER",
    action: "ASSIGNMENT_DELETED",
    entityType: "ASSIGNMENT",
    entityId: existingAssignment._id.toString(),
    schoolId,
    metadata: {
      title: existingAssignment.title,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Assignment deleted successfully.",
  });
}
