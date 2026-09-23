"use client";

import React, { useEffect, useState } from "react";
import {
  FileText,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Download,
  ExternalLink,
  Send,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Award,
  MessageSquare,
  Paperclip,
  ChevronRight,
  Filter,
  X,
  AlertTriangle,
} from "lucide-react";

interface Attachment {
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  type: "FILE" | "EXTERNAL_LINK";
}

interface AssignmentItem {
  _id: string;
  title: string;
  description: string;
  subject: {
    _id: string;
    name: string;
    code: string;
    type: string;
  };
  teacher: {
    _id: string;
    name: string;
    email: string;
  } | null;
  academicYear: {
    _id: string;
    name: string;
  };
  assignedDate: string;
  dueDate: string;
  maximumMarks: number | null;
  attachments: Attachment[];
  attachmentCount: number;
  isOverdue: boolean;
  submission: {
    _id: string;
    status: "PENDING" | "SUBMITTED" | "LATE" | "REVIEWED";
    submittedAt: string;
    content: string;
    attachments: Attachment[];
    marks: number | null;
    feedback: string;
    reviewedAt: string | null;
  } | null;
  submissionStatus: "PENDING" | "SUBMITTED" | "LATE" | "REVIEWED" | "OVERDUE";
}

interface AssignmentsData {
  summary: {
    total: number;
    pending: number;
    submitted: number;
    reviewed: number;
  };
  assignments: AssignmentItem[];
}

