/**
 * File Storage Service Abstraction for School ERP
 *
 * Implements safe validation, sanitization, and URL abstraction for external resources
 * and prepares storage hooks for local or cloud object storage.
 */

export interface AttachmentMetadata {
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  type: "FILE" | "EXTERNAL_LINK";
}

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "video/mp4",
  "video/webm",
];

export const MAX_ATTACHMENT_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export class FileStorageService {
  /**
   * Validates whether a provided external or internal URL is safe and valid HTTP/HTTPS
   */
  static validateUrl(rawUrl: string): boolean {
    try {
      const parsed = new URL(rawUrl);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  /**
   * Sanitizes attachment payload and ensures secure protocol usage
   */
  static sanitizeAttachment(attachment: {
    name: string;
    url: string;
    mimeType?: string;
    size?: number;
    type?: "FILE" | "EXTERNAL_LINK";
  }): AttachmentMetadata {
    if (!this.validateUrl(attachment.url)) {
      throw new Error("Invalid or unsafe attachment URL. Only HTTP and HTTPS protocols are permitted.");
    }

    const sanitizedName = attachment.name.replace(/[/\\?%*:|"<>]/g, "").trim().slice(0, 200);

    return {
      name: sanitizedName || "Resource",
      url: attachment.url.trim(),
      mimeType: attachment.mimeType?.trim() || "",
      size: attachment.size && attachment.size > 0 ? attachment.size : undefined,
      type: attachment.type || "EXTERNAL_LINK",
    };
  }
}
