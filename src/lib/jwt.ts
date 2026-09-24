import jwt from "jsonwebtoken";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import type { UserRole } from "@/models/User";

export interface UserJWTPayload {
  userId: string;
  email: string;
  name?: string;
  role: UserRole;
}

const DEFAULT_JWT_EXPIRY = "7d";
const FALLBACK_DEV_SECRET = "fallback_secret_erp_key_do_not_use_in_prod";

/**
 * Safely resolves the JWT secret from environment variables.
 * Ensures the secret is trimmed and non-empty.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "WARNING: JWT_SECRET environment variable is not defined in production. Using fallback secret. Please configure JWT_SECRET in your production deployment settings."
    );
  }
  return FALLBACK_DEV_SECRET;
}

/**
 * Safely parses, validates, and normalizes the JWT expiration setting.
 * Accepts:
 * - String timespan expressions: "15m", "1h", "7d", "30d", "24h", "60s"
 * - Numeric seconds (number or numeric string like "604800")
 * - Handles accidental small integers (e.g. "7" -> "7d")
 * - Falls back safely to "7d" if invalid or undefined
 */
export function getJwtExpiresIn(customExpiresIn?: string | number): string | number {
  const raw = customExpiresIn !== undefined ? customExpiresIn : process.env.JWT_EXPIRES_IN;

  // If already a valid positive number (seconds)
  if (typeof raw === "number") {
    return raw > 0 ? Math.floor(raw) : 60 * 60 * 24 * 7;
  }

  if (!raw || typeof raw !== "string") {
    return DEFAULT_JWT_EXPIRY;
  }

  // Sanitize: strip surrounding quotes (single/double) and whitespace
  const sanitized = raw.trim().replace(/^["']|["']$/g, "").trim();

  if (!sanitized) {
    return DEFAULT_JWT_EXPIRY;
  }

  // If numeric string (e.g. "604800" or "86400" or "7")
  if (/^\d+$/.test(sanitized)) {
    const num = parseInt(sanitized, 10);
    // If a small integer (<= 30) was provided like "7" or "30", treat as days
    if (num <= 30) {
      return `${num}d`;
    }
    // Otherwise treat as total seconds
    return num;
  }

  // Validate timespan format: e.g. "15m", "1h", "7d", "30d", "24h", "60s"
  const timespanRegex = /^(\d+(\.\d+)?)\s*(ms|s|m|h|d|w|y|seconds?|minutes?|hours?|days?|weeks?|years?)$/i;
  if (timespanRegex.test(sanitized)) {
    return sanitized;
  }

  console.warn(
    `Invalid JWT_EXPIRES_IN value "${raw}". Falling back to default "${DEFAULT_JWT_EXPIRY}".`
  );
  return DEFAULT_JWT_EXPIRY;
}

/**
 * Creates and signs a new JWT token.
 * @param payload - User data to embed in token (userId, email, name, role)
 * @param expiresIn - Token expiry (defaults to validated JWT_EXPIRES_IN or "7d")
 */
export function createToken(
  payload: UserJWTPayload,
  expiresIn?: string | number
): string {
  const secret = getJwtSecret();
  const validExpiresIn = getJwtExpiresIn(expiresIn);

  // Clean payload: ensure no conflicting exp / iat claims are present in payload body
  const cleanPayload = {
    userId: payload.userId,
    email: payload.email,
    ...(payload.name ? { name: payload.name } : {}),
    role: payload.role,
  };

  const options: SignOptions = {
    expiresIn: validExpiresIn as SignOptions["expiresIn"],
  };

  return jwt.sign(cleanPayload, secret, options);
}

/**
 * Verifies and decodes a JWT token.
 * @param token - Bearer JWT token string
 * @returns Decoded payload or null if invalid/expired
 */
export function verifyToken(token: string): (UserJWTPayload & JwtPayload) | null {
  try {
    if (!token || typeof token !== "string") {
      return null;
    }
    const secret = getJwtSecret();
    const decoded = jwt.verify(token.trim(), secret);
    return decoded as UserJWTPayload & JwtPayload;
  } catch {
    return null;
  }
}
