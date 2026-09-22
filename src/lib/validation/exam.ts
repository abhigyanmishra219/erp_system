import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z
  .string()
  .regex(objectIdRegex, { message: "Invalid ID format" });

export const createExamSchema = z
  .object({
    academicYearId: objectIdSchema,
    name: z.string().min(1, "Exam name is required").max(100, "Exam name too long"),
    description: z.string().max(1000).optional().default(""),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    status: z.enum(["DRAFT", "SCHEDULED", "ONGOING", "COMPLETED", "PUBLISHED"]).optional().default("SCHEDULED"),
    targets: z
      .array(
        z.object({
          classId: objectIdSchema,
          sectionIds: z.array(objectIdSchema).min(1, "Select at least one section"),
        })
      )
      .optional(),
    subjects: z
      .array(
        z
          .object({
            classId: objectIdSchema,
            subjectId: objectIdSchema,
            examDate: z.string().optional().nullable(),
            maximumMarks: z.coerce.number().positive("Maximum marks must be greater than 0"),
            passingMarks: z.coerce.number().nonnegative("Passing marks cannot be negative"),
          })
          .refine((data) => data.passingMarks <= data.maximumMarks, {
            message: "Passing marks cannot exceed maximum marks",
            path: ["passingMarks"],
          })
      )
      .optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    }
  );

export const updateExamSchema = z
  .object({
    name: z.string().min(1, "Exam name is required").max(100).optional(),
    description: z.string().max(1000).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.enum(["DRAFT", "SCHEDULED", "ONGOING", "COMPLETED", "PUBLISHED"]).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return new Date(data.endDate) >= new Date(data.startDate);
      }
      return true;
    },
    {
      message: "End date must be on or after start date",
      path: ["endDate"],
    }
  );

export const createExamTargetSchema = z.object({
  academicYearId: objectIdSchema,
  classId: objectIdSchema,
  sectionId: objectIdSchema,
});

export const createExamSubjectSchema = z
  .object({
    academicYearId: objectIdSchema,
    classId: objectIdSchema,
    subjectId: objectIdSchema,
    examDate: z.string().optional().nullable(),
    maximumMarks: z.coerce.number().positive("Maximum marks must be greater than 0"),
    passingMarks: z.coerce.number().nonnegative("Passing marks cannot be negative"),
  })
  .refine((data) => data.passingMarks <= data.maximumMarks, {
    message: "Passing marks cannot exceed maximum marks",
    path: ["passingMarks"],
  });

export const updateExamSubjectSchema = z
  .object({
    examDate: z.string().optional().nullable(),
    maximumMarks: z.coerce.number().positive("Maximum marks must be greater than 0").optional(),
    passingMarks: z.coerce.number().nonnegative("Passing marks cannot be negative").optional(),
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

export const studentMarkEntrySchema = z.object({
  studentId: objectIdSchema,
  marks: z.coerce
    .number()
    .min(0, "Marks cannot be negative")
    .nullable()
    .optional(),
  remarks: z.string().max(500).optional().default(""),
});

export const enterMarksSchema = z.object({
  examSubjectId: objectIdSchema,
  classId: objectIdSchema,
  sectionId: objectIdSchema,
  subjectId: objectIdSchema,
  entries: z.array(studentMarkEntrySchema).min(1, "At least one student mark entry is required"),
});

export const updateResultStatusSchema = z.object({
  status: z.enum(["DRAFT", "REVIEWED", "PUBLISHED"]),
  classId: objectIdSchema.optional(),
  sectionId: objectIdSchema.optional(),
  studentIds: z.array(objectIdSchema).optional(),
});
