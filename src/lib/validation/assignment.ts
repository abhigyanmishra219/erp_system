import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const attachmentSchema = z.object({
  name: z.string().min(1, "Attachment name is required").max(200),
  url: z.string().url("Must be a valid URL").refine((val) => {
    try {
      const u = new URL(val);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, { message: "URL must use HTTP or HTTPS protocol" }),
  mimeType: z.string().optional().default(""),
  size: z.number().nonnegative().optional(),
  type: z.enum(["FILE", "EXTERNAL_LINK"]).default("EXTERNAL_LINK"),
});

export const createAssignmentSchema = z
  .object({
    academicYearId: z.string().regex(objectIdRegex, "Invalid Academic Year ID"),
    classId: z.string().regex(objectIdRegex, "Invalid Class ID"),
    sectionId: z.string().regex(objectIdRegex, "Invalid Section ID"),
    subjectId: z.string().regex(objectIdRegex, "Invalid Subject ID"),
    teacherId: z.string().regex(objectIdRegex, "Invalid Teacher ID").optional(),
    title: z.string().min(2, "Title must be at least 2 characters").max(200, "Title cannot exceed 200 characters"),
    description: z.string().min(3, "Description must be at least 3 characters"),
    assignedDate: z.string().min(1, "Assigned date is required"),
    dueDate: z.string().min(1, "Due date is required"),
    maximumMarks: z.number().min(0, "Maximum marks cannot be negative").nullable().optional(),
    attachments: z.array(attachmentSchema).optional().default([]),
    status: z.enum(["PUBLISHED", "DRAFT", "ARCHIVED"]).default("PUBLISHED"),
  })
  .refine((data) => {
    const assigned = new Date(data.assignedDate);
    const due = new Date(data.dueDate);
    return due >= assigned;
  }, {
    message: "Due date cannot be before assigned date",
    path: ["dueDate"],
  });

export const updateAssignmentSchema = z
  .object({
    title: z.string().min(2, "Title must be at least 2 characters").max(200).optional(),
    description: z.string().min(3, "Description must be at least 3 characters").optional(),
    assignedDate: z.string().optional(),
    dueDate: z.string().optional(),
    maximumMarks: z.number().min(0).nullable().optional(),
    attachments: z.array(attachmentSchema).optional(),
    status: z.enum(["PUBLISHED", "DRAFT", "ARCHIVED"]).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => {
    if (data.assignedDate && data.dueDate) {
      const assigned = new Date(data.assignedDate);
      const due = new Date(data.dueDate);
      return due >= assigned;
    }
    return true;
  }, {
    message: "Due date cannot be before assigned date",
    path: ["dueDate"],
  });

export const submitAssignmentSchema = z.object({
  studentId: z.string().regex(objectIdRegex, "Invalid Student ID").optional(),
  content: z.string().optional().default(""),
  attachments: z.array(attachmentSchema).optional().default([]),
});

export const reviewSubmissionSchema = z.object({
  marks: z.number().min(0, "Marks cannot be negative").nullable().optional(),
  feedback: z.string().max(2000, "Feedback cannot exceed 2000 characters").optional().default(""),
});

export type CreateAssignmentInput = z.infer<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.infer<typeof updateAssignmentSchema>;
export type SubmitAssignmentInput = z.infer<typeof submitAssignmentSchema>;
export type ReviewSubmissionInput = z.infer<typeof reviewSubmissionSchema>;
