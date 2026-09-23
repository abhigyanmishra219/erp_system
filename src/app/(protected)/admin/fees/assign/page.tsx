"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Users,
  Layers,
  CheckCircle2,
  AlertCircle,
  Percent,
  DollarSign,
  Sparkles,
  HelpCircle,
  RefreshCw,
  Plus,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";

interface AcademicYear {
  id: string;
  name: string;
  status: string;
}

interface ClassItem {
  id: string;
  name: string;
  code: string;
}

interface SectionItem {
  id: string;
  name: string;
  classId: string;
}

interface FeeStructureItem {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  class: { id: string; name: string } | null;
  section: { id: string; name: string } | null;
  feeCategory: { name: string; code: string } | null;
}

interface EligibleStudent {
  id: string;
  name: string;
  admissionNumber: string;
  rollNumber: string;
  isSelected: boolean;
  discountType: "NONE" | "FIXED" | "PERCENTAGE";
  discountValue: number;
  concessionType: "NONE" | "FIXED" | "PERCENTAGE";
  concessionValue: number;
  concessionReason: string;
  calculatedNet: number;
}

export default function FeeAssignmentPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Metadata
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [structures, setStructures] = useState<FeeStructureItem[]>([]);

  // Form selections
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [selectedStructureId, setSelectedStructureId] = useState<string>("");

  // Students in selected class
  const [students, setStudents] = useState<EligibleStudent[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // 1. Initial Meta Load
  useEffect(() => {
    async function loadMeta() {
      try {
        const [yearsRes, classesRes] = await Promise.all([
          fetch("/api/admin/academic-years"),
          fetch("/api/admin/classes"),
        ]);
        const [yearsData, classesData] = await Promise.all([
          yearsRes.json(),
          classesRes.json(),
        ]);

        if (yearsData.success && yearsData.data) {
          const list: AcademicYear[] = yearsData.data.academicYears || (Array.isArray(yearsData.data) ? yearsData.data : []);
          setAcademicYears(list);
          const active = list.find((y) => y.status === "ACTIVE") || list[0];
          if (active) setSelectedYearId(active.id);
        }

        if (classesData.success && classesData.data) {
          setClasses(classesData.data.classes || []);
        }
      } catch (err) {
        console.error("Failed to load metadata", err);
      }
    }
    loadMeta();
  }, []);

  // 2. Load Fee Structures when Year & Class change
  useEffect(() => {
    if (!selectedYearId) return;

    async function loadStructures() {
      try {
        const params = new URLSearchParams();
        params.append("academicYearId", selectedYearId);
        if (selectedClassId) params.append("classId", selectedClassId);

        const res = await fetch(`/api/admin/fees/structures?${params.toString()}`);
        const data = await res.json();
        if (data.success && data.data?.structures) {
          setStructures(data.data.structures);
        } else {
          setStructures([]);
        }
      } catch (err) {
        console.error("Failed to load fee structures", err);
      }
    }
    loadStructures();
  }, [selectedYearId, selectedClassId]);

  // 3. Load Sections when Class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId("");
      return;
    }
    const cls = classes.find((c) => c.id === selectedClassId);
    if (cls && (cls as any).sections && (cls as any).sections.length > 0) {
      setSections((cls as any).sections);
    } else {
      fetch(`/api/admin/sections?classId=${selectedClassId}`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success && json.data?.sections) setSections(json.data.sections);
          else setSections([]);
        })
        .catch(() => setSections([]));
    }
    setSelectedSectionId("");
  }, [selectedClassId, classes]);

  // Find currently selected structure
  const selectedStructure = structures.find((s) => s.id === selectedStructureId);

  // Helper to calculate student net fee
  const calculateStudentNet = (
    baseAmount: number,
    dType: "NONE" | "FIXED" | "PERCENTAGE",
    dVal: number,
    cType: "NONE" | "FIXED" | "PERCENTAGE",
    cVal: number
  ) => {
    let dAmt = 0;
    if (dType === "FIXED") dAmt = Math.min(baseAmount, dVal);
    else if (dType === "PERCENTAGE") dAmt = (baseAmount * Math.min(100, dVal)) / 100;

    const afterD = Math.max(0, baseAmount - dAmt);
    let cAmt = 0;
    if (cType === "FIXED") cAmt = Math.min(afterD, cVal);
    else if (cType === "PERCENTAGE") cAmt = (afterD * Math.min(100, cVal)) / 100;

    return Math.max(0, Math.round((afterD - cAmt) * 100) / 100);
  };

  // 4. Fetch Students for Step 2
  const handleProceedToStudents = async () => {
    if (!selectedYearId || !selectedClassId || !selectedStructureId || !selectedStructure) {
      setMessage({ type: "error", text: "Please select an Academic Year, Class, and Fee Structure." });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const params = new URLSearchParams();
      params.append("classId", selectedClassId);
      if (selectedSectionId) params.append("sectionId", selectedSectionId);
      params.append("limit", "100");

      const res = await fetch(`/api/admin/students?${params.toString()}`);
      const data = await res.json();

      if (data.success && data.data?.students) {
        const initialStudents: EligibleStudent[] = (data.data.students || []).map((s: any) => ({
          id: s._id || s.id,
          name: `${s.firstName} ${s.lastName}`.trim(),
          admissionNumber: s.admissionNumber || "",
          rollNumber: s.rollNumber || "",
          isSelected: true,
          discountType: "NONE",
          discountValue: 0,
          concessionType: "NONE",
          concessionValue: 0,
          concessionReason: "",
          calculatedNet: selectedStructure.amount,
        }));

        setStudents(initialStudents);
        setStep(2);
      } else {
        setMessage({ type: "error", text: "No active students found in this class." });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to load class students" });
    } finally {
      setLoading(false);
    }
  };

  // Toggle single student selection
  const toggleStudent = (id: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isSelected: !s.isSelected } : s))
    );
  };

  // Toggle all students selection
  const toggleAll = (checked: boolean) => {
    setStudents((prev) => prev.map((s) => ({ ...s, isSelected: checked })));
  };

  // Update override for a student
  const updateStudentOverride = (
    id: string,
    field: "discountType" | "discountValue" | "concessionType" | "concessionValue" | "concessionReason",
    val: any
  ) => {
    if (!selectedStructure) return;
    const base = selectedStructure.amount;

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: val };
        updated.calculatedNet = calculateStudentNet(
          base,
          updated.discountType,
          updated.discountValue,
          updated.concessionType,
          updated.concessionValue
        );
        return updated;
      })
    );
  };

  // Selected students summary
  const selectedStudents = students.filter((s) => s.isSelected);
  const totalGrossAmount = selectedStudents.length * (selectedStructure?.amount || 0);
  const totalNetAmount = selectedStudents.reduce((sum, s) => sum + s.calculatedNet, 0);
  const totalSavings = totalGrossAmount - totalNetAmount;

  // 5. Submit Batch Assignment
  const handleConfirmAssignment = async () => {
    if (selectedStudents.length === 0 || !selectedStructure) {
      setMessage({ type: "error", text: "Please select at least one student." });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const overrides = selectedStudents
        .filter((s) => s.discountType !== "NONE" || s.concessionType !== "NONE")
        .map((s) => ({
          studentId: s.id,
          discountType: s.discountType,
          discountValue: s.discountValue,
          concessionType: s.concessionType,
          concessionValue: s.concessionValue,
          concessionReason: s.concessionReason,
        }));

      const res = await fetch("/api/admin/fees/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          feeStructureId: selectedStructureId,
          classId: selectedClassId,
          sectionId: selectedSectionId || undefined,
          studentIds: selectedStudents.map((s) => s.id),
          overrides,
        }),
      });

      const data = await res.json();
      if (data.success) {
        router.push("/admin/fees");
      } else {
        setMessage({ type: "error", text: data.error?.message || "Failed to assign fees" });
        setStep(2);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error submitting fee assignment" });
      setStep(2);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/fees"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-accent text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Fees Hub</span>
          </Link>
          <div className="h-4 w-px bg-border" />
          <h1 className="text-xl font-bold text-foreground">Fee Assignment Wizard</h1>
        </div>

        {/* Stepper indicator */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span
            className={`px-2.5 py-1 rounded-full ${
              step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            1. Select Scope
          </span>
          <span className="text-muted-foreground">→</span>
          <span
            className={`px-2.5 py-1 rounded-full ${
              step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            2. Students & Discounts
          </span>
          <span className="text-muted-foreground">→</span>
          <span
            className={`px-2.5 py-1 rounded-full ${
              step === 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            3. Review & Confirm
          </span>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in-50 ${
            message.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-xs font-semibold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* STEP 1: Select Scope */}
      {step === 1 && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              <span>Step 1: Choose Academic Scope & Fee Structure</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Select the target session, class, and fee structure template you wish to apply to students.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Academic Session <span className="text-destructive">*</span>
              </label>
              <select
                value={selectedYearId}
                onChange={(e) => {
                  setSelectedYearId(e.target.value);
                  setSelectedStructureId("");
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary font-medium"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.status === "ACTIVE" ? "(Active)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Target Class <span className="text-destructive">*</span>
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedSectionId("");
                  setSelectedStructureId("");
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary font-medium"
              >
                <option value="">-- Choose Class --</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Target Section (Optional)
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                disabled={!selectedClassId}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary disabled:opacity-50"
              >
                <option value="">All Sections in Class</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    Section {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1">
                Fee Structure Template <span className="text-destructive">*</span>
              </label>
              <select
                value={selectedStructureId}
                onChange={(e) => setSelectedStructureId(e.target.value)}
                disabled={!selectedClassId || structures.length === 0}
                className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary disabled:opacity-50 font-medium"
              >
                <option value="">-- Choose Structure --</option>
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (₹{s.amount.toLocaleString()} • {s.frequency})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedStructure && (
            <div className="p-4 bg-muted/40 border border-border rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-foreground">{selectedStructure.name}</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                  ₹{selectedStructure.amount.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Frequency: {selectedStructure.frequency} • Category: {selectedStructure.feeCategory?.name}
              </p>
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-border">
            <button
              onClick={handleProceedToStudents}
              disabled={loading || !selectedStructureId}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Loading Students...</span>
                </>
              ) : (
                <>
                  <span>Select Students</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Students & Overrides */}
      {step === 2 && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span>Step 2: Eligible Students & Waivers</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select candidates and apply individual sibling discounts or approved concessions.
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold text-muted-foreground">Selected: </span>
              <span className="text-sm font-bold text-foreground">
                {selectedStudents.length} of {students.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-muted/50 border-b border-border font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      checked={students.length > 0 && selectedStudents.length === students.length}
                      onChange={(e) => toggleAll(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3 text-center">Base Fee</th>
                  <th className="py-2.5 px-3">Discount</th>
                  <th className="py-2.5 px-3">Concession</th>
                  <th className="py-2.5 px-3 text-right">Net Payable</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {students.map((stu) => (
                  <tr key={stu.id} className={`hover:bg-muted/20 ${stu.isSelected ? "bg-primary/5" : ""}`}>
                    <td className="py-2.5 px-3">
                      <input
                        type="checkbox"
                        checked={stu.isSelected}
                        onChange={() => toggleStudent(stu.id)}
                        className="rounded border-input text-primary focus:ring-primary"
                      />
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-foreground">{stu.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        Adm: {stu.admissionNumber} {stu.rollNumber ? `• Roll: ${stu.rollNumber}` : ""}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-center font-medium">
                      ₹{selectedStructure?.amount.toLocaleString()}
                    </td>

                    {/* Discount */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={stu.discountType}
                          onChange={(e) =>
                            updateStudentOverride(stu.id, "discountType", e.target.value as any)
                          }
                          className="px-2 py-1 rounded border border-input bg-background text-[11px]"
                        >
                          <option value="NONE">None</option>
                          <option value="PERCENTAGE">% Off</option>
                          <option value="FIXED">₹ Flat</option>
                        </select>
                        {stu.discountType !== "NONE" && (
                          <input
                            type="number"
                            min="0"
                            placeholder="Value"
                            value={stu.discountValue || ""}
                            onChange={(e) =>
                              updateStudentOverride(stu.id, "discountValue", Number(e.target.value))
                            }
                            className="w-16 px-2 py-1 rounded border border-input bg-background text-[11px]"
                          />
                        )}
                      </div>
                    </td>

                    {/* Concession */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <select
                          value={stu.concessionType}
                          onChange={(e) =>
                            updateStudentOverride(stu.id, "concessionType", e.target.value as any)
                          }
                          className="px-2 py-1 rounded border border-input bg-background text-[11px]"
                        >
                          <option value="NONE">None</option>
                          <option value="PERCENTAGE">% Off</option>
                          <option value="FIXED">₹ Flat</option>
                        </select>
                        {stu.concessionType !== "NONE" && (
                          <>
                            <input
                              type="number"
                              min="0"
                              placeholder="Value"
                              value={stu.concessionValue || ""}
                              onChange={(e) =>
                                updateStudentOverride(
                                  stu.id,
                                  "concessionValue",
                                  Number(e.target.value)
                                )
                              }
                              className="w-16 px-2 py-1 rounded border border-input bg-background text-[11px]"
                            />
                            <input
                              type="text"
                              placeholder="Reason"
                              value={stu.concessionReason || ""}
                              onChange={(e) =>
                                updateStudentOverride(stu.id, "concessionReason", e.target.value)
                              }
                              className="w-24 px-2 py-1 rounded border border-input bg-background text-[11px]"
                            />
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 text-right font-bold text-foreground">
                      ₹{stu.calculatedNet.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-accent transition-colors"
            >
              ← Back
            </button>

            <button
              onClick={() => setStep(3)}
              disabled={selectedStudents.length === 0}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <span>Review Summary</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Review & Confirm */}
      {step === 3 && selectedStructure && (
        <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span>Step 3: Review & Confirm Fee Assignment</span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Verify the financial breakdown before assigning this structure to student fee accounts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-muted/40 border border-border rounded-xl">
              <div className="text-xs text-muted-foreground font-semibold">Total Students</div>
              <div className="text-2xl font-bold text-foreground mt-1">{selectedStudents.length}</div>
              <p className="text-[11px] text-muted-foreground mt-0.5">Eligible candidates in view</p>
            </div>

            <div className="p-4 bg-muted/40 border border-border rounded-xl">
              <div className="text-xs text-muted-foreground font-semibold">Gross Fee Total</div>
              <div className="text-2xl font-bold text-foreground mt-1">₹{totalGrossAmount.toLocaleString()}</div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                -₹{totalSavings.toLocaleString()} in discounts/concessions
              </p>
            </div>

            <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Net Total Payable</div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                ₹{totalNetAmount.toLocaleString()}
              </div>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">To be collected across schedules</p>
            </div>
          </div>

          <div className="p-4 bg-muted/30 border border-border rounded-xl space-y-1.5 text-xs">
            <div className="font-semibold text-foreground">Assignment Summary:</div>
            <div>• Fee Structure: <span className="font-medium text-foreground">{selectedStructure.name}</span></div>
            <div>• Base Amount: <span className="font-medium text-foreground">₹{selectedStructure.amount.toLocaleString()}</span></div>
            <div>• Frequency: <span className="font-medium text-foreground">{selectedStructure.frequency}</span></div>
            <div>• Duplicate assignments will be automatically skipped to prevent double charging.</div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-border">
            <button
              onClick={() => setStep(2)}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-accent transition-colors"
            >
              ← Back to Students
            </button>

            <button
              onClick={handleConfirmAssignment}
              disabled={submitting || selectedStudents.length === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Assigning Fees...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm & Assign Fees</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
