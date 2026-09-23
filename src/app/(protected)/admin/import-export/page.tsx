"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  UploadCloud,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  Sparkles,
  Users,
  User,
  ShieldCheck,
  Building2,
  CreditCard,
  History,
  FileDown,
  Layers,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Info,
} from "lucide-react";
import { ImportType } from "@/models/ImportSession";
import { IMPORT_CONFIGS, FieldDefinition } from "@/lib/import/types";

type TabMode = "IMPORT" | "EXPORT" | "HISTORY";
type WizardStep = 1 | 2 | 3 | 4 | 5 | 6; // 1: Select & Upload, 2: Map, 3: Validate, 4: Preview, 5: Confirm, 6: Complete

export default function ImportExportPage() {
  const [activeTab, setActiveTab] = useState<TabMode>("IMPORT");

  // --- Wizard State ---
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const [selectedType, setSelectedType] = useState<ImportType>("STUDENTS");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [validationSummary, setValidationSummary] = useState<{
    total: number;
    valid: number;
    invalid: number;
    errorsCount: number;
  } | null>(null);

  // Preview State
  const [previewFilter, setPreviewFilter] = useState<"ALL" | "VALID" | "ERRORS">("ALL");
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewTotalPages, setPreviewTotalPages] = useState(1);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Confirm / Execution State
  const [isImporting, setIsImporting] = useState(false);
  const [executionResult, setExecutionResult] = useState<{
    total: number;
    imported: number;
    failed: number;
    skipped: number;
  } | null>(null);

  // Error & Status State
  const [uiError, setUiError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // --- Export State ---
  const [exportAcademicYears, setExportAcademicYears] = useState<any[]>([]);
  const [exportClasses, setExportClasses] = useState<any[]>([]);
  const [exportSections, setExportSections] = useState<any[]>([]);
  const [exportFilters, setExportFilters] = useState({
    academicYearId: "",
    classId: "",
    sectionId: "",
    status: "ALL",
    gender: "ALL",
    department: "ALL",
    search: "",
  });
  const [exportingCategory, setExportingCategory] = useState<string | null>(null);

  // --- History State ---
  const [historySessions, setHistorySessions] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  // Load dropdowns for export filters
  useEffect(() => {
    async function loadAcademicDropdowns() {
      try {
        const [yearRes, classRes] = await Promise.all([
          fetch("/api/admin/academic-years"),
          fetch("/api/admin/classes"),
        ]);
        if (yearRes.ok) {
          const yd = await yearRes.json();
          setExportAcademicYears(yd.data?.academicYears || []);
        }
        if (classRes.ok) {
          const cd = await classRes.json();
          setExportClasses(cd.data?.classes || []);
        }
      } catch (err) {
        console.error("Failed to load academic dropdowns:", err);
      }
    }
    loadAcademicDropdowns();
  }, []);

  // Fetch sections when export class changes
  useEffect(() => {
    if (!exportFilters.classId) {
      setExportSections([]);
      return;
    }
    async function loadSections() {
      try {
        const res = await fetch(`/api/admin/sections?classId=${exportFilters.classId}`);
        if (res.ok) {
          const sd = await res.json();
          setExportSections(sd.data?.sections || []);
        }
      } catch (err) {
        console.error("Failed to load sections:", err);
      }
    }
    loadSections();
  }, [exportFilters.classId]);

  // Load History when tab clicked
  useEffect(() => {
    if (activeTab === "HISTORY") {
      fetchHistory(historyPage);
    }
  }, [activeTab, historyPage]);

  const fetchHistory = async (page: number) => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/import-export/history?page=${page}&limit=10`);
      if (res.ok) {
        const d = await res.json();
        setHistorySessions(d.data?.sessions || []);
        setHistoryTotalPages(d.data?.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // --- Step 1: Upload File ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
    setUiError("");
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", selectedType);

    try {
      const res = await fetch("/api/admin/import-export/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to upload file");
      }

      setSessionId(data.data.sessionId);
      setHeaders(data.data.headers);
      setMapping(data.data.suggestedMapping || {});
      setFields(data.data.fields || []);
      setCurrentStep(2); // Advance to Column Mapping
    } catch (err: any) {
      setUiError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // --- Step 2: Save Column Mapping & Advance ---
  const handleSaveMapping = async () => {
    setUiError("");
    try {
      const res = await fetch("/api/admin/import-export/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, mapping }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Column mapping failed");
      }

      // Automatically trigger validation
      await triggerValidation();
    } catch (err: any) {
      setUiError(err.message);
    }
  };

  // --- Step 3: Trigger Validation ---
  const triggerValidation = async () => {
    setIsValidating(true);
    setCurrentStep(3);
    setUiError("");
    try {
      const res = await fetch("/api/admin/import-export/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Validation failed");
      }

      setValidationSummary({
        total: data.data.totalRows,
        valid: data.data.validRows,
        invalid: data.data.invalidRows,
        errorsCount: data.data.errorsCount,
      });

      // Load Preview for Step 4
      await loadPreviewData(1, "ALL");
      setCurrentStep(4);
    } catch (err: any) {
      setUiError(err.message);
      setCurrentStep(2); // Roll back to mapping if fatal
    } finally {
      setIsValidating(false);
    }
  };

  // --- Step 4: Load Preview Rows ---
  const loadPreviewData = async (page: number, filter: "ALL" | "VALID" | "ERRORS") => {
    setPreviewLoading(true);
    try {
      const res = await fetch(
        `/api/admin/import-export/preview?sessionId=${sessionId}&filter=${filter}&page=${page}&limit=15`
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setPreviewRows(data.data.rows || []);
        setPreviewTotalPages(data.data.pagination?.totalPages || 1);
        setPreviewPage(page);
      }
    } catch (err) {
      console.error("Failed to load preview data:", err);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleFilterChange = (filter: "ALL" | "VALID" | "ERRORS") => {
    setPreviewFilter(filter);
    loadPreviewData(1, filter);
  };

  // --- Step 5: Execute Import ---
  const handleConfirmImport = async () => {
    setIsImporting(true);
    setUiError("");
    try {
      const res = await fetch("/api/admin/import-export/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Import execution failed");
      }

      setExecutionResult({
        total: data.data.totalRows,
        imported: data.data.importedRows,
        failed: data.data.failedRows,
        skipped: data.data.skippedRows,
      });
      setCurrentStep(6); // Advance to Complete
    } catch (err: any) {
      setUiError(err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Reset Wizard
  const handleResetWizard = () => {
    setCurrentStep(1);
    setUploadedFile(null);
    setSessionId("");
    setHeaders([]);
    setMapping({});
    setValidationSummary(null);
    setPreviewRows([]);
    setExecutionResult(null);
    setUiError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Trigger Excel Export
  const handleExportCategory = async (type: string) => {
    setExportingCategory(type);
    try {
      const query = new URLSearchParams();
      if (exportFilters.academicYearId) query.set("academicYearId", exportFilters.academicYearId);
      if (exportFilters.classId) query.set("classId", exportFilters.classId);
      if (exportFilters.sectionId) query.set("sectionId", exportFilters.sectionId);
      if (exportFilters.status !== "ALL") query.set("status", exportFilters.status);
      if (exportFilters.gender !== "ALL") query.set("gender", exportFilters.gender);
      if (exportFilters.department !== "ALL") query.set("department", exportFilters.department);
      if (exportFilters.search) query.set("search", exportFilters.search);

      const res = await fetch(`/api/admin/import-export/export/${type}?${query.toString()}`);
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || "Export failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert(`Export failed: ${err.message}`);
    } finally {
      setExportingCategory(null);
    }
  };

  const currentCategoryConfig = IMPORT_CONFIGS[selectedType];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-5 border-b border-border">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Data Import & Export Center
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Safely onboard school records with column mapping & export filtered Excel datasets.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-2 rounded-2xl border border-border shrink-0 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("IMPORT")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "IMPORT"
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-3"
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            Excel Import
          </button>
          <button
            onClick={() => setActiveTab("EXPORT")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "EXPORT"
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-3"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            Excel Export
          </button>
          <button
            onClick={() => setActiveTab("HISTORY")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "HISTORY"
                ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                : "text-muted-foreground hover:text-foreground hover:bg-surface-3"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Import History
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {uiError && (
        <div className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between gap-3 text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <XCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{uiError}</span>
          </div>
          <button onClick={() => setUiError("")} className="hover:underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: EXCEL IMPORT WIZARD */}
      {/* ========================================================================= */}
      {activeTab === "IMPORT" && (
        <div className="space-y-6">
          {/* Wizard Step Progress Tracker */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs overflow-x-auto">
            <div className="flex items-center justify-between min-w-[620px]">
              {[
                { step: 1, label: "1. Upload & Category" },
                { step: 2, label: "2. Map Columns" },
                { step: 3, label: "3. Validate" },
                { step: 4, label: "4. Preview & Errors" },
                { step: 5, label: "5. Confirm" },
                { step: 6, label: "6. Complete" },
              ].map((s, idx) => (
                <div key={s.step} className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black transition-all ${
                        currentStep === s.step
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20 shadow-md shadow-primary/30"
                          : currentStep > s.step
                          ? "bg-emerald-500 text-white"
                          : "bg-surface-2 text-muted-foreground border border-border"
                      }`}
                    >
                      {currentStep > s.step ? <CheckCircle2 className="w-4 h-4" /> : s.step}
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        currentStep === s.step
                          ? "text-primary"
                          : currentStep > s.step
                          ? "text-foreground"
                          : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {idx < 5 && <div className="w-8 h-[2px] bg-border mx-1" />}
                </div>
              ))}
            </div>
          </div>

          {/* STEP 1: SELECT CATEGORY & UPLOAD */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-base font-bold text-foreground">Select Import Category</h2>
                <p className="text-xs text-muted-foreground">
                  Choose the dataset you want to onboard. Download standard sample templates before uploading.
                </p>
              </div>

              {/* Category Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    type: "STUDENTS" as ImportType,
                    title: "Students",
                    desc: "Admission profile, class, section, roll number, guardian contacts.",
                    icon: Users,
                  },
                  {
                    type: "PARENTS" as ImportType,
                    title: "Parents & Guardians",
                    desc: "Parent directory with multi-child linking via admission numbers.",
                    icon: ShieldCheck,
                  },
                  {
                    type: "TEACHERS" as ImportType,
                    title: "Teachers & Staff",
                    desc: "Faculty details, departments, designations, qualifications.",
                    icon: User,
                  },
                  {
                    type: "CLASSES" as ImportType,
                    title: "Classes",
                    desc: "Grades and standards mapped to configured Academic Years.",
                    icon: Building2,
                  },
                  {
                    type: "SECTIONS" as ImportType,
                    title: "Sections",
                    desc: "Section divisions, capacities, and class associations.",
                    icon: Layers,
                  },
                  {
                    type: "FEES" as ImportType,
                    title: "Fee Payments & Receipts",
                    desc: "Historical receipts, student payments, and transactional ledger.",
                    icon: CreditCard,
                  },
                ].map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedType === cat.type;
                  return (
                    <div
                      key={cat.type}
                      onClick={() => setSelectedType(cat.type)}
                      className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? "bg-primary/5 border-primary shadow-sm shadow-primary/10 ring-1 ring-primary"
                          : "bg-card border-border hover:border-primary/40 hover:bg-surface-1"
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div
                            className={`p-2.5 rounded-xl ${
                              isSelected ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"
                            }`}
                          >
                            <Icon className="w-5 h-5" />
                          </div>
                          {isSelected && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                              Selected
                            </span>
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-foreground">{cat.title}</h3>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{cat.desc}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between">
                        <a
                          href={`/api/admin/import-export/templates/${cat.type.toLowerCase()}`}
                          download
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Template
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Upload Dropzone */}
              <div className="p-8 rounded-2xl bg-card border-2 border-dashed border-border hover:border-primary/50 transition-all text-center flex flex-col items-center justify-center space-y-4">
                <div className="p-4 rounded-2xl bg-primary/10 text-primary">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">
                    Upload {currentCategoryConfig.title} Excel File (.xlsx)
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Drag and drop your spreadsheet here or click browse. Maximum file size: 10MB.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="excel-file-upload"
                />

                <label
                  htmlFor="excel-file-upload"
                  className={`px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs cursor-pointer hover:opacity-95 shadow-md shadow-primary/25 transition-all flex items-center gap-2 ${
                    isUploading ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Parsing Worksheet...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4" />
                      Browse .xlsx File
                    </>
                  )}
                </label>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-foreground">Map Columns — {currentCategoryConfig.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    Match the columns in your uploaded Excel file to the corresponding ERP fields.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetWizard}
                    className="px-3 py-1.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-xs font-bold text-foreground border border-border"
                  >
                    Cancel & Re-upload
                  </button>
                </div>
              </div>

              {/* Mapping Table */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-2 border-b border-border text-muted-foreground uppercase font-bold text-[10px] tracking-wider">
                      <tr>
                        <th className="px-4 py-3">ERP Target Field</th>
                        <th className="px-4 py-3">Requirement</th>
                        <th className="px-4 py-3">Sample Value</th>
                        <th className="px-4 py-3">Excel Header in Uploaded File</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {fields.map((field) => {
                        const currentMapped = mapping[field.key] || "";
                        return (
                          <tr key={field.key} className="hover:bg-surface-1/50 transition-colors">
                            <td className="px-4 py-3 font-semibold text-foreground">
                              {field.label}
                              <span className="block text-[10px] text-muted-foreground font-normal">
                                {field.description}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {field.required ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                                  Required *
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-surface-2 text-muted-foreground font-bold text-[10px]">
                                  Optional
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground font-mono">{field.sample}</td>
                            <td className="px-4 py-3">
                              <select
                                value={currentMapped}
                                onChange={(e) =>
                                  setMapping((prev) => ({
                                    ...prev,
                                    [field.key]: e.target.value,
                                  }))
                                }
                                className={`w-full max-w-xs px-3 py-1.5 rounded-xl border text-xs font-medium bg-background ${
                                  field.required && !currentMapped
                                    ? "border-rose-500 text-rose-600"
                                    : "border-border text-foreground"
                                }`}
                              >
                                <option value="">— Ignore / Not Mapped —</option>
                                {headers.map((h) => (
                                  <option key={h} value={h}>
                                    {h}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 rounded-xl bg-surface-2 text-xs font-bold hover:bg-surface-3 flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Upload
                </button>
                <button
                  onClick={handleSaveMapping}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/25 hover:opacity-95 flex items-center gap-2"
                >
                  Validate Data <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: VALIDATING LOADER */}
          {currentStep === 3 && (
            <div className="p-12 rounded-2xl bg-card border border-border text-center space-y-4 flex flex-col items-center justify-center">
              <RefreshCw className="w-10 h-10 text-primary animate-spin" />
              <div>
                <h3 className="text-base font-bold text-foreground">Validating Spreadsheet Rows</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Checking unique admission numbers, emails, dates, and tenant relationships...
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: PREVIEW & ERROR REPORT */}
          {currentStep === 4 && validationSummary && (
            <div className="space-y-6">
              {/* Metric Overview Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-card border border-border shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Total Rows</span>
                  <div className="text-xl font-black text-foreground mt-1">{validationSummary.total}</div>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
                    Valid Rows
                  </span>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {validationSummary.valid}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 shadow-xs">
                  <span className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400">
                    Invalid / Error Rows
                  </span>
                  <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
                    {validationSummary.invalid}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-center">
                  <a
                    href={`/api/admin/import-export/error-report/${sessionId}`}
                    download
                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      validationSummary.invalid > 0
                        ? "bg-rose-500 text-white shadow-xs hover:bg-rose-600"
                        : "bg-surface-2 text-muted-foreground pointer-events-none opacity-50"
                    }`}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Error Report
                  </a>
                </div>
              </div>

              {/* Preview Filter Tabs */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleFilterChange("ALL")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                      previewFilter === "ALL" ? "bg-primary text-primary-foreground" : "bg-surface-2 text-muted-foreground"
                    }`}
                  >
                    All Rows ({validationSummary.total})
                  </button>
                  <button
                    onClick={() => handleFilterChange("VALID")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                      previewFilter === "VALID"
                        ? "bg-emerald-600 text-white"
                        : "bg-surface-2 text-muted-foreground"
                    }`}
                  >
                    Valid Only ({validationSummary.valid})
                  </button>
                  <button
                    onClick={() => handleFilterChange("ERRORS")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                      previewFilter === "ERRORS" ? "bg-rose-600 text-white" : "bg-surface-2 text-muted-foreground"
                    }`}
                  >
                    Errors Only ({validationSummary.invalid})
                  </button>
                </div>
              </div>

              {/* Preview Data Table */}
              <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-2 border-b border-border text-muted-foreground uppercase font-bold text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Row #</th>
                        <th className="px-4 py-3">Validation Status</th>
                        <th className="px-4 py-3">Key Details</th>
                        <th className="px-4 py-3">Errors / Warnings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewLoading ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                            Loading preview...
                          </td>
                        </tr>
                      ) : previewRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-muted-foreground">
                            No rows found matching current filter.
                          </td>
                        </tr>
                      ) : (
                        previewRows.map((r) => (
                          <tr
                            key={r.rowNumber}
                            className={r.status === "ERROR" ? "bg-rose-500/5" : "hover:bg-surface-1/50"}
                          >
                            <td className="px-4 py-3 font-mono font-bold text-foreground">{r.rowNumber}</td>
                            <td className="px-4 py-3">
                              {r.status === "VALID" ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[10px]">
                                  READY TO IMPORT
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 font-bold text-[10px]">
                                  ERROR
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-foreground">
                              {Object.entries(r.data || {})
                                .slice(0, 4)
                                .map(([k, v]) => `${k}: ${v || "—"}`)
                                .join(" | ")}
                            </td>
                            <td className="px-4 py-3">
                              {r.errors && r.errors.length > 0 ? (
                                <div className="space-y-1">
                                  {r.errors.map((e: any, idx: number) => (
                                    <div key={idx} className="text-rose-600 dark:text-rose-400 text-[11px] font-medium">
                                      • <span className="font-bold">{e.field}:</span> {e.message}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">No issues detected</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {previewTotalPages > 1 && (
                  <div className="p-3 border-t border-border flex items-center justify-between">
                    <button
                      disabled={previewPage <= 1}
                      onClick={() => loadPreviewData(previewPage - 1, previewFilter)}
                      className="px-3 py-1 rounded-xl bg-surface-2 border border-border text-xs font-bold disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-muted-foreground font-mono">
                      Page {previewPage} of {previewTotalPages}
                    </span>
                    <button
                      disabled={previewPage >= previewTotalPages}
                      onClick={() => loadPreviewData(previewPage + 1, previewFilter)}
                      className="px-3 py-1 rounded-xl bg-surface-2 border border-border text-xs font-bold disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>

              {/* Action Bar */}
              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 rounded-xl bg-surface-2 text-xs font-bold hover:bg-surface-3 flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" /> Edit Mapping
                </button>
                <button
                  disabled={validationSummary.valid === 0}
                  onClick={() => setCurrentStep(5)}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/25 hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
                >
                  Proceed to Confirmation <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: CONFIRMATION */}
          {currentStep === 5 && validationSummary && (
            <div className="max-w-2xl mx-auto p-6 rounded-2xl bg-card border border-border shadow-md space-y-6">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-foreground">Confirm Data Import</h2>
                <p className="text-xs text-muted-foreground">
                  Review the summary below before committing records to the school database.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-2 border border-border space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Import Category:</span>
                  <span className="font-bold text-foreground">{currentCategoryConfig.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Valid Records to Import:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {validationSummary.valid} records
                  </span>
                </div>
                {validationSummary.invalid > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invalid Rows (Will be skipped):</span>
                    <span className="font-bold text-rose-600 dark:text-rose-400">
                      {validationSummary.invalid} records
                    </span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5">
                <Info className="w-4 h-4 shrink-0" />
                <span>
                  Account credentials for any portal users will be securely provisioned with temporary passwords.
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <button
                  onClick={() => setCurrentStep(4)}
                  className="px-4 py-2 rounded-xl bg-surface-2 text-xs font-bold hover:bg-surface-3"
                >
                  Back to Preview
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={isImporting}
                  className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/25 hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Importing Records...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm & Execute Import
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* STEP 6: COMPLETE */}
          {currentStep === 6 && executionResult && (
            <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-card border border-border shadow-md text-center space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">Import Completed Successfully</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Your school database has been updated with the onboarded records.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-surface-2 border border-border text-center">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Imported</span>
                  <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {executionResult.imported}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Skipped</span>
                  <div className="text-lg font-black text-amber-600 dark:text-amber-400 mt-0.5">
                    {executionResult.skipped}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase">Failed</span>
                  <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-0.5">
                    {executionResult.failed}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <button
                  onClick={handleResetWizard}
                  className="px-4 py-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 text-xs font-bold text-foreground border border-border"
                >
                  Import Another File
                </button>
                {executionResult.skipped > 0 && (
                  <a
                    href={`/api/admin/import-export/error-report/${sessionId}`}
                    download
                    className="px-4 py-2.5 rounded-xl bg-rose-500 text-white hover:bg-rose-600 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Error Report
                  </a>
                )}
                <Link
                  href={
                    selectedType === "STUDENTS"
                      ? "/admin/students"
                      : selectedType === "TEACHERS"
                      ? "/admin/teachers"
                      : selectedType === "PARENTS"
                      ? "/admin/parents"
                      : selectedType === "CLASSES" || selectedType === "SECTIONS"
                      ? "/admin/academics/classes"
                      : "/admin/fees"
                  }
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 hover:opacity-95"
                >
                  View Records &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EXCEL EXPORT CENTER */}
      {/* ========================================================================= */}
      {activeTab === "EXPORT" && (
        <div className="space-y-6">
          {/* Export Filter Bar */}
          <div className="p-4 rounded-2xl bg-card border border-border shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <Filter className="w-4 h-4 text-primary" />
              <span>Contextual Export Filters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">
                  Academic Year
                </label>
                <select
                  value={exportFilters.academicYearId}
                  onChange={(e) => setExportFilters((prev) => ({ ...prev, academicYearId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium text-foreground"
                >
                  <option value="">All Academic Years</option>
                  {exportAcademicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Class</label>
                <select
                  value={exportFilters.classId}
                  onChange={(e) =>
                    setExportFilters((prev) => ({ ...prev, classId: e.target.value, sectionId: "" }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium text-foreground"
                >
                  <option value="">All Classes</option>
                  {exportClasses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Section</label>
                <select
                  value={exportFilters.sectionId}
                  disabled={!exportFilters.classId}
                  onChange={(e) => setExportFilters((prev) => ({ ...prev, sectionId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium text-foreground disabled:opacity-50"
                >
                  <option value="">All Sections</option>
                  {exportSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Status</label>
                <select
                  value={exportFilters.status}
                  onChange={(e) => setExportFilters((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium text-foreground"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active Only</option>
                  <option value="INACTIVE">Inactive Only</option>
                  <option value="TRANSFERRED">Transferred</option>
                </select>
              </div>
            </div>
          </div>

          {/* 7 Export Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                id: "students",
                title: "Students Master Export",
                desc: "Complete student directory with class, section, roll number, DOB, contacts, and status.",
                icon: Users,
              },
              {
                id: "teachers",
                title: "Teachers & Staff Directory",
                desc: "Faculty roster with employee IDs, departments, qualifications, and designations.",
                icon: User,
              },
              {
                id: "parents",
                title: "Parents & Guardians Roster",
                desc: "Guardian contact ledger with linked student admission references.",
                icon: ShieldCheck,
              },
              {
                id: "attendance",
                title: "Attendance Logs & Summary",
                desc: "Export section and student attendance logs according to applied filters.",
                icon: FileSpreadsheet,
              },
              {
                id: "fees",
                title: "Fee Collections & Receipts",
                desc: "Ledger of settled invoices, receipt numbers, payment modes, and transactions.",
                icon: CreditCard,
              },
              {
                id: "results",
                title: "Exam Results & Performance",
                desc: "Subject-wise marks, percentages, grades, and pass/fail diagnostics.",
                icon: Layers,
              },
              {
                id: "reports",
                title: "General Analytics Report",
                desc: "Analytical student distribution report formatted for administrative review.",
                icon: FileDown,
              },
            ].map((exp) => {
              const Icon = exp.icon;
              const isProcessing = exportingCategory === exp.id;
              return (
                <div
                  key={exp.id}
                  className="p-5 rounded-2xl bg-card border border-border shadow-xs hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase font-mono">.xlsx</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{exp.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{exp.desc}</p>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-border flex items-center justify-end">
                    <button
                      onClick={() => handleExportCategory(exp.id)}
                      disabled={isProcessing}
                      className="w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-md shadow-primary/25 hover:opacity-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Generating Export...
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          Export .xlsx
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: IMPORT HISTORY */}
      {/* ========================================================================= */}
      {activeTab === "HISTORY" && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-2 border-b border-border text-muted-foreground uppercase font-bold text-[10px] tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Import Date</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">File Name</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Total / Valid / Skipped</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {historyLoading ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                        Loading import history...
                      </td>
                    </tr>
                  ) : historySessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        No previous import sessions found.
                      </td>
                    </tr>
                  ) : (
                    historySessions.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-1/50 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">
                          {new Date(s.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-bold text-foreground">{s.type}</td>
                        <td className="px-4 py-3 text-muted-foreground font-mono truncate max-w-xs">
                          {s.fileName}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              s.status === "COMPLETED"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                : s.status === "FAILED"
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                                : "bg-primary/15 text-primary"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-muted-foreground">
                          <span className="font-bold text-foreground">{s.totalRows}</span> total /{" "}
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold">{s.importedRows || s.validRows}</span> ok /{" "}
                          <span className="text-rose-600 dark:text-rose-400 font-bold">{s.skippedRows || s.invalidRows}</span> skipped
                        </td>
                        <td className="px-4 py-3">
                          {s.hasErrors && (
                            <a
                              href={`/api/admin/import-export/error-report/${s.id}`}
                              download
                              className="text-rose-600 dark:text-rose-400 hover:underline font-bold text-xs flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5" /> Error Log
                            </a>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {historyTotalPages > 1 && (
              <div className="p-3 border-t border-border flex items-center justify-between">
                <button
                  disabled={historyPage <= 1}
                  onClick={() => setHistoryPage((p) => p - 1)}
                  className="px-3 py-1 rounded-xl bg-surface-2 border border-border text-xs font-bold disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-xs text-muted-foreground font-mono">
                  Page {historyPage} of {historyTotalPages}
                </span>
                <button
                  disabled={historyPage >= historyTotalPages}
                  onClick={() => setHistoryPage((p) => p + 1)}
                  className="px-3 py-1 rounded-xl bg-surface-2 border border-border text-xs font-bold disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
