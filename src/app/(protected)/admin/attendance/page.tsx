"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Calendar,
  Building2,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  UserX,
  AlertCircle,
  Save,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowRight,
  MessageSquare,
  Sparkles,
  Lock,
  Unlock,
  Check,
  X,
  FileText,
} from "lucide-react";
import { formatAttendanceDate } from "@/lib/utils/date";

type AttendanceTab = "daily" | "monthly" | "student";
type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "LEAVE";

interface AcademicYearOption {
  id: string;
  _id?: string;
  name: string;
  status: string;
}

interface ClassOption {
  id: string;
  _id?: string;
  name: string;
  code?: string;
}

interface SectionOption {
  id: string;
  _id?: string;
  name: string;
  code?: string;
  capacity?: number;
}

interface StudentDailyRow {
  studentId: string;
  name: string;
  admissionNumber: string;
  rollNumber: string;
  gender: string;
  avatarUrl?: string;
  attendanceId: string | null;
  status: AttendanceStatus | null; // null = unmarked
  remarks: string;
  isLocked: boolean;
  markedBy?: { name: string } | null;
  editedBy?: { name: string } | null;
  updatedAt?: string | null;
}

interface DailySummary {
  totalStudents: number;
  totalMarked: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  unmarkedCount: number;
  percentage: number;
}

interface MonthlyStudentRow {
  studentId: string;
  name: string;
  admissionNumber: string;
  rollNumber: string;
  gender: string;
  dailyMap: Record<number, string>;
  summary: {
    totalMarked: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    leaveCount: number;
    percentage: number;
  };
}

