"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  Users,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  CheckSquare,
  Square,
  RotateCw,
} from "lucide-react";

interface AcademicYearOpt {
  id: string;
  name: string;
  status: string;
}

interface ClassOpt {
  id: string;
  name: string;
  sections?: { id: string; name: string }[];
}

interface CandidateStudent {
  id: string;
  admissionNumber: string;
  rollNumber?: string;
  fullName: string;
  gender: string;
  status: string;
  section?: { _id: string; name: string };
}

export default function BulkPromotionPage() {
  const router = useRouter();

  const [academicYears, setAcademicYears] = useState<AcademicYearOpt[]>([]);
  const [classes, setClasses] = useState<ClassOpt[]>([]);
  const [isLoadingMeta, setIsLoadingMeta] = useState(true);

  // Source selection
  const [sourceAcademicYearId, setSourceAcademicYearId] = useState("");
  const [sourceClassId, setSourceClassId] = useState("");
  const [sourceSectionId, setSourceSectionId] = useState("");
  const [sourceSections, setSourceSections] = useState<{ id: string; name: string }[]>([]);

  // Target selection
  const [targetAcademicYearId, setTargetAcademicYearId] = useState("");
  const [targetClassId, setTargetClassId] = useState("");
  const [targetSectionId, setTargetSectionId] = useState("");
  const [targetSections, setTargetSections] = useState<{ id: string; name: string }[]>([]);

  // Candidate Students
  const [students, setStudents] = useState<CandidateStudent[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [statusAction, setStatusAction] = useState<"ACTIVE" | "GRADUATED">("ACTIVE");

  // State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [promotionResult, setPromotionResult] = useState<{
    promotedCount: number;
    targetClass: string;
    targetSection: string;
    targetAcademicYear: string;
  } | null>(null);

  // Load metadata
  useEffect(() => {
    async function loadMeta() {
      setIsLoadingMeta(true);
      try {
        const [ayRes, clRes] = await Promise.all([
          fetch("/api/admin/academic-years"),
          fetch("/api/admin/classes"),
        ]);
        const ayData = await ayRes.json();
        const clData = await clRes.json();

        if (ayData.success && ayData.data?.academicYears) {
          setAcademicYears(ayData.data.academicYears);
          const activeAy = ayData.data.academicYears.find((ay: AcademicYearOpt) => ay.status === "ACTIVE");
          if (activeAy) {
            setSourceAcademicYearId(activeAy.id);
            setTargetAcademicYearId(activeAy.id);
          }
        }

        if (clData.success && clData.data?.classes) {
          setClasses(clData.data.classes);
        }
      } catch (err) {
        console.error("Failed to load metadata", err);
      } finally {
        setIsLoadingMeta(false);
      }
    }
    loadMeta();
  }, []);

  // Update source sections
  useEffect(() => {
    if (!sourceClassId) {
      setSourceSections([]);
      setSourceSectionId("");
      return;
    }
    const selected = classes.find((c) => c.id === sourceClassId);
    let classSections = selected?.sections || [];
    if (classSections.length > 0) {
      setSourceSections(classSections);
    } else {
      fetch(`/api/admin/sections?classId=${sourceClassId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data?.sections) {
            setSourceSections(json.data.sections);
          } else {
            setSourceSections([]);
          }
        })
        .catch(() => setSourceSections([]));
    }
    setSourceSectionId("");
  }, [sourceClassId, classes]);

  // Update target sections
  useEffect(() => {
    if (!targetClassId) {
      setTargetSections([]);
      setTargetSectionId("");
      return;
    }
    const selected = classes.find((c) => c.id === targetClassId);
    let classSections = selected?.sections || [];
    if (classSections.length > 0) {
      setTargetSections(classSections);
      setTargetSectionId(classSections[0].id);
    } else {
      fetch(`/api/admin/sections?classId=${targetClassId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.success && json.data?.sections && json.data.sections.length > 0) {
            setTargetSections(json.data.sections);
            setTargetSectionId(json.data.sections[0].id);
          } else {
            setTargetSections([]);
            setTargetSectionId("");
          }
        })
        .catch(() => {
          setTargetSections([]);
          setTargetSectionId("");
        });
    }
  }, [targetClassId, classes]);

  // Fetch candidate students when source filters change
  useEffect(() => {
    if (!sourceAcademicYearId || !sourceClassId) {
      setStudents([]);
      setSelectedStudentIds(new Set());
      return;
    }

    async function loadSourceStudents() {
      setIsLoadingStudents(true);
      try {
        const params = new URLSearchParams();
        params.set("academicYearId", sourceAcademicYearId);
        params.set("classId", sourceClassId);
        if (sourceSectionId) params.set("sectionId", sourceSectionId);
        params.set("status", "ACTIVE");
        params.set("limit", "100");

        const res = await fetch(`/api/admin/students?${params.toString()}`);
        const json = await res.json();
        if (json.success && json.data?.students) {
          setStudents(json.data.students);
          // By default, select all active students
          const allIds = new Set<string>(json.data.students.map((s: CandidateStudent) => s.id));
          setSelectedStudentIds(allIds);
        }
      } catch (err) {
        console.error("Failed to load source students", err);
      } finally {
        setIsLoadingStudents(false);
      }
    }

    loadSourceStudents();
  }, [sourceAcademicYearId, sourceClassId, sourceSectionId]);

  const toggleSelectAll = () => {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(students.map((s) => s.id)));
    }
  };

  const toggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedStudentIds(next);
  };

  const handlePromoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (selectedStudentIds.size === 0) {
      setErrorMsg("Please select at least one student to promote.");
      return;
    }
    if (!targetAcademicYearId || !targetClassId || !targetSectionId) {
      setErrorMsg("Please select the target Academic Year, Class, and Section.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/students/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceAcademicYearId,
          sourceClassId,
          sourceSectionId: sourceSectionId || undefined,
          targetAcademicYearId,
          targetClassId,
          targetSectionId,
          studentIds: Array.from(selectedStudentIds),
          statusAction,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to promote students");
      }

      setPromotionResult(json.data);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error executing promotion");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/students"
          className="p-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <GraduationCap className="w-7 h-7 text-indigo-500" />
            Bulk Student Promotion
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Advance entire batches of students to the next academic year and class level with complete history retention.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-sm flex items-start gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Promotion Config Form */}
      <form onSubmit={handlePromoteSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Source Class Config */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm border-b border-border pb-2.5">
              <Building2 className="w-4 h-4" />
              Source (Current Placement)
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Source Academic Year *
                </label>
                <select
                  required
                  value={sourceAcademicYearId}
                  onChange={(e) => setSourceAcademicYearId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name} {ay.status === "ACTIVE" ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Source Class *
                </label>
                <select
                  required
                  value={sourceClassId}
                  onChange={(e) => setSourceClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Source Section (Optional filter)
                </label>
                <select
                  value={sourceSectionId}
                  disabled={!sourceClassId || sourceSections.length === 0}
                  onChange={(e) => setSourceSectionId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground disabled:opacity-50"
                >
                  <option value="">All Sections</option>
                  {sourceSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      Section {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Target Class Config */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm border-b border-border pb-2.5">
              <GraduationCap className="w-4 h-4" />
              Target (Next Academic Placement)
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Target Academic Year *
                </label>
                <select
                  required
                  value={targetAcademicYearId}
                  onChange={(e) => setTargetAcademicYearId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                >
                  <option value="">Select Academic Year</option>
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name} {ay.status === "ACTIVE" ? "(Current)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Target Class *
                </label>
                <select
                  required
                  value={targetClassId}
                  onChange={(e) => setTargetClassId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground"
                >
                  <option value="">Select Class</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Target Section *
                </label>
                <select
                  required
                  disabled={!targetClassId || targetSections.length === 0}
                  value={targetSectionId}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground disabled:opacity-50"
                >
                  <option value="">Select Section</option>
                  {targetSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      Section {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">
                  Status Action
                </label>
                <select
                  value={statusAction}
                  onChange={(e) => setStatusAction(e.target.value as "ACTIVE" | "GRADUATED")}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground font-semibold"
                >
                  <option value="ACTIVE">Promote (Remain ACTIVE)</option>
                  <option value="GRADUATED">Mark as GRADUATED</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Candidate Students List */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden space-y-3 p-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <h2 className="text-sm font-bold text-foreground">
                Enrolled Students ({students.length})
              </h2>
            </div>

            {students.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {selectedStudentIds.size === students.length ? (
                  <>
                    <Square className="w-3.5 h-3.5" /> Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="w-3.5 h-3.5" /> Select All ({students.length})
                  </>
                )}
              </button>
            )}
          </div>

          {isLoadingStudents ? (
            <div className="py-12 text-center text-muted-foreground text-xs">
              <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
              Loading students from source class...
            </div>
          ) : !sourceClassId ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              Please select a Source Academic Year and Class above to view candidate students.
            </div>
          ) : students.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">
              No active students found in the selected source class.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {students.map((st) => {
                const isSelected = selectedStudentIds.has(st.id);
                return (
                  <div
                    key={st.id}
                    onClick={() => toggleStudent(st.id)}
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? "bg-indigo-500/5 dark:bg-indigo-950/20" : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleStudent(st.id)}
                        className="w-4 h-4 text-indigo-600 rounded border-border"
                      />
                      <div>
                        <span className="font-semibold text-sm text-foreground block">
                          {st.fullName}
                        </span>
                        <div className="text-xs text-muted-foreground flex items-center gap-3">
                          <span>Adm: <strong className="font-mono text-foreground">{st.admissionNumber}</strong></span>
                          {st.rollNumber && <span>Roll: <strong className="text-foreground">{st.rollNumber}</strong></span>}
                          {st.section && <span>Sec: <strong className="text-foreground">{st.section.name}</strong></span>}
                        </div>
                      </div>
                    </div>

                    <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full">
                      {st.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit Bar */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-muted-foreground">
            {selectedStudentIds.size} of {students.length} students selected for promotion
          </span>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/students"
              className="px-4 py-2 border border-border rounded-lg text-xs font-semibold text-foreground hover:bg-muted"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting || selectedStudentIds.size === 0 || !targetClassId || !targetSectionId}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
            >
              <GraduationCap className="w-4 h-4" />
              {isSubmitting ? "Promoting..." : `Promote ${selectedStudentIds.size} Students`}
            </button>
          </div>
        </div>
      </form>

      {/* Promotion Success Modal */}
      {promotionResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-bold text-foreground">Promotion Completed!</h3>

            <p className="text-xs text-muted-foreground">
              Successfully promoted <strong className="text-foreground">{promotionResult.promotedCount}</strong> students to{" "}
              <strong className="text-foreground">{promotionResult.targetClass} - Section {promotionResult.targetSection}</strong> ({promotionResult.targetAcademicYear}).
            </p>

            <button
              onClick={() => router.push("/admin/students")}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm"
            >
              Return to Student Directory
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
