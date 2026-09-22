import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Parent from "@/models/Parent";
import User from "@/models/User";
import AuditLog from "@/models/AuditLog";

const parentStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ parentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;
  const { parentId } = await params;

  try {
    const body = await req.json();
    const validatedData = parentStatusSchema.parse(body);

    await connectToDatabase();

    const parent = await Parent.findOne({ _id: parentId, schoolId });

    if (!parent) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Parent not found" },
        },
        { status: 404 }
      );
    }

    const previousStatus = parent.status;
    parent.status = validatedData.status;

    if (parent.userId) {
      const parentUser = await User.findOne({ _id: parent.userId, schoolId });
      if (parentUser) {
        parentUser.isActive = validatedData.status === "ACTIVE";
        await parentUser.save();
      }
    }

    parent.updatedBy = user.id;
    await parent.save();

    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "PARENT_STATUS_CHANGED",
      entityType: "PARENT",
      entityId: parent._id.toString(),
      schoolId,
      metadata: {
        parentId: parent._id.toString(),
        email: parent.email,
        previousStatus,
        newStatus: validatedData.status,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: parent._id.toString(),
        status: parent.status,
      },
    });
  } catch (err: unknown) {
    console.error("PATCH /api/admin/parents/[parentId]/status error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: "Failed to update parent status" },
      },
      { status: 500 }
    );
  }
}
