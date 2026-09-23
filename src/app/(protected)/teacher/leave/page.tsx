"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CalendarX,
  Calendar,
  Clock,
  Plus,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Paperclip,
  Trash2,
  X,
  Ban,
  Search,
  Filter,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";

interface LeaveItem {
  _id: string;
  fromDate: string;
  toDate: string;
  reason: string;
  attachments: { name: string; url: string; mimeType?: string; size?: number }[];
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reviewedBy?: { _id: string; name: string; email?: string } | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

interface LeaveSummary {
  totalApplications: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  cancelledCount: number;
}

export default function TeacherLeavePage() {
  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [summary, setSummary] = useState<LeaveSummary>({
    totalApplications: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    cancelledCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Modal states
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Form Fields
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);

  // Cancel Confirmation
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/teacher/leave");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load leave records");
      }
      setLeaves(json.data.leaves || []);
      setSummary(json.data.summary);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, []);

  const handleAddAttachment = () => {
    if (!attachmentName.trim() || !attachmentUrl.trim()) return;
    setAttachments((prev) => [
      ...prev,
      { name: attachmentName.trim(), url: attachmentUrl.trim() },
    ]);
    setAttachmentName("");
    setAttachmentUrl("");
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!fromDate || !toDate) {
      setFormError("Please select both start and end dates.");
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      setFormError("End date must be on or after start date.");
      return;
    }

    if (!reason.trim() || reason.trim().length < 3) {
      setFormError("Please provide a valid reason (at least 3 characters).");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/teacher/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromDate,
          toDate,
          reason: reason.trim(),
          attachments,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit leave application");
      }

      setFormSuccess("Leave application submitted successfully!");
      setFromDate("");
      setToDate("");
      setReason("");
      setAttachments([]);
      await fetchLeaves();
      setTimeout(() => {
        setIsApplyModalOpen(false);
        setFormSuccess(null);
      }, 1200);
    } catch (err: any) {
      setFormError(err.message || "Failed to submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelLeave = async (leaveId: string) => {
    try {
      setCancellingId(leaveId);
      const res = await fetch(`/api/teacher/leave/${leaveId}/cancel`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to cancel leave request");
      }
      await fetchLeaves();
    } catch (err: any) {
      alert(err.message || "Error cancelling leave request");
    } finally {
      setCancellingId(null);
    }
  };

  const calculateDays = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays === 1 ? "1 Day" : `${diffDays} Days`;
  };

  const filteredLeaves = useMemo(() => {
    return leaves.filter((leave) => {
      if (activeTab !== "ALL" && leave.status !== activeTab) {
        return false;
      }
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesReason = leave.reason.toLowerCase().includes(query);
        const matchesStatus = leave.status.toLowerCase().includes(query);
        return matchesReason || matchesStatus;
      }
      return true;
    });
  }, [leaves, activeTab, searchTerm]);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
            Faculty Leave Applications
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Submit leave requests, track approval workflows, and review reviewer decisions.
          </p>
        </div>

        <button
          onClick={() => {
            setFormError(null);
            setFormSuccess(null);
            setIsApplyModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Apply for Leave</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-foreground tracking-tight">
              {summary.totalApplications}
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              Total Applied
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-foreground tracking-tight">
              {summary.pendingCount}
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              Pending Review
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-foreground tracking-tight">
              {summary.approvedCount}
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              Approved
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black text-foreground tracking-tight">
              {summary.rejectedCount}
            </div>
            <div className="text-[11px] font-medium text-muted-foreground">
              Rejected
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-2 rounded-2xl border border-border">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-thin">
          {[
            { key: "ALL", label: "All Requests", count: summary.totalApplications },
            { key: "PENDING", label: "Pending", count: summary.pendingCount },
            { key: "APPROVED", label: "Approved", count: summary.approvedCount },
            { key: "REJECTED", label: "Rejected", count: summary.rejectedCount },
            { key: "CANCELLED", label: "Cancelled", count: summary.cancelledCount },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab.key
                  ? "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              <span className="px-1.5 py-0.2 rounded-md bg-muted text-[10px]">
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search reasons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-muted/60 border border-border focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 text-foreground"
          />
        </div>
      </div>

      {/* Main Leave List */}
      {loading ? (
        <div className="p-16 rounded-3xl bg-card border border-border text-center space-y-3">
          <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-muted-foreground">Loading leave history...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-3xl bg-destructive/10 border border-destructive/20 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
          <div className="text-sm font-bold text-destructive">{error}</div>
          <button
            onClick={fetchLeaves}
            className="px-4 py-1.5 rounded-xl bg-destructive text-destructive-foreground text-xs font-bold hover:opacity-90"
          >
            Retry
          </button>
        </div>
      ) : filteredLeaves.length === 0 ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
          <CalendarX className="w-10 h-10 text-muted-foreground mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No Leave Requests Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {activeTab === "ALL"
              ? "You haven't submitted any leave applications yet."
              : `No leave applications currently match the ${activeTab.toLowerCase()} status.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLeaves.map((leave) => {
            const duration = calculateDays(leave.fromDate, leave.toDate);
            const isPending = leave.status === "PENDING";
            const isApproved = leave.status === "APPROVED";
            const isRejected = leave.status === "REJECTED";
            const isCancelled = leave.status === "CANCELLED";

            return (
              <div
                key={leave._id}
                className={`p-5 rounded-3xl bg-card border transition-all space-y-4 ${
                  isPending
                    ? "border-amber-500/40 shadow-xs"
                    : isApproved
                    ? "border-emerald-500/40"
                    : isRejected
                    ? "border-rose-500/40"
                    : "border-border opacity-70"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        isPending
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                          : isApproved
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : isRejected
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isApproved && <CheckCircle2 className="w-5 h-5" />}
                      {isRejected && <XCircle className="w-5 h-5" />}
                      {isPending && <Clock className="w-5 h-5 animate-pulse" />}
                      {isCancelled && <Ban className="w-5 h-5" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black text-foreground">
                          {new Date(leave.fromDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}{" "}
                          —{" "}
                          {new Date(leave.toDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-bold text-muted-foreground">
                          {duration}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Applied on{" "}
                        {new Date(leave.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                        isApproved
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : isRejected
                          ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                          : isPending
                          ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {leave.status}
                    </span>

                    {isPending && (
                      <button
                        onClick={() => handleCancelLeave(leave._id)}
                        disabled={cancellingId === leave._id}
                        className="px-3 py-1 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-500/10 border border-rose-500/20 transition-all disabled:opacity-50"
                      >
                        {cancellingId === leave._id ? "Cancelling..." : "Cancel Request"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Reason */}
                <div className="text-xs text-foreground bg-muted/40 p-3.5 rounded-2xl border border-border">
                  <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">
                    Reason
                  </span>
                  <p className="leading-relaxed">{leave.reason}</p>
                </div>

                {/* Attachments */}
                {leave.attachments && leave.attachments.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      Attachments:
                    </span>
                    {leave.attachments.map((att, aIdx) => (
                      <a
                        key={aIdx}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-card border border-border hover:border-cyan-500/40 text-xs font-medium text-foreground hover:text-cyan-600 transition-all"
                      >
                        <Paperclip className="w-3 h-3 text-cyan-500" />
                        <span>{att.name}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    ))}
                  </div>
                )}

                {/* Rejection Alert */}
                {isRejected && leave.rejectionReason && (
                  <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-0.5">
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        Rejection Reason:
                      </span>
                      <p className="text-rose-700 dark:text-rose-300">
                        {leave.rejectionReason}
                      </p>
                    </div>
                  </div>
                )}

                {/* Reviewer Note */}
                {(isApproved || isRejected) && leave.reviewedBy && (
                  <div className="text-[11px] text-muted-foreground flex items-center gap-2 pt-2 border-t border-border">
                    <span>
                      Reviewed by <strong className="text-foreground">{leave.reviewedBy.name}</strong>
                    </span>
                    {leave.reviewedAt && (
                      <>
                        <span>•</span>
                        <span>
                          {new Date(leave.reviewedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* APPLY FOR LEAVE MODAL */}
      {isApplyModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-card border border-border shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-foreground">Apply for Leave</h2>
                  <p className="text-xs text-muted-foreground">Submit a faculty absence request</p>
                </div>
              </div>

              <button
                onClick={() => setIsApplyModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="p-5 space-y-4 overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">From Date *</label>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-muted/50 border border-border focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 text-foreground"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">To Date *</label>
                  <input
                    type="date"
                    required
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-muted/50 border border-border focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 text-foreground"
                  />
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Reason for Leave *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide detailed explanation for your absence (e.g. Medical emergency, Conference, Family event)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={1000}
                  className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-muted/50 border border-border focus:outline-hidden focus:ring-2 focus:ring-cyan-500/20 text-foreground resize-none"
                />
                <div className="text-[10px] text-muted-foreground text-right">
                  {reason.length}/1000 characters
                </div>
              </div>

              {/* Attachments */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-xs font-bold text-foreground">
                  Supporting Documents / Links (Optional)
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Document Name (e.g. Medical Certificate)"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-muted/50 border border-border text-foreground"
                  />
                  <input
                    type="url"
                    placeholder="Document URL"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-muted/50 border border-border text-foreground"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="px-3 py-1.5 bg-secondary text-secondary-foreground text-xs font-bold rounded-xl hover:bg-secondary/80"
                  >
                    Add
                  </button>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-1.5 mt-2">
                    {attachments.map((att, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 rounded-xl bg-muted/60 border border-border text-xs"
                      >
                        <span className="font-medium truncate">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(i)}
                          className="text-rose-500 hover:text-rose-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Security Policy Reminder */}
              <div className="p-3 rounded-2xl bg-muted/40 border border-border text-[11px] text-muted-foreground">
                <p>
                  <strong>Approval Policy:</strong> All faculty leave applications are routed to school administration for review. Self-approval is strictly prohibited.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-sm shadow-cyan-600/20 disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
