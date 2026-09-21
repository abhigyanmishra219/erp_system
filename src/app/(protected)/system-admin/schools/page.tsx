"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  School as SchoolIcon,
  PlusCircle,
  Search,
  Filter,
  ArrowUpRight,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Users,
} from "lucide-react";

interface SchoolItem {
  id: string;
  name: string;
  code: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  plan: string;
  studentLimit: number;
  subscriptionStartDate: string;
  subscriptionExpiryDate: string;
  subscriptionStatus: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  enabledModules: string[];
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function SchoolsManagementPage() {
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [planFilter, setPlanFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Modal States
  const [actionSchool, setActionSchool] = useState<SchoolItem | null>(null);
  const [actionType, setActionType] = useState<
    "ACTIVATE" | "DEACTIVATE" | "SUSPEND" | "DELETE" | null
  >(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const fetchSchools = useCallback(
    async (pageToLoad = 1) => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const queryParams = new URLSearchParams({
          page: pageToLoad.toString(),
          limit: "10",
          search: search.trim(),
          status: statusFilter,
          plan: planFilter,
        });

        const res = await fetch(`/api/system-admin/schools?${queryParams}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || "Failed to fetch schools");
        }

        setSchools(json.data);
        setPagination(json.pagination);
      } catch (err: unknown) {
        setErrorMessage(
          err instanceof Error ? err.message : "Error fetching schools"
        );
      } finally {
        setIsLoading(false);
      }
    },
    [search, statusFilter, planFilter]
  );

  useEffect(() => {
    fetchSchools(1);
  }, [fetchSchools]);

  const handleStatusChange = async (
    schoolId: string,
    newStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED"
  ) => {
    setIsProcessingAction(true);
    try {
      const res = await fetch(`/api/system-admin/schools/${schoolId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update status");
      }

      setFeedbackMessage(`Status updated to ${newStatus}`);
      setActionSchool(null);
      setActionType(null);
      fetchSchools(pagination.page);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error updating status"
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleDeleteSchool = async (schoolId: string) => {
    setIsProcessingAction(true);
    try {
      const res = await fetch(`/api/system-admin/schools/${schoolId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to delete school");
      }

      setFeedbackMessage("School archived safely.");
      setActionSchool(null);
      setActionType(null);
      fetchSchools(pagination.page);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error deleting school"
      );
    } finally {
      setIsProcessingAction(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "INACTIVE":
        return "bg-surface-3 text-muted-foreground border-border";
      case "SUSPENDED":
        return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      default:
        return "bg-surface-3 text-muted-foreground border-border";
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case "ENTERPRISE":
        return "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30";
      case "PROFESSIONAL":
        return "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30";
      case "STANDARD":
        return "bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30";
      default:
        return "bg-surface-2 text-muted-foreground border-border";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <SchoolIcon className="w-5 h-5 text-primary" />
            <span>School Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Create, configure, monitor, and manage multi-tenant school instances.
          </p>
        </div>

        <Link
          href="/system-admin/schools/create"
          className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-foreground text-xs sm:text-sm font-semibold shadow-lg shadow-primary/20 flex items-center justify-center gap-2 transition-all w-full sm:w-auto"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add New School</span>
        </Link>
      </div>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className="p-3.5 rounded-xl bg-success/10 border border-success/20 text-success text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{feedbackMessage}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-success hover:opacity-80 font-bold cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-destructive hover:opacity-80 font-bold cursor-pointer"
          >
            ×
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by school name, code, city..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-input border border-input-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Filters & Refresh */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-input border border-input-border rounded-xl px-2.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          {/* Plan Filter */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-input border border-input-border rounded-xl px-2.5 py-2 text-xs text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Plans</option>
              <option value="BASIC">Basic</option>
              <option value="STANDARD">Standard</option>
              <option value="PROFESSIONAL">Professional</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchSchools(pagination.page)}
            disabled={isLoading}
            className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-all disabled:opacity-50 cursor-pointer border border-border shadow-sm"
            title="Reload table"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Schools Table */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-2/60 border-b border-border text-muted-foreground uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4 font-semibold">School</th>
                <th className="py-3.5 px-4 font-semibold">Code</th>
                <th className="py-3.5 px-4 font-semibold">Plan</th>
                <th className="py-3.5 px-4 font-semibold">Limit</th>
                <th className="py-3.5 px-4 font-semibold">Subscription</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    <span>Loading tenant schools from MongoDB...</span>
                  </td>
                </tr>
              ) : schools.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center space-y-2">
                    <SchoolIcon className="w-8 h-8 text-muted-foreground mx-auto" />
                    <p className="text-foreground font-medium">No schools found</p>
                    <p className="text-muted-foreground text-[11px]">
                      Try adjusting your search or filter parameters.
                    </p>
                  </td>
                </tr>
              ) : (
                schools.map((school) => (
                  <tr
                    key={school.id}
                    className="hover:bg-surface-2/50 transition-colors group"
                  >
                    {/* School Name & Location */}
                    <td className="py-3.5 px-4">
                      <Link
                        href={`/system-admin/schools/${school.id}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors block text-sm"
                      >
                        {school.name}
                      </Link>
                      <span className="text-[11px] text-muted-foreground">
                        {school.city || school.country
                          ? `${school.city || ""}${
                              school.city && school.country ? ", " : ""
                            }${school.country || ""}`
                          : "Location not specified"}
                      </span>
                    </td>

                    {/* School Code */}
                    <td className="py-3.5 px-4 font-mono font-medium text-foreground">
                      {school.code}
                    </td>

                    {/* Plan */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getPlanBadge(
                          school.plan
                        )}`}
                      >
                        {school.plan}
                      </span>
                    </td>

                    {/* Students Limit */}
                    <td className="py-3.5 px-4 text-foreground font-medium">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{school.studentLimit} max</span>
                      </div>
                    </td>

                    {/* Subscription */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-foreground block">
                        {school.subscriptionStatus}
                      </span>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-2.5 h-2.5" />
                        <span>
                          Expires{" "}
                          {new Date(
                            school.subscriptionExpiryDate
                          ).toLocaleDateString()}
                        </span>
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border uppercase tracking-wider ${getStatusBadge(
                          school.status
                        )}`}
                      >
                        {school.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/system-admin/schools/${school.id}`}
                          className="px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 text-foreground text-[11px] font-medium transition-all inline-flex items-center gap-1 border border-border shadow-sm"
                        >
                          <span>Manage</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>

                        {/* Quick Action Dropdown Trigger */}
                        <div className="relative group/actions inline-block">
                          <button
                            className="p-1 rounded-lg bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground border border-border cursor-pointer shadow-sm"
                            aria-label="More actions"
                          >
                            <MoreHorizontal className="w-3.5 h-3.5" />
                          </button>

                          {/* Action Menu */}
                          <div className="absolute right-0 mt-1 w-36 py-1 bg-popover border border-border rounded-xl shadow-2xl hidden group-hover/actions:block z-30 text-left text-[11px]">
                            {school.status !== "ACTIVE" && (
                              <button
                                onClick={() => {
                                  setActionSchool(school);
                                  setActionType("ACTIVATE");
                                }}
                                className="w-full px-3 py-1.5 hover:bg-surface-2 text-emerald-500 flex items-center gap-1.5 cursor-pointer"
                              >
                                <CheckCircle className="w-3 h-3" />
                                <span>Activate</span>
                              </button>
                            )}
                            {school.status === "ACTIVE" && (
                              <button
                                onClick={() => {
                                  setActionSchool(school);
                                  setActionType("DEACTIVATE");
                                }}
                                className="w-full px-3 py-1.5 hover:bg-surface-2 text-foreground flex items-center gap-1.5 cursor-pointer"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Deactivate</span>
                              </button>
                            )}
                            {school.status !== "SUSPENDED" && (
                              <button
                                onClick={() => {
                                  setActionSchool(school);
                                  setActionType("SUSPEND");
                                }}
                                className="w-full px-3 py-1.5 hover:bg-surface-2 text-amber-500 flex items-center gap-1.5 cursor-pointer"
                              >
                                <AlertTriangle className="w-3 h-3" />
                                <span>Suspend</span>
                              </button>
                            )}
                            <div className="border-t border-border my-1" />
                            <button
                              onClick={() => {
                                setActionSchool(school);
                                actionType;
                                setActionType("DELETE");
                              }}
                              className="w-full px-3 py-1.5 hover:bg-destructive/10 text-destructive flex items-center gap-1.5 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Safe Archive</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="p-4 bg-surface-1/50 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {schools.length} of {pagination.total} schools
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => fetchSchools(pagination.page - 1)}
                className="px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-border shadow-sm"
              >
                Previous
              </button>
              <span className="px-2 font-mono text-foreground font-medium">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => fetchSchools(pagination.page + 1)}
                className="px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-border shadow-sm"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {actionSchool && actionType && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-popover border border-border rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              {actionType === "DELETE" ? (
                <Trash2 className="w-5 h-5 text-destructive" />
              ) : actionType === "SUSPEND" ? (
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              ) : (
                <CheckCircle className="w-5 h-5 text-primary" />
              )}
              <span>
                {actionType === "DELETE"
                  ? "Archive & Soft Delete School"
                  : actionType === "ACTIVATE"
                  ? "Activate School"
                  : actionType === "DEACTIVATE"
                  ? "Deactivate School"
                  : "Suspend School Access"}
              </span>
            </h3>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {actionType === "DELETE"
                ? `Are you sure you want to archive '${actionSchool.name}' (${actionSchool.code})? The school will be deactivated and hidden from normal queries, preserving data integrity.`
                : `Are you sure you want to change status of '${actionSchool.name}' (${actionSchool.code}) to ${actionType}?`}
            </p>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => {
                  setActionSchool(null);
                  setActionType(null);
                }}
                className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-xs font-medium text-foreground transition-all cursor-pointer border border-border"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isProcessingAction}
                onClick={() => {
                  if (actionType === "DELETE") {
                    handleDeleteSchool(actionSchool.id);
                  } else {
                    handleStatusChange(
                      actionSchool.id,
                      actionType as "ACTIVE" | "INACTIVE" | "SUSPENDED"
                    );
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all shadow-md cursor-pointer ${
                  actionType === "DELETE"
                    ? "bg-destructive hover:opacity-90 shadow-destructive/20"
                    : actionType === "SUSPEND"
                    ? "bg-amber-600 hover:bg-amber-500 shadow-amber-600/20"
                    : "bg-primary hover:bg-primary-hover shadow-primary/20"
                }`}
              >
                {isProcessingAction ? "Processing..." : "Confirm Action"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
