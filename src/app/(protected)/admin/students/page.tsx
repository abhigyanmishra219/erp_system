"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  GraduationCap,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  UserCheck,
  UserX,
  RefreshCw,
  MoreVertical,
  Building2,
  BookOpen,
  Eye,
  Key,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { useSubscription } from "@/context/SubscriptionContext";

interface StudentItem {
  id: string;
  admissionNumber: string;
  studentId?: string;
  rollNumber?: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  bloodGroup?: string;
  avatarUrl?: string;
  academicYear?: { _id: string; name: string; status: string };
  class?: { _id: string; name: string; code?: string };
  section?: { _id: string; name: string };
  status: "ACTIVE" | "INACTIVE" | "TRANSFERRED" | "GRADUATED";
  hasLoginAccount: boolean;
  user?: { _id: string; email: string; isActive: boolean };
  admissionDate: string;
  createdAt: string;
}

interface AcademicYearOpt {
  id: string;
  name: string;
  status: string;
}

interface ClassOpt {
  id: string;
  name: string;
  sections?: { id: string; name: string }[];
}

export default function StudentsDirectoryPage() {
  const { studentUsage, subscription } = useSubscription();
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [limit] = useState(15);

  const [search, setSearch] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [status, setStatus] = useState("ALL");
  const [gender, setGender] = useState("ALL");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filter option dependencies
  const [academicYears, setAcademicYears] = useState<AcademicYearOpt[]>([]);
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [sections, setSections] = useState<{ id: string; name: string }[]>([]);

  // Load filter options (Academic Years, Classes, Sections)
  useEffect(() => {
    async function loadFilters() {
      try {
        const [ayRes, classRes] = await Promise.all([
          fetch("/api/admin/academic-years"),
          fetch("/api/admin/classes"),
        ]);
        const ayData = await ayRes.json();
        const classData = await classRes.json();

        if (ayData.success && ayData.data?.academicYears) {
          setAcademicYears(ayData.data.academicYears);
        }
        if (classData.success && classData.data?.classes) {
          setClasses(classData.data.classes);
        }
      } catch (err) {
        console.error("Failed to load filter options", err);
      }
    }
    loadFilters();
  }, []);

  // Update sections when class selection changes
  useEffect(() => {
    if (!classId) {
      setSections([]);
      setSectionId("");
      return;
    }
    const selectedClass = classes.find((c) => c.id === classId);
    let classSections = selectedClass?.sections || [];

    if (classSections.length > 0) {
      setSections(classSections);
    } else {
      fetch(`/api/admin/sections?classId=${classId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data?.sections) {
            setSections(json.data.sections);
          } else {
            setSections([]);
          }
        })
        .catch(() => setSections([]));
    }
    setSectionId("");
  }, [classId, classes]);

  const fetchStudents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (search) params.set("search", search);
      if (academicYearId) params.set("academicYearId", academicYearId);
      if (classId) params.set("classId", classId);
      if (sectionId) params.set("sectionId", sectionId);
      if (status !== "ALL") params.set("status", status);
      if (gender !== "ALL") params.set("gender", gender);
      params.set("sortBy", sortBy);
      params.set("sortOrder", sortOrder);

      const res = await fetch(`/api/admin/students?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to fetch student directory");
      }

      setStudents(json.data.students || []);
      setTotalPages(json.data.pagination?.totalPages || 1);
      setTotalCount(json.data.pagination?.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error fetching students");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, academicYearId, classId, sectionId, status, gender, sortBy, sortOrder]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const clearFilters = () => {
    setSearch("");
    setAcademicYearId("");
    setClassId("");
    setSectionId("");
    setStatus("ALL");
    setGender("ALL");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-7 h-7 text-indigo-500" />
            Student Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage student enrollment, profiles, academic placements, and status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/students/promote"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted/50 transition-colors shadow-sm"
          >
            <GraduationCap className="w-4 h-4 text-indigo-500" />
            Bulk Promote
          </Link>

          <Link
            href="/admin/students/create"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Enroll Student
          </Link>
        </div>
      </div>

      {/* Subscription Capacity Bar & Warnings */}
      {studentUsage.limit > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-foreground">Student Capacity:</span>
              <span className="font-mono text-muted-foreground">
                <strong className="text-foreground">{studentUsage.current}</strong> / {studentUsage.limit} active students
              </span>
              <span className="px-2 py-0.5 rounded-full bg-surface-2 border border-border text-[10px] font-semibold">
                {subscription?.planName || "Active Plan"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${studentUsage.isAtLimit ? "text-rose-600 dark:text-rose-400" : studentUsage.isNearLimit ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                {studentUsage.isAtLimit
                  ? "Capacity Limit Reached"
                  : `${studentUsage.percentage}% Used`}
              </span>
            </div>
          </div>

          <div className="w-full h-2 rounded-full bg-surface-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                studentUsage.isAtLimit
                  ? "bg-rose-500"
                  : studentUsage.isNearLimit
                  ? "bg-amber-500"
                  : "bg-indigo-600"
              }`}
              style={{ width: `${Math.min(100, studentUsage.percentage)}%` }}
            />
          </div>

          {studentUsage.isAtLimit && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Your school subscription has reached its maximum allowance of <strong>{studentUsage.limit}</strong> active students. New enrollments and imports are temporarily restricted. Contact your platform administrator to upgrade your plan.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search Box */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, roll no, admission no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Academic Year Filter */}
          <div>
            <select
              value={academicYearId}
              onChange={(e) => {
                setAcademicYearId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Academic Years</option>
              {academicYears.map((ay) => (
                <option key={ay.id} value={ay.id}>
                  {ay.name} {ay.status === "ACTIVE" ? "(Current)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <select
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <select
              value={sectionId}
              disabled={!classId || sections.length === 0}
              onChange={(e) => {
                setSectionId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="">All Sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  Section {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="GRADUATED">Graduated</option>
            </select>
          </div>
        </form>

        <div className="flex items-center justify-between pt-2 border-t border-border text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Showing {students.length} of {totalCount} students</span>
            {(search || academicYearId || classId || sectionId || status !== "ALL" || gender !== "ALL") && (
              <button
                onClick={clearFilters}
                className="text-indigo-600 hover:text-indigo-500 font-medium underline ml-2"
              >
                Clear Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span>Sort by:</span>
            <button
              onClick={() => {
                setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                setPage(1);
              }}
              className="inline-flex items-center gap-1 font-medium text-foreground hover:text-indigo-600"
            >
              {sortBy === "createdAt" ? "Date Enrolled" : sortBy} ({sortOrder.toUpperCase()})
              <ArrowUpDown className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Students Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40 border-b border-border text-muted-foreground uppercase text-[11px] font-semibold tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Admission No</th>
                <th className="px-4 py-3.5">Student Name</th>
                <th className="px-4 py-3.5">Class & Section</th>
                <th className="px-4 py-3.5">Roll No</th>
                <th className="px-4 py-3.5">Gender</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Portal Account</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                    Loading student directory...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="font-semibold text-foreground">No students found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {search || academicYearId || classId
                        ? "Try adjusting your search criteria or clear your filters."
                        : "No students have been enrolled yet. Get started by enrolling your first student."}
                    </p>
                    <Link
                      href="/admin/students/create"
                      className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Enroll First Student
                    </Link>
                  </td>
                </tr>
              ) : (
                students.map((st) => (
                  <tr key={st.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-foreground">
                      <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                        {st.admissionNumber}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-xs flex-shrink-0">
                          {st.firstName[0]}
                          {st.lastName[0]}
                        </div>
                        <div>
                          <Link
                            href={`/admin/students/${st.id}`}
                            className="font-medium text-foreground hover:text-indigo-600 transition-colors"
                          >
                            {st.fullName}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {st.email || st.phone || "No contact info"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-medium text-foreground">
                        {st.class ? st.class.name : "Unassigned"}
                      </span>
                      {st.section && (
                        <span className="text-xs text-muted-foreground ml-1">
                          - Sec {st.section.name}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-muted-foreground">
                      {st.rollNumber ? (
                        <span className="font-mono text-xs">{st.rollNumber}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-xs text-muted-foreground capitalize">
                      {st.gender.toLowerCase()}
                    </td>

                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          st.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : st.status === "INACTIVE"
                            ? "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                            : st.status === "TRANSFERRED"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                        }`}
                      >
                        {st.status}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      {st.hasLoginAccount ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          <UserCheck className="w-3.5 h-3.5" />
                          Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <UserX className="w-3.5 h-3.5" />
                          Not created
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/admin/students/${st.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-500" />
                        View Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <div className="text-xs text-muted-foreground">
              Page <span className="font-semibold text-foreground">{page}</span> of{" "}
              <span className="font-semibold text-foreground">{totalPages}</span> ({totalCount} total)
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-border text-foreground hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
