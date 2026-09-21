"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  History,
  Search,
  RotateCw,
  Calendar,
  Filter,
  ShieldCheck,
  User,
  Building2,
  AlertCircle,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  Layers,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { AUDIT_ACTIONS } from "@/lib/constants/audit";

interface AuditLogItem {
  id: string;
  actor: {
    id?: string;
    name?: string;
    email?: string;
    role: string;
  };
  userRole: string;
  action: string;
  entityType: string;
  entityId: string | null;
  school: {
    id: string;
    name: string;
    code: string;
  } | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(20);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Detail Modal
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", limit.toString());
      if (search.trim()) params.append("search", search.trim());
      if (actionFilter !== "ALL") params.append("action", actionFilter);
      if (entityFilter !== "ALL") params.append("entityType", entityFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const res = await fetch(`/api/system-admin/audit-logs?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load audit logs");
      }

      setLogs(json.data.logs || []);
      setTotalLogs(json.data.pagination.total || 0);
      setTotalPages(json.data.pagination.totalPages || 1);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error fetching audit logs");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, limit, search, actionFilter, entityFilter, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionBadgeClass = (action: string) => {
    if (action.includes("CREATE")) {
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
    }
    if (action.includes("UPDATE") || action.includes("CHANGED") || action.includes("RENEW")) {
      return "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
    }
    if (action.includes("DELETE") || action.includes("DEACTIVATE") || action.includes("SUSPEND")) {
      return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20";
    }
    return "bg-surface-2 text-foreground border-border";
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case "SCHOOL":
        return <Building2 className="w-3.5 h-3.5 text-primary" />;
      case "PLAN":
        return <Layers className="w-3.5 h-3.5 text-indigo-500" />;
      case "SUBSCRIPTION":
        return <CreditCard className="w-3.5 h-3.5 text-emerald-500" />;
      case "USER":
        return <User className="w-3.5 h-3.5 text-amber-500" />;
      default:
        return <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-1.5">
            <History className="w-3.5 h-3.5" />
            <span>Compliance & Security</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Platform Audit Logs
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Append-only immutable record of administrative actions, mutations, and security events.
          </p>
        </div>

        <button
          onClick={() => fetchLogs()}
          className="p-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-foreground transition-all flex items-center gap-2 text-xs font-medium cursor-pointer shadow-sm self-start sm:self-auto"
        >
          <RotateCw className={`w-4 h-4 text-primary ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border space-y-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Search */}
          <div className="relative sm:col-span-2 lg:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by action, entity ID..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-input border border-input-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Actions</option>
              {AUDIT_ACTIONS.map((a) => (
                <option key={a} value={a}>
                  {a.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Filter */}
          <div>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 rounded-xl bg-input border border-input-border text-foreground focus:outline-none focus:border-primary"
            >
              <option value="ALL">All Entities</option>
              <option value="SCHOOL">School</option>
              <option value="USER">User</option>
              <option value="PLAN">Plan</option>
              <option value="SUBSCRIPTION">Subscription</option>
              <option value="PLATFORM">Platform</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2 py-2 rounded-xl bg-input border border-input-border text-foreground text-[11px] focus:outline-none focus:border-primary"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-2 py-2 rounded-xl bg-input border border-input-border text-foreground text-[11px] focus:outline-none focus:border-primary"
            />
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      {isLoading ? (
        <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground font-medium">Querying platform audit trail...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-3 shadow-sm">
          <div className="p-4 rounded-2xl bg-primary/10 text-primary w-fit mx-auto">
            <History className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-foreground">No audit activity found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Administrative actions, plan creations, and subscription modifications will be permanently recorded here.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-surface-1/50 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Actor</th>
                  <th className="py-3.5 px-4">Action</th>
                  <th className="py-3.5 px-4">Entity</th>
                  <th className="py-3.5 px-4">Tenant Scope</th>
                  <th className="py-3.5 px-4">Metadata Summary</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => {
                  const metaKeys = Object.keys(log.metadata || {});
                  return (
                    <tr key={log.id} className="hover:bg-surface-1/50 transition-colors">
                      {/* Date & Time */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-foreground block">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {new Date(log.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-foreground block">
                            {log.actor.name || log.actor.email || "System"}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-surface-2 border border-border text-[9px] font-mono font-semibold uppercase text-primary">
                            {log.actor.role || log.userRole}
                          </span>
                        </div>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wide border inline-block ${getActionBadgeClass(
                            log.action
                          )}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Entity */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {getEntityIcon(log.entityType)}
                          <span className="font-semibold text-foreground">{log.entityType}</span>
                        </div>
                      </td>

                      {/* School / Tenant */}
                      <td className="py-3.5 px-4">
                        {log.school ? (
                          <div className="space-y-0.5">
                            <span className="font-medium text-foreground block truncate max-w-[140px]">
                              {log.school.name}
                            </span>
                            <span className="font-mono text-[9px] text-muted-foreground uppercase">
                              {log.school.code}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-muted-foreground font-mono">Platform Wide</span>
                        )}
                      </td>

                      {/* Metadata Summary */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <span className="text-[11px] text-muted-foreground line-clamp-1 font-mono">
                          {metaKeys.length > 0
                            ? metaKeys.slice(0, 3).map((k) => `${k}: ${String(log.metadata[k])}`).join(" • ")
                            : "No metadata"}
                        </span>
                      </td>

                      {/* Inspect Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border text-foreground transition-all inline-flex items-center gap-1 shadow-xs cursor-pointer text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-border bg-surface-1/40 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {logs.length} of {totalLogs.toLocaleString()} total audit entries
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-mono text-xs text-foreground font-medium px-2">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border text-foreground disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Detail Modal (Read-Only & Sanitized) */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-popover border border-border rounded-2xl p-6 max-w-xl w-full my-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">Audit Record Details</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg hover:bg-surface-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-surface-2 border border-border">
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Action</span>
                  <span className="font-mono font-bold text-foreground">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Timestamp</span>
                  <span className="text-foreground">{new Date(selectedLog.createdAt).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Actor</span>
                  <span className="text-foreground font-medium">
                    {selectedLog.actor.name || selectedLog.actor.email || "System"} ({selectedLog.actor.role})
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px] uppercase font-bold">Entity Type</span>
                  <span className="text-foreground font-mono">{selectedLog.entityType}</span>
                </div>
                {selectedLog.entityId && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Entity ID</span>
                    <span className="font-mono text-foreground">{selectedLog.entityId}</span>
                  </div>
                )}
                {selectedLog.school && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-[10px] uppercase font-bold">Affected Tenant School</span>
                    <span className="text-foreground font-medium">
                      {selectedLog.school.name} ({selectedLog.school.code})
                    </span>
                  </div>
                )}
              </div>

              {/* Safe Metadata Inspector */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Event Metadata Payload (Sanitized)
                </span>
                <pre className="p-3.5 rounded-xl bg-surface-1 border border-border font-mono text-[11px] text-foreground overflow-x-auto max-h-56 leading-relaxed">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-foreground border border-border text-xs font-semibold cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
