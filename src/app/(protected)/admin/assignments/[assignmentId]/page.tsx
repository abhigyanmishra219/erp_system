"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  FileText,
  ArrowLeft,
  Calendar,
  BookOpen,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  RotateCw,
  ExternalLink,
  Award,
  MessageSquare,
  Edit2,
  Trash2,
  Check,
  Building2,
  User,
} from "lucide-react";
import { formatAttendanceDate } from "@/lib/utils/date";

interface StudentRosterRow {
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    rollNumber: string;
    gender: string;
  };
  submission: {
    id: string;
    status: "PENDING" | "SUBMITTED" | "LATE" | "REVIEWED";
    submittedAt: string | null;
    content: string;
    attachments: Array<{ name: string; url: string; type: string }>;
    marks?: number | null;
    feedback?: string;
    reviewedBy?: { name: string } | null;
    reviewedAt?: string | null;
  } | null;
}

export default function AdminAssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.assignmentId as string;

  const [assignment, setAssignment] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [roster, setRoster] = useState<StudentRosterRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Review Modal State
  const [reviewModalStudent, setReviewModalStudent] = useState<StudentRosterRow | null>(null);
  const [reviewMarks, setReviewMarks] = useState<string>("");
  const [reviewFeedback, setReviewFeedback] = useState<string>("");
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);

  // Edit Assignment Modal
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editDueDate, setEditDueDate] = useState<string>("");
  const [editMaxMarks, setEditMaxMarks] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  // Load Assignment Detail
  const fetchAssignmentDetail = useCallback(async () => {
    if (!assignmentId) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/assignments/${assignmentId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load assignment");
      }
      setAssignment(json.data.assignment);
      setSummary(json.data.summary);
      setRoster(json.data.roster);

      setEditTitle(json.data.assignment.title);
      setEditDescription(json.data.assignment.description);
      setEditDueDate(formatAttendanceDate(new Date(json.data.assignment.dueDate)));
      setEditMaxMarks(json.data.assignment.maximumMarks ? String(json.data.assignment.maximumMarks) : "");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load assignment details");
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    fetchAssignmentDetail();
  }, [fetchAssignmentDetail]);

  // Handle Review Modal Open
  const handleOpenReview = (row: StudentRosterRow) => {
    setReviewModalStudent(row);
    setReviewMarks(row.submission?.marks !== undefined && row.submission?.marks !== null ? String(row.submission.marks) : "");
    setReviewFeedback(row.submission?.feedback || "");
  };

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalStudent?.submission?.id) return;
    setIsSubmittingReview(true);
    setErrorMessage(null);
    try {
      const res = await fetch(
        `/api/admin/assignments/${assignmentId}/submissions/${reviewModalStudent.submission.id}/review`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            marks: reviewMarks ? Number(reviewMarks) : null,
            feedback: reviewFeedback,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to submit review");
      }

      setSuccessMessage(`Submission for ${reviewModalStudent.student.name} reviewed successfully!`);
      setReviewModalStudent(null);
      await fetchAssignmentDetail();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save submission review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Handle Edit Assignment
  const handleUpdateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/assignments/${assignmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          dueDate: editDueDate,
          maximumMarks: editMaxMarks ? Number(editMaxMarks) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update assignment");
      }

      setSuccessMessage("Assignment updated successfully!");
      setIsEditModalOpen(false);
      await fetchAssignmentDetail();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update assignment");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle Delete / Archive Assignment
  const handleDeleteAssignment = async () => {
    if (!confirm("Are you sure you want to archive this assignment? Submissions will be preserved.")) return;
    try {
      const res = await fetch(`/api/admin/assignments/${assignmentId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to archive assignment");
      }
      router.push("/admin/assignments");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to archive assignment");
    }
  };

  if (isLoading) {
    return (
      <div className="p-16 rounded-3xl bg-card border border-border text-center space-y-3">
        <RotateCw className="w-8 h-8 animate-spin text-primary mx-auto" />
        <p className="text-xs text-muted-foreground">Loading assignment details...</p>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="p-16 rounded-3xl bg-card border border-border text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-foreground">Assignment Not Found</h2>
        <p className="text-xs text-muted-foreground">The requested assignment could not be loaded.</p>
        <Link
          href="/admin/assignments"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assignments</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/assignments"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Assignments Roster</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-xs font-semibold text-foreground transition-colors cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Assignment</span>
          </button>
          <button
            onClick={handleDeleteAssignment}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Archive</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="p-1 cursor-pointer">
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

      {/* Hero Assignment Card */}
      <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">{assignment.title}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {assignment.status}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                <strong className="text-foreground">{assignment.class?.name}</strong> - Section {assignment.section?.name}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                <strong className="text-foreground">{assignment.subject?.name}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {assignment.teacher ? `${assignment.teacher.firstName} ${assignment.teacher.lastName}` : "Administrator"}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-surface-2 border border-border flex items-center gap-4 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Assigned</span>
              <span className="font-mono font-bold text-foreground">
                {formatAttendanceDate(new Date(assignment.assignedDate))}
              </span>
            </div>
            <div className="h-8 w-px bg-border" />
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Due Date</span>
              <span className="font-mono font-bold text-primary">
                {formatAttendanceDate(new Date(assignment.dueDate))}
              </span>
            </div>
            {assignment.maximumMarks && (
              <>
                <div className="h-8 w-px bg-border" />
                <div>
                  <span className="text-[10px] uppercase font-bold text-muted-foreground block">Max Marks</span>
                  <span className="font-extrabold text-foreground">{assignment.maximumMarks}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Instructions / Description */}
        <div className="p-4 rounded-2xl bg-surface-2/60 border border-border space-y-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
            Instructions & Prompt
          </span>
          <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
            {assignment.description}
          </p>
        </div>

        {/* Attachments / Links */}
        {assignment.attachments?.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Reference Attachments ({assignment.attachments.length})
            </span>
            <div className="flex flex-wrap gap-2">
              {assignment.attachments.map((att: any, idx: number) => (
                <a
                  key={idx}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border text-xs font-semibold text-primary transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{att.name}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submission Status KPI Pills */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Class Roster
            </span>
            <span className="text-xl font-extrabold text-foreground">{summary.totalStudents}</span>
          </div>
          <div className="p-4 rounded-2xl bg-surface-2 border border-border shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Pending
            </span>
            <span className="text-xl font-extrabold text-muted-foreground">{summary.pendingCount}</span>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Submitted
            </span>
            <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {summary.submittedCount}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block">
              Late Submissions
            </span>
            <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
              {summary.lateCount}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
              Reviewed
            </span>
            <span className="text-xl font-extrabold text-purple-600 dark:text-purple-400">
              {summary.reviewedCount}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 shadow-xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary block">
              Completion Rate
            </span>
            <span className="text-xl font-extrabold text-primary">{summary.completionRate}%</span>
          </div>
        </div>
      )}

      {/* Student Submissions List Table */}
      <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-border bg-surface-2/40 flex items-center justify-between">
          <h3 className="font-bold text-xs text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <span>Student Submissions Roster ({roster.length} students)</span>
          </h3>
        </div>

        {roster.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            No active students are enrolled in this class and section.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4">Roll</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Adm No</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4">Marks</th>
                  <th className="py-3 px-4">Feedback</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {roster.map((row) => {
                  const status = row.submission?.status || "PENDING";
                  const isSubmitted = status === "SUBMITTED";
                  const isLate = status === "LATE";
                  const isReviewed = status === "REVIEWED";
                  const isPending = status === "PENDING";

                  return (
                    <tr key={row.student.id} className="hover:bg-surface-2/30 transition-colors">
                      {/* Roll */}
                      <td className="py-3 px-4 font-mono font-bold text-foreground">
                        {row.student.rollNumber || "-"}
                      </td>

                      {/* Student */}
                      <td className="py-3 px-4">
                        <Link
                          href={`/admin/students/${row.student.id}`}
                          className="font-bold text-foreground hover:text-primary transition-colors block"
                        >
                          {row.student.name}
                        </Link>
                        <span className="text-[10px] text-muted-foreground capitalize">
                          {row.student.gender?.toLowerCase()}
                        </span>
                      </td>

                      {/* Admission Number */}
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {row.student.admissionNumber}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isReviewed
                              ? "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                              : isSubmitted
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : isLate
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "bg-surface-2 text-muted-foreground"
                          }`}
                        >
                          {status}
                        </span>
                      </td>

                      {/* Submitted At */}
                      <td className="py-3 px-4 text-muted-foreground font-mono text-[11px]">
                        {row.submission?.submittedAt
                          ? formatAttendanceDate(new Date(row.submission.submittedAt))
                          : "—"}
                      </td>

                      {/* Marks */}
                      <td className="py-3 px-4 font-extrabold text-foreground">
                        {row.submission?.marks !== undefined && row.submission?.marks !== null
                          ? `${row.submission.marks} / ${assignment.maximumMarks || 100}`
                          : "—"}
                      </td>

                      {/* Feedback */}
                      <td className="py-3 px-4 text-muted-foreground max-w-[200px] truncate">
                        {row.submission?.feedback || "—"}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        {row.submission ? (
                          <button
                            onClick={() => handleOpenReview(row)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-90 transition-all cursor-pointer"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>{isReviewed ? "Edit Marks" : "Review"}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-muted-foreground/60 italic">
                            Unsubmitted
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* REVIEW / MARKS MODAL                                                      */}
      {/* ========================================================================= */}
      {reviewModalStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                <span>Review Submission — {reviewModalStudent.student.name}</span>
              </h3>
              <button
                onClick={() => setReviewModalStudent(null)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Submission info banner */}
              <div className="p-3 rounded-2xl bg-surface-2 border border-border text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-bold text-foreground">{reviewModalStudent.submission?.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Submitted Date:</span>
                  <span className="font-mono text-foreground">
                    {reviewModalStudent.submission?.submittedAt
                      ? formatAttendanceDate(new Date(reviewModalStudent.submission.submittedAt))
                      : "N/A"}
                  </span>
                </div>
                {reviewModalStudent.submission?.content && (
                  <div className="pt-1 text-[11px] text-muted-foreground border-t border-border mt-1">
                    <strong>Submission Note:</strong> {reviewModalStudent.submission.content}
                  </div>
                )}
              </div>

              {/* Marks Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Awarded Marks {assignment.maximumMarks ? `(Max: ${assignment.maximumMarks})` : ""}
                </label>
                <input
                  type="number"
                  min="0"
                  max={assignment.maximumMarks || 100}
                  step="0.5"
                  value={reviewMarks}
                  onChange={(e) => setReviewMarks(e.target.value)}
                  placeholder="e.g. 85"
                  className="w-full p-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Feedback Textarea */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Teacher Feedback & Comments</label>
                <textarea
                  rows={3}
                  value={reviewFeedback}
                  onChange={(e) => setReviewFeedback(e.target.value)}
                  placeholder="Provide constructive feedback for the student..."
                  className="w-full p-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setReviewModalStudent(null)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReview ? <RotateCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>Save Review</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT ASSIGNMENT MODAL                                                     */}
      {/* ========================================================================= */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-primary" />
                <span>Edit Assignment</span>
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateAssignment} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Title *</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Description / Instructions *</label>
                <textarea
                  rows={3}
                  required
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full p-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground">Max Marks</label>
                  <input
                    type="number"
                    min="0"
                    value={editMaxMarks}
                    onChange={(e) => setEditMaxMarks(e.target.value)}
                    className="w-full p-2 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-90 cursor-pointer disabled:opacity-50"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
