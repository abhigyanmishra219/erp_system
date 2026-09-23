import { z } from "zod";
import { DAYS_OF_WEEK } from "@/models/TimetableEntry";

// Helper function to convert "HH:mm" to minutes from midnight
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;

export const createTimetableEntrySchema = z
  .object({
    academicYearId: z.string().min(1, "Academic Year is required"),
    classId: z.string().min(1, "Class is required"),
    sectionId: z.string().min(1, "Section is required"),
    subjectId: z.string().min(1, "Subject is required"),
    teacherId: z.string().min(1, "Teacher is required"),
    dayOfWeek: z.enum(DAYS_OF_WEEK, {
      message: "Valid day of week is required",
    }),
    startTime: z
      .string()
      .regex(timeRegex, "Start time must be in HH:mm format (e.g. 09:00)"),
    endTime: z
      .string()
      .regex(timeRegex, "End time must be in HH:mm format (e.g. 10:00)"),
    room: z.string().max(50, "Room cannot exceed 50 characters").optional().default(""),
  })
  .refine((data) => timeToMinutes(data.startTime) < timeToMinutes(data.endTime), {
    message: "End time must be later than start time",
    path: ["endTime"],
  });

export const updateTimetableEntrySchema = z
  .object({
    academicYearId: z.string().min(1, "Academic Year is required").optional(),
    classId: z.string().min(1, "Class is required").optional(),
    sectionId: z.string().min(1, "Section is required").optional(),
    subjectId: z.string().min(1, "Subject is required").optional(),
    teacherId: z.string().min(1, "Teacher is required").optional(),
    dayOfWeek: z
      .enum(DAYS_OF_WEEK, {
        message: "Valid day of week is required",
      })
      .optional(),
    startTime: z
      .string()
      .regex(timeRegex, "Start time must be in HH:mm format (e.g. 09:00)")
      .optional(),
    endTime: z
      .string()
      .regex(timeRegex, "End time must be in HH:mm format (e.g. 10:00)")
      .optional(),
    room: z.string().max(50, "Room cannot exceed 50 characters").optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return timeToMinutes(data.startTime) < timeToMinutes(data.endTime);
      }
      return true;
    },
    {
      message: "End time must be later than start time",
      path: ["endTime"],
    }
  );

export const checkTimetableConflictSchema = z
  .object({
    academicYearId: z.string().min(1, "Academic Year is required"),
    classId: z.string().min(1, "Class is required"),
    sectionId: z.string().min(1, "Section is required"),
    teacherId: z.string().min(1, "Teacher is required"),
    dayOfWeek: z.enum(DAYS_OF_WEEK, {
      message: "Valid day of week is required",
    }),
    startTime: z
      .string()
      .regex(timeRegex, "Start time must be in HH:mm format (e.g. 09:00)"),
    endTime: z
      .string()
      .regex(timeRegex, "End time must be in HH:mm format (e.g. 10:00)"),
    excludeEntryId: z.string().optional(),
  })
  .refine((data) => timeToMinutes(data.startTime) < timeToMinutes(data.endTime), {
    message: "End time must be later than start time",
    path: ["endTime"],
  });

export type CreateTimetableEntryInput = z.infer<typeof createTimetableEntrySchema>;
export type UpdateTimetableEntryInput = z.infer<typeof updateTimetableEntrySchema>;
export type CheckTimetableConflictInput = z.infer<typeof checkTimetableConflictSchema>;
