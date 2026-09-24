import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import ImportSession from "@/models/ImportSession";
import { ImportExecutor } from "@/lib/import/importExecutor";

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId, user } = auth.context;

  try {
    const body = await req.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "Session ID is required." } },
        { status: 400 }
      );
    }

    await connectToDatabase();

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

    // Idempotency: Return existing result if already completed
    if (session.status === "COMPLETED") {
      return NextResponse.json({
        success: true,
        data: {
          sessionId: session._id.toString(),
          status: "COMPLETED",
          totalRows: session.totalRows,
          importedRows: session.importedRows,
          failedRows: session.failedRows,
          skippedRows: session.skippedRows,
          alreadyCompleted: true,
        },
      });
    }

    if (session.status === "IMPORTING") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "IMPORT_IN_PROGRESS", message: "This import session is already currently executing." },
        },
        { status: 409 }
      );
    }

    if (session.status !== "VALIDATED") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "SESSION_NOT_VALIDATED", message: "Import data must be validated before confirmation." },
        },
        { status: 400 }
      );
    }

    const validDataList = (session.summary as any)?.validDataList || [];
    if (validDataList.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NO_VALID_ROWS", message: "There are no valid rows to import in this session." },
        },
        { status: 400 }
      );
    }

    // If importing students, check capacity before execution
    if (session.type === "STUDENTS") {
      const activeRows = validDataList.filter((r: any) => (r.data?.status || "ACTIVE") === "ACTIVE");
      const { checkStudentCapacity } = await import("@/lib/subscription-guard");
      const capacityCheck = await checkStudentCapacity(schoolId, activeRows.length);

      if (!capacityCheck.allowed) {
        return NextResponse.json(
          {
            success: false,
            error: "STUDENT_LIMIT_REACHED",
            message: `Importing ${activeRows.length} active students exceeds the subscription limit of ${capacityCheck.limit} (${capacityCheck.remaining} available slots, ${capacityCheck.currentCount} current active).`,
            limit: capacityCheck.limit,
            current: capacityCheck.currentCount,
            available: capacityCheck.remaining,
            requested: activeRows.length,
          },
          { status: 403 }
        );
      }
    }

    session.status = "IMPORTING";
    await session.save();

    // Execute Batch Import
    const execResult = await ImportExecutor.executeImport(
      session,
      validDataList,
      user.id,
      user.role
    );

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session._id.toString(),
        status: "COMPLETED",
        totalRows: execResult.totalRows,
        importedRows: execResult.importedRows,
        failedRows: execResult.failedRows,
        skippedRows: execResult.skippedRows,
        errors: execResult.errors,
      },
    });
  } catch (err: any) {
    console.error("POST /api/admin/import-export/confirm error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "IMPORT_EXECUTION_FAILED", message: err.message || "Failed to execute database import." },
      },
      { status: 500 }
    );
  }
}
