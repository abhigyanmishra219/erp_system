import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { TemplateGenerator } from "@/lib/import/templateGenerator";
import { ImportType } from "@/models/ImportSession";
import { IMPORT_CONFIGS } from "@/lib/import/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  try {
    const { type } = await params;
    const upperType = type.toUpperCase() as ImportType;

    const config = IMPORT_CONFIGS[upperType];
    if (!config) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_IMPORT_TYPE",
            message: `Unsupported template type '${type}'. Supported types: STUDENTS, PARENTS, TEACHERS, CLASSES, SECTIONS, FEES.`,
          },
        },
        { status: 400 }
      );
    }

    const buffer = await TemplateGenerator.generateTemplateBuffer(upperType);

    return new NextResponse(buffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${config.templateFileName}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err: any) {
    console.error("GET /api/admin/import-export/templates/[type] error:", err);
    return NextResponse.json(
      {
        success: false,
        error: { code: "SERVER_ERROR", message: err.message || "Failed to generate Excel template" },
      },
      { status: 500 }
    );
  }
}
