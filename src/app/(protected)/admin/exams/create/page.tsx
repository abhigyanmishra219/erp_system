"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Award,
  ArrowLeft,
  Check,
  ChevronRight,
  Calendar,
  Building2,
  BookOpen,
  AlertCircle,
  RotateCw,
  Plus,
  Trash2,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { formatAttendanceDate } from "@/lib/utils/date";

interface AcademicYearOption {
  id: string;
  _id?: string;
  name: string;
  status: string;
}

interface ClassOption {
  id: string;
  _id?: string;
  name: string;
  code?: string;
}

interface SectionOption {
  id: string;
  _id?: string;
  name: string;
  classId?: string;
}

interface ClassSubjectConfig {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  subjectCode?: string;
  examDate: string;
  maximumMarks: number;
  passingMarks: number;
}

export default function CreateExamPage() {
  const router = useRouter();

  // Wizard Step (1: Info, 2: Targets, 3: Subjects, 4: Review)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Reference Data
  const [academicYears, setAcademicYears] = useState<AcademicYearOption[]>([]);
  const [allClasses, setAllClasses] = useState<ClassOption[]>([]);
  const [sectionsByClass, setSectionsByClass] = useState<Record<string, SectionOption[]>>({});
  const [isLoadingRef, setIsLoadingRef] = useState<boolean>(true);

  // Form State
  const [examName, setExamName] = useState<string>("");
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [startDate, setStartDate] = useState<string>(formatAttendanceDate(new Date()));
  const [endDate, setEndDate] = useState<string>(formatAttendanceDate(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)));
  const [description, setDescription] = useState<string>("");
  const [status, setStatus] = useState<string>("SCHEDULED");

  // Selected Targets: { classId: [sectionId, ...] }
  const [selectedTargets, setSelectedTargets] = useState<Record<string, string[]>>({});

  // Configured Subjects per class
  const [subjectConfigs, setSubjectConfigs] = useState<ClassSubjectConfig[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState<boolean>(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Initial Load: Academic Years
  useEffect(() => {
    async function loadYears() {
      try {
        const res = await fetch("/api/admin/academic-years");
        const json = await res.json();
        if (json.success && json.data) {
          const list: AcademicYearOption[] = json.data.academicYears || json.data;
          setAcademicYears(list);
          const active = list.find((y) => y.status === "ACTIVE") || list[0];
          if (active) {
            setAcademicYearId(active.id || active._id || "");
          }
        }
      } catch (err) {
        console.error("Failed to load academic years:", err);
      } finally {
        setIsLoadingRef(false);
      }
    }
    loadYears();
  }, []);

  // 2. Load Classes when Academic Year is selected
  useEffect(() => {
    if (!academicYearId) return;
    async function loadClassesAndSections() {
      try {
        const res = await fetch(`/api/admin/classes?academicYearId=${academicYearId}`);
        const json = await res.json();
        if (json.success && json.data) {
          const list: ClassOption[] = json.data.classes || json.data;
          setAllClasses(list);

          // Fetch sections for each class
          const sectionsMap: Record<string, SectionOption[]> = {};
          await Promise.all(
            list.map(async (c) => {
              const cId = c.id || c._id || "";
              const secRes = await fetch(`/api/admin/sections?academicYearId=${academicYearId}&classId=${cId}`);
              const secJson = await secRes.json();
              if (secJson.success && secJson.data) {
                sectionsMap[cId] = secJson.data.sections || secJson.data;
              }
            })
          );
          setSectionsByClass(sectionsMap);
        }
      } catch (err) {
        console.error("Failed to load classes and sections:", err);
      }
    }
    loadClassesAndSections();
  }, [academicYearId]);

  // Handle Class Target Selection Toggle
  const toggleClassTarget = (classId: string) => {
    setSelectedTargets((prev) => {
      const next = { ...prev };
      if (next[classId]) {
        delete next[classId];
      } else {
        // Select all sections of this class by default
        const classSections = sectionsByClass[classId] || [];
        next[classId] = classSections.map((s) => s.id || s._id || "");
      }
      return next;
    });
  };

  // Handle Section Target Selection Toggle
  const toggleSectionTarget = (classId: string, sectionId: string) => {
    setSelectedTargets((prev) => {
      const current = prev[classId] || [];
      const updated = current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId];

      const next = { ...prev };
      if (updated.length === 0) {
        delete next[classId];
      } else {
        next[classId] = updated;
      }
      return next;
    });
  };

  // 3. Load Subjects for all selected classes when transitioning to Step 3
  const prepareSubjectsStep = async () => {
    const selectedClassIds = Object.keys(selectedTargets);
    if (selectedClassIds.length === 0) {
      setErrorMessage("Please select at least one class and section target for this exam.");
      return;
    }

    setErrorMessage(null);
    setIsLoadingSubjects(true);

    try {
      const newConfigs: ClassSubjectConfig[] = [];

      for (const cId of selectedClassIds) {
        const classDoc = allClasses.find((c) => (c.id || c._id) === cId);
        const className = classDoc?.name || "Class";

        const res = await fetch(`/api/admin/classes/${cId}/subjects?academicYearId=${academicYearId}`);
        const json = await res.json();
        if (json.success && json.data) {
          const subList = json.data.subjects || json.data;
          for (const s of subList) {
            const subId = s.subjectId || s.subject?._id || s._id || s.id;
            const subName = s.name || s.subject?.name || "Subject";
            const subCode = s.code || s.subject?.code || "";
            const defaultMax = s.maximumMarks && s.maximumMarks > 0 ? s.maximumMarks : 100;
            const defaultPass = s.passingMarks !== undefined ? s.passingMarks : 33;

            // Check if existing config already present
            const existing = subjectConfigs.find(
              (sc) => sc.classId === cId && sc.subjectId === subId
            );

            newConfigs.push(
              existing || {
                classId: cId,
                className,
                subjectId: subId,
                subjectName: subName,
                subjectCode: subCode,
                examDate: startDate,
                maximumMarks: defaultMax,
                passingMarks: defaultPass,
              }
            );
          }
        }
      }

      setSubjectConfigs(newConfigs);
      setCurrentStep(3);
    } catch (err) {
      console.error("Failed to load class subjects:", err);
      setErrorMessage("Failed to load subjects for the selected classes.");
    } finally {
      setIsLoadingSubjects(false);
    }
  };

  // Handle Subject Config changes
  const updateSubjectConfig = (
    classId: string,
    subjectId: string,
    field: "maximumMarks" | "passingMarks" | "examDate",
    value: any
  ) => {
    setSubjectConfigs((prev) =>
      prev.map((sc) => {
        if (sc.classId === classId && sc.subjectId === subjectId) {
          return { ...sc, [field]: value };
        }
        return sc;
      })
    );
  };

  // Final Form Submission
  const handleSubmitExam = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // Format targets payload
      const targets = Object.entries(selectedTargets).map(([classId, sectionIds]) => ({
        classId,
        sectionIds,
      }));

      // Format subjects payload with validation
      const subjects = subjectConfigs.map((sc) => {
        if (sc.passingMarks > sc.maximumMarks) {
          throw new Error(
            `Passing marks (${sc.passingMarks}) cannot exceed maximum marks (${sc.maximumMarks}) for ${sc.className} - ${sc.subjectName}.`
          );
        }
        return {
          classId: sc.classId,
          subjectId: sc.subjectId,
          examDate: sc.examDate || null,
          maximumMarks: Number(sc.maximumMarks),
          passingMarks: Number(sc.passingMarks),
        };
      });

      const payload = {
        name: examName.trim(),
        academicYearId,
        startDate,
        endDate,
        description: description.trim(),
        status,
        targets,
        subjects,
      };

      const res = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create exam");
      }

      router.push(`/admin/exams/${json.data.exam.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while creating the exam.");
      setIsSubmitting(false);
    }
  };

  const selectedClassesCount = Object.keys(selectedTargets).length;
  const totalSectionsCount = Object.values(selectedTargets).reduce((acc, s) => acc + s.length, 0);

  return (
    <div className="space-y-6 pb-16 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/exams"
            className="p-2 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Award className="w-6 h-6 text-primary" />
              <span>Create New Examination</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Define exam schedules, target classes & sections, and configure subject maximum/passing marks.
            </p>
          </div>
        </div>
      </div>

      {/* Step Progress Indicator */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { step: 1, label: "1. Exam Info" },
          { step: 2, label: "2. Classes & Targets" },
          { step: 3, label: "3. Subjects & Marks" },
          { step: 4, label: "4. Review & Save" },
        ].map((item) => {
          const isDone = currentStep > item.step;
          const isCurrent = currentStep === item.step;
          return (
            <div
              key={item.step}
              className={`p-3 rounded-2xl border text-center transition-all ${
                isCurrent
                  ? "bg-primary/10 border-primary text-primary font-bold shadow-xs"
                  : isDone
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold"
                  : "bg-surface-2 border-border text-muted-foreground opacity-60"
              }`}
            >
              <span className="text-xs">{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: EXAM BASIC INFORMATION                                           */}
      {/* ========================================================================= */}
      {currentStep === 1 && (
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-5">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <span>Examination Schedule & Identification</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Exam Name */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-foreground">Exam Title / Name *</label>
              <input
                type="text"
                required
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
                placeholder="e.g. Mid-Term Examination 2026-27 or Annual Final Assessment"
                className="w-full p-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Academic Session */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Academic Session *</label>
              <select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {academicYears.map((y) => (
                  <option key={y.id || y._id} value={y.id || y._id}>
                    {y.name} {y.status === "ACTIVE" ? "(Current Active)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Initial Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="SCHEDULED">Scheduled (Upcoming)</option>
                <option value="ONGOING">Ongoing (In-Progress)</option>
                <option value="DRAFT">Draft</option>
              </select>
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">Start Date *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground">End Date *</label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Description / Instructions */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-foreground">Exam Instructions / Notes (Optional)</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Guidelines, syllabus scope, or notes for teachers and students..."
                className="w-full p-2.5 rounded-xl bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div className="flex items-center justify-end pt-3 border-t border-border">
            <button
              type="button"
              disabled={!examName.trim() || !startDate || !endDate}
              onClick={() => {
                if (!examName.trim()) {
                  setErrorMessage("Please enter an exam title.");
                  return;
                }
                if (new Date(endDate) < new Date(startDate)) {
                  setErrorMessage("End date cannot be earlier than start date.");
                  return;
                }
                setErrorMessage(null);
                setCurrentStep(2);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>Next: Select Classes & Targets</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: TARGET CLASSES & SECTIONS                                         */}
      {/* ========================================================================= */}
      {currentStep === 2 && (
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-5">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4 text-primary" />
              <span>Select Participating Classes & Sections</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Choose which classes and sections will sit for this examination.
            </p>
          </div>

          {allClasses.length === 0 ? (
            <div className="p-8 text-center bg-surface-2 rounded-2xl">
              <p className="text-xs text-muted-foreground">No classes found in the selected academic year.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allClasses.map((cls) => {
                const cId = cls.id || cls._id || "";
                const classSections = sectionsByClass[cId] || [];
                const isClassSelected = !!selectedTargets[cId];
                const selectedSecs = selectedTargets[cId] || [];

                return (
                  <div
                    key={cId}
                    className={`p-4 rounded-2xl border transition-all ${
                      isClassSelected
                        ? "bg-primary/5 border-primary/30"
                        : "bg-surface-2/60 border-border hover:border-border/80"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isClassSelected}
                          onChange={() => toggleClassTarget(cId)}
                          className="w-4 h-4 rounded text-primary focus:ring-primary/30 cursor-pointer"
                        />
                        <span className="font-bold text-xs text-foreground">{cls.name}</span>
                        {cls.code && (
                          <span className="text-[10px] text-muted-foreground uppercase font-mono">
                            ({cls.code})
                          </span>
                        )}
                      </label>

                      {isClassSelected && (
                        <span className="text-[11px] font-semibold text-primary">
                          {selectedSecs.length} of {classSections.length} sections selected
                        </span>
                      )}
                    </div>

                    {/* Section Checkboxes */}
                    {isClassSelected && classSections.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/60 flex flex-wrap gap-2">
                        {classSections.map((sec) => {
                          const sId = sec.id || sec._id || "";
                          const isSecChecked = selectedSecs.includes(sId);

                          return (
                            <button
                              key={sId}
                              type="button"
                              onClick={() => toggleSectionTarget(cId, sId)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 border ${
                                isSecChecked
                                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                  : "bg-card border-border text-foreground hover:bg-surface-3"
                              }`}
                            >
                              {isSecChecked && <Check className="w-3.5 h-3.5" />}
                              <span>Section {sec.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground text-xs font-semibold cursor-pointer"
            >
              Back to Exam Info
            </button>

            <button
              type="button"
              disabled={selectedClassesCount === 0 || isLoadingSubjects}
              onClick={prepareSubjectsStep}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoadingSubjects ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Next: Configure Subjects ({selectedClassesCount} classes)</span>
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: CONFIGURE SUBJECTS & MAXIMUM MARKS                                 */}
      {/* ========================================================================= */}
      {currentStep === 3 && (
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-5">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>Configure Exam Subjects & Maximum / Passing Marks</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Values are prefilled from your school curriculum defaults. Adjust maximum and passing marks for each subject as needed for this specific exam.
            </p>
          </div>

          {subjectConfigs.length === 0 ? (
            <div className="p-8 text-center bg-surface-2 rounded-2xl space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-xs text-muted-foreground font-semibold">
                No subjects are mapped to the selected classes in Curriculum Setup.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Please assign subjects to these classes under Academics &gt; Subjects first.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.keys(selectedTargets).map((cId) => {
                const classConfigs = subjectConfigs.filter((sc) => sc.classId === cId);
                const classDoc = allClasses.find((c) => (c.id || c._id) === cId);
                const className = classDoc?.name || "Class";

                return (
                  <div key={cId} className="space-y-2.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-xl bg-primary/10 text-primary font-bold text-xs">
                        {className}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({classConfigs.length} subjects configured)
                      </span>
                    </div>

                    <div className="rounded-2xl border border-border overflow-hidden bg-card">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-surface-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <tr>
                            <th className="py-2.5 px-3">Subject</th>
                            <th className="py-2.5 px-3">Exam Date</th>
                            <th className="py-2.5 px-3">Max Marks *</th>
                            <th className="py-2.5 px-3">Passing Marks *</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {classConfigs.map((sc) => (
                            <tr key={`${sc.classId}-${sc.subjectId}`} className="hover:bg-surface-2/40">
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-foreground block">{sc.subjectName}</span>
                                {sc.subjectCode && (
                                  <span className="text-[10px] text-muted-foreground font-mono">
                                    {sc.subjectCode}
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="date"
                                  value={sc.examDate}
                                  onChange={(e) =>
                                    updateSubjectConfig(sc.classId, sc.subjectId, "examDate", e.target.value)
                                  }
                                  className="p-1.5 rounded-lg bg-surface-2 border border-border text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="number"
                                  min="1"
                                  value={sc.maximumMarks}
                                  onChange={(e) =>
                                    updateSubjectConfig(sc.classId, sc.subjectId, "maximumMarks", Number(e.target.value))
                                  }
                                  className="w-24 p-1.5 rounded-lg bg-surface-2 border border-border text-foreground text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary/30"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <input
                                  type="number"
                                  min="0"
                                  value={sc.passingMarks}
                                  onChange={(e) =>
                                    updateSubjectConfig(sc.classId, sc.subjectId, "passingMarks", Number(e.target.value))
                                  }
                                  className={`w-24 p-1.5 rounded-lg bg-surface-2 border text-foreground text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-primary/30 ${
                                    sc.passingMarks > sc.maximumMarks
                                      ? "border-rose-500 text-rose-600 bg-rose-500/10"
                                      : "border-border"
                                  }`}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground text-xs font-semibold cursor-pointer"
            >
              Back to Targets
            </button>

            <button
              type="button"
              disabled={subjectConfigs.length === 0}
              onClick={() => {
                // Check if any passing marks > maximum marks
                const invalid = subjectConfigs.find((sc) => sc.passingMarks > sc.maximumMarks);
                if (invalid) {
                  setErrorMessage(
                    `Passing marks cannot exceed maximum marks for ${invalid.className} - ${invalid.subjectName}.`
                  );
                  return;
                }
                setErrorMessage(null);
                setCurrentStep(4);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
            >
              <span>Next: Review & Finalize</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: REVIEW & SAVE EXAM                                                */}
      {/* ========================================================================= */}
      {currentStep === 4 && (
        <div className="p-6 rounded-3xl bg-card border border-border shadow-sm space-y-6">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Review Examination Specification</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Confirm your examination details before saving to the active academic roster.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-surface-2/60 border border-border">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Exam Title
              </span>
              <span className="text-sm font-extrabold text-foreground">{examName}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Schedule
              </span>
              <span className="text-xs font-semibold text-foreground">
                {startDate} to {endDate}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Target Scope
              </span>
              <span className="text-xs font-semibold text-foreground">
                {selectedClassesCount} Classes • {totalSectionsCount} Sections
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                Configured Subjects
              </span>
              <span className="text-xs font-semibold text-foreground">
                {subjectConfigs.length} Subject Assessments
              </span>
            </div>
          </div>

          {/* Subjects Table Preview */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-foreground block">Configured Subjects Summary</span>
            <div className="rounded-2xl border border-border overflow-hidden bg-card">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Max Marks</th>
                    <th className="py-2.5 px-3">Passing Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {subjectConfigs.map((sc) => (
                    <tr key={`${sc.classId}-${sc.subjectId}`} className="hover:bg-surface-2/40">
                      <td className="py-2 px-3 font-semibold text-foreground">{sc.className}</td>
                      <td className="py-2 px-3 text-muted-foreground">{sc.subjectName}</td>
                      <td className="py-2 px-3 font-bold text-foreground">{sc.maximumMarks}</td>
                      <td className="py-2 px-3 text-muted-foreground">{sc.passingMarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-4 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-muted-foreground text-xs font-semibold cursor-pointer"
            >
              Back to Subjects
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleSubmitExam}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 hover:opacity-90 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Creating Examination...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save &amp; Publish Exam</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
