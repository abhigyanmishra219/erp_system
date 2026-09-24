"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParentChild } from "@/context/ParentChildContext";
import ChildSwitcher from "../components/ChildSwitcher";
import {
  Clock,
  Calendar,
  MapPin,
  User,
  BookOpen,
  RefreshCw,
  AlertCircle,
  Sparkles,
  CalendarDays,
  GraduationCap,
  ChevronRight,
  Info,
} from "lucide-react";

const DAYS = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"] as const;

interface TimetableItem {
  _id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  subject: {
    _id: string;
    name: string;
    code: string;
    type: string;
  };
  teacher: {
    _id: string;
    name: string;
  };
}

interface TimetableData {
  student: {
    _id: string;
    name: string;
    rollNumber: string;
    admissionNumber: string;
  };
  class: { _id: string; name: string; code: string } | null;
  section: { _id: string; name: string } | null;
  academicYear: { _id: string; name: string } | null;
  entries: TimetableItem[];
}

export default function ParentTimetablePage() {
  const { children, selectedChild, selectedChildId, isLoading: isChildrenLoading } = useParentChild();

  const [data, setData] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("MONDAY");
  const [viewMode, setViewMode] = useState<"day" | "week">("day");

  // Set default day based on today
  useEffect(() => {
    const daysMap = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
    const today = daysMap[new Date().getDay()];
    if (DAYS.includes(today as any)) {
      setSelectedDay(today);
    } else {
      setSelectedDay("MONDAY");
    }
  }, []);

  const fetchTimetable = useCallback(async (studentId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/parent/timetable?studentId=${studentId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || "Failed to load class schedule");
      }

      setData(json.data || null);
    } catch (err: any) {
      console.error("Error loading parent timetable:", err);
      setError(err.message || "Network error loading timetable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      fetchTimetable(selectedChildId);
    }
  }, [selectedChildId, fetchTimetable]);

  const currentDayEntries = (data?.entries || []).filter(
    (entry) => entry.dayOfWeek.toUpperCase() === selectedDay.toUpperCase()
  );

  const getEntriesForDay = (day: string) => {
    return (data?.entries || []).filter(
      (entry) => entry.dayOfWeek.toUpperCase() === day.toUpperCase()
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header with ChildSwitcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <CalendarDays className="h-4 w-4" />
            <span>Class Schedule</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Class Timetable</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            View daily period schedules, subject faculty, and classroom locations for your child.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <ChildSwitcher />
          {selectedChildId && (
            <button
              onClick={() => fetchTimetable(selectedChildId)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* No Children Guard */}
      {!isChildrenLoading && (!children || children.length === 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Linked Students Found</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Your parent account is not currently linked to any active student records in the school system.
          </p>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-4">
          <div className="h-12 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            ))}
          </div>
        </div>
      )}

      {/* Error Alert */}
      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Main Timetable Content */}
      {!loading && !error && selectedChildId && data && (
        <>
          {/* Class Information Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white/10 rounded-lg text-xs font-medium text-indigo-200 mb-1.5">
                <GraduationCap className="h-3.5 w-3.5 text-indigo-300" />
                <span>Classroom Schedule</span>
              </div>
              <h2 className="text-xl font-bold tracking-tight">
                {data.class ? `${data.class.name} - ${data.section?.name}` : "Class Schedule"}
              </h2>
              <p className="text-indigo-200 text-xs mt-0.5">
                Student: {data.student.name} • Admission No: {data.student.admissionNumber}
              </p>
            </div>

            <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl backdrop-blur-sm">
              <button
                onClick={() => setViewMode("day")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  viewMode === "day" ? "bg-white text-indigo-900 shadow-sm" : "text-white/80 hover:text-white"
                }`}
              >
                Day View
              </button>
              <button
                onClick={() => setViewMode("week")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  viewMode === "week" ? "bg-white text-indigo-900 shadow-sm" : "text-white/80 hover:text-white"
                }`}
              >
                Weekly Grid
              </button>
            </div>
          </div>

          {/* DAY VIEW */}
          {viewMode === "day" && (
            <div className="space-y-6">
              {/* Day Selection Tabs */}
              <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-none">
                {DAYS.map((day) => {
                  const count = getEntriesForDay(day).length;
                  const isSelected = selectedDay === day;
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`flex-1 min-w-[120px] p-3 rounded-2xl border text-center transition-all ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-100"
                          : "bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-sm"
                      }`}
                    >
                      <p className={`text-xs font-bold uppercase tracking-wider ${isSelected ? "text-indigo-100" : "text-slate-400"}`}>
                        {day.slice(0, 3)}
                      </p>
                      <p className="text-sm font-bold mt-0.5">{day}</p>
                      <span
                        className={`inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                          isSelected ? "bg-indigo-700 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {count} {count === 1 ? "Period" : "Periods"}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Day Periods Grid */}
              {currentDayEntries.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                  <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-700 mb-1">No Periods Scheduled</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    There are no classes or periods scheduled on {selectedDay} for this section.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentDayEntries.map((period, idx) => (
                    <div
                      key={period._id || idx}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Period Time Header */}
                        <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
                          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                              {period.startTime} - {period.endTime}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-400">
                            Period {idx + 1}
                          </span>
                        </div>

                        {/* Subject Details */}
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {period.subject.name}
                        </h3>
                        {period.subject.code && (
                          <p className="text-xs text-slate-400 font-mono mt-0.5">
                            Code: {period.subject.code}
                          </p>
                        )}
                      </div>

                      {/* Teacher and Room details */}
                      <div className="mt-5 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 text-slate-600">
                          <User className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="font-medium text-slate-800">
                            {period.teacher.name}
                          </span>
                        </div>
                        {period.room && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>Room / Lab: {period.room}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* WEEKLY GRID VIEW */}
          {viewMode === "week" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-slate-900 text-base">Full Week Schedule Matrix</h3>
                <p className="text-xs text-slate-500">Complete overview of all days Monday through Saturday.</p>
              </div>

              <div className="overflow-x-auto">
                <div className="grid grid-cols-1 md:grid-cols-6 divide-y md:divide-y-0 md:divide-x divide-slate-200 min-w-[800px]">
                  {DAYS.map((day) => {
                    const entries = getEntriesForDay(day);
                    return (
                      <div key={day} className="p-4 space-y-3 bg-white">
                        <div className="text-center pb-2 border-b border-slate-100">
                          <p className="text-xs font-bold text-slate-400 uppercase">{day.slice(0, 3)}</p>
                          <p className="text-sm font-extrabold text-slate-900">{day}</p>
                        </div>

                        {entries.length === 0 ? (
                          <div className="py-8 text-center text-slate-300 text-xs italic">
                            No classes
                          </div>
                        ) : (
                          entries.map((p, i) => (
                            <div
                              key={p._id || i}
                              className="p-3 bg-slate-50 hover:bg-indigo-50/60 rounded-xl border border-slate-200 transition-colors text-xs"
                            >
                              <div className="font-bold text-slate-900">{p.subject.name}</div>
                              <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                                {p.startTime} - {p.endTime}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                <span className="truncate">{p.teacher.name}</span>
                              </div>
                              {p.room && (
                                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-slate-400" />
                                  <span>{p.room}</span>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
