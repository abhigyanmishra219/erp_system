"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Sun,
  LayoutGrid,
  CalendarDays,
  ListOrdered,
  AlertCircle,
  CheckCircle2,
  Lock,
  Layers,
  Info,
} from "lucide-react";

interface TimetableSlot {
  _id: string;
  academicYearId?: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  classId: string;
  className: string;
  classCode?: string;
  sectionId: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
}

interface TimetableData {
  todayDayOfWeek: string;
  todayClasses: TimetableSlot[];
  weekly: Record<string, TimetableSlot[]>;
  allEntries: TimetableSlot[];
  academicYear?: {
    _id: string;
    name: string;
    status: string;
  } | null;
  summary: {
    totalWeeklyPeriods: number;
    todayPeriodsCount: number;
    distinctClassesCount: number;
    distinctSubjectsCount: number;
    distinctRoomsCount: number;
  };
}

const ORDERED_DAYS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

export default function TeacherTimetablePage() {
  const [data, setData] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"weekly" | "daily" | "today">("weekly");
  const [selectedDay, setSelectedDay] = useState<string>("MONDAY");

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/teacher/timetable");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load timetable");
      }
      setData(json.data);
      if (json.data?.todayDayOfWeek && ORDERED_DAYS.includes(json.data.todayDayOfWeek as any)) {
        setSelectedDay(json.data.todayDayOfWeek);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  // Compute status for a period (upcoming, active, or completed today)
  const getPeriodStatus = (startTime: string, endTime: string, day: string) => {
    if (!data || day !== data.todayDayOfWeek) return null;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    const periodStartMin = startH * 60 + startM;
    const periodEndMin = endH * 60 + endM;

    if (currentMinutes >= periodStartMin && currentMinutes <= periodEndMin) {
      return "IN_PROGRESS";
    } else if (currentMinutes < periodStartMin) {
      return "UPCOMING";
    } else {
      return "COMPLETED";
    }
  };

  // Color generator based on subject name for distinctive badges
  const getSubjectBadgeColor = (subjectName: string) => {
    const colors = [
      "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
      "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
      "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
      "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    ];
    let hash = 0;
    for (let i = 0; i < subjectName.length; i++) {
      hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-bold uppercase tracking-wider">
              {data?.academicYear?.name || "Active Session"}
            </span>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-md border border-border">
              <Lock className="w-3 h-3 text-muted-foreground/70" />
              Read-Only
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            My Teaching Timetable
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Personalized class schedules, period allocations, and classroom assignments.
          </p>
        </div>

        {/* View Switcher */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-muted/70 border border-border shadow-xs">
          <button
            onClick={() => setActiveTab("weekly")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "weekly"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Weekly View</span>
            <span className="sm:hidden">Weekly</span>
          </button>
          <button
            onClick={() => setActiveTab("daily")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "daily"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Daily View</span>
            <span className="sm:hidden">Daily</span>
          </button>
          <button
            onClick={() => setActiveTab("today")}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "today"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            <span>Today's Classes</span>
            {data && data.todayClasses.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-black">
                {data.todayClasses.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-foreground tracking-tight">
              {data?.summary.totalWeeklyPeriods ?? 0}
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              Weekly Periods
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Sun className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-foreground tracking-tight">
              {data?.summary.todayPeriodsCount ?? 0}
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              Today's Periods
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-foreground tracking-tight">
              {data?.summary.distinctClassesCount ?? 0}
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              Assigned Classes
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-foreground tracking-tight">
              {data?.summary.distinctRoomsCount ?? 0}
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              Rooms / Labs
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-16 rounded-3xl bg-card border border-border/80 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-muted-foreground">Loading your timetable schedule...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-3xl bg-destructive/10 border border-destructive/20 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <div className="text-sm font-bold text-destructive">{error}</div>
          <button
            onClick={fetchTimetable}
            className="px-4 py-1.5 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold hover:opacity-90"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          {/* TAB 1: TODAY'S CLASSES VIEW */}
          {activeTab === "today" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-foreground">
                      Today's Schedule ({data?.todayDayOfWeek})
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {data?.todayClasses.length
                        ? `You have ${data.todayClasses.length} period${
                            data.todayClasses.length > 1 ? "s" : ""
                          } scheduled for today.`
                        : "No teaching periods scheduled for today."}
                    </p>
                  </div>
                </div>
              </div>

              {data?.todayClasses.length === 0 ? (
                <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <h3 className="text-base font-bold text-foreground">No Classes Scheduled Today</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Enjoy your free day or prepare your lesson plans and assignments for upcoming sessions.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data?.todayClasses.map((period, idx) => {
                    const status = getPeriodStatus(
                      period.startTime,
                      period.endTime,
                      period.dayOfWeek
                    );
                    const badgeColor = getSubjectBadgeColor(period.subjectName);

                    return (
                      <div
                        key={period._id || idx}
                        className={`p-5 rounded-3xl bg-card border transition-all duration-200 relative overflow-hidden flex flex-col justify-between ${
                          status === "IN_PROGRESS"
                            ? "border-amber-500 shadow-md ring-2 ring-amber-500/20"
                            : "border-border hover:border-cyan-500/30"
                        }`}
                      >
                        {status === "IN_PROGRESS" && (
                          <div className="absolute top-0 right-0 px-3 py-1 bg-amber-500 text-white font-black text-[10px] uppercase tracking-widest rounded-bl-xl shadow-xs">
                            Active Period Now
                          </div>
                        )}

                        <div className="space-y-3">
                          {/* Time & Period Number */}
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted text-foreground text-xs font-black">
                              <Clock className="w-3.5 h-3.5 text-cyan-500" />
                              {period.startTime} - {period.endTime}
                            </span>
                            <span className="text-xs font-bold text-muted-foreground">
                              Period #{idx + 1}
                            </span>
                          </div>

                          {/* Subject & Class Info */}
                          <div>
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-md border text-[11px] font-bold mb-1.5 ${badgeColor}`}
                            >
                              {period.subjectName}{" "}
                              {period.subjectCode ? `(${period.subjectCode})` : ""}
                            </span>
                            <h3 className="text-base font-black text-foreground">
                              {period.className} — {period.sectionName}
                            </h3>
                          </div>
                        </div>

                        {/* Room Allocation */}
                        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                            {period.room || "Classroom"}
                          </span>
                          {status === "COMPLETED" && (
                            <span className="text-[11px] font-bold text-muted-foreground/80">
                              Completed
                            </span>
                          )}
                          {status === "UPCOMING" && (
                            <span className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                              Upcoming
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DAILY VIEW */}
          {activeTab === "daily" && (
            <div className="space-y-4">
              {/* Day Selector Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {ORDERED_DAYS.map((day) => {
                  const count = data?.weekly[day]?.length || 0;
                  const isSelected = selectedDay === day;
                  const isToday = data?.todayDayOfWeek === day;

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 ${
                        isSelected
                          ? "bg-cyan-500 text-white shadow-sm shadow-cyan-500/20"
                          : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <span>{day}</span>
                      {isToday && (
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isSelected ? "bg-amber-300" : "bg-amber-500"
                          }`}
                        />
                      )}
                      <span
                        className={`px-1.5 py-0.2 rounded-md text-[10px] font-black ${
                          isSelected
                            ? "bg-white/20 text-white"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Day Timeline */}
              {(!data?.weekly[selectedDay] || data.weekly[selectedDay].length === 0) ? (
                <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center mx-auto text-muted-foreground">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    No Teaching Periods on {selectedDay}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    No classes or periods are scheduled for this day.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.weekly[selectedDay].map((period, idx) => {
                    const status = getPeriodStatus(
                      period.startTime,
                      period.endTime,
                      selectedDay
                    );
                    const badgeColor = getSubjectBadgeColor(period.subjectName);

                    return (
                      <div
                        key={period._id || idx}
                        className={`p-4 sm:p-5 rounded-2xl bg-card border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          status === "IN_PROGRESS"
                            ? "border-amber-500/80 ring-2 ring-amber-500/10 shadow-xs"
                            : "border-border hover:border-border/80"
                        }`}
                      >
                        <div className="flex items-start sm:items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-muted/80 flex flex-col items-center justify-center shrink-0 border border-border">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                              Period
                            </span>
                            <span className="text-sm font-black text-foreground">
                              #{idx + 1}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${badgeColor}`}
                              >
                                {period.subjectName}
                              </span>
                              <span className="text-xs font-black text-foreground">
                                {period.className} ({period.sectionName})
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span className="inline-flex items-center gap-1 font-medium">
                                <Clock className="w-3 h-3 text-cyan-500" />
                                {period.startTime} - {period.endTime}
                              </span>
                              <span className="inline-flex items-center gap-1 font-medium">
                                <MapPin className="w-3 h-3 text-indigo-500" />
                                {period.room || "Classroom"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {status && (
                          <div className="self-end sm:self-center">
                            {status === "IN_PROGRESS" && (
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black animate-pulse">
                                Active Now
                              </span>
                            )}
                            {status === "COMPLETED" && (
                              <span className="px-2.5 py-1 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                                Completed
                              </span>
                            )}
                            {status === "UPCOMING" && (
                              <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-bold">
                                Upcoming
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: WEEKLY MATRIX GRID */}
          {activeTab === "weekly" && (
            <div className="space-y-4">
              {/* Desktop / Tablet Matrix Grid */}
              <div className="hidden md:grid md:grid-cols-6 gap-3">
                {ORDERED_DAYS.map((day) => {
                  const dayPeriods = data?.weekly[day] || [];
                  const isToday = data?.todayDayOfWeek === day;

                  return (
                    <div
                      key={day}
                      className={`flex flex-col rounded-2xl bg-card border overflow-hidden ${
                        isToday
                          ? "border-amber-500/60 shadow-sm ring-1 ring-amber-500/20"
                          : "border-border"
                      }`}
                    >
                      {/* Day Column Header */}
                      <div
                        className={`p-3 text-center border-b ${
                          isToday
                            ? "bg-amber-500/15 border-amber-500/30 text-foreground font-black"
                            : "bg-muted/40 border-border text-foreground font-bold"
                        }`}
                      >
                        <div className="text-xs uppercase tracking-wider flex items-center justify-center gap-1.5">
                          {day.slice(0, 3)}
                          {isToday && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {dayPeriods.length} {dayPeriods.length === 1 ? "Class" : "Classes"}
                        </div>
                      </div>

                      {/* Day Periods List */}
                      <div className="p-2 space-y-2 flex-1 min-h-[300px]">
                        {dayPeriods.length === 0 ? (
                          <div className="h-full flex items-center justify-center p-4 text-center">
                            <span className="text-[11px] text-muted-foreground/60 italic font-medium">
                              Free Day
                            </span>
                          </div>
                        ) : (
                          dayPeriods.map((period, pIdx) => {
                            const badgeColor = getSubjectBadgeColor(period.subjectName);
                            return (
                              <div
                                key={period._id || pIdx}
                                className="p-2.5 rounded-xl bg-muted/40 border border-border hover:border-cyan-500/40 hover:bg-muted/70 transition-all text-left space-y-1.5"
                              >
                                <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                                  <span className="inline-flex items-center gap-1 text-cyan-600 dark:text-cyan-400">
                                    <Clock className="w-2.5 h-2.5" />
                                    {period.startTime}
                                  </span>
                                  <span>{period.endTime}</span>
                                </div>

                                <div className="text-xs font-black text-foreground truncate">
                                  {period.className} — {period.sectionName}
                                </div>

                                <div
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold truncate border ${badgeColor}`}
                                >
                                  {period.subjectName}
                                </div>

                                <div className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                                  <MapPin className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                  <span className="truncate">{period.room || "Classroom"}</span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mobile Fallback for Weekly Grid */}
              <div className="md:hidden space-y-3">
                {ORDERED_DAYS.map((day) => {
                  const dayPeriods = data?.weekly[day] || [];
                  const isToday = data?.todayDayOfWeek === day;

                  return (
                    <div
                      key={day}
                      className={`rounded-2xl bg-card border overflow-hidden ${
                        isToday ? "border-amber-500/60 shadow-xs" : "border-border"
                      }`}
                    >
                      <div
                        className={`px-4 py-2.5 flex items-center justify-between border-b ${
                          isToday ? "bg-amber-500/10 border-amber-500/20" : "bg-muted/30 border-border"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-foreground">{day}</span>
                          {isToday && (
                            <span className="px-2 py-0.2 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                              Today
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-muted-foreground">
                          {dayPeriods.length} {dayPeriods.length === 1 ? "Period" : "Periods"}
                        </span>
                      </div>

                      <div className="p-3">
                        {dayPeriods.length === 0 ? (
                          <div className="py-2 text-center text-xs text-muted-foreground/60 italic font-medium">
                            No classes scheduled
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {dayPeriods.map((period, pIdx) => {
                              const badgeColor = getSubjectBadgeColor(period.subjectName);
                              return (
                                <div
                                  key={period._id || pIdx}
                                  className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-3"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`px-2 py-0.2 rounded text-[10px] font-bold border ${badgeColor}`}
                                      >
                                        {period.subjectName}
                                      </span>
                                      <span className="text-xs font-bold text-foreground">
                                        {period.className} ({period.sectionName})
                                      </span>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                                      <span className="inline-flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-cyan-500" />
                                        {period.startTime} - {period.endTime}
                                      </span>
                                      <span className="inline-flex items-center gap-1">
                                        <MapPin className="w-3 h-3 text-indigo-500" />
                                        {period.room || "Classroom"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer Note */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-start gap-3">
            <Info className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Timetable allocations are scheduled by the school academic administration. If you notice any period conflicts or classroom discrepancies, please contact your academic administrator.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
