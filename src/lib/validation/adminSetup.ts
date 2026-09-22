import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid ID format",
});

// 1. School Profile Validation
export const updateSchoolProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "School name must be at least 2 characters")
    .max(150, "School name cannot exceed 150 characters"),
  address: z.string().trim().max(300, "Address cannot exceed 300 characters").optional().default(""),
  city: z.string().trim().max(100, "City cannot exceed 100 characters").optional().default(""),
  state: z.string().trim().max(100, "State cannot exceed 100 characters").optional().default(""),
  country: z.string().trim().max(100, "Country cannot exceed 100 characters").optional().default("India"),
  phone: z.string().trim().max(30, "Phone cannot exceed 30 characters").optional().default(""),
  email: z
    .string()
    .trim()
    .max(100)
    .refine((val) => val === "" || z.string().email().safeParse(val).success, {
      message: "Please provide a valid email address",
    })
    .optional()
    .default(""),
  website: z
    .string()
    .trim()
    .max(150)
    .refine((val) => val === "" || /^https?:\/\/.+/i.test(val) || /^[\w-]+\.[\w.-]+/i.test(val), {
      message: "Please provide a valid website URL",
    })
    .optional()
    .default(""),
});

export type UpdateSchoolProfileInput = z.infer<typeof updateSchoolProfileSchema>;

// 2. School Branding Validation
export const updateBrandingSchema = z.object({
  logo: z.string().trim().max(1000).optional().default(""),
  favicon: z.string().trim().max(1000).optional().default(""),
  primaryColor: z
    .string()
    .trim()
    .max(50)
    .refine((val) => val === "" || /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(val) || /^(rgb|hsl)/i.test(val), {
      message: "Invalid primary color format (use Hex, RGB, or HSL)",
    })
    .optional()
    .default(""),
  secondaryColor: z
    .string()
    .trim()
    .max(50)
    .refine((val) => val === "" || /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(val) || /^(rgb|hsl)/i.test(val), {
      message: "Invalid secondary color format (use Hex, RGB, or HSL)",
    })
    .optional()
    .default(""),
});

export type UpdateBrandingInput = z.infer<typeof updateBrandingSchema>;

// 3. Academic Year Validation
export const createAcademicYearSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Academic year name must be at least 2 characters (e.g. 2026-27)")
      .max(50, "Academic year name cannot exceed 50 characters"),
    startDate: z.string().or(z.date()).transform((val) => new Date(val)),
    endDate: z.string().or(z.date()).transform((val) => new Date(val)),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional().default("INACTIVE"),
  })
  .refine((data) => data.startDate < data.endDate, {
    message: "Start date must be earlier than end date",
    path: ["endDate"],
  });

export const updateAcademicYearSchema = z
  .object({
    name: z.string().trim().min(2).max(50).optional(),
    startDate: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
    endDate: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.startDate < data.endDate;
      }
      return true;
    },
    {
      message: "Start date must be earlier than end date",
      path: ["endDate"],
    }
  );

export type CreateAcademicYearInput = z.infer<typeof createAcademicYearSchema>;
export type UpdateAcademicYearInput = z.infer<typeof updateAcademicYearSchema>;

// 4. Class Validation
export const createClassSchema = z.object({
  academicYearId: objectIdSchema,
  name: z
    .string()
    .trim()
    .min(1, "Class name is required (e.g. Class 10, Grade 1, Nursery)")
    .max(80, "Class name cannot exceed 80 characters"),
  code: z.string().trim().max(20).optional().default(""),
  displayOrder: z.number().int().optional().default(0),
});

export const updateClassSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  code: z.string().trim().max(20).optional(),
  displayOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

export type CreateClassInput = z.infer<typeof createClassSchema>;
export type UpdateClassInput = z.infer<typeof updateClassSchema>;

// 5. Section Validation
export const createSectionSchema = z.object({
  academicYearId: objectIdSchema,
  classId: objectIdSchema,
  name: z
    .string()
    .trim()
    .min(1, "Section name is required (e.g. A, B, Red, Blue)")
    .max(50, "Section name cannot exceed 50 characters"),
  code: z.string().trim().max(20).optional().default(""),
  capacity: z.number().int().min(1, "Capacity must be at least 1").optional().default(40),
});

export const updateSectionSchema = z.object({
  name: z.string().trim().min(1).max(50).optional(),
  code: z.string().trim().max(20).optional(),
  capacity: z.number().int().min(1).optional(),
  isActive: z.boolean().optional(),
});

