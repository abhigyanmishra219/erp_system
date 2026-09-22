"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Users,
  Search,
  Plus,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  Key,
  Eye,
  Edit2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Mail,
  Phone,
  Briefcase,
  BookOpen,
  Award,
  AlertCircle,
  Building2,
} from "lucide-react";

interface TeacherItem {
  id: string;
  teacherId: string;
  employeeId?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  photo?: string;
  gender: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  qualification?: string;
  joiningDate?: string;
  status: "ACTIVE" | "INACTIVE";
  hasLoginAccount: boolean;
  assignmentsCount: number;
  isClassTeacher: boolean;
  createdAt: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function TeachersDirectoryPage() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");

  // Summary counts
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
  });

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchTeachers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        status: statusFilter,
        department: departmentFilter,
      });

      if (debouncedSearch) {
        params.append("search", debouncedSearch);
      }

      const res = await fetch(`/api/admin/teachers?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to fetch teachers directory");
      }

      setTeachers(json.data.teachers || []);
      setPagination(json.data.pagination);

      // Derive quick stats from overall data if on page 1
      if (statusFilter === "ALL" && !debouncedSearch && departmentFilter === "ALL") {
        const total = json.data.pagination.total;
        const active = json.data.teachers.filter((t: TeacherItem) => t.status === "ACTIVE").length;
        setStats({
          total,
          active,
          inactive: total - active,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, departmentFilter, debouncedSearch]);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const handleToggleStatus = async (teacher: TeacherItem) => {
    const newStatus = teacher.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const confirmMessage =
      newStatus === "INACTIVE"
        ? `Are you sure you want to deactivate ${teacher.fullName}? Their portal access will be suspended.`
        : `Activate ${teacher.fullName}?`;

    if (!confirm(confirmMessage)) return;

    try {
      const res = await fetch(`/api/admin/teachers/${teacher.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update status");
      }
      fetchTeachers();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Status change failed");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-indigo-500" />
            Teachers & Faculty Directory
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage teacher profiles, qualifications, class & subject assignments, and portal access.
          </p>
        </div>

        <Link
          href="/admin/teachers/create"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add New Teacher
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Total Faculty
            </span>
            <span className="text-2xl font-extrabold text-foreground">{pagination.total}</span>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Active Teachers
            </span>
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {teachers.filter((t) => t.status === "ACTIVE").length}
            </span>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Class Teachers
            </span>
            <span className="text-2xl font-extrabold text-purple-600 dark:text-purple-400">
              {teachers.filter((t) => t.isClassTeacher).length}
            </span>
          </div>
          <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by teacher name, ID, employee ID, email, phone, or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-background border border-border rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Inactive Only</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="sm:col-span-3">
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Departments</option>
              <option value="Science">Science</option>
              <option value="Mathematics">Mathematics</option>
              <option value="Languages">Languages</option>
              <option value="Social Studies">Social Studies</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Physical Education">Physical Education</option>
              <option value="Arts & Music">Arts & Music</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Teachers Table */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-foreground border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Teacher & ID</th>
                <th className="py-3 px-4">Department & Role</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Academic Assignments</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Portal Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RotateCw className="w-6 h-6 animate-spin text-indigo-500" />
                      <span>Loading faculty records...</span>
                    </div>
                  </td>
                </tr>
              ) : teachers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <GraduationCap className="w-8 h-8 text-muted-foreground/40" />
                      <span className="font-semibold text-foreground text-sm">No teachers found</span>
                      <p className="text-xs">
                        {debouncedSearch || statusFilter !== "ALL" || departmentFilter !== "ALL"
                          ? "Try adjusting your search criteria or filters."
                          : "Get started by adding faculty members to your school database."}
                      </p>
                      {!debouncedSearch && statusFilter === "ALL" && (
                        <Link
                          href="/admin/teachers/create"
                          className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Teacher
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                teachers.map((t) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    {/* Teacher & ID */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-bold text-xs flex items-center justify-center shadow-inner flex-shrink-0">
                          {t.firstName[0]}
                          {t.lastName[0]}
                        </div>
                        <div>
                          <Link
                            href={`/admin/teachers/${t.id}`}
                            className="font-bold text-foreground hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors block text-sm"
                          >
                            {t.fullName}
                          </Link>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <span className="font-mono font-medium text-foreground">ID: {t.teacherId}</span>
                            {t.employeeId && <span>• Emp: {t.employeeId}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department & Role */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="font-semibold text-foreground block">
                          {t.designation || "Teacher"}
                        </span>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {t.department || "General"}
                        </span>
                        {t.qualification && (
                          <span className="text-[10px] text-muted-foreground block truncate max-w-[150px]">
                            {t.qualification}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5 text-[11px]">
                        {t.email ? (
                          <div className="flex items-center gap-1.5 text-foreground">
                            <Mail className="w-3 h-3 text-muted-foreground" />
                            <span>{t.email}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">No email</span>
                        )}
                        {t.phone && (
                          <div className="flex items-center gap-1.5 text-muted-foreground font-mono">
                            <Phone className="w-3 h-3" />
                            <span>{t.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Academic Assignments */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="font-semibold text-foreground">
                            {t.assignmentsCount} {t.assignmentsCount === 1 ? "Class" : "Classes"}
                          </span>
                        </div>
                        {t.isClassTeacher && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded text-[10px] font-bold">
                            <Award className="w-3 h-3" /> Class Teacher
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          t.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-slate-500/10 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>

                    {/* Portal Login */}
                    <td className="py-3.5 px-4">
                      {t.hasLoginAccount ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Enabled
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">Disabled</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/admin/teachers/${t.id}`}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                          title="View Profile & Assignments"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        <button
                          onClick={() => handleToggleStatus(t)}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                          title={t.status === "ACTIVE" ? "Deactivate Teacher" : "Activate Teacher"}
                        >
                          {t.status === "ACTIVE" ? (
                            <XCircle className="w-4 h-4 text-rose-500" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>
              Showing page <strong className="text-foreground">{pagination.page}</strong> of{" "}
              <strong className="text-foreground">{pagination.totalPages}</strong> (
              <strong className="text-foreground">{pagination.total}</strong> total teachers)
            </div>

            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                className="p-1.5 rounded-lg border border-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted text-foreground transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                className="p-1.5 rounded-lg border border-border disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted text-foreground transition-colors"
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
