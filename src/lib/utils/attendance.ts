import { AttendanceStatus } from "@/models/Attendance";
import { formatAttendanceDate, getDayOfWeek } from "@/lib/utils/date";

export interface AttendanceRecordLike {
  date: Date | string;
  status: AttendanceStatus | string;
  remarks?: string;
  isLocked?: boolean;
}

export interface AttendanceSummaryMetrics {
  totalMarked: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  attendedCount: number;
  percentage: number;
}

export interface AttendanceCalculationOptions {
  workingDays?: string[];
  admissionDate?: Date;
  statusTypes?: string[];
}

/**
 * Calculates standardized attendance percentage given attended/present days and total working days.
 * If workingDays <= 0, returns 0.
 * Never returns NaN, Infinity, or falls back to 100 on division by zero.
 */
export function calculateAttendancePercentage(
  presentDays: number,
  workingDays: number
): number {
  if (!workingDays || workingDays <= 0 || !isFinite(workingDays) || isNaN(workingDays)) {
    return 0;
  }
  const attended = Math.max(0, presentDays || 0);
  return Number(((attended / workingDays) * 100).toFixed(1));
}

/**
 * Calculates standardized attendance summary metrics from an array of attendance records.
 * Only marked and eligible records are counted.
 *
 * Attended days = Present + Late
 * Percentage = (Attended Days / Total Marked Days) * 100
 */
export function calculateAttendanceSummary(
  records: AttendanceRecordLike[],
  options: AttendanceCalculationOptions = {}
): AttendanceSummaryMetrics {
  let presentCount = 0;
  let absentCount = 0;
  let lateCount = 0;
  let leaveCount = 0;

  for (const rec of records) {
    const recDate = typeof rec.date === "string" ? new Date(rec.date) : rec.date;

    // Skip if before admission date
    if (options.admissionDate && recDate < options.admissionDate) {
      continue;
    }

    // Skip if workingDays specified and day is not in workingDays
    if (options.workingDays && options.workingDays.length > 0) {
      const dayName = getDayOfWeek(recDate);
      if (!options.workingDays.includes(dayName)) {
        continue;
      }
    }

    const status = String(rec.status).toUpperCase();
    if (status === "PRESENT") {
      presentCount++;
    } else if (status === "ABSENT") {
      absentCount++;
    } else if (status === "LATE") {
      lateCount++;
    } else if (status === "LEAVE") {
      leaveCount++;
    }
  }

  const totalMarked = presentCount + absentCount + lateCount + leaveCount;
  const attendedCount = presentCount + lateCount;
  const percentage = calculateAttendancePercentage(attendedCount, totalMarked);

  return {
    totalMarked,
    presentCount,
    absentCount,
    lateCount,
    leaveCount,
    attendedCount,
    percentage,
  };
}

/**
 * Maps an array of attendance records to a dictionary keyed by YYYY-MM-DD.
 */
export function mapAttendanceByDate<T extends AttendanceRecordLike>(
  records: T[]
): Record<string, T> {
  const map: Record<string, T> = {};
  for (const rec of records) {
    const dateObj = typeof rec.date === "string" ? new Date(rec.date) : rec.date;
    const dateKey = formatAttendanceDate(dateObj);
    map[dateKey] = rec;
  }
  return map;
}
