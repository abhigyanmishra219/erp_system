"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParentChild } from "@/context/ParentChildContext";
import ChildSwitcher from "../components/ChildSwitcher";
import {
  Award,
  Calendar,
  Clock,
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Printer,
  Sparkles,
  RefreshCw,
  Layers,
  GraduationCap,
  CalendarDays,
  FileText,
  X,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface ScheduleItem {
  _id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  subjectType: string;
  examDate: string | null;
  maximumMarks: number;
  passingMarks: number;
}

interface ExamItem {
  _id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  timelineStatus: "UPCOMING" | "ONGOING" | "COMPLETED";
  academicYear: {
    _id: string;
    name: string;
  };
  classContext: {
    classId: string;
    className: string;
    sectionId: string;
    sectionName: string;
  };
  subjectCount: number;
  schedule: ScheduleItem[];
}

interface AcademicContext {
  student: {
    _id: string;
    name: string;
    rollNumber: string;
    admissionNumber: string;
  };
  class: {
    _id: string;
    name: string;
    code: string;
  };
  section: {
    _id: string;
    name: string;
  };
  academicYear: {
    _id: string;
    name: string;
  };
}

interface SummaryData {
  total: number;
  upcoming: number;
  ongoing: number;
  completed: number;
  totalSubjectsScheduled: number;
}

export default function ParentExamsPage() {
  const { children, selectedChild, selectedChildId, isLoading: isChildrenLoading } = useParentChild();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [academicContext, setAcademicContext] = useState<AcademicContext | null>(null);
  const [summary, setSummary] = useState<SummaryData>({
    total: 0,
    upcoming: 0,
    ongoing: 0,
    completed: 0,
    totalSubjectsScheduled: 0,
  });

  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedExamId, setExpandedExamId] = useState<string | null>(null);

  const fetchExams = useCallback(async (studentId: string, status: string = "ALL", search: string = "") => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      params.set("studentId", studentId);
      if (status !== "ALL") params.set("status", status);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/parent/exams?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || "Failed to load examination timetable");
      }

      if (json.data) {
        setExams(json.data.exams || []);
        setAcademicContext(json.data.academicContext || null);
        setSummary(
          json.data.summary || {
            total: 0,
            upcoming: 0,
            ongoing: 0,
            completed: 0,
            totalSubjectsScheduled: 0,
          }
        );
        // Expand the first upcoming/ongoing exam by default
        if (json.data.exams && json.data.exams.length > 0) {
          setExpandedExamId(json.data.exams[0]._id);
        } else {
          setExpandedExamId(null);
        }
      }
    } catch (err: any) {
      console.error("Error fetching parent exams:", err);
      setError(err.message || "Could not load examination data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      fetchExams(selectedChildId, statusFilter, searchQuery);
    }
  }, [selectedChildId, statusFilter, searchQuery, fetchExams]);

  const toggleExpand = (id: string) => {
    setExpandedExamId((prev) => (prev === id ? null : id));
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "TBD";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusBadge = (timelineStatus: string, modelStatus: string) => {
    if (timelineStatus === "ONGOING" || modelStatus === "ONGOING") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          ONGOING
        </span>
      );
    }
    if (timelineStatus === "UPCOMING" || modelStatus === "SCHEDULED") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Clock className="w-3.5 h-3.5" />
          UPCOMING
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" />
        COMPLETED
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header with ChildSwitcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <Award className="h-4 w-4" />
            <span>Examination Datesheet</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Examinations &amp; Schedules</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Track upcoming test series, semester examinations, and subject datesheets for your child.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <ChildSwitcher />
          {selectedChildId && (
            <button
              onClick={() => fetchExams(selectedChildId, statusFilter, searchQuery)}
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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse" />
            ))}
          </div>
          <div className="h-48 bg-white rounded-2xl border border-slate-200 animate-pulse" />
        </div>
      )}

      {/* Error Alert */}
      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Main Exams Content */}
      {!loading && !error && selectedChildId && (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Upcoming Exams</p>
                  <h3 className="text-2xl font-bold text-blue-600 mt-1">{summary.upcoming}</h3>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>Scheduled on datesheet</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-200 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Ongoing Series</p>
                  <h3 className="text-2xl font-bold text-amber-600 mt-1">{summary.ongoing}</h3>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Currently active cycle</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed</p>
                  <h3 className="text-2xl font-bold text-emerald-600 mt-1">{summary.completed}</h3>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Results available in Results tab</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Scheduled Subjects</p>
                  <h3 className="text-2xl font-bold text-indigo-600 mt-1">{summary.totalSubjectsScheduled}</h3>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
                <span>Total subject test papers</span>
              </div>
            </div>
          </div>

          {/* Filters and Search Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="h-4 w-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search examination name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 overflow-x-auto">
              {["ALL", "UPCOMING", "ONGOING", "COMPLETED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    statusFilter === st
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Exams List & Datesheets */}
          {exams.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
              <Award className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 mb-1">No Examinations Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No examination cycles match your criteria for {selectedChild?.student?.fullName || "this child"}.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {exams.map((exam) => {
                const isExpanded = expandedExamId === exam._id;
                return (
                  <div
                    key={exam._id}
                    className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                      isExpanded
                        ? "border-indigo-500 shadow-md ring-2 ring-indigo-50"
                        : "border-slate-200 hover:border-slate-300 shadow-sm"
                    }`}
                  >
                    {/* Exam Card Header */}
                    <div
                      onClick={() => toggleExpand(exam._id)}
                      className="p-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none hover:bg-slate-50/50 transition-colors"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                          {getStatusBadge(exam.timelineStatus, exam.status)}
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                            {exam.academicYear.name}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
                            {exam.classContext.className} - {exam.classContext.sectionName}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">{exam.name}</h3>
                        {exam.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{exam.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-xs text-slate-400 uppercase font-semibold">Date Range</p>
                          <p className="text-xs font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {formatDate(exam.startDate)} - {formatDate(exam.endDate)}
                          </p>
                        </div>
                        <div className="p-2 text-slate-400 hover:text-slate-700">
                          <ChevronDown
                            className={`w-5 h-5 transition-transform duration-200 ${
                              isExpanded ? "rotate-180 text-indigo-600" : ""
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Expandable Datesheet Breakdown */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 p-5 bg-slate-50/40 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <CalendarDays className="w-4 h-4 text-indigo-600" />
                            <span>Official Datesheet ({exam.schedule.length} Subjects)</span>
                          </h4>
                        </div>

                        {exam.schedule.length === 0 ? (
                          <div className="p-6 text-center text-slate-400 text-xs italic bg-white rounded-xl border border-slate-200">
                            Detailed datesheet schedule has not been published yet.
                          </div>
                        ) : (
                          <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                                  <th className="p-3 pl-4">Subject</th>
                                  <th className="p-3">Paper Code</th>
                                  <th className="p-3">Type</th>
                                  <th className="p-3">Exam Date</th>
                                  <th className="p-3">Max Marks</th>
                                  <th className="p-3 pr-4">Pass Marks</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {exam.schedule.map((item, idx) => (
                                  <tr key={item._id || idx} className="hover:bg-slate-50/80">
                                    <td className="p-3 pl-4 font-bold text-slate-900">
                                      {item.subjectName}
                                    </td>
                                    <td className="p-3 font-mono text-slate-500">
                                      {item.subjectCode || "—"}
                                    </td>
                                    <td className="p-3">
                                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-600 text-[10px] font-semibold">
                                        {item.subjectType}
                                      </span>
                                    </td>
                                    <td className="p-3 font-medium text-slate-800">
                                      <span className="flex items-center gap-1">
                                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                                        {formatDate(item.examDate)}
                                      </span>
                                    </td>
                                    <td className="p-3 font-bold text-slate-800">{item.maximumMarks}</td>
                                    <td className="p-3 pr-4 text-slate-600">{item.passingMarks}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
