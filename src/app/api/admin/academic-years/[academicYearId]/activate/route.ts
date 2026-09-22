import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import AcademicYear from "@/models/AcademicYear";
import AuditLog from "@/models/AuditLog";
import connectToDatabase from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ academicYearId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { academicYearId } = await params;

  if (!mongoose.Types.ObjectId.isValid(academicYearId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid academic year ID" } },
      { status: 400 }
    );
  }

  await connectToDatabase();

  const academicYear = await AcademicYear.findOne({ _id: academicYearId, schoolId });
  if (!academicYear) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Academic year not found" } },
      { status: 404 }
    );
  }

  // Deactivate all others for this school
  await AcademicYear.updateMany(
    { schoolId, status: "ACTIVE" },
    { $set: { status: "INACTIVE", updatedBy: user.id } }
  );

  // Activate the selected one
  academicYear.status = "ACTIVE";
  academicYear.updatedBy = user.id;
  await academicYear.save();

  // Audit log
  await AuditLog.create({
    userId: user.id,
    userRole: user.role,
    action: "ACADEMIC_YEAR_ACTIVATED",
    entityType: "ACADEMIC_YEAR",
    entityId: academicYearId,
    schoolId,
    metadata: {
      name: academicYear.name,
      status: "ACTIVE",
    },
  });

  return NextResponse.json({
    success: true,
    message: `Academic year '${academicYear.name}' is now active`,
    data: {
      id: academicYear._id.toString(),
      name: academicYear.name,
      status: "ACTIVE",
    },
  });
}
