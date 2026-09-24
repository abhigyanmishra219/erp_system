"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParentChild } from "@/context/ParentChildContext";
import ChildSwitcher from "../components/ChildSwitcher";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Calendar,
  FileText,
  Paperclip,
  GraduationCap,
  Info,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function ParentAssignmentsPage() {
  const { children, selectedChild, selectedChildId, isLoading: isChildrenLoading } = useParentChild();

  const [assignmentData, setAssignmentData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAssignments = useCallback(
    async (studentId: string, status: string = "ALL", subjectId: string = "ALL") => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        params.set("studentId", studentId);
        if (status !== "ALL") params.set("status", status);
        if (subjectId !== "ALL") params.set("subjectId", subjectId);

        const res = await fetch(`/api/parent/assignments?${params.toString()}`);
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || json.message || "Failed to load assignments");
        }

        setAssignmentData(json.data);
      } catch (err: any) {
        console.error("Error loading parent assignments:", err);
        setError(err.message || "Could not load assignments data.");
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (selectedChildId) {
      fetchAssignments(selectedChildId, selectedStatus, selectedSubjectId);
    } else if (!isChildrenLoading && (!children || children.length === 0)) {
      setIsLoading(false);
    }
  }, [selectedChildId, selectedStatus, selectedSubjectId, isChildrenLoading, children, fetchAssignments]);

  if (isChildrenLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12 animate-pulse">
        <div className="h-16 bg-surface-2 rounded-2xl border border-border" />
        <div className="h-32 bg-surface-2 rounded-3xl border border-border" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-surface-2 rounded-2xl border border-border" />
          ))}
        </div>
      </div>
    );
  }

  if (!children || children.length === 0) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        <div className="p-8 sm:p-12 rounded-3xl bg-card border border-border text-center shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground">No Linked Children Found</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Your parent profile does not have any active students attached. Please contact the school administration.
          </p>
          <div className="mt-6">
            <Link
              href="/parent/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { student, summary, availableSubjects, assignments } = assignmentData || {};

  const totalCount = summary?.total ?? 0;
  const pendingCount = summary?.pending ?? 0;
  const overdueCount = summary?.overdue ?? 0;
  const submittedCount = summary?.submitted ?? 0;
  const reviewedCount = summary?.reviewed ?? 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Universal Child Switcher */}
      <section aria-label="Switch Child">
        <ChildSwitcher variant="pills" />
      </section>

      {/* 2. Header Information Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-amber-500/15 via-card to-card border border-border p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-semibold">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Homework & Assignments</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              {student?.fullName || selectedChild?.student.fullName}&apos;s Coursework
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Class {student?.class?.name || selectedChild?.student.class} - {student?.section?.name || selectedChild?.student.section}
              {student?.rollNumber && ` • Roll #${student.rollNumber}`}
              {student?.admissionNumber && ` • Adm #${student.admissionNumber}`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() =>
                selectedChildId &&
                fetchAssignments(selectedChildId, selectedStatus, selectedSubjectId)
              }
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card hover:bg-surface-2 border border-border text-xs font-semibold text-foreground transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-primary" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() =>
              selectedChildId &&
              fetchAssignments(selectedChildId, selectedStatus, selectedSubjectId)
            }
            className="underline font-bold hover:opacity-80"
          >
            Retry
          </button>
        </div>
      )}

      {/* 3. Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Total Assignments */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total
            </span>
            <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-foreground">{totalCount}</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">Assigned coursework</p>
          </div>
        </div>

        {/* Pending */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Pending
            </span>
            <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-foreground">{pendingCount}</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">To be completed</p>
          </div>
        </div>

        {/* Overdue */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Overdue
            </span>
            <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-foreground">{overdueCount}</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">Past deadline</p>
          </div>
        </div>

        {/* Submitted */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Submitted
            </span>
            <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-foreground">{submittedCount}</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">Awaiting teacher review</p>
          </div>
        </div>

        {/* Reviewed / Graded */}
        <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border shadow-2xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Reviewed
            </span>
            <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-black text-foreground">{reviewedCount}</span>
            <p className="text-[11px] text-muted-foreground mt-0.5">Graded with feedback</p>
          </div>
        </div>
      </div>

      {/* 4. Filter Toolbar */}
      <div className="p-4 sm:p-5 rounded-3xl bg-card border border-border shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-surface-2 p-1 rounded-xl border border-border text-xs overflow-x-auto no-scrollbar">
            {[
              { id: "ALL", label: "All" },
              { id: "PENDING", label: `Pending (${pendingCount})` },
              { id: "OVERDUE", label: `Overdue (${overdueCount})` },
              { id: "SUBMITTED", label: `Submitted (${submittedCount})` },
              { id: "REVIEWED", label: `Reviewed (${reviewedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedStatus(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedStatus === tab.id
                    ? "bg-card text-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Subject Filter */}
          {availableSubjects && availableSubjects.length > 0 && (
            <div className="flex items-center gap-2">
              <label htmlFor="subject-filter-select" className="text-xs text-muted-foreground font-semibold shrink-0">
                Subject:
              </label>
              <select
                id="subject-filter-select"
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                className="bg-surface-2 hover:bg-surface-3 text-foreground text-xs font-semibold px-3 py-1.5 rounded-xl border border-border shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="ALL">All Subjects</option>
                {availableSubjects.map((s: any) => (
                  <option key={s._id} value={s._id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 5. Assignments List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3 py-4 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-surface-2/60 rounded-3xl border border-border" />
            ))}
          </div>
        ) : assignments && assignments.length > 0 ? (
          assignments.map((assignment: any) => {
            const isExpanded = expandedId === assignment._id;
            const isPastDue = assignment.isOverdue;
            const { submission } = assignment;

            const dueDateObj = new Date(assignment.dueDate);
            const assignedDateObj = new Date(assignment.assignedDate);

            // Status Badge Config
            let statusBadge = (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Clock className="w-3.5 h-3.5" />
                <span>Pending</span>
              </span>
            );

            if (assignment.submissionStatus === "OVERDUE") {
              statusBadge = (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Overdue</span>
                </span>
              );
            } else if (assignment.submissionStatus === "SUBMITTED") {
              statusBadge = (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Submitted</span>
                </span>
              );
            } else if (assignment.submissionStatus === "LATE") {
              statusBadge = (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Late Submission</span>
                </span>
              );
            } else if (assignment.submissionStatus === "REVIEWED") {
              statusBadge = (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <Award className="w-3.5 h-3.5" />
                  <span>Reviewed</span>
                </span>
              );
            }

            return (
              <div
                key={assignment._id}
                className="rounded-3xl bg-card border border-border shadow-2xs hover:border-primary/40 transition-all overflow-hidden"
              >
                {/* Main Card Row */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : assignment._id)}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
                        {assignment.subject.name}
                      </span>
                      {assignment.maximumMarks !== null && (
                        <span className="text-[11px] text-muted-foreground font-mono">
                          Max Marks: {assignment.maximumMarks}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-foreground">
                      {assignment.title}
                    </h3>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      {assignment.teacher && (
                        <span>Assigned by {assignment.teacher.name}</span>
                      )}
                      <span>•</span>
                      <span>
                        Assigned:{" "}
                        {assignedDateObj.toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                      <span>•</span>
                      <span className={isPastDue && !submission ? "text-rose-500 font-bold" : "text-foreground font-semibold"}>
                        Due:{" "}
                        {dueDateObj.toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border">
                    {statusBadge}
                    <button
                      type="button"
                      className="p-1 rounded-lg text-muted-foreground hover:text-foreground"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details View */}
                {isExpanded && (
                  <div className="p-4 sm:p-5 bg-surface-2/40 border-t border-border space-y-4 text-xs animate-in fade-in duration-150">
                    {/* Instructions / Description */}
                    {assignment.description && (
                      <div className="space-y-1">
                        <h4 className="font-bold text-foreground">Instructions & Description:</h4>
                        <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                          {assignment.description}
                        </p>
                      </div>
                    )}

                    {/* Teacher Attachments */}
                    {assignment.attachments && assignment.attachments.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-foreground flex items-center gap-1.5">
                          <Paperclip className="w-3.5 h-3.5 text-primary" />
                          <span>Coursework Materials ({assignment.attachments.length}):</span>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {assignment.attachments.map((att: any, idx: number) => (
                            <a
                              key={idx}
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border hover:border-primary/40 text-foreground transition-colors font-semibold"
                            >
                              <FileText className="w-3.5 h-3.5 text-primary" />
                              <span className="truncate max-w-[180px]">{att.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Selected Child's Submission Status */}
                    <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="font-bold text-foreground flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          <span>Student Submission Details:</span>
                        </h4>
                        {submission?.marks !== null && submission?.marks !== undefined && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                            Score: {submission.marks} / {assignment.maximumMarks || 100}
                          </span>
                        )}
                      </div>

                      {submission ? (
                        <div className="space-y-2 text-muted-foreground">
                          <p>
                            Submitted on:{" "}
                            <strong className="text-foreground">
                              {new Date(submission.submittedAt).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </strong>
                          </p>

                          {submission.content && (
                            <div className="p-3 rounded-xl bg-surface-2/60 border border-border/70 text-foreground">
                              <p className="text-[11px] font-semibold text-muted-foreground mb-1">
                                Student Notes:
                              </p>
                              <p className="whitespace-pre-line">{submission.content}</p>
                            </div>
                          )}

                          {submission.feedback && (
                            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 text-foreground">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-primary mb-1">
                                <MessageSquare className="w-3.5 h-3.5" />
                                <span>Teacher Feedback:</span>
                              </div>
                              <p className="whitespace-pre-line">{submission.feedback}</p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          {isPastDue ? (
                            <p className="text-rose-500 font-semibold">
                              The due date has passed and no submission has been recorded.
                            </p>
                          ) : (
                            <p>
                              This assignment has not been submitted yet. The student can submit work from their student portal.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center rounded-3xl bg-card border border-dashed border-border text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground">No assignments found</p>
            <p>
              {selectedStatus !== "ALL" || selectedSubjectId !== "ALL"
                ? "Try adjusting the active filters."
                : "No coursework has been published for this student's class."}
            </p>
          </div>
        )}
      </div>

      {/* Read-Only Notice */}
      <div className="p-4 rounded-2xl bg-surface-2/40 border border-border/70 text-muted-foreground text-xs flex items-center gap-2">
        <Info className="w-4 h-4 text-primary shrink-0" />
        <span>
          Parent portal is read-only for homework monitoring. Assignment submissions and file uploads must be completed directly via the student&apos;s account.
        </span>
      </div>
    </div>
  );
}
