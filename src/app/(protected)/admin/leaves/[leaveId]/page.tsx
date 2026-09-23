"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarX,
  ArrowLeft,
  Calendar,
  Clock,
  User,
  Users,
  Paperclip,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Building2,
  RefreshCw,
  X,
} from "lucide-react";

interface LeaveDetail {
  _id: string;
  applicantUserId?: { name: string; email: string; role: string };
  applicantRole: "STUDENT" | "PARENT" | "TEACHER";
  studentId?: {
    _id: string;
    name: string;
    admissionNumber?: string;
    rollNumber?: string;
    classId?: { name: string; code?: string };
    sectionId?: { name: string };
  };
  teacherId?: {
    _id: string;
    name: string;
    employeeId?: string;
    email?: string;
    phone?: string;
  };
  fromDate: string;
  toDate: string;
  reason: string;
  attachments?: { name: string; url: string; mimeType?: string; size?: number }[];
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  reviewedBy?: { name: string; email: string };
  reviewedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export default function AdminLeaveDetailPage({
  params,
}: {
  params: Promise<{ leaveId: string }>;
}) {
  const { leaveId } = use(params);
  const router = useRouter();

  const [leave, setLeave] = useState<LeaveDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Review states
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [isRejectOpen, setIsRejectOpen] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);

