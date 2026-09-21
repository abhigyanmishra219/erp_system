import AuditLog, { AuditAction } from "@/models/AuditLog";
import { UserRole } from "@/lib/constants/roles";
import connectToDatabase from "@/lib/db";

export interface CreateAuditLogParams {
  userId: string;
  userRole: UserRole;
  action: AuditAction | string;
  entityType: "SCHOOL" | "USER" | "PLATFORM" | string;
  entityId?: string;
  schoolId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Reusable server-side helper to record system audit logs.
 * Never stores passwords, tokens, or sensitive credentials.
 * Fails safely with logging without disrupting the primary business operation.
 */
export async function createAuditLog(params: CreateAuditLogParams): Promise<void> {
  try {
    await connectToDatabase();

    // Sanitize metadata to guarantee no secrets/tokens are logged
    const sanitizedMetadata: Record<string, unknown> = {};
    if (params.metadata && typeof params.metadata === "object") {
      for (const [key, value] of Object.entries(params.metadata)) {
        if (!/password|token|secret|jwt|hash/i.test(key)) {
          sanitizedMetadata[key] = value;
        }
      }
    }

    await AuditLog.create({
      userId: params.userId,
      userRole: params.userRole,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId || null,
      schoolId: params.schoolId || null,
      metadata: sanitizedMetadata,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Audit log recording failure:", error);
    // Non-blocking: Primary operation succeeds even if logging fails
  }
}
