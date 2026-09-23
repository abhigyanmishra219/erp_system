import { z } from "zod";

export const noticeAttachmentSchema = z.object({
  name: z.string().min(1, "Attachment name is required").trim(),
  url: z.string().min(1, "Attachment URL is required").trim(),
  mimeType: z.string().optional().default(""),
  size: z.number().nullable().optional(),
  type: z.enum(["FILE", "EXTERNAL_LINK"]).default("FILE"),
});

export const createNoticeSchema = z
  .object({
    title: z
      .string()
      .min(1, "Notice title is required")
      .max(200, "Title cannot exceed 200 characters")
      .trim(),
    description: z
      .string()
      .min(1, "Notice description is required")
      .trim(),
    targetType: z.enum([
      "SCHOOL",
      "TEACHERS",
      "STUDENTS",
      "PARENTS",
      "CLASS",
      "SECTION",
    ]),
    targetClassId: z.string().optional().nullable(),
    targetSectionId: z.string().optional().nullable(),
    targetRoles: z.array(z.string()).optional().default([]),
    attachments: z.array(noticeAttachmentSchema).optional().default([]),
    status: z.enum(["DRAFT", "PUBLISHED"]).optional().default("DRAFT"),
    publishedAt: z.string().datetime().optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.targetType === "CLASS" && !data.targetClassId) {
        return false;
      }
      return true;
    },
    {
      message: "Target class is required when audience is CLASS",
      path: ["targetClassId"],
    }
  )
  .refine(
    (data) => {
      if (data.targetType === "SECTION" && (!data.targetClassId || !data.targetSectionId)) {
        return false;
      }
      return true;
    },
    {
      message: "Both Class and Section are required when audience is SECTION",
      path: ["targetSectionId"],
    }
  )
  .refine(
    (data) => {
      if (data.publishedAt && data.expiresAt) {
        return new Date(data.expiresAt) > new Date(data.publishedAt);
      }
      return true;
    },
    {
      message: "Expiry date must be after publish date",
      path: ["expiresAt"],
    }
  );

export const updateNoticeSchema = z
  .object({
    title: z
      .string()
      .min(1, "Notice title is required")
      .max(200, "Title cannot exceed 200 characters")
      .trim()
      .optional(),
    description: z
      .string()
      .min(1, "Notice description is required")
      .trim()
      .optional(),
    targetType: z
      .enum(["SCHOOL", "TEACHERS", "STUDENTS", "PARENTS", "CLASS", "SECTION"])
      .optional(),
    targetClassId: z.string().optional().nullable(),
    targetSectionId: z.string().optional().nullable(),
    targetRoles: z.array(z.string()).optional(),
    attachments: z.array(noticeAttachmentSchema).optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "EXPIRED", "ARCHIVED"]).optional(),
    publishedAt: z.string().datetime().optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.targetType === "CLASS" && data.targetClassId === null) {
        return false;
      }
      return true;
    },
    {
      message: "Target class is required when audience is CLASS",
      path: ["targetClassId"],
    }
  );

export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;
export type UpdateNoticeInput = z.infer<typeof updateNoticeSchema>;
