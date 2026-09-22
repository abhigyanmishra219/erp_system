/**
 * Standard email normalization utility for the entire ERP application.
 * Trims leading/trailing whitespace and converts to lowercase.
 */
export function normalizeEmail(email?: string | null): string {
  if (!email || typeof email !== "string") {
    return "";
  }
  return email.trim().toLowerCase();
}
