import { z } from "zod";
import { LEAVE_APPLICANT_ROLES, LEAVE_STATUSES } from "@/models/LeaveRequest";

export const leaveAttachmentSchema = z.object({
  name: z.string().min(1, "Attachment name is required"),
  url: z.string().min(1, "Attachment URL is required"),
  mimeType: z.string().optional().default(""),
  size: z.number().optional(),
});

export const createLeaveRequestSchema = z
  .object({
    applicantRole: z.enum(LEAVE_APPLICANT_ROLES, {
      message: "Valid applicant role is required",
    }),
    studentId: z.string().optional().nullable(),
    teacherId: z.string().optional().nullable(),
    fromDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Valid from date is required",
    }),
    toDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Valid to date is required",
    }),
    reason: z
      .string()
      .min(3, "Reason must be at least 3 characters")
      .max(1000, "Reason cannot exceed 1000 characters"),
    attachments: z.array(leaveAttachmentSchema).optional().default([]),
  })
  .refine(
    (data) => {
      const from = new Date(data.fromDate);
      const to = new Date(data.toDate);
      return from.getTime() <= to.getTime();
    },
    {
      message: "To date must be on or after from date",
      path: ["toDate"],
    }
  )
  .refine(
    (data) => {
      if ((data.applicantRole === "STUDENT" || data.applicantRole === "PARENT") && !data.studentId) {
        return false;
      }
      return true;
    },
    {
      message: "Student selection is required for student/parent leave requests",
      path: ["studentId"],
    }
  )
  .refine(
    (data) => {
      if (data.applicantRole === "TEACHER" && !data.teacherId) {
        return false;
      }
      return true;
    },
    {
      message: "Teacher selection is required for teacher leave requests",
      path: ["teacherId"],
    }
  );

export const rejectLeaveSchema = z.object({
  rejectionReason: z
    .string()
    .min(3, "Rejection reason must be at least 3 characters")
    .max(1000, "Rejection reason cannot exceed 1000 characters"),
});

export const cancelLeaveSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type RejectLeaveInput = z.infer<typeof rejectLeaveSchema>;
