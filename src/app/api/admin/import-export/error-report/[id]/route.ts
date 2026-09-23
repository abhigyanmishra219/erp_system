import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import ImportSession from "@/models/ImportSession";
import { ErrorReportGenerator } from "@/lib/import/errorReportGenerator";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId, user } = auth.context;

  try {
    const { id } = await params;

    await connectToDatabase();

    const session = await ImportSession.findOne({ _id: id, schoolId, userId: user.id });
    if (!session) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "SESSION_NOT_FOUND", message: "Import session not found or access denied." },
        },
        { status: 404 }
      );
    }

    if (!session.validationErrors || session.validationErrors.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NO_ERRORS", message: "No validation errors found for this import session." },
        },
        { status: 400 }
      );
    }

    const buffer = await ErrorReportGenerator.generateErrorReportBuffer(
      session.type,
      session.fileName,
      session.validationErrors
    );

    const safeName = session.fileName.replace(/\.[^/.]+$/, "");
    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="error-report-${safeName}.xlsx"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/import-export/error-report/[id] error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: err.message || "Failed to generate error report" },
      },
      { status: 500 }
    );
  }
}
