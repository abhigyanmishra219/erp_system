import { NextRequest, NextResponse } from "next/server";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import { validatePngBuffer, MAX_LOGO_SIZE_BYTES, MAX_FAVICON_SIZE_BYTES } from "@/lib/validation/imageValidation";
import { storageService } from "@/lib/storage";
import AuditLog from "@/models/AuditLog";

export async function POST(req: NextRequest) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { user, schoolId } = auth.context;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const assetType = ((formData.get("type") as string) || "").toLowerCase();

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "NO_FILE_PROVIDED", message: "Please select a PNG file to upload." } },
        { status: 400 }
      );
    }

    if (assetType !== "logo" && assetType !== "favicon") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_ASSET_TYPE",
            message: "Asset type must be either 'logo' or 'favicon'.",
          },
        },
        { status: 400 }
      );
    }

    // 1. Filename extension check
    const originalName = file.name || "";
    if (!originalName.toLowerCase().endsWith(".png")) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_FILE_EXTENSION",
            message: "Only PNG image files (.png) are supported. JPG, SVG, WEBP, and other formats are not accepted.",
          },
        },
        { status: 400 }
      );
    }

    // 2. MIME type check
    if (file.type && file.type !== "image/png") {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_MIME_TYPE",
            message: `Invalid MIME type '${file.type}'. Only 'image/png' is accepted.`,
          },
        },
        { status: 400 }
      );
    }

    // 3. Read buffer and validate PNG binary contents & headers
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const maxSizeBytes = assetType === "logo" ? MAX_LOGO_SIZE_BYTES : MAX_FAVICON_SIZE_BYTES;
    const validation = validatePngBuffer(buffer, {
      maxSizeBytes,
      assetType,
      minWidth: assetType === "favicon" ? 16 : 32,
      minHeight: assetType === "favicon" ? 16 : 32,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_FAILED",
            message: validation.error || "The uploaded file is not a valid PNG image.",
          },
        },
        { status: 400 }
      );
    }

    // 4. Save to tenant-isolated storage
    const saveResult = await storageService.saveBrandingAsset(
      schoolId.toString(),
      assetType,
      buffer,
      originalName
    );

    // 5. Audit Log
    await AuditLog.create({
      userId: user.id,
      userRole: user.role,
      action: "SCHOOL_BRANDING_ASSET_UPLOADED",
      entityType: "SCHOOL",
      entityId: schoolId,
      schoolId: schoolId,
      metadata: {
        assetType,
        fileName: originalName,
        storedUrl: saveResult.url,
        fileSizeBytes: saveResult.sizeBytes,
        width: validation.width,
        height: validation.height,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${assetType === "logo" ? "School Logo" : "Favicon"} uploaded successfully.`,
      data: {
        url: saveResult.url,
        assetType,
        fileName: originalName,
        sizeBytes: saveResult.sizeBytes,
        dimensions: {
          width: validation.width,
          height: validation.height,
        },
      },
    });
  } catch (err: any) {
    console.error("POST /api/admin/settings/branding/upload error:", err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UPLOAD_FAILED",
          message: err instanceof Error ? err.message : "Failed to process PNG upload.",
        },
      },
      { status: 500 }
    );
  }
}
