"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  CalendarCheck,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Coffee,
  Save,
  Check,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Search,
  Layers,
  FileText,
  Eye,
  Lock,
} from "lucide-react";

interface FilterOption {
  classId: string;
  className: string;
}

interface SectionOption {
  sectionId: string;
  sectionName: string;
  classId: string;
  isClassTeacher?: boolean;
}

interface StudentAttendanceRecord {
  studentId: string;
  admissionNumber: string;
  rollNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  gender: string;
  avatarUrl: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
  existingStatus: string | null;
  remarks: string;
  isLocked: boolean;
  markedByRole: string | null;
}

export default function TeacherAttendancePage() {
  const [activeTab, setActiveTab] = useState<"mark" | "daily" | "monthly" | "student">("mark");

  // Filter & Selection State
  const [classes, setClasses] = useState<FilterOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);

  // Mark Roll-call State
  const [students, setStudents] = useState<StudentAttendanceRecord[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitFeedback, setSubmitFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmittedToday, setIsSubmittedToday] = useState(false);

  // Daily History State
  const [dailyDate, setDailyDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [dailyData, setDailyData] = useState<any>(null);
  const [isLoadingDaily, setIsLoadingDaily] = useState(false);

  // Monthly Register State
  const [monthlyMonth, setMonthlyMonth] = useState(() => new Date().getMonth() + 1);
  const [monthlyYear, setMonthlyYear] = useState(() => new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState<any>(null);
  const [isLoadingMonthly, setIsLoadingMonthly] = useState(false);

  // Individual Student History State
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState("");
  const [studentHistoryData, setStudentHistoryData] = useState<any>(null);
  const [isLoadingStudentHistory, setIsLoadingStudentHistory] = useState(false);

  // 1. Initial Load: Fetch Scoped Classes and Sections
  useEffect(() => {
    async function loadScopeOptions() {
      try {
        const res = await fetch("/api/teacher/attendance");
        const json = await res.json();
        if (json.success && json.data?.filterOptions) {
          const cls = json.data.filterOptions.classes || [];
          const secs = json.data.filterOptions.sections || [];
          setClasses(cls);
          setSections(secs);

          if (cls.length > 0) {
            setSelectedClass(cls[0].classId);
            const matchingSec = secs.filter((s: SectionOption) => s.classId === cls[0].classId);
            if (matchingSec.length > 0) {
              setSelectedSection(matchingSec[0].sectionId);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load attendance scope options:", err);
      }
    }
    loadScopeOptions();
  }, []);

  // 2. Fetch Roll-call Roster for selected Class, Section, and Date
  const fetchRoster = useCallback(async () => {
    if (!selectedClass || !selectedSection) return;
    setIsLoadingRoster(true);
    setSubmitFeedback(null);

    try {
      const res = await fetch(
        `/api/teacher/attendance?classId=${selectedClass}&sectionId=${selectedSection}&date=${selectedDate}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setStudents(json.data.students || []);
        setIsSubmittedToday(json.data.summary?.isSubmitted || false);
        if (json.data.academicYear?._id) {
          setAcademicYearId(json.data.academicYear._id);
        }
      }
    } catch (err) {
      console.error("Failed to load student roster:", err);
    } finally {
      setIsLoadingRoster(false);
    }
  }, [selectedClass, selectedSection, selectedDate]);

  useEffect(() => {
    if (activeTab === "mark") {
      fetchRoster();
    }
  }, [activeTab, fetchRoster]);

  // 3. Fetch Daily History
  const fetchDailyHistory = useCallback(async () => {
    if (!selectedClass || !selectedSection) return;
    setIsLoadingDaily(true);

    try {
      const res = await fetch(
        `/api/teacher/attendance/history?mode=daily&classId=${selectedClass}&sectionId=${selectedSection}&date=${dailyDate}`
      );
      const json = await res.json();
      if (json.success) {
        setDailyData(json.data);
      }
    } catch (err) {
      console.error("Failed to load daily attendance:", err);
    } finally {
      setIsLoadingDaily(false);
    }
  }, [selectedClass, selectedSection, dailyDate]);

  useEffect(() => {
    if (activeTab === "daily") {
      fetchDailyHistory();
    }
  }, [activeTab, fetchDailyHistory]);

  // 4. Fetch Monthly Register
  const fetchMonthlyRegister = useCallback(async () => {
    if (!selectedClass || !selectedSection) return;
    setIsLoadingMonthly(true);

    try {
      const res = await fetch(
        `/api/teacher/attendance/history?mode=monthly&classId=${selectedClass}&sectionId=${selectedSection}&month=${monthlyMonth}&year=${monthlyYear}`
      );
      const json = await res.json();
      if (json.success) {
        setMonthlyData(json.data);
      }
    } catch (err) {
      console.error("Failed to load monthly register:", err);
    } finally {
      setIsLoadingMonthly(false);
    }
  }, [selectedClass, selectedSection, monthlyMonth, monthlyYear]);

  useEffect(() => {
    if (activeTab === "monthly") {
      fetchMonthlyRegister();
    }
  }, [activeTab, fetchMonthlyRegister]);

  // 5. Fetch Individual Student History
  const fetchStudentHistory = useCallback(async () => {
    if (!selectedClass || !selectedSection || !selectedStudentForHistory) return;
    setIsLoadingStudentHistory(true);

    try {
      const res = await fetch(
        `/api/teacher/attendance/history?mode=student&classId=${selectedClass}&sectionId=${selectedSection}&studentId=${selectedStudentForHistory}`
      );
      const json = await res.json();
      if (json.success) {
        setStudentHistoryData(json.data);
      }
    } catch (err) {
      console.error("Failed to load student history:", err);
    } finally {
      setIsLoadingStudentHistory(false);
    }
  }, [selectedClass, selectedSection, selectedStudentForHistory]);

  useEffect(() => {
    if (activeTab === "student" && selectedStudentForHistory) {
      fetchStudentHistory();
    }
  }, [activeTab, selectedStudentForHistory, fetchStudentHistory]);

  // Handle class change -> auto-select first section
  const handleClassChange = (cId: string) => {
    setSelectedClass(cId);
    const matching = sections.filter((s) => s.classId === cId);
    if (matching.length > 0) {
      setSelectedSection(matching[0].sectionId);
    } else {
      setSelectedSection("");
    }
  };

  // Bulk quick-status actions
  const markAllStatus = (status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE") => {
    setStudents((prev) =>
      prev.map((s) => (s.isLocked ? s : { ...s, status }))
    );
  };

  const updateStudentStatus = (studentId: string, status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE") => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId && !s.isLocked ? { ...s, status } : s))
    );
  };

  const updateStudentRemarks = (studentId: string, remarks: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.studentId === studentId && !s.isLocked ? { ...s, remarks } : s))
    );
  };

  // Submit Roll-call
  const handleSubmitAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass || !selectedSection || students.length === 0) return;

    setIsSubmitting(true);
    setSubmitFeedback(null);

    try {
      const payload = {
        academicYearId: academicYearId || "600000000000000000000000",
        classId: selectedClass,
        sectionId: selectedSection,
        date: selectedDate,
        records: students.map((s) => ({
          studentId: s.studentId,
          status: s.status,
          remarks: s.remarks,
        })),
      };

      const res = await fetch("/api/teacher/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit attendance.");
      }

      setSubmitFeedback({
        type: "success",
        message: json.message || "Attendance submitted successfully!",
      });
      setIsSubmittedToday(true);
      fetchRoster();
    } catch (err: any) {
      setSubmitFeedback({
        type: "error",
        message: err.message || "Failed to save attendance.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Roll-call live stats
  const presentCount = students.filter((s) => s.status === "PRESENT").length;
  const absentCount = students.filter((s) => s.status === "ABSENT").length;
  const lateCount = students.filter((s) => s.status === "LATE").length;
  const leaveCount = students.filter((s) => s.status === "LEAVE").length;
  const totalCount = students.length;
  const attendanceRate = totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 0;

  const availableSections = selectedClass
    ? sections.filter((s) => s.classId === selectedClass)
    : sections;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
            <CalendarCheck className="w-6 h-6 text-emerald-500" />
            <span>Class Attendance Portal</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Daily roll-call attendance marking, daily history logs, and monthly registers
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSubmittedToday && activeTab === "mark" && (
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Marked for {selectedDate}</span>
            </span>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border gap-2 text-xs">
        <button
          onClick={() => setActiveTab("mark")}
          className={`pb-2.5 font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === "mark" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <CalendarCheck className="w-3.5 h-3.5" />
          <span>Mark Roll-call</span>
        </button>

        <button
          onClick={() => setActiveTab("daily")}
          className={`pb-2.5 font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === "daily" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Daily History</span>
        </button>

        <button
          onClick={() => setActiveTab("monthly")}
          className={`pb-2.5 font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === "monthly" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Monthly Register</span>
        </button>

        <button
          onClick={() => setActiveTab("student")}
          className={`pb-2.5 font-bold border-b-2 transition flex items-center gap-2 cursor-pointer ${
            activeTab === "student" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Student History</span>
        </button>
      </div>

      {/* Shared Scoped Selector Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Class Select */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-muted-foreground uppercase">
              Assigned Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => handleClassChange(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground font-semibold focus:outline-none focus:border-primary"
            >
              {classes.length === 0 && <option value="">No Assigned Classes</option>}
              {classes.map((c) => (
                <option key={c.classId} value={c.classId}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>

          {/* Section Select */}
          <div className="space-y-1">
            <label className="block text-[11px] font-bold text-muted-foreground uppercase">
              Assigned Section
            </label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground font-semibold focus:outline-none focus:border-primary"
            >
              {availableSections.length === 0 && <option value="">No Sections Available</option>}
              {availableSections.map((s) => (
                <option key={s.sectionId} value={s.sectionId}>
                  {s.sectionName} {s.isClassTeacher ? "(Class Teacher)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker (for Mark & Daily modes) */}
          {activeTab === "mark" && (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-muted-foreground uppercase">
                Attendance Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground font-semibold focus:outline-none focus:border-primary"
              />
            </div>
          )}

          {activeTab === "daily" && (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-muted-foreground uppercase">
                History Date
              </label>
              <input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground font-semibold focus:outline-none focus:border-primary"
              />
            </div>
          )}

          {activeTab === "monthly" && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-muted-foreground uppercase">Month</label>
                <select
                  value={monthlyMonth}
                  onChange={(e) => setMonthlyMonth(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground font-semibold focus:outline-none focus:border-primary"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2026, m - 1, 1).toLocaleString("default", { month: "short" })}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-muted-foreground uppercase">Year</label>
                <input
                  type="number"
                  value={monthlyYear}
                  onChange={(e) => setMonthlyYear(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground font-semibold focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          )}

          {activeTab === "student" && (
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-muted-foreground uppercase">
                Select Student
              </label>
              <select
                value={selectedStudentForHistory}
                onChange={(e) => setSelectedStudentForHistory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground font-semibold focus:outline-none focus:border-primary"
              >
                <option value="">-- Choose Student --</option>
                {students.map((s) => (
                  <option key={s.studentId} value={s.studentId}>
                    {s.rollNumber ? `[${s.rollNumber}] ` : ""}{s.fullName}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MARK ROLL-CALL */}
      {/* ========================================================================= */}
      {activeTab === "mark" && (
        <div className="space-y-6">
          {/* Live Metrics Counter Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-card border border-border shadow-xs text-center space-y-0.5">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Enrolled</span>
              <p className="text-xl font-black text-foreground">{totalCount}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs text-center space-y-0.5">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold">Present</span>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">{presentCount}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 shadow-xs text-center space-y-0.5">
              <span className="text-[10px] text-destructive uppercase font-bold">Absent</span>
              <p className="text-xl font-black text-destructive">{absentCount}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-xs text-center space-y-0.5">
              <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-bold">Late</span>
              <p className="text-xl font-black text-amber-600 dark:text-amber-400">{lateCount}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 shadow-xs text-center space-y-0.5">
              <span className="text-[10px] text-blue-700 dark:text-blue-400 uppercase font-bold">Leave</span>
              <p className="text-xl font-black text-blue-600 dark:text-blue-400">{leaveCount}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 shadow-xs text-center space-y-0.5">
              <span className="text-[10px] text-primary uppercase font-bold">Attendance</span>
              <p className="text-xl font-black text-primary">{attendanceRate}%</p>
            </div>
          </div>

          {/* Quick Bulk Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground font-semibold">Quick Actions:</span>
              <button
                type="button"
                onClick={() => markAllStatus("PRESENT")}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold transition cursor-pointer"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => markAllStatus("ABSENT")}
                className="px-3 py-1.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/30 font-bold transition cursor-pointer"
              >
                Mark All Absent
              </button>
            </div>

            <button
              type="button"
              onClick={fetchRoster}
              disabled={isLoadingRoster}
              className="p-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground transition cursor-pointer"
              title="Refresh Roster"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRoster ? "animate-spin text-amber-500" : "text-muted-foreground"}`} />
            </button>
          </div>

          {/* Feedback Alerts */}
          {submitFeedback && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-center gap-2.5 ${
                submitFeedback.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/10 border border-destructive/20 text-destructive"
              }`}
            >
              {submitFeedback.type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{submitFeedback.message}</span>
            </div>
          )}

          {/* Roll-call Student Table Form */}
          {isLoadingRoster ? (
            <div className="p-12 rounded-3xl bg-card border border-border text-center text-xs text-muted-foreground">
              Loading student roll-call list...
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 rounded-3xl bg-card border border-dashed border-border text-center space-y-2">
              <Users className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="font-bold text-sm text-foreground">No Students in Selected Section</p>
              <p className="text-xs text-muted-foreground">
                There are no active students enrolled in this class and section.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitAttendance} className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-2/60 border-b border-border text-muted-foreground font-semibold">
                      <th className="p-3 pl-4">Roll</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 pr-4">Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {students.map((st) => (
                      <tr key={st.studentId} className="hover:bg-surface-2/40 transition">
                        <td className="p-3 pl-4 font-mono font-bold text-foreground">
                          {st.rollNumber}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-[10px] shrink-0 overflow-hidden">
                              {st.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={st.avatarUrl} alt={st.fullName} className="w-full h-full object-cover" />
                              ) : (
                                st.firstName?.[0] || "S"
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{st.fullName}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{st.admissionNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          {st.isLocked ? (
                            <span className="px-2 py-1 rounded-lg bg-surface-3 border border-border text-muted-foreground font-bold flex items-center gap-1 w-fit">
                              <Lock className="w-3 h-3 text-muted-foreground" />
                              <span>{st.status} (Locked)</span>
                            </span>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => updateStudentStatus(st.studentId, "PRESENT")}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                                  st.status === "PRESENT"
                                    ? "bg-emerald-500 text-white shadow-xs shadow-emerald-500/30"
                                    : "bg-surface-2 text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600"
                                }`}
                              >
                                Present
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStudentStatus(st.studentId, "ABSENT")}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                                  st.status === "ABSENT"
                                    ? "bg-destructive text-white shadow-xs shadow-destructive/30"
                                    : "bg-surface-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                }`}
                              >
                                Absent
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStudentStatus(st.studentId, "LATE")}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                                  st.status === "LATE"
                                    ? "bg-amber-500 text-white shadow-xs shadow-amber-500/30"
                                    : "bg-surface-2 text-muted-foreground hover:bg-amber-500/10 hover:text-amber-600"
                                }`}
                              >
                                Late
                              </button>
                              <button
                                type="button"
                                onClick={() => updateStudentStatus(st.studentId, "LEAVE")}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition cursor-pointer ${
                                  st.status === "LEAVE"
                                    ? "bg-blue-500 text-white shadow-xs shadow-blue-500/30"
                                    : "bg-surface-2 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-600"
                                }`}
                              >
                                Leave
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="p-3 pr-4">
                          <input
                            type="text"
                            value={st.remarks}
                            disabled={st.isLocked}
                            onChange={(e) => updateStudentRemarks(st.studentId, e.target.value)}
                            placeholder="Optional note..."
                            className="w-full px-2.5 py-1 text-xs rounded-lg bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary disabled:opacity-50"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Submit Action Bar */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-muted-foreground">
                  Ready to submit attendance for <strong className="text-foreground">{students.length} students</strong> on{" "}
                  <strong className="text-foreground">{selectedDate}</strong>.
                </p>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground font-bold text-xs shadow-md shadow-primary/25 flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? "Saving Attendance..." : isSubmittedToday ? "Update Attendance" : "Submit Attendance"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DAILY HISTORY */}
      {/* ========================================================================= */}
      {activeTab === "daily" && (
        <div className="space-y-6">
          {isLoadingDaily ? (
            <div className="p-12 rounded-3xl bg-card border border-border text-center text-xs text-muted-foreground">
              Loading daily attendance history...
            </div>
          ) : !dailyData || dailyData.students?.length === 0 ? (
            <div className="p-12 rounded-3xl bg-card border border-dashed border-border text-center space-y-2">
              <Calendar className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="font-bold text-sm text-foreground">No Attendance Records for this Date</p>
              <p className="text-xs text-muted-foreground">
                No attendance was submitted for {dailyDate} in this section.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Daily Metric Summary Card */}
              <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    {dailyData.className} - {dailyData.sectionName}
                  </h3>
                  <p className="text-muted-foreground">
                    Record Date: <strong className="text-foreground">{dailyData.date}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                    Present: {dailyData.summary?.present || 0}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive font-bold">
                    Absent: {dailyData.summary?.absent || 0}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold">
                    Late: {dailyData.summary?.late || 0}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                    Leave: {dailyData.summary?.leave || 0}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-black">
                    {dailyData.summary?.percentage || 0}%
                  </span>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-2/60 border-b border-border text-muted-foreground font-semibold">
                      <th className="p-3 pl-4">Roll</th>
                      <th className="p-3">Student</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Remarks</th>
                      <th className="p-3 pr-4">Marker</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {dailyData.students.map((st: any) => (
                      <tr key={st.studentId} className="hover:bg-surface-2/40 transition">
                        <td className="p-3 pl-4 font-mono font-bold text-foreground">
                          {st.rollNumber}
                        </td>
                        <td className="p-3">
                          <p className="font-bold text-foreground">{st.fullName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{st.admissionNumber}</p>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              st.status === "PRESENT"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : st.status === "ABSENT"
                                ? "bg-destructive/10 text-destructive border border-destructive/20"
                                : st.status === "LATE"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : st.status === "LEAVE"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                                : "bg-surface-3 text-muted-foreground border border-border"
                            }`}
                          >
                            {st.status}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {st.remarks || "—"}
                        </td>
                        <td className="p-3 pr-4 text-muted-foreground text-[11px]">
                          {st.markedByName} ({st.markedByRole || "Teacher"})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MONTHLY REGISTER MATRIX */}
      {/* ========================================================================= */}
      {activeTab === "monthly" && (
        <div className="space-y-6">
          {isLoadingMonthly ? (
            <div className="p-12 rounded-3xl bg-card border border-border text-center text-xs text-muted-foreground">
              Generating monthly attendance register matrix...
            </div>
          ) : !monthlyData || monthlyData.students?.length === 0 ? (
            <div className="p-12 rounded-3xl bg-card border border-dashed border-border text-center space-y-2">
              <Layers className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="font-bold text-sm text-foreground">No Monthly Register Available</p>
              <p className="text-xs text-muted-foreground">
                No attendance recorded for this month in the selected section.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Section Monthly Summary */}
              <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <h3 className="font-bold text-sm text-foreground">
                    Monthly Register: {new Date(monthlyData.year, monthlyData.month - 1, 1).toLocaleString("default", { month: "long" })} {monthlyData.year}
                  </h3>
                  <p className="text-muted-foreground">
                    {monthlyData.className} - {monthlyData.sectionName} • Total Enrolled: <strong className="text-foreground">{monthlyData.sectionSummary?.totalStudents}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-xl bg-surface-2 border border-border text-foreground font-bold">
                    Total Logs: {monthlyData.sectionSummary?.totalMarked}
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground font-black">
                    Class Rate: {monthlyData.sectionSummary?.percentage}%
                  </span>
                </div>
              </div>

              {/* Matrix Table */}
              <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
                <table className="w-full text-left text-[11px] border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-surface-2/70 border-b border-border text-muted-foreground font-semibold">
                      <th className="p-2.5 pl-3 sticky left-0 bg-card z-10 w-44">Student Name</th>
                      {Array.from({ length: monthlyData.totalDaysInMonth || 31 }, (_, i) => i + 1).map((day) => (
                        <th key={day} className="p-1.5 text-center font-mono w-7">
                          {day}
                        </th>
                      ))}
                      <th className="p-2.5 text-center font-bold">P</th>
                      <th className="p-2.5 text-center font-bold">A</th>
                      <th className="p-2.5 pr-3 text-center font-bold">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {monthlyData.students.map((st: any) => (
                      <tr key={st.studentId} className="hover:bg-surface-2/30 transition">
                        <td className="p-2.5 pl-3 sticky left-0 bg-card z-10 font-medium">
                          <p className="font-bold text-foreground truncate max-w-[150px]">{st.fullName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{st.admissionNumber}</p>
                        </td>

                        {Array.from({ length: monthlyData.totalDaysInMonth || 31 }, (_, i) => i + 1).map((day) => {
                          const status = st.dailyMap?.[day];
                          return (
                            <td key={day} className="p-1 text-center font-mono">
                              {status === "PRESENT" ? (
                                <span className="inline-block w-5 h-5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold leading-5 text-[10px]">
                                  P
                                </span>
                              ) : status === "ABSENT" ? (
                                <span className="inline-block w-5 h-5 rounded bg-destructive/15 text-destructive font-bold leading-5 text-[10px]">
                                  A
                                </span>
                              ) : status === "LATE" ? (
                                <span className="inline-block w-5 h-5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold leading-5 text-[10px]">
                                  L
                                </span>
                              ) : status === "LEAVE" ? (
                                <span className="inline-block w-5 h-5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold leading-5 text-[10px]">
                                  LV
                                </span>
                              ) : (
                                <span className="text-muted-foreground/30 font-mono">•</span>
                              )}
                            </td>
                          );
                        })}

                        <td className="p-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {st.summary?.presentCount || 0}
                        </td>
                        <td className="p-2.5 text-center font-bold text-destructive">
                          {st.summary?.absentCount || 0}
                        </td>
                        <td className="p-2.5 pr-3 text-center font-black text-foreground">
                          {st.summary?.percentage || 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: STUDENT ATTENDANCE HISTORY */}
      {/* ========================================================================= */}
      {activeTab === "student" && (
        <div className="space-y-6">
          {!selectedStudentForHistory ? (
            <div className="p-12 rounded-3xl bg-card border border-dashed border-border text-center space-y-2">
              <Users className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="font-bold text-sm text-foreground">Please Select a Student</p>
              <p className="text-xs text-muted-foreground">
                Choose a student from the dropdown above to inspect their attendance history.
              </p>
            </div>
          ) : isLoadingStudentHistory ? (
            <div className="p-12 rounded-3xl bg-card border border-border text-center text-xs text-muted-foreground">
              Loading student attendance history...
            </div>
          ) : !studentHistoryData ? (
            <div className="p-8 rounded-3xl bg-card border border-border text-center text-xs text-muted-foreground">
              No attendance data found for this student.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Student KPI Card */}
              <div className="p-6 rounded-3xl bg-card border border-border shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center text-xl shrink-0 overflow-hidden">
                    {studentHistoryData.student?.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={studentHistoryData.student.avatarUrl} alt={studentHistoryData.student.fullName} className="w-full h-full object-cover" />
                    ) : (
                      studentHistoryData.student?.fullName?.[0] || "S"
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-foreground">{studentHistoryData.student?.fullName}</h3>
                    <p className="text-xs text-muted-foreground">
                      Roll: <strong className="font-mono text-foreground">{studentHistoryData.student?.rollNumber}</strong> • Admission: <strong className="font-mono text-foreground">{studentHistoryData.student?.admissionNumber}</strong>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold">Present</span>
                    <p className="font-black text-emerald-600 dark:text-emerald-400 text-base">{studentHistoryData.summary?.present || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-center">
                    <span className="text-[10px] text-destructive uppercase font-bold">Absent</span>
                    <p className="font-black text-destructive text-base">{studentHistoryData.summary?.absent || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-bold">Late</span>
                    <p className="font-black text-amber-600 dark:text-amber-400 text-base">{studentHistoryData.summary?.late || 0}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary text-primary-foreground text-center min-w-[70px]">
                    <span className="text-[10px] uppercase font-bold">Rate</span>
                    <p className="font-black text-base">{studentHistoryData.summary?.percentage || 0}%</p>
                  </div>
                </div>
              </div>

              {/* Records Timeline Table */}
              <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-2/60 border-b border-border text-muted-foreground font-semibold">
                      <th className="p-3 pl-4">Date</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Remarks</th>
                      <th className="p-3 pr-4">Marker</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border font-medium">
                    {studentHistoryData.records?.map((rec: any) => (
                      <tr key={rec._id} className="hover:bg-surface-2/40 transition">
                        <td className="p-3 pl-4 font-mono font-bold text-foreground">
                          {rec.date}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              rec.status === "PRESENT"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : rec.status === "ABSENT"
                                ? "bg-destructive/10 text-destructive border border-destructive/20"
                                : rec.status === "LATE"
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {rec.remarks || "—"}
                        </td>
                        <td className="p-3 pr-4 text-muted-foreground text-[11px]">
                          {rec.markedByRole || "TEACHER"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