export default function StudentAssignmentsPage() {
  const [data, setData] = useState<AssignmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL");

  // Selected Assignment for Submission / Details Modal
  const [activeAssignment, setActiveAssignment] = useState<AssignmentItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Submission Form State
  const [submitContent, setSubmitContent] = useState("");
  const [submitAttachments, setSubmitAttachments] = useState<Attachment[]>([]);
  const [newAttachmentName, setNewAttachmentName] = useState("");
  const [newAttachmentUrl, setNewAttachmentUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/student/assignments");
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to load assignments");
      }
      setData(result.data);
    } catch (err: any) {
      console.error("Fetch assignments error:", err);
      setError(err.message || "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, []);

  const openSubmissionModal = (asg: AssignmentItem) => {
    setActiveAssignment(asg);
    setSubmitContent(asg.submission?.content || "");
    setSubmitAttachments(asg.submission?.attachments || []);
    setNewAttachmentName("");
    setNewAttachmentUrl("");
    setSubmitError(null);
    setSubmitSuccess(null);
    setModalOpen(true);
  };

  const handleAddAttachment = () => {
    if (!newAttachmentName.trim() || !newAttachmentUrl.trim()) return;
    try {
      new URL(newAttachmentUrl);
    } catch {
      setSubmitError("Please enter a valid URL starting with http:// or https://");
      return;
    }
    setSubmitAttachments([
      ...submitAttachments,
      {
        name: newAttachmentName.trim(),
        url: newAttachmentUrl.trim(),
        type: "EXTERNAL_LINK",
      },
    ]);
    setNewAttachmentName("");
    setNewAttachmentUrl("");
    setSubmitError(null);
  };

  const handleRemoveAttachment = (idx: number) => {
    setSubmitAttachments(submitAttachments.filter((_, i) => i !== idx));
  };

  const handleSubmitAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAssignment) return;

    try {
      setSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(null);

      const res = await fetch(`/api/student/assignments/${activeAssignment._id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: submitContent,
          attachments: submitAttachments,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || "Failed to submit assignment");
      }

      setSubmitSuccess(result.message || "Assignment submitted successfully!");
      fetchAssignments();
      setTimeout(() => {
        setModalOpen(false);
      }, 1200);
    } catch (err: any) {
      console.error("Submission failed:", err);
      setSubmitError(err.message || "Failed to submit assignment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
        <p className="text-sm text-zinc-400 font-medium">Loading coursework and assignments...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="p-8 text-center max-w-lg mx-auto bg-zinc-900/60 rounded-2xl border border-red-500/20 backdrop-blur-xl mt-8">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-white mb-2">Unable to load assignments</h2>
        <p className="text-sm text-zinc-400 mb-6">{error}</p>
        <button
          onClick={fetchAssignments}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-xl transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, assignments } = data;

  // Extract unique subjects for filtering
  const subjectsMap = new Map<string, string>();
  assignments.forEach((a) => {
    if (a.subject?._id) subjectsMap.set(a.subject._id, a.subject.name);
  });

  const filteredAssignments = assignments.filter((a) => {
    if (selectedStatus !== "ALL" && a.submissionStatus !== selectedStatus) return false;
    if (selectedSubject !== "ALL" && a.subject._id !== selectedSubject) return false;
    return true;
  });

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Header & Stats Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Course Assignments</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Review coursework, download resources, submit assignments, and view teacher feedback
          </p>
        </div>
        <button
          onClick={fetchAssignments}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-800 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl">
          <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider block mb-1">
            Total Assigned
          </span>
          <span className="text-3xl font-bold text-white">{summary.total}</span>
          <span className="text-xs text-zinc-500 block mt-1">Active coursework</span>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-amber-500/20 backdrop-blur-xl">
          <span className="text-xs font-medium text-amber-400 uppercase tracking-wider block mb-1">
            Pending Tasks
          </span>
          <span className="text-3xl font-bold text-amber-400">{summary.pending}</span>
          <span className="text-xs text-zinc-500 block mt-1">Awaiting submission</span>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-blue-500/20 backdrop-blur-xl">
          <span className="text-xs font-medium text-blue-400 uppercase tracking-wider block mb-1">
            Submitted
          </span>
          <span className="text-3xl font-bold text-blue-400">{summary.submitted}</span>
          <span className="text-xs text-zinc-500 block mt-1">Completed by you</span>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-emerald-500/20 backdrop-blur-xl">
          <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider block mb-1">
            Reviewed & Graded
          </span>
          <span className="text-3xl font-bold text-emerald-400">{summary.reviewed}</span>
          <span className="text-xs text-zinc-500 block mt-1">Scores & feedback available</span>
        </div>
      </div>

      {/* 2. Filters Bar */}
      <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Status Pill Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          {[
            { id: "ALL", label: "All" },
            { id: "PENDING", label: "Pending" },
            { id: "OVERDUE", label: "Overdue" },
            { id: "SUBMITTED", label: "Submitted" },
            { id: "LATE", label: "Late" },
            { id: "REVIEWED", label: "Reviewed" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                selectedStatus === tab.id
                  ? "bg-emerald-600 text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Subject Filter Dropdown */}
        {subjectsMap.size > 0 && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <label className="text-xs font-medium text-zinc-400 whitespace-nowrap">Subject:</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Subjects</option>
              {Array.from(subjectsMap.entries()).map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. Assignment Cards List */}
      {filteredAssignments.length === 0 ? (
        <div className="py-16 text-center rounded-3xl bg-zinc-900/40 border border-dashed border-zinc-800 backdrop-blur-xl">
          <FileCheck className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No assignments found</h3>
          <p className="text-xs text-zinc-400 max-w-sm mx-auto">
            {selectedStatus !== "ALL" || selectedSubject !== "ALL"
              ? "No assignments match your active filters. Try selecting 'All'."
              : "You have no active assignments posted for your class and section."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAssignments.map((asg) => (
            <div
              key={asg._id}
              className={`p-6 rounded-3xl bg-zinc-900/60 border backdrop-blur-xl transition hover:border-zinc-700 ${
                asg.submissionStatus === "REVIEWED"
                  ? "border-emerald-500/30"
                  : asg.submissionStatus === "OVERDUE"
                  ? "border-red-500/30"
                  : asg.submissionStatus === "SUBMITTED" || asg.submissionStatus === "LATE"
                  ? "border-blue-500/30"
                  : "border-zinc-800/80"
              }`}
            >
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700">
                      {asg.subject.name}
                    </span>
                    <h2 className="text-lg font-bold text-white">{asg.title}</h2>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed max-w-3xl">{asg.description}</p>
                </div>

                {/* Status Badge & Action */}
                <div className="flex items-center gap-3 self-start lg:self-auto shrink-0">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      asg.submissionStatus === "REVIEWED"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : asg.submissionStatus === "OVERDUE"
                        ? "bg-red-500/10 text-red-400 border border-red-500/30"
                        : asg.submissionStatus === "LATE"
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        : asg.submissionStatus === "SUBMITTED"
                        ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                        : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                    }`}
                  >
                    {asg.submissionStatus === "REVIEWED" && "Reviewed & Graded"}
                    {asg.submissionStatus === "SUBMITTED" && "Submitted (On-Time)"}
                    {asg.submissionStatus === "LATE" && "Submitted (Late)"}
                    {asg.submissionStatus === "OVERDUE" && "Overdue"}
                    {asg.submissionStatus === "PENDING" && "Pending Submission"}
                  </span>

                  <button
                    onClick={() => openSubmissionModal(asg)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition shadow"
                  >
                    {asg.submissionStatus === "REVIEWED" ? "View Grade & Feedback" : asg.submission ? "View / Edit Submission" : "Submit Homework"}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Meta & Attachments Strip */}
              <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-6 pt-4 border-t border-zinc-800/60 text-xs text-zinc-400">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>
                    Faculty: <strong className="text-zinc-200">{asg.teacher?.name || "Teacher"}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Assigned: <strong className="text-zinc-200">{new Date(asg.assignedDate).toLocaleDateString()}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Due:{" "}
                    <strong className={asg.isOverdue ? "text-red-400" : "text-emerald-400"}>
                      {new Date(asg.dueDate).toLocaleDateString()}
                    </strong>
                  </span>
                  {asg.maximumMarks !== null && (
                    <>
                      <span>•</span>
                      <span>
                        Max Marks: <strong className="text-zinc-200">{asg.maximumMarks} pts</strong>
                      </span>
                    </>
                  )}
                </div>

                {/* Attachments List */}
                {asg.attachments.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-medium text-zinc-500 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      Resources:
                    </span>
                    {asg.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-emerald-500/40 text-zinc-300 hover:text-emerald-400 text-xs transition"
                      >
                        <span>{att.name}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Teacher Review Box (if graded) */}
              {asg.submission?.status === "REVIEWED" && (
                <div className="mt-4 p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
                      <Award className="w-4 h-4" />
                      <span>Graded Assessment</span>
                    </div>
                    {asg.submission.marks !== null && (
                      <span className="text-sm font-bold text-white bg-emerald-500/20 px-3 py-0.5 rounded-full border border-emerald-500/40">
                        Score: {asg.submission.marks} / {asg.maximumMarks || 100} pts
                      </span>
                    )}
                  </div>
                  {asg.submission.feedback && (
                    <p className="text-xs text-zinc-300 italic bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                      &quot;{asg.submission.feedback}&quot;
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 4. Submission & Feedback Modal */}
      {modalOpen && activeAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl p-6 sm:p-8 space-y-6">
            
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {activeAssignment.subject.name}
                </span>
                <h2 className="text-xl font-bold text-white mt-1">{activeAssignment.title}</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Due by {new Date(activeAssignment.dueDate).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Alerts */}
            {submitSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{submitSuccess}</span>
              </div>
            )}
            {submitError && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* If Graded: Show Read-Only Review */}
            {activeAssignment.submission?.status === "REVIEWED" ? (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                      Teacher Evaluation
                    </span>
                    <span className="text-lg font-bold text-white bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-500/40">
                      {activeAssignment.submission.marks} / {activeAssignment.maximumMarks || 100} pts
                    </span>
                  </div>
                  {activeAssignment.submission.feedback ? (
                    <div>
                      <span className="text-[11px] font-medium text-zinc-400 block mb-1">Feedback:</span>
                      <p className="text-sm text-zinc-200 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800">
                        {activeAssignment.submission.feedback}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-400 italic">No written feedback provided.</p>
                  )}
                </div>

                <div className="p-5 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-3">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                    Your Submitted Solution
                  </span>
                  <p className="text-xs text-zinc-300 whitespace-pre-wrap">
                    {activeAssignment.submission.content || "No text content submitted."}
                  </p>
                  {activeAssignment.submission.attachments.length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] text-zinc-500 block mb-1.5">Submitted Links & Files:</span>
                      <div className="space-y-1.5">
                        {activeAssignment.submission.attachments.map((att, idx) => (
                          <a
                            key={idx}
                            href={att.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:underline mr-4"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {att.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Editable Submission Form */
              <form onSubmit={handleSubmitAssignment} className="space-y-5">
                {activeAssignment.isOverdue && (
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>Past Due Date: This submission will be recorded as <strong>Late</strong>.</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Written Answer / Solution Notes
                  </label>
                  <textarea
                    rows={4}
                    value={submitContent}
                    onChange={(e) => setSubmitContent(e.target.value)}
                    placeholder="Type your response, working notes, or explanations here..."
                    className="w-full px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {/* Attachments Section */}
                <div className="space-y-3">
                  <label className="block text-xs font-medium text-zinc-300">
                    Solution Links & File Attachments (Google Drive, Docs, GitHub, PDFs)
                  </label>

                  {submitAttachments.length > 0 && (
                    <div className="space-y-2">
                      {submitAttachments.map((att, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate pr-2">
                            <Paperclip className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            <span className="font-semibold text-zinc-200">{att.name}</span>
                            <span className="text-zinc-500 truncate">({att.url})</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAttachment(idx)}
                            className="text-red-400 hover:text-red-300 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Attachment Row */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={newAttachmentName}
                      onChange={(e) => setNewAttachmentName(e.target.value)}
                      placeholder="Attachment Title (e.g. My Homework PDF)"
                      className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="url"
                      value={newAttachmentUrl}
                      onChange={(e) => setNewAttachmentUrl(e.target.value)}
                      placeholder="URL (https://...)"
                      className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddAttachment}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition shrink-0 inline-flex items-center gap-1 justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Link
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition shadow disabled:opacity-50"
                  >
                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    {activeAssignment.submission ? "Update Submission" : "Submit Assignment"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