export type CreateSectionInput = z.infer<typeof createSectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;

// 6. Subject Validation
export const createSubjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Subject name is required (e.g. Mathematics)")
    .max(100, "Subject name cannot exceed 100 characters"),
  code: z
    .string()
    .trim()
    .min(1, "Subject code is required (e.g. MATH)")
    .max(20, "Subject code cannot exceed 20 characters")
    .transform((val) => val.toUpperCase()),
  description: z.string().trim().max(300).optional().default(""),
  subjectType: z.enum(["CORE", "ELECTIVE"]).optional().default("CORE"),
});

export const updateSubjectSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  code: z.string().trim().min(1).max(20).transform((val) => val.toUpperCase()).optional(),
  description: z.string().trim().max(300).optional(),
  subjectType: z.enum(["CORE", "ELECTIVE"]).optional(),
  isActive: z.boolean().optional(),
});

export type CreateSubjectInput = z.infer<typeof createSubjectSchema>;
export type UpdateSubjectInput = z.infer<typeof updateSubjectSchema>;

// 7. Class-Subject Assignment Validation
export const createClassSubjectSchema = z
  .object({
    academicYearId: objectIdSchema,
    subjectId: objectIdSchema,
    maximumMarks: z.number().min(1, "Maximum marks must be greater than 0").default(100),
    passingMarks: z.number().min(0, "Passing marks cannot be negative").default(33),
  })
  .refine((data) => data.passingMarks <= data.maximumMarks, {
    message: "Passing marks cannot exceed maximum marks",
    path: ["passingMarks"],
  });

export const updateClassSubjectSchema = z
  .object({
    maximumMarks: z.number().min(1).optional(),
    passingMarks: z.number().min(0).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.maximumMarks !== undefined && data.passingMarks !== undefined) {
        return data.passingMarks <= data.maximumMarks;
      }
      return true;
    },
    {
      message: "Passing marks cannot exceed maximum marks",
      path: ["passingMarks"],
    }
  );

export type CreateClassSubjectInput = z.infer<typeof createClassSubjectSchema>;
export type UpdateClassSubjectInput = z.infer<typeof updateClassSubjectSchema>;

// 8. Grading System Settings Validation
export const gradingScaleItemSchema = z.object({
  grade: z.string().trim().min(1, "Grade label is required (e.g. A+, A, B)"),
  minPercentage: z.number().min(0).max(100, "Percentage must be between 0 and 100"),
  maxPercentage: z.number().min(0).max(100, "Percentage must be between 0 and 100"),
  gradePoint: z.number().min(0).optional(),
  description: z.string().trim().max(100).optional().default(""),
});

export const updateGradingSettingsSchema = z
  .object({
    gradingType: z.enum(["PERCENTAGE", "GRADE_POINT"]),
    scales: z.array(gradingScaleItemSchema).min(1, "At least one grade scale item is required"),
  })
  .refine(
    (data) => {
      for (const item of data.scales) {
        if (item.minPercentage > item.maxPercentage) {
          return false;
        }
      }
      return true;
    },
    {
      message: "Minimum percentage cannot be greater than maximum percentage in any scale item",
    }
  );

export type UpdateGradingSettingsInput = z.infer<typeof updateGradingSettingsSchema>;

// 9. Attendance Settings Validation
export const updateAttendanceSettingsSchema = z.object({
  attendanceTypes: z
    .array(z.string().trim().min(1))
    .min(1, "At least one attendance status type is required"),
  workingDays: z
    .array(
      z.enum([
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ])
    )
    .min(1, "At least one working day must be selected"),
});

export type UpdateAttendanceSettingsInput = z.infer<typeof updateAttendanceSettingsSchema>;

// 10. Fee Settings Validation
export const updateFeeSettingsSchema = z.object({
  categories: z
    .array(z.string().trim().min(1))
    .min(1, "At least one fee category is required"),
  paymentFrequencies: z
    .array(z.string().trim().min(1))
    .min(1, "At least one payment frequency option is required"),
  lateFeeGraceDays: z.number().int().min(0, "Grace period days cannot be negative"),
  lateFeeFineAmount: z.number().min(0, "Late fee amount cannot be negative"),
  lateFeeType: z.enum(["FIXED", "PERCENTAGE"]),
});

export type UpdateFeeSettingsInput = z.infer<typeof updateFeeSettingsSchema>;
