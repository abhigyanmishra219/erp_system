import { z } from "zod";
import { SCHOOL_PLANS, SUBSCRIPTION_STATUSES, SCHOOL_MODULES } from "./school";

export const updateSubscriptionSchema = z.object({
  plan: z.string().trim().toUpperCase().min(2).optional(),
  studentLimit: z.coerce.number().int().min(1, "Student limit must be at least 1").optional(),
  subscriptionStartDate: z
    .string()
    .or(z.date())
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  subscriptionExpiryDate: z
    .string()
    .or(z.date())
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  subscriptionStatus: z.enum(SUBSCRIPTION_STATUSES).optional(),
  enabledModules: z.array(z.enum(SCHOOL_MODULES)).min(1, "At least one module must be enabled").optional(),
  reason: z.string().trim().max(300).optional(),
}).refine(
  (data) => {
    if (data.subscriptionStartDate && data.subscriptionExpiryDate) {
      return data.subscriptionStartDate <= data.subscriptionExpiryDate;
    }
    return true;
  },
  {
    message: "Subscription start date must be before or equal to expiry date.",
    path: ["subscriptionExpiryDate"],
  }
);

export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