  const fetchLeaveDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/admin/leaves/${leaveId}`);
      const data = await res.json();

      if (data.success && data.data?.leave) {
        setLeave(data.data.leave);
      } else {
        setError(data.error?.message || "Failed to load leave details");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load leave details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveDetail();
  }, [leaveId]);

  const handleApprove = async () => {
    try {
      setProcessing(true);
      const res = await fetch(`/api/admin/leaves/${leaveId}/approve`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error?.message || "Failed to approve leave");
        return;
      }

      await fetchLeaveDetail();
    } catch (err: any) {
      alert(err.message || "Failed to approve leave");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) return;

    try {
      setProcessing(true);
      const res = await fetch(`/api/admin/leaves/${leaveId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error?.message || "Failed to reject leave");
        return;
      }

      setIsRejectOpen(false);
      await fetchLeaveDetail();
    } catch (err: any) {
      alert(err.message || "Failed to reject leave");
    } finally {
      setProcessing(false);
    }
  };

  const calculateDays = (from: string, to: string) => {
    const start = new Date(from).getTime();
    const end = new Date(to).getTime();
    const diff = Math.max(0, Math.round((end - start) / (1000 * 60 * 60 * 24))) + 1;
    return `${diff} ${diff === 1 ? "day" : "days"}`;
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-500 text-sm">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
        Loading leave details...
      </div>
    );
  }

  if (error || !leave) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto" />
          <h2 className="text-lg font-bold text-red-900">Leave Request Not Found</h2>
          <p className="text-sm text-red-700">{error || "Unable to locate this leave record."}</p>
          <Link
            href="/admin/leaves"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Leaves
          </Link>
        </div>
      </div>
    );
  }

  const applicantName =
    leave.applicantRole === "TEACHER"
      ? leave.teacherId?.name || leave.applicantUserId?.name || "Teacher"
      : leave.studentId?.name || leave.applicantUserId?.name || "Student";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/leaves"
            className="p-2 text-gray-500 hover:text-gray-900 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarX className="w-6 h-6 text-indigo-600" />
              Leave Application Detail
            </h1>
            <p className="text-xs text-gray-500">
              Submitted on {new Date(leave.createdAt).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Action Controls for Pending Leaves */}
        {leave.status === "PENDING" && (
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleApprove}
              disabled={processing}
              className="px-4 py-2 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              Approve Leave
            </button>
            <button
              onClick={() => setIsRejectOpen(true)}
              disabled={processing}
              className="px-4 py-2 text-sm font-semibold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              Reject Leave
            </button>
          </div>
        )}
      </div>

      {/* Main Details Card */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
        {/* Status Header Banner */}
        <div
          className={`p-5 flex items-center justify-between border-b ${
            leave.status === "APPROVED"
              ? "bg-emerald-50/70 border-emerald-200"
              : leave.status === "REJECTED"
              ? "bg-red-50/70 border-red-200"
              : leave.status === "CANCELLED"
              ? "bg-gray-50 border-gray-200"
              : "bg-amber-50/70 border-amber-200"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {leave.status === "APPROVED" && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
            {leave.status === "REJECTED" && <XCircle className="w-5 h-5 text-red-600" />}
            {leave.status === "PENDING" && <Clock className="w-5 h-5 text-amber-600" />}
            <span
              className={`text-sm font-bold uppercase tracking-wider ${
                leave.status === "APPROVED"
                  ? "text-emerald-800"
                  : leave.status === "REJECTED"
                  ? "text-red-800"
                  : leave.status === "CANCELLED"
                  ? "text-gray-700"
                  : "text-amber-800"
              }`}
            >
              Status: {leave.status}
            </span>
          </div>

          <span className="text-xs font-semibold px-3 py-1 bg-white rounded-full border border-gray-200 text-gray-700">
            {leave.applicantRole} APPLICANT
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Applicant & Target Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50/60 rounded-xl border border-gray-100">
            <div>
              <span className="text-xs font-bold uppercase text-gray-400 block mb-1">
                Target Person
              </span>
              <div className="text-base font-bold text-gray-900">{applicantName}</div>
              {leave.applicantRole === "TEACHER" ? (
                <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                  {leave.teacherId?.employeeId && <div>Emp ID: {leave.teacherId.employeeId}</div>}
                  {leave.teacherId?.email && <div>Email: {leave.teacherId.email}</div>}
                </div>
              ) : (
                <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                  <div>
                    Class: {leave.studentId?.classId?.name || "N/A"} -{" "}
                    {leave.studentId?.sectionId?.name || "N/A"}
                  </div>
                  {leave.studentId?.admissionNumber && (
                    <div>Admission No: {leave.studentId.admissionNumber}</div>
                  )}
                </div>
              )}
            </div>

            <div>
              <span className="text-xs font-bold uppercase text-gray-400 block mb-1">
                Leave Duration
              </span>
              <div className="text-base font-bold text-gray-900">
                {new Date(leave.fromDate).toLocaleDateString()} &rarr;{" "}
                {new Date(leave.toDate).toLocaleDateString()}
              </div>
              <div className="text-xs text-indigo-600 font-bold mt-1">
                Total Duration: {calculateDays(leave.fromDate, leave.toDate)}
              </div>
            </div>
          </div>

          {/* Reason Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Reason for Leave
            </h3>
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {leave.reason}
            </div>
          </div>

          {/* Attachments Section */}
          {leave.attachments && leave.attachments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Attachments
              </h3>
              <div className="space-y-2">
                {leave.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={att.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-xs font-semibold text-indigo-600 transition"
                  >
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>{att.name}</span>
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Review Audit Info (if reviewed) */}
          {leave.reviewedBy && (
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2 text-xs text-gray-600">
              <div className="font-bold text-gray-900 text-sm">Review Information</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-400">Reviewed By:</span>{" "}
                  <span className="font-semibold text-gray-800">{leave.reviewedBy.name}</span>
                </div>
                {leave.reviewedAt && (
                  <div>
                    <span className="text-gray-400">Reviewed At:</span>{" "}
                    <span className="font-semibold text-gray-800">
                      {new Date(leave.reviewedAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
              {leave.rejectionReason && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  <span className="font-bold block">Rejection Reason:</span>
                  <span>{leave.rejectionReason}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {isRejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                Reject Leave Request
              </h3>
              <button
                onClick={() => setIsRejectOpen(false)}
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
                  placeholder="State why this leave application is rejected..."
                  className="w-full px-3.5 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsRejectOpen(false)}
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
    </div>
  );
}
