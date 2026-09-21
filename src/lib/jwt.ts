import jwt from "jsonwebtoken";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import type { UserRole } from "@/models/User";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_erp_key_do_not_use_in_prod";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export interface UserJWTPayload {
  userId: string;
  email: string;
  name?: string;
  role: UserRole;
}

/**
 * Creates and signs a new JWT token
 * @param payload - User data to embed in token (userId, email, name, role)
 * @param expiresIn - Token expiry (defaults to 7d)
 */
export function createToken(
  payload: UserJWTPayload,
  expiresIn: string | number = JWT_EXPIRES_IN
): string {
  const options: SignOptions = {
    expiresIn: expiresIn as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, JWT_SECRET, options);
}

/**
 * Verifies and decodes a JWT token
 * @param token - Bearer JWT token string
 * @returns Decoded payload or null if invalid/expired
 */
export function verifyToken(token: string): (UserJWTPayload & JwtPayload) | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded as UserJWTPayload & JwtPayload;
  } catch {
    return null;
  }
}
