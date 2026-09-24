"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParentChild } from "@/context/ParentChildContext";
import ChildSwitcher from "../components/ChildSwitcher";
import {
  CalendarDays,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Calendar,
  RefreshCw,
  Send,
  X,
  Paperclip,
  Trash2,
  ChevronRight,
  ShieldCheck,
  UserCheck,
} from "lucide-react";

interface LeaveAttachment {
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
}

interface LeaveItem {
  _id: string;
  studentId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  attachments?: LeaveAttachment[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

export default function ParentLeavePage() {
  const { children, selectedChild, selectedChildId, isLoading: isChildrenLoading } = useParentChild();

  const [leaves, setLeaves] = useState<LeaveItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [reason, setReason] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [attachments, setAttachments] = useState<LeaveAttachment[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Filter State
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");

  const fetchLeaves = useCallback(async (studentId: string) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/parent/leave?studentId=${studentId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || "Failed to load leave history");
      }

      setLeaves(json.data?.leaves || []);
    } catch (err: any) {
      console.error("Error fetching parent leaves:", err);
      setError(err.message || "Could not load leave records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      fetchLeaves(selectedChildId);
    }
  }, [selectedChildId, fetchLeaves]);

  const handleAddAttachment = () => {
    if (!attachmentUrl.trim()) return;
    const name = attachmentName.trim() || `Document-${attachments.length + 1}`;
    setAttachments((prev) => [...prev, { name, url: attachmentUrl.trim() }]);
    setAttachmentUrl("");
    setAttachmentName("");
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmitLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChildId) return;

    setFormError(null);
    setFormSuccess(null);

    if (!fromDate || !toDate) {
      setFormError("Please select both from and to dates.");
      return;
    }

    if (new Date(fromDate) > new Date(toDate)) {
      setFormError("From date cannot be after To date.");
      return;
    }

    if (reason.trim().length < 3) {
      setFormError("Please provide a reason with at least 3 characters.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/parent/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedChildId,
          fromDate,
          toDate,
          reason: reason.trim(),
          attachments,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || "Failed to submit leave request.");
      }

      setFormSuccess("Leave application submitted successfully!");
      // Reset form
      setFromDate("");
      setToDate("");
      setReason("");
      setAttachments([]);

      // Refresh list
      await fetchLeaves(selectedChildId);

      setTimeout(() => {
        setIsModalOpen(false);
        setFormSuccess(null);
      }, 1200);
    } catch (err: any) {
      console.error("Leave submission error:", err);
      setFormError(err.message || "Could not submit leave request");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const calculateDays = (from: string, to: string) => {
    const d1 = new Date(from);
    const d2 = new Date(to);
    const diff = Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : 1;
  };

  const filteredLeaves = leaves.filter((l) => {
    if (statusFilter === "ALL") return true;
    return l.status === statusFilter;
  });

  const counts = {
    all: leaves.length,
    pending: leaves.filter((l) => l.status === "PENDING").length,
    approved: leaves.filter((l) => l.status === "APPROVED").length,
    rejected: leaves.filter((l) => l.status === "REJECTED").length,
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <CalendarDays className="h-4 w-4" />
            <span>Attendance &amp; Absence</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Leave Requests</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Submit leave applications and track approval statuses for your children.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <ChildSwitcher />
          {selectedChildId && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Apply for Leave</span>
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
            Your account is not linked to any active student records in the school system.
          </p>
        </div>
      )}

      {selectedChildId && (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div
              onClick={() => setStatusFilter("ALL")}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === "ALL"
                  ? "bg-slate-900 text-white border-slate-900 shadow-md"
                  : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">Total Applied</div>
              <div className="text-2xl font-bold">{counts.all}</div>
            </div>

            <div
              onClick={() => setStatusFilter("PENDING")}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === "PENDING"
                  ? "bg-amber-600 text-white border-amber-600 shadow-md"
                  : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">
                <span>Pending</span>
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold">{counts.pending}</div>
            </div>

            <div
              onClick={() => setStatusFilter("APPROVED")}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === "APPROVED"
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-md"
                  : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">
                <span>Approved</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold">{counts.approved}</div>
            </div>

            <div
              onClick={() => setStatusFilter("REJECTED")}
              className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                statusFilter === "REJECTED"
                  ? "bg-rose-600 text-white border-rose-600 shadow-md"
                  : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider opacity-80 mb-1">
                <span>Rejected</span>
                <XCircle className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold">{counts.rejected}</div>
            </div>
          </div>

          {/* Workflow Note Alert */}
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-950 leading-relaxed">
              <span className="font-bold">Leave Approval Workflow:</span> Once submitted, the application enters{" "}
              <span className="font-semibold text-amber-700">PENDING</span> status. The school administration or
              class teacher will review and approve or reject it. You will be updated here in real-time.
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-white rounded-2xl border border-slate-200 animate-pulse" />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Leave Records List */}
          {!loading && !error && (
            <div className="space-y-4">
              {filteredLeaves.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                  <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h3 className="text-base font-bold text-slate-700 mb-1">No Leave Applications Found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                    {statusFilter === "ALL"
                      ? "You haven't submitted any leave requests for this student yet."
                      : `No leave applications with status "${statusFilter}".`}
                  </p>
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Apply Now</span>
                  </button>
                </div>
              ) : (
                filteredLeaves.map((leave) => {
                  const days = calculateDays(leave.fromDate, leave.toDate);
                  return (
                    <div
                      key={leave._id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                              leave.status === "APPROVED"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : leave.status === "REJECTED"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {leave.status === "APPROVED" && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {leave.status === "REJECTED" && <XCircle className="w-3.5 h-3.5" />}
                            {leave.status === "PENDING" && <Clock className="w-3.5 h-3.5" />}
                            {leave.status}
                          </span>
                          <span className="text-xs text-slate-400">
                            Submitted on {formatDate(leave.createdAt)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200/60 self-start sm:self-auto">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          <span>
                            {formatDate(leave.fromDate)} → {formatDate(leave.toDate)}
                          </span>
                          <span className="text-indigo-600 font-bold ml-1">
                            ({days} {days === 1 ? "day" : "days"})
                          </span>
                        </div>
                      </div>

                      {/* Reason */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Reason</h4>
                        <p className="text-sm text-slate-800 leading-relaxed bg-slate-50/60 p-3 rounded-xl border border-slate-100">
                          {leave.reason}
                        </p>
                      </div>

                      {/* Rejection / Review Info */}
                      {leave.status === "REJECTED" && leave.rejectionReason && (
                        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-800">
                          <span className="font-bold">Rejection Reason:</span> {leave.rejectionReason}
                        </div>
                      )}

                      {leave.reviewedBy && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 pt-1">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            Reviewed by <span className="font-semibold text-slate-700">{leave.reviewedBy}</span>
                            {leave.reviewedAt && ` on ${formatDate(leave.reviewedAt)}`}
                          </span>
                        </div>
                      )}

                      {/* Attachments */}
                      {leave.attachments && leave.attachments.length > 0 && (
                        <div className="pt-2">
                          <div className="flex flex-wrap gap-2">
                            {leave.attachments.map((att, idx) => (
                              <a
                                key={idx}
                                href={att.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors"
                              >
                                <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                                <span className="truncate max-w-[150px]">{att.name}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* Leave Application Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Apply for Student Leave</h2>
                <p className="text-xs text-slate-500">
                  Submitting for <span className="font-semibold text-indigo-600">{selectedChild?.student?.fullName || "Selected Child"}</span>
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmitLeave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    From Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    To Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason for Leave <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain reason (medical, family event, personal)..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Attachments section */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Attachments (Optional)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Document URL (e.g. medical note)"
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Title"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    className="w-28 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                  >
                    Add
                  </button>
                </div>

                {attachments.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {attachments.map((att, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                      >
                        <span className="truncate font-medium text-slate-700">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveAttachment(idx)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition-all disabled:opacity-50"
                >
                  <Send className={`w-3.5 h-3.5 ${submitting ? "animate-pulse" : ""}`} />
                  <span>{submitting ? "Submitting..." : "Submit Application"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
