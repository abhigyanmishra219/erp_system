import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import ImportSession from "@/models/ImportSession";
import { ColumnMapper } from "@/lib/import/columnMapper";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId, user } = auth.context;

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    const filter = url.searchParams.get("filter") || "ALL"; // ALL | VALID | ERRORS
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get("limit") || "20", 10)));

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: { code: "MISSING_SESSION_ID", message: "sessionId query parameter is required." } },
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

    const mapping = session.columnMapping instanceof Map
      ? Object.fromEntries(session.columnMapping)
      : (session.columnMapping as Record<string, string>);

    // Create error lookup by row number
    const errorsByRow = new Map<number, any[]>();
    for (const err of session.validationErrors) {
      const list = errorsByRow.get(err.rowNumber) || [];
      list.push(err);
      errorsByRow.set(err.rowNumber, list);
    }

    // Build preview list
    const previewRows = session.rowsData.map((r: any) => {
      const rowErrors = errorsByRow.get(r.rowNumber) || [];
      const transformedData = ColumnMapper.transformRow(r.rawValues, mapping);
      return {
        rowNumber: r.rowNumber,
        status: rowErrors.length > 0 ? "ERROR" : "VALID",
        errors: rowErrors,
        data: transformedData,
      };
    });

    // Apply Filter
    let filteredRows = previewRows;
    if (filter === "VALID") {
      filteredRows = previewRows.filter((r) => r.status === "VALID");
    } else if (filter === "ERRORS") {
      filteredRows = previewRows.filter((r) => r.status === "ERROR");
    }

    const totalFiltered = filteredRows.length;
    const totalPages = Math.ceil(totalFiltered / limit) || 1;
    const paginatedRows = filteredRows.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session._id.toString(),
        type: session.type,
        fileName: session.fileName,
        status: session.status,
        totalRows: session.totalRows,
        validRows: session.validRows,
        invalidRows: session.invalidRows,
        summary: {
          total: session.totalRows,
          valid: session.validRows,
          invalid: session.invalidRows,
        },
        rows: paginatedRows,
        pagination: {
          page,
          limit,
          total: totalFiltered,
          totalPages,
        },
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/import-export/preview error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: err.message || "Failed to fetch import preview" },
      },
      { status: 500 }
    );
  }
}
