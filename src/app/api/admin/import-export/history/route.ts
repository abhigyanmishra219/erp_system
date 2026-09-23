import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import connectToDatabase from "@/lib/db";
import ImportSession from "@/models/ImportSession";

export async function GET(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.max(1, Math.min(50, parseInt(url.searchParams.get("limit") || "10", 10)));
    const type = url.searchParams.get("type") || "ALL";

    await connectToDatabase();

    const query: Record<string, any> = { schoolId };
    if (type !== "ALL") {
      query.type = type;
    }

    const skip = (page - 1) * limit;

    const [total, sessions] = await Promise.all([
      ImportSession.countDocuments(query),
      ImportSession.find(query)
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      success: true,
      data: {
        sessions: sessions.map((s: any) => ({
          id: s._id.toString(),
          type: s.type,
          status: s.status,
          fileName: s.fileName,
          fileSize: s.fileSize,
          totalRows: s.totalRows,
          validRows: s.validRows,
          invalidRows: s.invalidRows,
          importedRows: s.importedRows,
          failedRows: s.failedRows,
          skippedRows: s.skippedRows,
          user: s.userId ? { name: (s.userId as any).name, email: (s.userId as any).email } : null,
          hasErrors: (s.validationErrors && s.validationErrors.length > 0) || s.failedRows > 0,
          createdAt: s.createdAt,
          completedAt: s.completedAt,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/import-export/history error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: err.message || "Failed to fetch import history" },
      },
      { status: 500 }
    );
  }
}
