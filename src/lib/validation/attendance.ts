import { z } from "zod";
import mongoose from "mongoose";

const objectIdSchema = z.string().refine((val) => mongoose.Types.ObjectId.isValid(val), {
  message: "Invalid ID format",
});

export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "LEAVE"] as const;

export const attendanceStatusSchema = z.enum(ATTENDANCE_STATUSES, {
  message: "Status must be PRESENT, ABSENT, LATE, or LEAVE",
});

// Single student attendance submission schema
export const markAttendanceSchema = z.object({
  academicYearId: objectIdSchema,
  classId: objectIdSchema,
  sectionId: objectIdSchema,
  studentId: objectIdSchema,
  date: z.string().min(1, "Date is required"),
  status: attendanceStatusSchema,
  remarks: z.string().trim().max(500, "Remarks cannot exceed 500 characters").optional().default(""),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

// Bulk attendance single item schema
export const bulkAttendanceItemSchema = z.object({
  studentId: objectIdSchema,
  status: attendanceStatusSchema,
  remarks: z.string().trim().max(500, "Remarks cannot exceed 500 characters").optional().default(""),
});

export type BulkAttendanceItemInput = z.infer<typeof bulkAttendanceItemSchema>;

// Bulk attendance submission schema for a class/section on a date
export const bulkAttendanceSchema = z.object({
  academicYearId: objectIdSchema,
  classId: objectIdSchema,
  sectionId: objectIdSchema,
  date: z.string().min(1, "Attendance date is required"),
  records: z.array(bulkAttendanceItemSchema).min(1, "At least one student attendance record is required"),
});

export type BulkAttendanceInput = z.infer<typeof bulkAttendanceSchema>;

// Single record update schema
export const updateAttendanceSchema = z
  .object({
    status: attendanceStatusSchema.optional(),
    remarks: z.string().trim().max(500, "Remarks cannot exceed 500 characters").optional(),
    isLocked: z.boolean().optional(),
  })
  .refine((data) => data.status !== undefined || data.remarks !== undefined || data.isLocked !== undefined, {
    message: "At least one field (status, remarks, or isLocked) must be provided to update",
  });

export type UpdateAttendanceInput = z.infer<typeof updateAttendanceSchema>;

// Query filters schema
export const attendanceQuerySchema = z.object({
  academicYearId: objectIdSchema.optional(),
  classId: objectIdSchema.optional(),
  sectionId: objectIdSchema.optional(),
  studentId: objectIdSchema.optional(),
  date: z.string().optional(),
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(["ALL", ...ATTENDANCE_STATUSES]).optional().default("ALL"),
});

export type AttendanceQueryInput = z.infer<typeof attendanceQuerySchema>;
