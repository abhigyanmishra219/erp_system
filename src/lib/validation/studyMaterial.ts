import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createStudyMaterialSchema = z.object({
  academicYearId: z.string().regex(objectIdRegex, "Invalid Academic Year ID"),
  classId: z.string().regex(objectIdRegex, "Invalid Class ID"),
  subjectId: z.string().regex(objectIdRegex, "Invalid Subject ID"),
  topic: z.string().min(2, "Topic must be at least 2 characters").max(120, "Topic cannot exceed 120 characters"),
  title: z.string().min(2, "Title must be at least 2 characters").max(200, "Title cannot exceed 200 characters"),
  description: z.string().optional().default(""),
  type: z.enum(["PDF", "IMAGE", "DOCUMENT", "PRESENTATION", "VIDEO", "EXTERNAL_LINK"]),
  url: z.string().url("Must be a valid URL").refine((val) => {
    try {
      const u = new URL(val);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, { message: "URL must use HTTP or HTTPS protocol" }),
  fileName: z.string().optional().default(""),
  fileSize: z.number().nonnegative().nullable().optional(),
  mimeType: z.string().optional().default(""),
  teacherId: z.string().regex(objectIdRegex, "Invalid Teacher ID").optional(),
});

export const updateStudyMaterialSchema = z.object({
  topic: z.string().min(2).max(120).optional(),
  title: z.string().min(2).max(200).optional(),
  description: z.string().optional(),
  type: z.enum(["PDF", "IMAGE", "DOCUMENT", "PRESENTATION", "VIDEO", "EXTERNAL_LINK"]).optional(),
  url: z.string().url("Must be a valid URL").refine((val) => {
    try {
      const u = new URL(val);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, { message: "URL must use HTTP or HTTPS protocol" }).optional(),
  fileName: z.string().optional(),
  fileSize: z.number().nonnegative().nullable().optional(),
  mimeType: z.string().optional(),
  isActive: z.boolean().optional(),
});

export type CreateStudyMaterialInput = z.infer<typeof createStudyMaterialSchema>;
export type UpdateStudyMaterialInput = z.infer<typeof updateStudyMaterialSchema>;
