import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import Teacher from "@/models/Teacher";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;

  try {
    const { searchParams } = new URL(req.url);
    const teacherId = (searchParams.get("teacherId") || "").trim();
    const employeeId = (searchParams.get("employeeId") || "").trim();
    const excludeTeacherId = searchParams.get("excludeTeacherId");

    await connectToDatabase();

    const responseData: {
      teacherIdAvailable?: boolean;
      employeeIdAvailable?: boolean;
      teacherIdReason?: string;
      employeeIdReason?: string;
    } = {};

    if (teacherId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query: Record<string, any> = {
        schoolId,
        teacherId: {
          $regex: new RegExp(`^${teacherId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        },
      };
      if (excludeTeacherId) {
        query._id = { $ne: excludeTeacherId };
      }

      const existing = await Teacher.findOne(query).select("_id");
      responseData.teacherIdAvailable = !existing;
      if (existing) {
        responseData.teacherIdReason = "Teacher ID already in use in your school.";
      }
    }

    if (employeeId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query: Record<string, any> = {
        schoolId,
        employeeId: {
          $regex: new RegExp(`^${employeeId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        },
      };
      if (excludeTeacherId) {
        query._id = { $ne: excludeTeacherId };
      }

      const existing = await Teacher.findOne(query).select("_id");
      responseData.employeeIdAvailable = !existing;
      if (existing) {
        responseData.employeeIdReason = "Employee ID already in use in your school.";
      }
    }

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (err: unknown) {
    console.error("GET /api/admin/teachers/check-ids error:", err);
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: "Failed to validate IDs" } },
      { status: 500 }
    );
  }
}
