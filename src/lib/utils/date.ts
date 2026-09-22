/**
 * Date utility functions for School ERP SaaS.
 * Guarantees strict date normalization without accidental UTC shift / timezone drift.
 */

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export type DayName = (typeof DAY_NAMES)[number];

/**
 * Normalizes an input date string (YYYY-MM-DD or ISO) or Date instance
 * into a standardized UTC Midnight Date object (YYYY-MM-DDT00:00:00.000Z).
 */
export function normalizeAttendanceDate(input: string | Date): Date {
  if (typeof input === "string") {
    const trimmed = input.trim();
    // Match YYYY-MM-DD explicitly
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }
    const parsed = new Date(trimmed);
    if (isNaN(parsed.getTime())) {
      throw new Error(`Invalid date string provided: ${input}`);
    }
    return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 0, 0, 0, 0));
  }

  if (isNaN(input.getTime())) {
    throw new Error("Invalid Date instance provided");
  }

  return new Date(Date.UTC(input.getUTCFullYear(), input.getUTCMonth(), input.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Formats a Date object to YYYY-MM-DD string representation in UTC.
 */
export function formatAttendanceDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Gets the English day of the week for a normalized attendance date.
 */
export function getDayOfWeek(date: Date): DayName {
  return DAY_NAMES[date.getUTCDay()];
}

/**
 * Returns UTC midnight start and end dates for a specific month (1-12) and year.
 */
export function getMonthDateRange(year: number, month: number): { startDate: Date; endDate: Date } {
  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  // Day 0 of next month is the last day of current month
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endDate = new Date(Date.UTC(year, month - 1, lastDay, 23, 59, 59, 999));
  return { startDate, endDate };
}

/**
 * Returns the number of days in a given month (1-12) and year.
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Generates an array of all dates in a month (UTC midnight).
 */
export function getMonthDates(year: number, month: number): Date[] {
  const totalDays = getDaysInMonth(year, month);
  const dates: Date[] = [];
  for (let d = 1; d <= totalDays; d++) {
    dates.push(new Date(Date.UTC(year, month - 1, d, 0, 0, 0, 0)));
  }
  return dates;
}
