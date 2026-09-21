import { z } from "zod";
import { AUDIT_ACTIONS } from "@/lib/constants/audit";

export const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional().default(""),
  action: z.string().trim().optional().default("ALL"),
  entityType: z.enum(["ALL", "SCHOOL", "USER", "PLAN", "SUBSCRIPTION", "PLATFORM"]).default("ALL"),
  schoolId: z.string().trim().optional(),
  userId: z.string().trim().optional(),
  startDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .optional()
    .transform((val) => {
      if (!val) return undefined;
      const d = new Date(val);
      d.setHours(23, 59, 59, 999);
      return d;
    }),
  sortBy: z.enum(["createdAt", "action", "entityType"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type AuditLogQueryParams = z.infer<typeof auditLogQuerySchema>;
export { AUDIT_ACTIONS };
