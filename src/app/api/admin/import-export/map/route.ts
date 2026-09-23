import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import ImportSession from "@/models/ImportSession";
import { ColumnMapper } from "@/lib/import/columnMapper";

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId, user } = auth.context;

  try {
    const body = await req.json();
    const { sessionId, mapping } = body;

    if (!sessionId || !mapping || typeof mapping !== "object") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "Session ID and column mapping are required." } },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Verify session tenant ownership
    const session = await ImportSession.findOne({ _id: sessionId, schoolId, userId: user.id });
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "SESSION_NOT_FOUND", message: "Import session not found or access denied." },
        },
        { status: 404 }
      );
    }

    // Check required fields
    const validation = ColumnMapper.validateRequiredMappings(session.type, mapping);
    if (!validation.valid) {
      const missingNames = validation.missingRequiredFields.map((f) => f.label).join(", ");
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "REQUIRED_MAPPING_MISSING",
            message: `Required field(s) unmapped: ${missingNames}. Please map all required columns before proceeding.`,
            details: validation.missingRequiredFields,
          },
        },
        { status: 400 }
      );
    }

    session.columnMapping = mapping;
    session.status = "MAPPED";
    await session.save();

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session._id.toString(),
        status: session.status,
        columnMapping: session.columnMapping,
      },
    });
  } catch (err: any) {
    console.error("POST /api/admin/import-export/map error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: err.message || "Failed to update column mapping" },
      },
      { status: 500 }
    );
  }
}
