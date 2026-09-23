import { z } from "zod";
import { FEE_FREQUENCIES } from "@/models/FeeStructure";
import { PAYMENT_METHODS } from "@/models/FeePayment";

export const feeFrequencyEnum = z.enum([
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "ANNUAL",
  "INSTALLMENT",
]);

export const feeReductionTypeEnum = z.enum(["FIXED", "PERCENTAGE", "NONE"]);

export const paymentMethodEnum = z.enum([
  "CASH",
  "BANK_TRANSFER",
  "CHEQUE",
  "UPI",
  "OTHER",
]);

export const feeInstallmentSchema = z.object({
  name: z.string().min(1, "Installment name is required").trim(),
  amount: z.coerce.number().min(0, "Installment amount cannot be negative"),
  dueDate: z.coerce.date(),
  sequence: z.coerce.number().int().min(1),
});

export const createFeeCategorySchema = z.object({
  name: z.string().min(1, "Fee category name is required").max(100).trim(),
  code: z.string().min(1, "Fee category code is required").max(50).trim().toUpperCase(),
  description: z.string().max(500).optional().default(""),
  isActive: z.boolean().optional().default(true),
});

export const updateFeeCategorySchema = z.object({
  name: z.string().min(1, "Fee category name is required").max(100).trim().optional(),
  code: z.string().min(1, "Fee category code is required").max(50).trim().toUpperCase().optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

export const createFeeStructureSchema = z.object({
  academicYearId: z.string().min(1, "Academic Year is required"),
  feeCategoryId: z.string().min(1, "Fee Category is required"),
  name: z.string().min(1, "Fee Structure name is required").max(120).trim(),
  description: z.string().max(500).optional().default(""),
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional().nullable().default(null),
  amount: z.coerce.number().min(1, "Fee amount must be greater than zero"),
  frequency: feeFrequencyEnum.default("ANNUAL"),
  installments: z.array(feeInstallmentSchema).optional().default([]),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().optional(),
  isActive: z.boolean().optional().default(true),
}).refine(
  (data) => {
    if (data.frequency === "INSTALLMENT") {
      if (!data.installments || data.installments.length === 0) return false;
      const sum = data.installments.reduce((acc, curr) => acc + curr.amount, 0);
      return Math.abs(sum - data.amount) < 0.01;
    }
    return true;
  },
  {
    message: "Sum of installment amounts must equal the total fee amount",
    path: ["installments"],
  }
);

export const updateFeeStructureSchema = z.object({
  name: z.string().min(1, "Fee Structure name is required").max(120).trim().optional(),
  description: z.string().max(500).optional(),
  amount: z.coerce.number().min(1, "Fee amount must be greater than zero").optional(),
  frequency: feeFrequencyEnum.optional(),
  installments: z.array(feeInstallmentSchema).optional(),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

export const studentAssignmentOverrideSchema = z.object({
  studentId: z.string().min(1, "Student ID is required"),
  discountType: feeReductionTypeEnum.optional().default("NONE"),
  discountValue: z.coerce.number().min(0).optional().default(0),
  concessionReason: z.string().max(200).optional().default(""),
  concessionType: feeReductionTypeEnum.optional().default("NONE"),
  concessionValue: z.coerce.number().min(0).optional().default(0),
});

export const assignFeeSchema = z.object({
  academicYearId: z.string().min(1, "Academic Year is required"),
  feeStructureId: z.string().min(1, "Fee Structure is required"),
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional().nullable(),
  studentIds: z.array(z.string().min(1)).min(1, "At least one student must be selected"),
  overrides: z.array(studentAssignmentOverrideSchema).optional().default([]),
});

export const recordPaymentSchema = z.object({
  academicYearId: z.string().min(1, "Academic Year is required"),
  studentId: z.string().min(1, "Student ID is required"),
  feeAccountId: z.string().min(1, "Fee Account is required"),
  amount: z.coerce.number().min(1, "Payment amount must be greater than zero"),
  paymentDate: z.coerce.date().default(() => new Date()),
  paymentMethod: paymentMethodEnum,
  transactionId: z.string().max(100).optional().default(""),
  remarks: z.string().max(500).optional().default(""),
});
