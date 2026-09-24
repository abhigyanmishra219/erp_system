import fs from "fs/promises";
import path from "path";

export interface SaveAssetResult {
  url: string;
  relativePath: string;
  filename: string;
  sizeBytes: number;
}

export interface IStorageService {
  saveBrandingAsset(
    schoolId: string,
    assetType: "logo" | "favicon",
    buffer: Buffer,
    originalFilename?: string
  ): Promise<SaveAssetResult>;
  deleteBrandingAsset(urlOrPath: string): Promise<boolean>;
}

/**
 * Local Disk Storage Provider Implementation
 * Stores files under public/uploads/branding/[schoolId]/ and serves them via static URL path /uploads/branding/[schoolId]/...
 */
export class LocalDiskStorageService implements IStorageService {
  private baseDir: string;
  private publicUrlPrefix: string;

  constructor(baseDir: string = path.join(process.cwd(), "public", "uploads", "branding"), publicUrlPrefix: string = "/uploads/branding") {
    this.baseDir = baseDir;
    this.publicUrlPrefix = publicUrlPrefix;
  }

  /**
   * Saves a validated PNG branding asset for a school tenant.
   * Cleans up any existing asset of the same type for that school to prevent orphan files.
   */
  async saveBrandingAsset(
    schoolId: string,
    assetType: "logo" | "favicon",
    buffer: Buffer,
    originalFilename?: string
  ): Promise<SaveAssetResult> {
    // Sanitize schoolId to prevent directory traversal
    const safeSchoolId = schoolId.replace(/[^a-zA-Z0-9_-]/g, "");
    const schoolDir = path.join(this.baseDir, safeSchoolId);

    // Ensure directory exists
    await fs.mkdir(schoolDir, { recursive: true });

    // Clean up older assets of the same type
    try {
      const existingFiles = await fs.readdir(schoolDir);
      for (const file of existingFiles) {
        if (file.startsWith(`${assetType}-`)) {
          await fs.unlink(path.join(schoolDir, file)).catch(() => {});
        }
      }
    } catch {
      // Directory read error can be ignored
    }

    const timestamp = Date.now();
    const filename = `${assetType}-${timestamp}.png`;
    const filePath = path.join(schoolDir, filename);

    await fs.writeFile(filePath, buffer);

    const relativePath = `${safeSchoolId}/${filename}`;
    const url = `${this.publicUrlPrefix}/${safeSchoolId}/${filename}`;

    return {
      url,
      relativePath,
      filename,
      sizeBytes: buffer.length,
    };
  }

  /**
   * Deletes a branding asset from storage if it exists.
   */
  async deleteBrandingAsset(urlOrPath: string): Promise<boolean> {
    if (!urlOrPath) return false;

    try {
      // Extract the relative path from URL (e.g. /uploads/branding/123/logo-xxx.png -> 123/logo-xxx.png)
      let relativePath = urlOrPath;
      if (urlOrPath.startsWith(this.publicUrlPrefix)) {
        relativePath = urlOrPath.substring(this.publicUrlPrefix.length).replace(/^\/+/, "");
      }

      // Sanitize path to prevent directory traversal outside baseDir
      const normalizedPath = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, "");
      const fullPath = path.join(this.baseDir, normalizedPath);

      // Verify that the target path is inside baseDir
      if (!fullPath.startsWith(path.normalize(this.baseDir))) {
        return false;
      }

      await fs.unlink(fullPath);
      return true;
    } catch {
      // If file doesn't exist or already removed, return false safely
      return false;
    }
  }
}

// Global default storage service instance
export const storageService: IStorageService = new LocalDiskStorageService();
