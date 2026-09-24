/**
 * PNG Image Validation Utility
 * Strictly validates PNG magic numbers, IHDR chunks, dimensions, and file size on server-side.
 */

export interface PngValidationResult {
  isValid: boolean;
  error?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
  mimeType?: string;
}

// Official PNG Signature: 89 50 4E 47 0D 0A 1A 0A
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB
export const MAX_FAVICON_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB

export function validatePngBuffer(
  buffer: Buffer,
  options: {
    maxSizeBytes?: number;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    assetType?: "logo" | "favicon";
  } = {}
): PngValidationResult {
  const {
    maxSizeBytes = 2 * 1024 * 1024,
    minWidth = 1,
    minHeight = 1,
    maxWidth = 4096,
    maxHeight = 4096,
    assetType = "logo",
  } = options;

  if (!buffer || buffer.length === 0) {
    return { isValid: false, error: "Empty file received. Please provide a valid PNG file." };
  }

  // 1. File Size Verification
  if (buffer.length > maxSizeBytes) {
    const sizeMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    return {
      isValid: false,
      error: `File exceeds maximum allowed size of ${sizeMb} MB. Current size: ${(buffer.length / (1024 * 1024)).toFixed(2)} MB.`,
    };
  }

  // 2. Minimum length check for PNG Header (8 bytes) + IHDR Chunk (25 bytes: 4 length + 4 type + 13 data + 4 crc) = 33 bytes
  if (buffer.length < 33) {
    return { isValid: false, error: "Invalid or corrupted file. Not a valid PNG format." };
  }

  // 3. Binary Magic Number / Signature Verification
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (buffer[i] !== PNG_SIGNATURE[i]) {
      return {
        isValid: false,
        error: "Invalid file format. Only true PNG images (.png) with valid PNG signatures are permitted.",
      };
    }
  }

  // 4. IHDR Chunk Verification
  // Bytes 8-11: Length of IHDR data (should be 13 = 0x0000000d)
  const ihdrDataLength = buffer.readUInt32BE(8);
  // Bytes 12-15: Chunk Type (should be ASCII "IHDR")
  const ihdrChunkType = buffer.toString("ascii", 12, 16);

  if (ihdrChunkType !== "IHDR" || ihdrDataLength !== 13) {
    return {
      isValid: false,
      error: "Corrupted PNG header. The mandatory IHDR chunk is missing or malformed.",
    };
  }

  // Bytes 16-19: Image Width (UInt32 Big Endian)
  const width = buffer.readUInt32BE(16);
  // Bytes 20-23: Image Height (UInt32 Big Endian)
  const height = buffer.readUInt32BE(20);

  if (width <= 0 || height <= 0) {
    return {
      isValid: false,
      error: "Malformed PNG header: dimensions must be positive integers.",
    };
  }

  if (width < minWidth || height < minHeight) {
    return {
      isValid: false,
      error: `Image dimensions (${width}×${height}px) are smaller than minimum allowed (${minWidth}×${minHeight}px).`,
    };
  }

  if (width > maxWidth || height > maxHeight) {
    return {
      isValid: false,
      error: `Image dimensions (${width}×${height}px) exceed maximum allowed (${maxWidth}×${maxHeight}px).`,
    };
  }

  // Byte 24: Bit Depth (1, 2, 4, 8, 16)
  const bitDepth = buffer[24];
  // Byte 25: Color Type (0=Grayscale, 2=RGB, 3=Indexed, 4=Grayscale+Alpha, 6=RGBA)
  const colorType = buffer[25];

  const validColorTypes = [0, 2, 3, 4, 6];
  if (!validColorTypes.includes(colorType)) {
    return {
      isValid: false,
      error: `Invalid PNG color type ${colorType}.`,
    };
  }

  return {
    isValid: true,
    width,
    height,
    sizeBytes: buffer.length,
    mimeType: "image/png",
  };
}
