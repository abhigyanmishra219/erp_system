import { z } from "zod";
import { SCHOOL_MODULES } from "./school";

export const BILLING_PERIODS = ["MONTHLY", "QUARTERLY", "YEARLY"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export const createPlanSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Plan name must be at least 2 characters")
    .max(60, "Plan name cannot exceed 60 characters"),
  code: z
    .string()
    .trim()
    .min(2, "Plan code must be at least 2 characters")
    .max(30, "Plan code cannot exceed 30 characters")
    .regex(
      /^[A-Z0-9_-]+$/,
      "Plan code can only contain uppercase letters, numbers, hyphens, and underscores"
    )
    .transform((val) => val.toUpperCase()),
  description: z.string().trim().max(500, "Description cannot exceed 500 characters").default(""),
  maxStudents: z.coerce.number().int().min(1, "Max students must be at least 1"),
  storageLimit: z.coerce.number().int().min(100, "Storage limit must be at least 100 MB"),
  maxAdmins: z.coerce.number().int().min(1, "Max admins must be at least 1").default(2),
  enabledModules: z
    .array(z.enum(SCHOOL_MODULES))
    .min(1, "At least one module must be selected"),
  price: z.coerce.number().min(0, "Price cannot be negative"),
  currency: z.string().trim().toUpperCase().default("INR"),
  billingPeriod: z.enum(BILLING_PERIODS).default("YEARLY"),
  isActive: z.boolean().default(true),
});

export const updatePlanSchema = createPlanSchema.partial().omit({ code: true });

export const planQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional().default(""),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
  sortBy: z.enum(["createdAt", "name", "code", "price", "maxStudents"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreatePlanInput = z.infer<typeof createPlanSchema>;
export type UpdatePlanInput = z.infer<typeof updatePlanSchema>;
export type PlanQueryParams = z.infer<typeof planQuerySchema>;
