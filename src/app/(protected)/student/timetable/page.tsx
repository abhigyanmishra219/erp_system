"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  MapPin,
  User,
  BookOpen,
  RefreshCw,
  AlertCircle,
  Sparkles,
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
  entries: TimetableItem[];
  class: { _id: string; name: string; code: string } | null;
  section: { _id: string; name: string } | null;
}

export default function StudentTimetablePage() {
  const [data, setData] = useState<TimetableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string>("MONDAY");

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

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/student/timetable");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load timetable");
      }
      setData(json.data);
    } catch (err: any) {
      console.error("Error loading timetable:", err);
      setError(err.message || "Network error loading timetable");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimetable();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Loading your weekly timetable...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 rounded-3xl bg-card border border-destructive/20 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Unable to Load Timetable</h3>
        <p className="text-xs text-muted-foreground">{error || "No schedule available"}</p>
        <button
          onClick={fetchTimetable}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const entriesForDay = (data.entries || []).filter((e) => e.dayOfWeek === selectedDay);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              Class Timetable
            </h1>
            {data.class && (
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold">
                {data.class.name} {data.section ? `- ${data.section.name}` : ""}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your section weekly period slots, room assignments, and subject instructors.
          </p>
        </div>
      </div>

      {/* Day Selector Tabs (Responsive) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
        {DAYS.map((day) => {
          const count = (data.entries || []).filter((e) => e.dayOfWeek === day).length;
          const isSelected = selectedDay === day;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-xs ${
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-surface-2"
              }`}
            >
              <span>{day.slice(0, 3)}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-surface-2 text-muted-foreground"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Daily Periods List */}
      <div className="space-y-3">
        {entriesForDay.length === 0 ? (
          <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-2 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-surface-2 text-muted-foreground flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No Classes Scheduled for {selectedDay}</h3>
            <p className="text-xs text-muted-foreground">
              There are no active timetable periods scheduled for your class section on this day.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {entriesForDay.map((entry, idx) => (
              <div
                key={entry._id}
                className="p-5 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all space-y-3 shadow-xs"
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <span className="text-[11px] font-bold text-primary px-2 py-0.5 rounded-md bg-primary/10">
                    Period {idx + 1}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>
                      {entry.startTime} - {entry.endTime}
                    </span>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-bold text-foreground">{entry.subject.name}</h3>
                  {entry.subject.code && (
                    <p className="text-[11px] font-mono text-muted-foreground">{entry.subject.code}</p>
                  )}
                </div>

                <div className="pt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">{entry.teacher.name}</span>
                  </div>
                  {entry.room && (
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <MapPin className="w-3 h-3 text-muted-foreground" />
                      <span>{entry.room}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
