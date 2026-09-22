"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  Award,
  ArrowLeft,
  Search,
  Building2,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
  RotateCw,
  Save,
  Check,
  FileCheck2,
  User,
  Users,
  HelpCircle,
} from "lucide-react";
import { DEFAULT_GRADING_SCALES, ResultCalculationService } from "@/lib/services/resultCalculationService";

interface TargetOption {
  class: {
    _id: string;
    name: string;
    code?: string;
  };
  sections: Array<{
    targetId: string;
    section: {
      _id: string;
      name: string;
    };
  }>;
}

interface SubjectOption {
  class: {
    _id: string;
    name: string;
  };
  subjects: Array<{
    examSubjectId: string;
    subject: {
      _id: string;
      name: string;
      code?: string;
    };
    maximumMarks: number;
    passingMarks: number;
  }>;
}

interface StudentEntry {
  studentId: string;
  admissionNumber: string;
  rollNumber?: string;
  name: string;
  photo?: string;
  marks: number | null;
  grade: string;
  isPassed: boolean;
  remarks: string;
  status: "DRAFT" | "REVIEWED" | "PUBLISHED";
  resultId?: string | null;
}

export default function ExamMarksEntryPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = use(params);

  // Filter States
  const [targets, setTargets] = useState<TargetOption[]>([]);
  const [subjectsByClass, setSubjectsByClass] = useState<SubjectOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [selectedExamSubjectId, setSelectedExamSubjectId] = useState<string>("");

  const [examName, setExamName] = useState<string>("");
  const [maximumMarks, setMaximumMarks] = useState<number>(100);
  const [passingMarks, setPassingMarks] = useState<number>(33);

  // Marks Roster
  const [roster, setRoster] = useState<StudentEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isPublished, setIsPublished] = useState<boolean>(false);

  // 1. Initial Load: Fetch Exam Hub structure to populate Class, Section, and Subject dropdowns
  useEffect(() => {
    async function loadExamStructure() {
      try {
        const res = await fetch(`/api/admin/exams/${examId}`);
        const json = await res.json();
        if (json.success && json.data?.exam) {
          const e = json.data.exam;
          setExamName(e.name);
          setTargets(e.targets || []);
          setSubjectsByClass(e.subjects || []);

          // Auto-select first class & section & subject if available
          if (e.targets.length > 0) {
            const firstClass = e.targets[0].class._id;
            setSelectedClassId(firstClass);

            if (e.targets[0].sections.length > 0) {
              setSelectedSectionId(e.targets[0].sections[0].section._id);
            }

            const classSubs = (e.subjects || []).find((s: any) => s.class._id === firstClass);
            if (classSubs && classSubs.subjects.length > 0) {
              setSelectedSubjectId(classSubs.subjects[0].subject._id);
              setSelectedExamSubjectId(classSubs.subjects[0].examSubjectId);
              setMaximumMarks(classSubs.subjects[0].maximumMarks);
              setPassingMarks(classSubs.subjects[0].passingMarks);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load exam structure:", err);
      }
    }
    loadExamStructure();
  }, [examId]);

  // 2. Load Marks Roster for selected Class, Section, and Subject
  const fetchMarksRoster = async () => {
    if (!selectedClassId || !selectedSectionId || !selectedSubjectId) {
      setRoster([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({
        classId: selectedClassId,
        sectionId: selectedSectionId,
        subjectId: selectedSubjectId,
      });
      if (selectedExamSubjectId) params.append("examSubjectId", selectedExamSubjectId);

      const res = await fetch(`/api/admin/exams/${examId}/marks?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load marks roster");
      }

      setRoster(json.data.roster || []);
      setMaximumMarks(json.data.examSubject.maximumMarks);
      setPassingMarks(json.data.examSubject.passingMarks);
      setSelectedExamSubjectId(json.data.examSubject.id);
      setIsPublished(json.data.stats?.isPublished || false);
      setHasUnsavedChanges(false);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to fetch student roster");
      setRoster([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMarksRoster();
  }, [selectedClassId, selectedSectionId, selectedSubjectId]);

  // Handle Mark Input Change
  const handleMarkChange = (studentId: string, valStr: string) => {
    setHasUnsavedChanges(true);
    setRoster((prev) =>
      prev.map((s) => {
        if (s.studentId !== studentId) return s;

        const num = valStr.trim() === "" ? null : Number(valStr);
        let grade = "—";
        let isPassed = false;

        if (num !== null && !isNaN(num)) {
          const evaluated = ResultCalculationService.evaluateSubject({
            subjectId: selectedSubjectId,
            marks: num,
            maximumMarks,
            passingMarks,
          });
          grade = evaluated.grade;
          isPassed = evaluated.isPassed;
        }

        return {
          ...s,
          marks: num,
          grade,
          isPassed,
        };
      })
    );
  };

  // Handle Remarks Change
  const handleRemarksChange = (studentId: string, remarks: string) => {
    setHasUnsavedChanges(true);
    setRoster((prev) =>
      prev.map((s) => (s.studentId === studentId ? { ...s, remarks } : s))
    );
  };

  // Save Marks Submission
  const handleSaveMarks = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      // Validate all marks
      for (const s of roster) {
        if (s.marks !== null && (s.marks < 0 || s.marks > maximumMarks)) {
          throw new Error(
            `Marks for ${s.name} (${s.marks}) cannot exceed the maximum marks of ${maximumMarks}.`
          );
        }
      }

      const payload = {
        examSubjectId: selectedExamSubjectId,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        subjectId: selectedSubjectId,
        entries: roster.map((s) => ({
          studentId: s.studentId,
          marks: s.marks,
          remarks: s.remarks,
        })),
      };

      const res = await fetch(`/api/admin/exams/${examId}/marks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to save marks");
      }

      setSuccessMessage("Marks and results calculated and saved successfully!");
      setHasUnsavedChanges(false);
      fetchMarksRoster();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save marks.");
    } finally {
      setIsSaving(false);
    }
  };

  // Sections for currently selected class
  const currentClassTarget = targets.find((t) => t.class._id === selectedClassId);
  const availableSections = currentClassTarget?.sections || [];

  // Subjects for currently selected class
  const currentClassSubjects = subjectsByClass.find((s) => s.class._id === selectedClassId);
  const availableSubjects = currentClassSubjects?.subjects || [];

  // Stats
  const totalStudents = roster.length;
  const enteredCount = roster.filter((s) => s.marks !== null && s.marks !== undefined).length;
  const passedCount = roster.filter((s) => s.marks !== null && s.isPassed).length;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/admin/exams/${examId}`}
            className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-foreground">Student Marks Entry</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
                {examName || "Exam"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Enter and validate student scores. Totals, percentages, and grades are computed automatically.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && (
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1.5 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" />
              Unsaved changes
            </span>
          )}

          <button
            type="button"
            disabled={isSaving || roster.length === 0}
            onClick={handleSaveMarks}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Saving Marks...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Student Marks</span>
              </>
            )}
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

      {isPublished && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              Results for this class and subject are currently <strong>PUBLISHED</strong>. Any changes will overwrite live report cards.
            </span>
          </div>
          <Link
            href={`/admin/results?examId=${examId}`}
            className="underline font-bold text-xs hover:opacity-80"
          >
            Manage Results
          </Link>
        </div>
      )}

      {/* Filter Selector Bar */}
      <div className="p-5 rounded-3xl bg-card border border-border shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Class */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Class *
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                const cId = e.target.value;
                setSelectedClassId(cId);

                // Update section & subject options for new class
                const targetG = targets.find((t) => t.class._id === cId);
                if (targetG && targetG.sections.length > 0) {
                  setSelectedSectionId(targetG.sections[0].section._id);
                }

                const subG = subjectsByClass.find((s) => s.class._id === cId);
                if (subG && subG.subjects.length > 0) {
                  setSelectedSubjectId(subG.subjects[0].subject._id);
                  setSelectedExamSubjectId(subG.subjects[0].examSubjectId);
                  setMaximumMarks(subG.subjects[0].maximumMarks);
                  setPassingMarks(subG.subjects[0].passingMarks);
                }
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {targets.map((t) => (
                <option key={t.class._id} value={t.class._id}>
                  {t.class.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Section *
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {availableSections.map((s) => (
                <option key={s.targetId} value={s.section._id}>
                  Section {s.section.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
              Subject *
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => {
                const subId = e.target.value;
                setSelectedSubjectId(subId);
                const subDoc = availableSubjects.find((s) => s.subject._id === subId);
                if (subDoc) {
                  setSelectedExamSubjectId(subDoc.examSubjectId);
                  setMaximumMarks(subDoc.maximumMarks);
                  setPassingMarks(subDoc.passingMarks);
                }
              }}
              className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {availableSubjects.map((s) => (
                <option key={s.examSubjectId} value={s.subject._id}>
                  {s.subject.name} (Max: {s.maximumMarks})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Subject Specs Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-surface-2 border border-border text-xs font-bold text-foreground">
              Maximum Marks: <span className="text-primary">{maximumMarks}</span>
            </span>
            <span className="px-3 py-1 rounded-xl bg-surface-2 border border-border text-xs font-bold text-foreground">
              Passing Marks: <span className="text-emerald-600 dark:text-emerald-400">{passingMarks}</span>
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              Total: <strong>{totalStudents}</strong>
            </span>
            <span>
              Entered: <strong className="text-primary">{enteredCount}</strong>
            </span>
            <span>
              Passed: <strong className="text-emerald-600 dark:text-emerald-400">{passedCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Marks Entry Roster Table */}
      {isLoading ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
          <RotateCw className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Loading student marks roster...</p>
        </div>
      ) : roster.length === 0 ? (
        <div className="p-12 rounded-3xl bg-card border border-border text-center space-y-3">
          <Users className="w-10 h-10 text-muted-foreground/50 mx-auto" />
          <h3 className="text-sm font-bold text-foreground">No students found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No active students enrolled in this class and section.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-2/60 border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">Roll</th>
                  <th className="py-3 px-4">Student Profile</th>
                  <th className="py-3 px-4">Admission No</th>
                  <th className="py-3 px-4 w-44">Marks Obtained *</th>
                  <th className="py-3 px-4 w-24 text-center">Grade</th>
                  <th className="py-3 px-4 w-28 text-center">Result Status</th>
                  <th className="py-3 px-4">Remarks (Optional)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {roster.map((s, index) => {
                  const isInvalid = s.marks !== null && (s.marks < 0 || s.marks > maximumMarks);

                  return (
                    <tr key={s.studentId} className="hover:bg-surface-2/40 transition-colors">
                      {/* Roll Number */}
                      <td className="py-3 px-4 text-center font-bold font-mono text-muted-foreground text-xs">
                        {s.rollNumber || index + 1}
                      </td>

                      {/* Student Profile */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {s.photo ? (
                            <img
                              src={s.photo}
                              alt={s.name}
                              className="w-8 h-8 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                              {s.name.charAt(0)}
                            </div>
                          )}
                          <span className="font-bold text-foreground text-xs">{s.name}</span>
                        </div>
                      </td>

                      {/* Admission Number */}
                      <td className="py-3 px-4 font-mono text-muted-foreground text-[11px]">
                        {s.admissionNumber || "—"}
                      </td>

                      {/* Marks Input */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            max={maximumMarks}
                            value={s.marks !== null && s.marks !== undefined ? s.marks : ""}
                            onChange={(e) => handleMarkChange(s.studentId, e.target.value)}
                            placeholder="Score"
                            className={`w-24 p-2 rounded-xl bg-surface-2 border text-xs font-bold focus:outline-none focus:ring-2 ${
                              isInvalid
                                ? "border-rose-500 bg-rose-500/10 text-rose-600 focus:ring-rose-500/30"
                                : s.marks !== null
                                ? "border-primary/40 text-foreground focus:ring-primary/30"
                                : "border-border text-foreground placeholder:text-muted-foreground focus:ring-primary/30"
                            }`}
                          />
                          <span className="text-xs text-muted-foreground font-semibold">/ {maximumMarks}</span>
                        </div>
                      </td>

                      {/* Calculated Grade Preview */}
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono font-bold text-xs ${
                            s.grade === "F"
                              ? "text-rose-600 dark:text-rose-400"
                              : s.grade && s.grade !== "—"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-muted-foreground"
                          }`}
                        >
                          {s.grade || "—"}
                        </span>
                      </td>

                      {/* Pass / Fail Outcome */}
                      <td className="py-3 px-4 text-center">
                        {s.marks !== null ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              s.isPassed
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                            }`}
                          >
                            {s.isPassed ? "PASSED" : "FAILED"}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground italic font-medium">
                            Not entered
                          </span>
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          value={s.remarks || ""}
                          onChange={(e) => handleRemarksChange(s.studentId, e.target.value)}
                          placeholder="Teacher notes..."
                          className="w-full p-1.5 rounded-xl bg-surface-2 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
