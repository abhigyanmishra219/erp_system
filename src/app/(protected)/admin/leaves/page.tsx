"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  CalendarX,
  CalendarCheck2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Users,
  Paperclip,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Eye,
  Check,
  X,
  User,
} from "lucide-react";
import LockedModuleGate from "@/components/subscription/LockedModuleGate";

interface LeaveRequestItem {
  _id: string;
  applicantUserId?: { name: string; email: string; role: string };
  applicantRole: "STUDENT" | "PARENT" | "TEACHER";
  studentId?: {
    _id: string;
    name: string;
    admissionNumber?: string;
    classId?: { name: string; code?: string };
    sectionId?: { name: string };
  };
  teacherId?: { _id: string; name: string; employeeId?: string; email?: string };
  fromDate: string;
  toDate: string;
  reason: string;
  attachments?: { name: string; url: string }[];
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reviewedBy?: { name: string; email: string };
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface LeaveStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  cancelled: number;
}

export default function AdminLeavesPage() {
  const [leaves, setLeaves] = useState<LeaveRequestItem[]>([]);
  const [stats, setStats] = useState<LeaveStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Review Dialog State
  const [selectedLeave, setSelectedLeave] = useState<LeaveRequestItem | null>(null);
  const [isReviewOpen, setIsReviewOpen] = useState<boolean>(false);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [isRejecting, setIsRejecting] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);

  // Submission Modal
  const [isApplyOpen, setIsApplyOpen] = useState<boolean>(false);
  const [students, setStudents] = useState<{ id: string; name: string; admissionNumber?: string }[]>([]);
  const [teachers, setTeachers] = useState<{ id: string; name: string }[]>([]);
  const [applyForm, setApplyForm] = useState({
    applicantRole: "STUDENT" as "STUDENT" | "TEACHER",
    studentId: "",
    teacherId: "",
    fromDate: "",
    toDate: "",
    reason: "",
    attachmentName: "",
    attachmentUrl: "",
  });
  const [applyError, setApplyError] = useState<string | null>(null);
  const [submittingApply, setSubmittingApply] = useState<boolean>(false);

  // Fetch Leaves
  const fetchLeaves = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (statusFilter && statusFilter !== "ALL") params.append("status", statusFilter);
      if (roleFilter && roleFilter !== "ALL") params.append("applicantRole", roleFilter);
      if (searchTerm) params.append("search", searchTerm);

      const res = await fetch(`/api/admin/leaves?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.data) {
        setLeaves(data.data.leaves || []);
        setStats(data.data.stats || { total: 0, pending: 0, approved: 0, rejected: 0, cancelled: 0 });
      } else {
        setError(data.error?.message || "Failed to load leave requests");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load leave requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();
  }, [statusFilter, roleFilter]);

  // Load students and teachers for leave application modal
  const openApplyModal = async () => {
    setIsApplyOpen(true);
    setApplyError(null);

    try {
      const [stuRes, teaRes] = await Promise.all([
        fetch("/api/admin/students?limit=100"),
        fetch("/api/admin/teachers"),
      ]);
      const [stuData, teaData] = await Promise.all([stuRes.json(), teaRes.json()]);

      if (stuData.success && stuData.data?.students) {
        setStudents(
          stuData.data.students.map((s: any) => ({
            id: s.id || s._id,
            name: s.name,
            admissionNumber: s.admissionNumber,
          }))
        );
      }

      if (teaData.success && teaData.data?.teachers) {
        setTeachers(
          teaData.data.teachers.map((t: any) => ({
            id: t.id || t._id,
            name: t.name,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load applicants for modal:", err);
    }
  };

  // Submit Leave Request
  const handleApplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingApply(true);
    setApplyError(null);

    try {
      const attachments = [];
      if (applyForm.attachmentUrl) {
        attachments.push({
          name: applyForm.attachmentName || "Leave Attachment",
          url: applyForm.attachmentUrl,
        });
      }

      const payload = {
        applicantRole: applyForm.applicantRole,
        studentId: applyForm.applicantRole === "STUDENT" ? applyForm.studentId : undefined,
        teacherId: applyForm.applicantRole === "TEACHER" ? applyForm.teacherId : undefined,
        fromDate: applyForm.fromDate,
        toDate: applyForm.toDate,
        reason: applyForm.reason,
        attachments,
      };

      const res = await fetch("/api/admin/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to submit leave request");
      }

      setIsApplyOpen(false);
      setApplyForm({
        applicantRole: "STUDENT",
        studentId: "",
        teacherId: "",
        fromDate: "",
        toDate: "",
        reason: "",
        attachmentName: "",
        attachmentUrl: "",
      });
      await fetchLeaves();
    } catch (err: any) {
      setApplyError(err.message || "Failed to submit leave request");
    } finally {
      setSubmittingApply(false);
    }
  };

  // Approve Leave
  const handleApprove = async (leaveId: string) => {
    try {
      setProcessing(true);
      const res = await fetch(`/api/admin/leaves/${leaveId}/approve`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error?.message || "Failed to approve leave request");
        return;
      }

      setIsReviewOpen(false);
      setSelectedLeave(null);
      await fetchLeaves();
    } catch (err: any) {
      alert(err.message || "Failed to approve leave request");
    } finally {
      setProcessing(false);
    }
  };

  // Reject Leave
  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeave || !rejectionReason.trim()) return;

    try {
      setProcessing(true);
      const res = await fetch(`/api/admin/leaves/${selectedLeave._id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error?.message || "Failed to reject leave request");
        return;
      }

      setIsReviewOpen(false);
      setIsRejecting(false);
      setSelectedLeave(null);
      setRejectionReason("");
      await fetchLeaves();
    } catch (err: any) {
      alert(err.message || "Failed to reject leave request");
    } finally {
      setProcessing(false);
    }
  };

  // Calculate duration in days
  const calculateDays = (from: string, to: string) => {
    const start = new Date(from).getTime();
    const end = new Date(to).getTime();
    const diff = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24))) + 1;
    return `${diff} ${diff === 1 ? "day" : "days"}`;
  };

  return (
    <LockedModuleGate moduleKey="LEAVE">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <CalendarX className="w-7 h-7 text-indigo-600" />
            Leave Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review student and teacher leave requests, approvals, and history.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchLeaves}
            className="p-2.5 text-gray-600 hover:text-indigo-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition shadow-xs"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={openApplyModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            Submit Leave Request
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <CalendarCheck2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-gray-500">Total Leaves</div>
            <div className="text-xl font-bold text-gray-900">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-gray-500">Pending Review</div>
            <div className="text-xl font-bold text-amber-600">{stats.pending}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-gray-500">Approved</div>
            <div className="text-xl font-bold text-emerald-600">{stats.approved}</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-red-50 text-red-600 rounded-lg">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-gray-500">Rejected</div>
            <div className="text-xl font-bold text-red-600">{stats.rejected}</div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {["ALL", "PENDING", "APPROVED", "REJECTED"].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition ${
                  statusFilter === st
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {st === "ALL" ? "All Statuses" : st}
              </button>
            ))}
          </div>

          {/* Role Filter & Search */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-indigo-500 text-gray-700"
            >
              <option value="ALL">All Applicants</option>
              <option value="STUDENT">Students</option>
              <option value="TEACHER">Teachers</option>
              <option value="PARENT">Parents</option>
            </select>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchLeaves();
              }}
              className="relative flex-1 sm:w-64"
            >
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search reason..."
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-gray-50"
              />
            </form>
          </div>
        </div>
      </div>

      {/* Leaves List / Table */}
      <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
            Loading leave requests...
          </div>
        ) : leaves.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <CalendarX className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="font-semibold text-gray-700">No leave requests found</p>
            <p className="text-xs text-gray-400 mt-1">
              There are no leave applications matching your current filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/75 text-xs font-bold uppercase text-gray-500 tracking-wider">
                  <th className="py-3 px-4">Applicant & Details</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Date Span</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {leaves.map((l) => {
                  const applicantName =
                    l.applicantRole === "TEACHER"
                      ? l.teacherId?.name || l.applicantUserId?.name || "Teacher"
                      : l.studentId?.name || l.applicantUserId?.name || "Student";

                  return (
                    <tr key={l._id} className="hover:bg-gray-50/50 transition">
                      {/* Applicant & Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900">{applicantName}</div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {l.applicantRole === "TEACHER" ? (
                            <span>{l.teacherId?.employeeId ? `Emp ID: ${l.teacherId.employeeId}` : "Teacher Staff"}</span>
                          ) : (
                            <span>
                              Class: {l.studentId?.classId?.name || "N/A"} - {l.studentId?.sectionId?.name || "N/A"}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${
                            l.applicantRole === "TEACHER"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : l.applicantRole === "PARENT"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {l.applicantRole}
                        </span>
                      </td>

                      {/* Date Span */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-800">
                          {new Date(l.fromDate).toLocaleDateString()} &rarr; {new Date(l.toDate).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500 font-semibold mt-0.5">
                          {calculateDays(l.fromDate, l.toDate)}
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-gray-700 truncate" title={l.reason}>
                          {l.reason}
                        </div>
                        {l.attachments && l.attachments.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-indigo-600 mt-1">
                            <Paperclip className="w-3 h-3" />
                            <span>{l.attachments.length} attachment(s)</span>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${
                            l.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800"
                              : l.status === "REJECTED"
                              ? "bg-red-100 text-red-800"
                              : l.status === "CANCELLED"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {l.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/leaves/${l._id}`}
                            className="p-1.5 text-gray-600 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition"
                            title="View Detail"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          {l.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleApprove(l._id)}
                                className="px-2.5 py-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition shadow-2xs"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedLeave(l);
                                  setIsReviewOpen(true);
                                  setIsRejecting(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition shadow-2xs"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {isReviewOpen && selectedLeave && isRejecting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Reject Leave Request
              </h3>
              <button
                onClick={() => {
                  setIsReviewOpen(false);
                  setIsRejecting(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reason for Rejection *
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  required
                  rows={3}
                  placeholder="State the reason why this leave is rejected..."
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsReviewOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing || !rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {processing ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {isApplyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <CalendarX className="w-5 h-5 text-indigo-600" />
                Submit Leave Application
              </h3>
              <button
                onClick={() => setIsApplyOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplySubmit} className="p-6 space-y-4">
              {applyError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{applyError}</span>
                </div>
              )}

              {/* Applicant Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Applicant Type *
                </label>
                <select
                  value={applyForm.applicantRole}
                  onChange={(e) =>
                    setApplyForm((prev) => ({
                      ...prev,
                      applicantRole: e.target.value as any,
                      studentId: "",
                      teacherId: "",
                    }))
                  }
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                >
                  <option value="STUDENT">Student Leave</option>
                  <option value="TEACHER">Teacher Leave</option>
                </select>
              </div>

              {/* Student or Teacher Selection */}
              {applyForm.applicantRole === "STUDENT" ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Select Student *
                  </label>
                  <select
                    value={applyForm.studentId}
                    onChange={(e) => setApplyForm((prev) => ({ ...prev, studentId: e.target.value }))}
                    required
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">Choose Student</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.admissionNumber ? `(${s.admissionNumber})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Select Teacher *
                  </label>
                  <select
                    value={applyForm.teacherId}
                    onChange={(e) => setApplyForm((prev) => ({ ...prev, teacherId: e.target.value }))}
                    required
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">Choose Teacher</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Date Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    From Date *
                  </label>
                  <input
                    type="date"
                    value={applyForm.fromDate}
                    onChange={(e) => setApplyForm((prev) => ({ ...prev, fromDate: e.target.value }))}
                    required
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    To Date *
                  </label>
                  <input
                    type="date"
                    value={applyForm.toDate}
                    onChange={(e) => setApplyForm((prev) => ({ ...prev, toDate: e.target.value }))}
                    required
                    className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Reason for Leave *
                </label>
                <textarea
                  value={applyForm.reason}
                  onChange={(e) => setApplyForm((prev) => ({ ...prev, reason: e.target.value }))}
                  required
                  rows={3}
                  placeholder="Explain the reason for leave..."
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Optional Attachment URL */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Attachment Link (Optional)
                </label>
                <input
                  type="url"
                  value={applyForm.attachmentUrl}
                  onChange={(e) => setApplyForm((prev) => ({ ...prev, attachmentUrl: e.target.value }))}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsApplyOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApply}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submittingApply ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </LockedModuleGate>
  );
}
