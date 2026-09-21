import { z } from "zod";

export const SCHOOL_PLANS = ["BASIC", "STANDARD", "PROFESSIONAL", "ENTERPRISE"] as const;
export type SchoolPlan = (typeof SCHOOL_PLANS)[number];

export const SCHOOL_STATUSES = ["ACTIVE", "INACTIVE", "SUSPENDED"] as const;
export type SchoolStatus = (typeof SCHOOL_STATUSES)[number];

export const SUBSCRIPTION_STATUSES = [
  "TRIAL",
  "ACTIVE",
  "EXPIRED",
  "SUSPENDED",
  "CANCELLED",
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const SCHOOL_MODULES = [
  "ATTENDANCE",
  "ASSIGNMENTS",
  "STUDY_MATERIAL",
  "EXAMS",
  "RESULTS",
  "FEES",
  "NOTICES",
  "NOTIFICATIONS",
  "TIMETABLE",
  "LEAVE",
  "REPORTS",
] as const;
export type SchoolModule = (typeof SCHOOL_MODULES)[number];

export const createSchoolSchema = z.object({
  name: z.string().trim().min(2, "School name must be at least 2 characters").max(100, "School name cannot exceed 100 characters"),
  code: z
    .string()
    .trim()
    .max(20, "School code cannot exceed 20 characters")
    .regex(
      /^[A-Za-z0-9_-]*$/,
      "School code can only contain alphanumeric characters, underscores, and dashes"
    )
    .transform((val) => val.toUpperCase())
    .optional()
    .or(z.literal("")),
  address: z.string().trim().optional().default(""),
  city: z.string().trim().optional().default(""),
  state: z.string().trim().optional().default(""),
  country: z.string().trim().optional().default("India"),
  phone: z.string().trim().optional().default(""),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal("")),
  logo: z.string().trim().optional().default(""),
  website: z.string().trim().optional().default(""),
  plan: z.enum(SCHOOL_PLANS).default("BASIC"),
  studentLimit: z.coerce.number().int().min(1, "Student limit must be at least 1").default(200),
  subscriptionStartDate: z
    .string()
    .or(z.date())
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
  subscriptionExpiryDate: z
    .string()
    .or(z.date())
    .optional()
    .transform((val) => {
      if (val) return new Date(val);
      const date = new Date();
      date.setMonth(date.getMonth() + 1); // Default 1 month trial
      return date;
    }),
  subscriptionStatus: z.enum(SUBSCRIPTION_STATUSES).default("TRIAL"),
  enabledModules: z
    .array(z.enum(SCHOOL_MODULES))
    .default(["ATTENDANCE", "ASSIGNMENTS", "EXAMS", "RESULTS", "FEES", "NOTICES"]),
  status: z.enum(SCHOOL_STATUSES).default("ACTIVE"),
});

export const updateSchoolSchema = createSchoolSchema
  .partial()
  .omit({ code: true }); // School code is protected from casual changes

export const updateSchoolStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "SUSPENDED"]),
});

export const schoolQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().optional().default(""),
  status: z.enum(["ALL", "ACTIVE", "INACTIVE", "SUSPENDED"]).default("ALL"),
  plan: z.enum(["ALL", "BASIC", "STANDARD", "PROFESSIONAL", "ENTERPRISE"]).default("ALL"),
  sortBy: z.enum(["createdAt", "name", "code", "studentLimit"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type CreateSchoolInput = z.infer<typeof createSchoolSchema>;
export type UpdateSchoolInput = z.infer<typeof updateSchoolSchema>;
export type UpdateSchoolStatusInput = z.infer<typeof updateSchoolStatusSchema>;
export type SchoolQueryParams = z.infer<typeof schoolQuerySchema>;