export default function AdminAttendancePage() {
  const [activeTab, setActiveTab] = useState<AttendanceTab>("daily");

  // Filter selections
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  // Daily tab state
  const [selectedDate, setSelectedDate] = useState<string>(formatAttendanceDate(new Date()));
  const [students, setStudents] = useState<StudentDailyRow[]>([]);
  const [originalStudents, setOriginalStudents] = useState<StudentDailyRow[]>([]);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);
  const [dailySearch, setDailySearch] = useState<string>("");
  const [isDailyLoading, setIsDailyLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Remarks modal state
  const [remarksModalStudent, setRemarksModalStudent] = useState<StudentDailyRow | null>(null);
  const [tempRemarks, setTempRemarks] = useState<string>("");

  // Monthly tab state
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDate.getUTCMonth() + 1);
  const [selectedMonthYear, setSelectedMonthYear] = useState<number>(currentDate.getUTCFullYear());
  const [monthlyStudents, setMonthlyStudents] = useState<MonthlyStudentRow[]>([]);
  const [monthlyTotalDays, setMonthlyTotalDays] = useState<number>(30);
  const [monthlySummary, setMonthlySummary] = useState<any>(null);
  const [isMonthlyLoading, setIsMonthlyLoading] = useState<boolean>(false);

  // Student history tab state
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [studentHistoryData, setStudentHistoryData] = useState<any>(null);
  const [isStudentLoading, setIsStudentLoading] = useState<boolean>(false);

  const hasUnsavedChanges = students.some((s, idx) => {
    const orig = originalStudents[idx];
    if (!orig) return false;
    return s.status !== orig.status || s.remarks !== orig.remarks;
  });

  // 1. Initial Load: Academic Years
  useEffect(() => {
    async function loadAcademicYears() {
      try {
        const res = await fetch("/api/admin/academic-years");
        const json = await res.json();
        if (json.success && json.data) {
          const list: AcademicYearOption[] = json.data.academicYears || json.data;
          setAcademicYears(list);
          const activeYear = list.find((y) => y.status === "ACTIVE") || list[0];
          if (activeYear) {
            setSelectedYearId(activeYear.id || activeYear._id || "");
          }
        }
      } catch (err) {
        console.error("Failed to load academic years:", err);
      }
    }
    loadAcademicYears();
  }, []);

  // 2. Load Classes when Academic Year changes
  useEffect(() => {
    async function loadClasses() {
      if (!selectedYearId) {
        setClasses([]);
        setSelectedClassId("");
        setSections([]);
        setSelectedSectionId("");
        setSelectedStudentId("");
        setStudentHistoryData(null);
        setStudents([]);
        return;
      }
      try {
        const url = `/api/admin/classes?academicYearId=${selectedYearId}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success && json.data) {
          const classList: ClassOption[] = json.data.classes || json.data;
          setClasses(classList);
          if (classList.length > 0) {
            setSelectedClassId((prev) => {
              const exists = classList.some((c) => (c.id || c._id) === prev);
              return exists ? prev : (classList[0].id || classList[0]._id || "");
            });
          } else {
            setSelectedClassId("");
            setSections([]);
            setSelectedSectionId("");
            setSelectedStudentId("");
            setStudentHistoryData(null);
            setStudents([]);
          }
        }
      } catch (err) {
        console.error("Failed to load classes:", err);
      }
    }
    loadClasses();
  }, [selectedYearId]);

  // 3. Load Sections when Class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId("");
      setSelectedStudentId("");
      setStudentHistoryData(null);
      setStudents([]);
      return;
    }
    async function loadSections() {
      try {
        const url = selectedYearId
          ? `/api/admin/sections?academicYearId=${selectedYearId}&classId=${selectedClassId}`
          : `/api/admin/sections?classId=${selectedClassId}`;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success && json.data) {
          const secList: SectionOption[] = json.data.sections || json.data;
          setSections(secList);
          if (secList.length > 0) {
            setSelectedSectionId((prev) => {
              const exists = secList.some((s) => (s.id || s._id) === prev);
              return exists ? prev : (secList[0].id || secList[0]._id || "");
            });
          } else {
            setSelectedSectionId("");
            setSelectedStudentId("");
            setStudentHistoryData(null);
            setStudents([]);
          }
        }
      } catch (err) {
        console.error("Failed to load sections:", err);
      }
    }
    loadSections();
  }, [selectedClassId, selectedYearId]);

  // 4. Fetch Section Roster & Daily Attendance
  const fetchDailyAttendance = useCallback(async () => {
    if (!selectedSectionId || !selectedDate || !selectedYearId) return;
    setIsDailyLoading(true);
    setErrorMessage(null);
    setSaveSuccessMessage(null);
    try {
      const res = await fetch(
        `/api/admin/attendance/section/${selectedSectionId}?date=${selectedDate}&academicYearId=${selectedYearId}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load section attendance");
      }
      const studentList: StudentDailyRow[] = json.data.students || [];
      setStudents(studentList);
      setOriginalStudents(JSON.parse(JSON.stringify(studentList)));
      setDailySummary(json.data.summary || null);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load section attendance data.");
      setStudents([]);
      setOriginalStudents([]);
      setDailySummary(null);
    } finally {
      setIsDailyLoading(false);
    }
  }, [selectedSectionId, selectedDate, selectedYearId]);

  useEffect(() => {
    if (selectedSectionId && selectedDate && selectedYearId) {
      fetchDailyAttendance();
    }
  }, [selectedSectionId, selectedDate, selectedYearId, fetchDailyAttendance]);

  // 5. Fetch Monthly Matrix
  const fetchMonthlyAttendance = useCallback(async () => {
    if (!selectedSectionId || !selectedClassId || !selectedYearId) return;
    setIsMonthlyLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/admin/attendance/monthly?academicYearId=${selectedYearId}&classId=${selectedClassId}&sectionId=${selectedSectionId}&month=${selectedMonth}&year=${selectedMonthYear}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load monthly attendance matrix");
      }
      setMonthlyStudents(json.data.students || []);
      setMonthlyTotalDays(json.data.totalDaysInMonth || 30);
      setMonthlySummary(json.data.sectionSummary || null);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load monthly attendance.");
      setMonthlyStudents([]);
      setMonthlySummary(null);
    } finally {
      setIsMonthlyLoading(false);
    }
  }, [selectedSectionId, selectedClassId, selectedYearId, selectedMonth, selectedMonthYear]);

  useEffect(() => {
    if (activeTab === "monthly" && selectedSectionId && selectedClassId && selectedYearId) {
      fetchMonthlyAttendance();
    }
  }, [activeTab, selectedSectionId, selectedClassId, selectedYearId, selectedMonth, selectedMonthYear, fetchMonthlyAttendance]);

  // 6. Fetch Student History
  const fetchStudentHistory = useCallback(async () => {
    if (!selectedStudentId || !selectedSectionId || !selectedClassId || !selectedYearId) {
      setStudentHistoryData(null);
      return;
    }
    setIsStudentLoading(true);
    setErrorMessage(null);
    setStudentHistoryData(null);
    try {
      const res = await fetch(
        `/api/admin/attendance/student/${selectedStudentId}?academicYearId=${selectedYearId}&classId=${selectedClassId}&sectionId=${selectedSectionId}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load student attendance history");
      }
      setStudentHistoryData(json.data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load student history.");
      setStudentHistoryData(null);
    } finally {
      setIsStudentLoading(false);
    }
  }, [selectedStudentId, selectedYearId, selectedClassId, selectedSectionId]);

  useEffect(() => {
    if (activeTab === "student" && selectedStudentId && selectedSectionId && selectedClassId && selectedYearId) {
      fetchStudentHistory();
    }
  }, [activeTab, selectedStudentId, selectedSectionId, selectedClassId, selectedYearId, fetchStudentHistory]);

  // Status Handlers
  const handleSetStudentStatus = (studentId: string, status: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) => {
        if (s.studentId === studentId) {
          // Toggle off if same status clicked
          const newStatus = s.status === status ? null : status;
          return { ...s, status: newStatus };
        }
        return s;
      })
    );
    setSaveSuccessMessage(null);
  };

  const handleMarkAll = (status: AttendanceStatus) => {
    setStudents((prev) =>
      prev.map((s) => (s.isLocked ? s : { ...s, status }))
    );
    setSaveSuccessMessage(null);
  };

  const handleResetAll = () => {
    setStudents((prev) =>
      prev.map((s) => (s.isLocked ? s : { ...s, status: null, remarks: "" }))
    );
    setSaveSuccessMessage(null);
  };

  const handleOpenRemarks = (student: StudentDailyRow) => {
    setRemarksModalStudent(student);
    setTempRemarks(student.remarks || "");
  };

  const handleSaveRemarks = () => {
    if (!remarksModalStudent) return;
    setStudents((prev) =>
      prev.map((s) =>
        s.studentId === remarksModalStudent.studentId ? { ...s, remarks: tempRemarks } : s
      )
    );
    setRemarksModalStudent(null);
    setTempRemarks("");
  };

  // Bulk Save Attendance
  const handleSaveAttendance = async () => {
    // Check if any students have unmarked status
    const markedRecords = students
      .filter((s) => s.status !== null)
      .map((s) => ({
        studentId: s.studentId,
        status: s.status as AttendanceStatus,
        remarks: s.remarks || "",
      }));

    if (markedRecords.length === 0) {
      setErrorMessage("Please select an attendance status for at least one student before saving.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccessMessage(null);

    try {
      const res = await fetch("/api/admin/attendance/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          classId: selectedClassId,
          sectionId: selectedSectionId,
          date: selectedDate,
          records: markedRecords,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to save attendance");
      }

      setSaveSuccessMessage(json.message || "Attendance saved successfully!");
      // Reload fresh data from database
      await fetchDailyAttendance();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save attendance.");
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered student list for search
  const filteredStudents = students.filter((s) => {
    if (!dailySearch) return true;
    const q = dailySearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      s.admissionNumber.toLowerCase().includes(q) ||
      s.rollNumber.toLowerCase().includes(q)
    );
  });

  // Calculate live summary from current local state
  const liveTotal = students.length;
  const livePresent = students.filter((s) => s.status === "PRESENT").length;
  const liveAbsent = students.filter((s) => s.status === "ABSENT").length;
  const liveLate = students.filter((s) => s.status === "LATE").length;
  const liveLeave = students.filter((s) => s.status === "LEAVE").length;
  const liveUnmarked = students.filter((s) => s.status === null).length;
  const liveMarked = livePresent + liveAbsent + liveLate + liveLeave;
  const liveAttended = livePresent + liveLate;
  const livePercentage = liveMarked > 0 ? Number(((liveAttended / liveMarked) * 100).toFixed(1)) : 0;

  const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <CalendarCheck className="w-7 h-7 text-primary" />
            <span>Attendance</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Manage daily and monthly student attendance records across classes and sections.
          </p>
        </div>

        {/* Tab Navigation Controls */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-2 rounded-2xl border border-border">
          <button
            onClick={() => setActiveTab("daily")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "daily"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Daily Attendance
          </button>
          <button
            onClick={() => setActiveTab("monthly")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "monthly"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Monthly Matrix
          </button>
          <button
            onClick={() => setActiveTab("student")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "student"
                ? "bg-card text-foreground shadow-xs border border-border"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Student History
          </button>
        </div>
      </div>

      {/* Main Filter Bar */}
      <div className="p-5 rounded-3xl bg-card border border-border shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Academic Year */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Academic Session
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => {
                setSelectedYearId(e.target.value);
                setSelectedClassId("");
                setSelectedSectionId("");
                setSelectedStudentId("");
                setStudentHistoryData(null);
                setStudents([]);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {academicYears.map((yr) => {
                const yId = yr.id || yr._id || "";
                return (
                  <option key={yId} value={yId}>
                    {yr.name} {yr.status === "ACTIVE" ? "(Current Active)" : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Class */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSectionId("");
                setSelectedStudentId("");
                setStudentHistoryData(null);
                setStudents([]);
              }}
              disabled={classes.length === 0}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
            >
              {classes.length === 0 && <option value="">No classes available</option>}
              {classes.map((cls) => {
                const cId = cls.id || cls._id || "";
                return (
                  <option key={cId} value={cId}>
                    {cls.name}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Section */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Section
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => {
                setSelectedSectionId(e.target.value);
                setSelectedStudentId("");
                setStudentHistoryData(null);
              }}
              disabled={sections.length === 0}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
            >
              {sections.length === 0 && <option value="">No sections available</option>}
              {sections.map((sec) => {
                const sId = sec.id || sec._id || "";
                return (
                  <option key={sId} value={sId}>
                    Section {sec.name} {sec.capacity ? `(${sec.capacity} max)` : ""}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Tab Specific Date Filter */}
          {activeTab === "daily" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Attendance Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          {activeTab === "monthly" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Month & Year
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {MONTH_NAMES.map((mName, idx) => (
                    <option key={idx + 1} value={idx + 1}>
                      {mName}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedMonthYear}
                  onChange={(e) => setSelectedMonthYear(parseInt(e.target.value, 10))}
                  className="w-full px-2.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {activeTab === "student" && (
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                Select Student
              </label>
              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  setStudentHistoryData(null);
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="">Choose a student...</option>
                {students.map((st) => (
                  <option key={st.studentId} value={st.studentId}>
                    {st.rollNumber ? `[#${st.rollNumber}] ` : ""}
                    {st.name} ({st.admissionNumber})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Notifications / Alerts */}
      {saveSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button onClick={() => setSaveSuccessMessage(null)} className="p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: DAILY ATTENDANCE                                                    */}
      {/* ========================================================================= */}
      {activeTab === "daily" && (
        <div className="space-y-6">
          {/* Daily Section Summary Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Total Enrolled
              </span>
              <span className="text-xl font-extrabold text-foreground">{liveTotal}</span>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                Present
              </span>
              <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                {livePresent}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                Absent
              </span>
              <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
                {liveAbsent}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                Late
              </span>
              <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                {liveLate}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                Leave
              </span>
              <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400">
                {liveLeave}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-surface-2 border border-border shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Not Marked
              </span>
              <span className="text-xl font-extrabold text-muted-foreground">{liveUnmarked}</span>
            </div>
            <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 shadow-xs col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                Attendance Rate
              </span>
              <span className="text-xl font-extrabold text-primary">{livePercentage}%</span>
            </div>
          </div>

          {/* Action Bar: Search, Mark All Shortcuts & Save Button */}
          <div className="p-4 rounded-3xl bg-card border border-border shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={dailySearch}
                onChange={(e) => setDailySearch(e.target.value)}
                placeholder="Search student or roll no..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-surface-2 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Quick Bulk Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
              <button
                type="button"
                onClick={() => handleMarkAll("PRESENT")}
                className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold cursor-pointer transition-colors"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll("ABSENT")}
                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold cursor-pointer transition-colors"
              >
                Mark All Absent
              </button>
              <button
                type="button"
                onClick={handleResetAll}
                className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground border border-border text-xs font-semibold cursor-pointer transition-colors"
              >
                Reset All
              </button>

              {/* Save Attendance Submit Button */}
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={isSaving || students.length === 0}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <RotateCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Attendance</span>
              </button>
            </div>
          </div>

          {/* Unsaved changes indicator */}
          {hasUnsavedChanges && (
            <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>You have unsaved attendance changes. Remember to click <strong>Save Attendance</strong>.</span>
            </div>
          )}

          {/* Student Attendance List */}
          {isDailyLoading ? (
            <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
              <RotateCw className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground">Loading section student roster...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
              <Users className="w-10 h-10 text-muted-foreground/50 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">No students found in this section</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No active students are enrolled in the selected class and section. Enroll students from the Student Directory first.
              </p>
              <Link
                href="/admin/students/create"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
              >
                Enroll Student
              </Link>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-2/60 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-3.5 px-4 w-16">Roll</th>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Admission No</th>
                      <th className="py-3.5 px-4 text-center">Status</th>
                      <th className="py-3.5 px-4">Remarks</th>
                      <th className="py-3.5 px-4 text-right">Lock / History</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStudents.map((st) => {
                      const isPresent = st.status === "PRESENT";
                      const isAbsent = st.status === "ABSENT";
                      const isLate = st.status === "LATE";
                      const isLeave = st.status === "LEAVE";

                      return (
                        <tr
                          key={st.studentId}
                          className="hover:bg-surface-2/40 transition-colors group"
                        >
                          {/* Roll Number */}
                          <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                            {st.rollNumber || "-"}
                          </td>

                          {/* Student Identity */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                                {st.name.charAt(0)}
                              </div>
                              <div>
                                <Link
                                  href={`/admin/students/${st.studentId}`}
                                  className="font-bold text-foreground hover:text-primary transition-colors block"
                                >
                                  {st.name}
                                </Link>
                                <span className="text-[10px] text-muted-foreground capitalize">
                                  {st.gender.toLowerCase()}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Admission Number */}
                          <td className="py-3.5 px-4 font-mono text-muted-foreground">
                            {st.admissionNumber}
                          </td>

                          {/* Status Action Buttons */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Present */}
                              <button
                                type="button"
                                disabled={st.isLocked}
                                onClick={() => handleSetStudentStatus(st.studentId, "PRESENT")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isPresent
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "bg-surface-2 text-muted-foreground hover:text-foreground border border-border"
                                } disabled:opacity-50`}
                              >
                                {isPresent && <Check className="w-3.5 h-3.5" />}
                                <span>Present</span>
                              </button>

                              {/* Absent */}
                              <button
                                type="button"
                                disabled={st.isLocked}
                                onClick={() => handleSetStudentStatus(st.studentId, "ABSENT")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isAbsent
                                    ? "bg-rose-600 text-white shadow-xs"
                                    : "bg-surface-2 text-muted-foreground hover:text-foreground border border-border"
                                } disabled:opacity-50`}
                              >
                                {isAbsent && <X className="w-3.5 h-3.5" />}
                                <span>Absent</span>
                              </button>

                              {/* Late */}
                              <button
                                type="button"
                                disabled={st.isLocked}
                                onClick={() => handleSetStudentStatus(st.studentId, "LATE")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isLate
                                    ? "bg-amber-600 text-white shadow-xs"
                                    : "bg-surface-2 text-muted-foreground hover:text-foreground border border-border"
                                } disabled:opacity-50`}
                              >
                                {isLate && <Clock className="w-3.5 h-3.5" />}
                                <span>Late</span>
                              </button>

                              {/* Leave */}
                              <button
                                type="button"
                                disabled={st.isLocked}
                                onClick={() => handleSetStudentStatus(st.studentId, "LEAVE")}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                  isLeave
                                    ? "bg-purple-600 text-white shadow-xs"
                                    : "bg-surface-2 text-muted-foreground hover:text-foreground border border-border"
                                } disabled:opacity-50`}
                              >
                                {isLeave && <Calendar className="w-3.5 h-3.5" />}
                                <span>Leave</span>
                              </button>
                            </div>
                          </td>

                          {/* Remarks */}
                          <td className="py-3.5 px-4">
                            <button
                              type="button"
                              onClick={() => handleOpenRemarks(st)}
                              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 max-w-[200px] truncate cursor-pointer group-hover:text-primary transition-colors"
                            >
                              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">
                                {st.remarks ? st.remarks : <span className="italic text-muted-foreground/60">Add note</span>}
                              </span>
                            </button>
                          </td>

                          {/* Lock / History */}
                          <td className="py-3.5 px-4 text-right">
                            {st.isLocked ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                <Lock className="w-3 h-3" /> Locked
                              </span>
                            ) : st.updatedAt ? (
                              <span className="text-[10px] text-muted-foreground">
                                Saved
                              </span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground/50">
                                Not Saved
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="md:hidden divide-y divide-border">
                {filteredStudents.map((st) => {
                  const isPresent = st.status === "PRESENT";
                  const isAbsent = st.status === "ABSENT";
                  const isLate = st.status === "LATE";
                  const isLeave = st.status === "LEAVE";

                  return (
                    <div key={st.studentId} className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center">
                            {st.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-foreground block">
                              {st.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Roll: {st.rollNumber || "N/A"} • Adm: {st.admissionNumber}
                            </span>
                          </div>
                        </div>

                        {st.isLocked && (
                          <span className="p-1 rounded-lg bg-amber-500/10 text-amber-500">
                            <Lock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>

                      {/* Status Buttons Grid */}
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSetStudentStatus(st.studentId, "PRESENT")}
                          className={`py-2 rounded-xl text-xs font-bold text-center transition-all ${
                            isPresent
                              ? "bg-emerald-600 text-white"
                              : "bg-surface-2 text-muted-foreground border border-border"
                          }`}
                        >
                          Present
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetStudentStatus(st.studentId, "ABSENT")}
                          className={`py-2 rounded-xl text-xs font-bold text-center transition-all ${
                            isAbsent
                              ? "bg-rose-600 text-white"
                              : "bg-surface-2 text-muted-foreground border border-border"
                          }`}
                        >
                          Absent
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetStudentStatus(st.studentId, "LATE")}
                          className={`py-2 rounded-xl text-xs font-bold text-center transition-all ${
                            isLate
                              ? "bg-amber-600 text-white"
                              : "bg-surface-2 text-muted-foreground border border-border"
                          }`}
                        >
                          Late
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetStudentStatus(st.studentId, "LEAVE")}
                          className={`py-2 rounded-xl text-xs font-bold text-center transition-all ${
                            isLeave
                              ? "bg-purple-600 text-white"
                              : "bg-surface-2 text-muted-foreground border border-border"
                          }`}
                        >
                          Leave
                        </button>
                      </div>

                      {/* Remarks */}
                      <button
                        type="button"
                        onClick={() => handleOpenRemarks(st)}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{st.remarks ? st.remarks : "Add remark..."}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MONTHLY MATRIX                                                      */}
      {/* ========================================================================= */}
      {activeTab === "monthly" && (
        <div className="space-y-6">
          {/* Section Monthly Aggregate Cards */}
          {monthlySummary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-4 rounded-2xl bg-card border border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Students
                </span>
                <span className="text-xl font-extrabold text-foreground">
                  {monthlySummary.totalStudents}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-surface-2 border border-border">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                  Total Marked
                </span>
                <span className="text-xl font-extrabold text-foreground">
                  {monthlySummary.totalMarked}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                  Present
                </span>
                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {monthlySummary.presentCount}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                  Absent
                </span>
                <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
                  {monthlySummary.absentCount}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                  Late
                </span>
                <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                  {monthlySummary.lateCount}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                  Monthly Rate
                </span>
                <span className="text-xl font-extrabold text-primary">
                  {monthlySummary.percentage}%
                </span>
              </div>
            </div>
          )}

          {/* Monthly Matrix Grid Table */}
          {isMonthlyLoading ? (
            <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
              <RotateCw className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground">Calculating monthly attendance matrix...</p>
            </div>
          ) : monthlyStudents.length === 0 ? (
            <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-2">
              <Users className="w-8 h-8 text-muted-foreground/50 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">No attendance records found for this month</h3>
              <p className="text-xs text-muted-foreground">
                Select another month or mark attendance on the Daily tab.
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-surface-2/60 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="py-3 px-3 w-10 sticky left-0 bg-surface-2 z-10">Roll</th>
                      <th className="py-3 px-3 min-w-[150px] sticky left-10 bg-surface-2 z-10">Student</th>
                      {Array.from({ length: monthlyTotalDays }, (_, i) => i + 1).map((day) => (
                        <th key={day} className="py-3 px-1.5 text-center min-w-[28px]">
                          {day}
                        </th>
                      ))}
                      <th className="py-3 px-2 text-center text-emerald-600 dark:text-emerald-400">P</th>
                      <th className="py-3 px-2 text-center text-rose-600 dark:text-rose-400">A</th>
                      <th className="py-3 px-2 text-center text-amber-600 dark:text-amber-400">L</th>
                      <th className="py-3 px-2 text-center text-purple-600 dark:text-purple-400">Lv</th>
                      <th className="py-3 px-3 text-right font-bold text-primary">Rate %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-[11px]">
                    {monthlyStudents.map((st) => (
                      <tr key={st.studentId} className="hover:bg-surface-2/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold sticky left-0 bg-card z-10">
                          {st.rollNumber || "-"}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-foreground sticky left-10 bg-card z-10 truncate max-w-[180px]">
                          <Link href={`/admin/students/${st.studentId}`} className="hover:text-primary">
                            {st.name}
                          </Link>
                        </td>
                        {Array.from({ length: monthlyTotalDays }, (_, i) => i + 1).map((day) => {
                          const status = st.dailyMap[day];
                          return (
                            <td key={day} className="py-2.5 px-1 text-center font-mono text-[10px] font-bold">
                              {status === "PRESENT" && (
                                <span className="inline-block w-5 h-5 leading-5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                  P
                                </span>
                              )}
                              {status === "ABSENT" && (
                                <span className="inline-block w-5 h-5 leading-5 rounded bg-rose-500/20 text-rose-600 dark:text-rose-400">
                                  A
                                </span>
                              )}
                              {status === "LATE" && (
                                <span className="inline-block w-5 h-5 leading-5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">
                                  L
                                </span>
                              )}
                              {status === "LEAVE" && (
                                <span className="inline-block w-5 h-5 leading-5 rounded bg-purple-500/20 text-purple-600 dark:text-purple-400">
                                  Lv
                                </span>
                              )}
                              {!status && <span className="text-muted-foreground/30">-</span>}
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-2 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          {st.summary.presentCount}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-rose-600 dark:text-rose-400">
                          {st.summary.absentCount}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-amber-600 dark:text-amber-400">
                          {st.summary.lateCount}
                        </td>
                        <td className="py-2.5 px-2 text-center font-bold text-purple-600 dark:text-purple-400">
                          {st.summary.leaveCount}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-primary">
                          {st.summary.percentage}%
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
      {/* TAB 3: STUDENT ATTENDANCE HISTORY                                         */}
      {/* ========================================================================= */}
      {activeTab === "student" && (
        <div className="space-y-6">
          {!selectedStudentId ? (
            <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-2">
              <Users className="w-8 h-8 text-muted-foreground/50 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">Select a student to view attendance history</h3>
              <p className="text-xs text-muted-foreground">
                Choose a student from the filter bar above to see their comprehensive attendance timeline and metrics.
              </p>
            </div>
          ) : isStudentLoading ? (
            <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
              <RotateCw className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground">Loading student attendance history...</p>
            </div>
          ) : studentHistoryData ? (
            <div className="space-y-6">
              {/* Student Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-4 rounded-2xl bg-card border border-border">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Total Days
                  </span>
                  <span className="text-xl font-extrabold text-foreground">
                    {studentHistoryData.summary.totalMarked}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                    Present
                  </span>
                  <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {studentHistoryData.summary.presentCount}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 block">
                    Absent
                  </span>
                  <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400">
                    {studentHistoryData.summary.absentCount}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
                    Late
                  </span>
                  <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                    {studentHistoryData.summary.lateCount}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
                    Leave
                  </span>
                  <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400">
                    {studentHistoryData.summary.leaveCount}
                  </span>
                </div>
                <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
                    Turnout %
                  </span>
                  <span className="text-xl font-extrabold text-primary">
                    {studentHistoryData.summary.percentage}%
                  </span>
                </div>
              </div>

              {/* Monthly Breakdown Cards */}
              {studentHistoryData.monthlyBreakdown?.length > 0 && (
                <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span>Monthly Attendance Breakdown</span>
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {studentHistoryData.monthlyBreakdown.map((m: any) => (
                      <div key={m.key} className="p-3.5 rounded-2xl bg-surface-2 border border-border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-foreground">{m.monthName} {m.year}</span>
                          <span className="font-extrabold text-xs text-primary">{m.percentage}%</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{m.presentCount} P</span>
                          <span className="text-rose-600 dark:text-rose-400 font-semibold">{m.absentCount} A</span>
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">{m.lateCount} L</span>
                          <span className="text-purple-600 dark:text-purple-400 font-semibold">{m.leaveCount} Lv</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily Records Log Table */}
              <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                <div className="p-4 border-b border-border bg-surface-2/40 flex items-center justify-between">
                  <h3 className="font-bold text-xs text-foreground flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span>Daily Attendance Log ({studentHistoryData.records.length} records)</span>
                  </h3>
                </div>

                {studentHistoryData.records.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">
                    No attendance records found for the selected student, class and section.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-2/60 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="py-3 px-4">Date</th>
                          <th className="py-3 px-4">Class & Section</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Remarks</th>
                          <th className="py-3 px-4">Recorded By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {studentHistoryData.records.map((rec: any) => (
                          <tr key={rec.id} className="hover:bg-surface-2/30 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-foreground">
                              {rec.date}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {rec.class?.name} - Section {rec.section?.name}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  rec.status === "PRESENT"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : rec.status === "ABSENT"
                                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                    : rec.status === "LATE"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                                }`}
                              >
                                {rec.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {rec.remarks || "-"}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {rec.markedBy?.name || "Admin"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ========================================================================= */}
      {/* REMARKS MODAL                                                             */}
      {/* ========================================================================= */}
      {remarksModalStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <span>Attendance Remark for {remarksModalStudent.name}</span>
              </h3>
              <button
                onClick={() => setRemarksModalStudent(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">
                Enter note or reason (e.g. Medical leave, Arrived late due to bus delay):
              </label>
              <textarea
                rows={3}
                value={tempRemarks}
                onChange={(e) => setTempRemarks(e.target.value)}
                placeholder="Type remark here..."
                className="w-full p-3 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRemarksModalStudent(null)}
                className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRemarks}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-90 cursor-pointer"
              >
                Apply Remark
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
