import { NextRequest, NextResponse } from "next/server";
import { requireParent } from "@/lib/auth/requireParent";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

    const { linkedChildren } = auth.context;

    return NextResponse.json({
      success: true,
      data: {
        children: linkedChildren.map((item) => ({
          studentId: item.studentId,
          student: {
            _id: item.student._id.toString(),
            firstName: item.student.firstName,
            lastName: item.student.lastName,
            fullName: `${item.student.firstName} ${item.student.lastName}`.trim(),
            admissionNumber: item.student.admissionNumber,
            rollNumber: item.student.rollNumber || "",
            gender: item.student.gender,
            dateOfBirth: item.student.dateOfBirth,
            photo: (item.student as any).photo || null,
            class: (item.student.classId as any)?.name || "N/A",
            section: (item.student.sectionId as any)?.name || "N/A",
            academicYear: (item.student.academicYearId as any)?.name || "Current Session",
          },
          relationship: item.relationship,
          isPrimaryGuardian: item.isPrimaryGuardian,
          isEmergencyContact: item.isEmergencyContact,
          canPickup: item.canPickup,
          notes: item.notes || "",
        })),
        totalChildren: linkedChildren.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "SERVER_ERROR",
          message: error.message || "Failed to fetch linked children",
        },
      },
      { status: 500 }
    );
  }
}
