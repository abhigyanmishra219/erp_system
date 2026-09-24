"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  CreditCard,
  DollarSign,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  FileText,
  Printer,
  ChevronRight,
  TrendingUp,
  Percent,
  Layers,
  Calendar,
  Building2,
  Tag,
  ArrowUpDown,
  FileCheck2,
  Sparkles,
  HelpCircle,
  X,
  ExternalLink,
} from "lucide-react";
import LockedModuleGate from "@/components/subscription/LockedModuleGate";

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

interface FeeCategoryItem {
  id: string;
  name: string;
  code: string;
  description: string;
  isActive: boolean;
  createdAt: string;
}

interface FeeStructureItem {
  id: string;
  name: string;
  description: string;
  academicYear: { id: string; name: string } | null;
  feeCategory: { id: string; name: string; code: string } | null;
  class: { id: string; name: string; code: string } | null;
  section: { id: string; name: string } | null;
  amount: number;
  frequency: string;
  installments: Array<{ name: string; amount: number; dueDate: string; sequence: number }>;
  assignedStudentsCount: number;
  isActive: boolean;
  createdAt: string;
}

interface StudentAccountItem {
  id: string;
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    rollNumber: string;
    class: { id: string; name: string; code: string } | null;
    section: { id: string; name: string } | null;
    photo?: string | null;
  };
  totalFee: number;
  discountAmount: number;
  concessionAmount: number;
  netFee: number;
  paidAmount: number;
  pendingAmount: number;
  lateFeeAmount: number;
  nextDueAmount: number;
  nextDueDate: string | null;
  status: "PAID" | "PARTIALLY_PAID" | "PENDING" | "OVERDUE";
  updatedAt: string;
}

interface PaymentItem {
  id: string;
  receiptNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionId: string;
  remarks: string;
  status: "ACTIVE" | "REVERSED";
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    rollNumber: string;
    class: { id: string; name: string } | null;
    section: { id: string; name: string } | null;
  } | null;
  recordedBy: { name: string; email: string } | null;
  createdAt: string;
}

interface FeeStats {
  totalAssigned: number;
  totalDiscount: number;
  totalConcession: number;
  totalNetFee: number;
  totalCollected: number;
  totalPending: number;
  totalOverdue: number;
  collectionRate: number;
  studentCount: number;
  paymentCount: number;
}

export default function AdminFeesPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "accounts" | "structures" | "payments" | "categories">("overview");

  // Filter state
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [selectedYearId, setSelectedYearId] = useState<string>("");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");

  // Data states
  const [stats, setStats] = useState<FeeStats | null>(null);
  const [accounts, setAccounts] = useState<StudentAccountItem[]>([]);
  const [structures, setStructures] = useState<FeeStructureItem[]>([]);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [categories, setCategories] = useState<FeeCategoryItem[]>([]);

  // Search & Filter within tabs
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [methodFilter, setMethodFilter] = useState<string>("ALL");
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);
  const [categoryFormData, setCategoryFormData] = useState({ name: "", code: "", description: "" });

  const [isStructureModalOpen, setIsStructureModalOpen] = useState<boolean>(false);
  const [structureFormData, setStructureFormData] = useState({
    name: "",
    description: "",
    feeCategoryId: "",
    academicYearId: "",
    classId: "",
    sectionId: "",
    amount: 0,
    frequency: "ANNUAL",
    installments: [] as Array<{ name: string; amount: number; dueDate: string; sequence: number }>,
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [selectedAccountForPayment, setSelectedAccountForPayment] = useState<StudentAccountItem | null>(null);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: 0,
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "CASH",
    transactionId: "",
    remarks: "",
  });
  const [paymentSuccessReceipt, setPaymentSuccessReceipt] = useState<{
    id: string;
    receiptNumber: string;
    studentName: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
  } | null>(null);

  // 1. Initial Metadata Load
  useEffect(() => {
    async function loadMeta() {
      try {
        const [yearsRes, classesRes, categoriesRes] = await Promise.all([
          fetch("/api/admin/academic-years"),
          fetch("/api/admin/classes"),
          fetch("/api/admin/fees/categories"),
        ]);

        const [yearsData, classesData, categoriesData] = await Promise.all([
          yearsRes.json(),
          classesRes.json(),
          categoriesRes.json(),
        ]);

        if (yearsData.success && yearsData.data) {
          const list: AcademicYear[] = yearsData.data.academicYears || (Array.isArray(yearsData.data) ? yearsData.data : []);
          setAcademicYears(list);
          const activeYear = list.find((y) => y.status === "ACTIVE") || list[0];
          if (activeYear) setSelectedYearId(activeYear.id);
        }

        if (classesData.success && classesData.data) {
          setClasses(classesData.data.classes || []);
        }

        if (categoriesData.success && categoriesData.data) {
          setCategories(categoriesData.data.categories || []);
        }
      } catch (err) {
        console.error("Failed to load metadata", err);
      }
    }
    loadMeta();
  }, []);

  // 2. Load Sections when Class changes
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

  // 3. Fetch Tab Data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setMessage(null);

    try {
      const yearQuery = selectedYearId ? `academicYearId=${selectedYearId}` : "";

      // Load Stats
      const statsRes = await fetch(`/api/admin/fees/stats?${yearQuery}`);
      const statsData = await statsRes.json();
      if (statsData.success) setStats(statsData.data);

      if (activeTab === "accounts" || activeTab === "overview") {
        const params = new URLSearchParams();
        if (selectedYearId) params.append("academicYearId", selectedYearId);
        if (selectedClassId) params.append("classId", selectedClassId);
        if (selectedSectionId) params.append("sectionId", selectedSectionId);
        if (statusFilter !== "ALL") params.append("status", statusFilter);
        if (searchQuery.trim()) params.append("search", searchQuery.trim());
        params.append("page", page.toString());
        params.append("limit", "20");

        const accRes = await fetch(`/api/admin/fees/students?${params.toString()}`);
        const accData = await accRes.json();
        if (accData.success && accData.data) {
          setAccounts(accData.data.accounts || []);
          setTotalPages(accData.data.pagination?.totalPages || 1);
        }
      }

      if (activeTab === "structures" || activeTab === "overview") {
        const params = new URLSearchParams();
        if (selectedYearId) params.append("academicYearId", selectedYearId);
        if (selectedClassId) params.append("classId", selectedClassId);

        const structRes = await fetch(`/api/admin/fees/structures?${params.toString()}`);
        const structData = await structRes.json();
        if (structData.success && structData.data) {
          setStructures(structData.data.structures || []);
        }
      }

      if (activeTab === "payments" || activeTab === "overview") {
        const params = new URLSearchParams();
        if (selectedYearId) params.append("academicYearId", selectedYearId);
        if (methodFilter !== "ALL") params.append("paymentMethod", methodFilter);
        if (searchQuery.trim()) params.append("search", searchQuery.trim());
        params.append("page", page.toString());
        params.append("limit", "20");

        const payRes = await fetch(`/api/admin/fees/payments?${params.toString()}`);
        const payData = await payRes.json();
        if (payData.success && payData.data) {
          setPayments(payData.data.payments || []);
        }
      }

      if (activeTab === "categories") {
        const catRes = await fetch("/api/admin/fees/categories");
        const catData = await catRes.json();
        if (catData.success && catData.data) {
          setCategories(catData.data.categories || []);
        }
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Failed to load fee data" });
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    selectedYearId,
    selectedClassId,
    selectedSectionId,
    statusFilter,
    methodFilter,
    searchQuery,
    page,
  ]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryFormData.name.trim() || !categoryFormData.code.trim()) return;

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/fees/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(categoryFormData),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Fee category created successfully." });
        setIsCategoryModalOpen(false);
        setCategoryFormData({ name: "", code: "", description: "" });
        await fetchData();
      } else {
        setMessage({ type: "error", text: data.error?.message || "Failed to create category" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error creating category" });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Create Fee Structure
  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!structureFormData.name.trim() || !structureFormData.feeCategoryId || !structureFormData.classId || structureFormData.amount <= 0) {
      setMessage({ type: "error", text: "Please fill in all required fields with valid amounts." });
      return;
    }

    setActionLoading(true);
    try {
      const payload: any = {
        name: structureFormData.name.trim(),
        description: structureFormData.description.trim(),
        feeCategoryId: structureFormData.feeCategoryId,
        academicYearId: selectedYearId,
        classId: structureFormData.classId,
        sectionId: structureFormData.sectionId || null,
        amount: Number(structureFormData.amount),
        frequency: structureFormData.frequency,
      };

      if (structureFormData.frequency === "INSTALLMENT") {
        payload.installments = structureFormData.installments;
      }

      const res = await fetch("/api/admin/fees/structures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Fee structure configured successfully." });
        setIsStructureModalOpen(false);
        setStructureFormData({
          name: "",
          description: "",
          feeCategoryId: "",
          academicYearId: "",
          classId: "",
          sectionId: "",
          amount: 0,
          frequency: "ANNUAL",
          installments: [],
        });
        await fetchData();
      } else {
        setMessage({ type: "error", text: data.error?.message || "Failed to create fee structure" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error creating fee structure" });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Payment Modal
  const openRecordPaymentModal = (account: StudentAccountItem) => {
    setSelectedAccountForPayment(account);
    setPaymentFormData({
      amount: account.nextDueAmount > 0 ? account.nextDueAmount : account.pendingAmount,
      paymentDate: new Date().toISOString().split("T")[0],
      paymentMethod: "CASH",
      transactionId: "",
      remarks: "",
    });
    setPaymentSuccessReceipt(null);
    setIsPaymentModalOpen(true);
  };

  // Submit Manual Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountForPayment || paymentFormData.amount <= 0) return;

    if (paymentFormData.amount > selectedAccountForPayment.pendingAmount) {
      setMessage({
        type: "error",
        text: `Payment amount (₹${paymentFormData.amount}) cannot exceed pending balance (₹${selectedAccountForPayment.pendingAmount}).`,
      });
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch("/api/admin/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          academicYearId: selectedYearId,
          studentId: selectedAccountForPayment.student.id,
          feeAccountId: selectedAccountForPayment.id,
          amount: Number(paymentFormData.amount),
          paymentDate: paymentFormData.paymentDate,
          paymentMethod: paymentFormData.paymentMethod,
          transactionId: paymentFormData.transactionId.trim(),
          remarks: paymentFormData.remarks.trim(),
        }),
      });

      const data = await res.json();
      if (data.success && data.data?.payment) {
        setMessage({
          type: "success",
          text: `Payment recorded successfully. Receipt generated: ${data.data.payment.receiptNumber}`,
        });
        setPaymentSuccessReceipt({
          id: data.data.payment.id,
          receiptNumber: data.data.payment.receiptNumber,
          studentName: selectedAccountForPayment.student.name,
          amount: data.data.payment.amount,
          paymentDate: data.data.payment.paymentDate,
          paymentMethod: data.data.payment.paymentMethod,
        });
        await fetchData();
      } else {
        setMessage({ type: "error", text: data.error?.message || "Failed to record payment" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error recording payment" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <LockedModuleGate moduleKey="FEES">
      <div className="space-y-6 pb-16">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Fee Management
              </h1>
              <p className="text-sm text-muted-foreground">
                Configure fee structures, track student accounts, record payments, and generate official receipts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/admin/fees/assign"
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Assign Fees</span>
          </Link>

          <button
            onClick={() => setIsStructureModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg border border-border bg-card hover:bg-accent text-foreground transition-colors shadow-xs"
          >
            <Layers className="h-4 w-4 text-primary" />
            <span>New Structure</span>
          </button>
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

      {/* Top Filter Bar */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Academic Session */}
          <div className="w-full sm:w-56">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Academic Session
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => {
                setSelectedYearId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary font-medium"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.status === "ACTIVE" ? "(Active)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div className="w-full sm:w-48">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSectionId("");
                setPage(1);
              }}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.code ? `(${c.code})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div className="w-full sm:w-40">
            <label className="block text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
              Section
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => {
                setSelectedSectionId(e.target.value);
                setPage(1);
              }}
              disabled={!selectedClassId}
              className="w-full px-3 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="">All Sections</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  Section {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border hover:bg-accent text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Net Fee</span>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-foreground">
            ₹{(stats?.totalNetFee || 0).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Gross: ₹{(stats?.totalAssigned || 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Collected</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            ₹{(stats?.totalCollected || 0).toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            <span>{stats?.collectionRate || 0}% collection rate</span>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Dues</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            ₹{(stats?.totalPending || 0).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Across {stats?.studentCount || 0} student accounts
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Overdue Dues</span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            ₹{(stats?.totalOverdue || 0).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Passed installment due date
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-border">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: "overview", label: "Overview & Dashboard", icon: TrendingUp },
            { id: "accounts", label: `Student Accounts (${accounts.length})`, icon: Users },
            { id: "structures", label: `Fee Structures (${structures.length})`, icon: Layers },
            { id: "payments", label: `Payment Ledger (${payments.length})`, icon: CreditCard },
            { id: "categories", label: `Categories (${categories.length})`, icon: Tag },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as typeof activeTab);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content 1: Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Actions & Recent Accounts */}
            <div className="bg-card border border-border rounded-xl shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Recent Fee Accounts</span>
                </h3>
                <button
                  onClick={() => setActiveTab("accounts")}
                  className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
                >
                  <span>View All</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {accounts.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <p className="text-sm">No student fee accounts assigned yet for this session.</p>
                  <Link
                    href="/admin/fees/assign"
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Assign Fees to Class
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {accounts.slice(0, 5).map((acc) => (
                    <div key={acc.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm text-foreground">{acc.student.name}</div>
                        <div className="text-xs text-muted-foreground">
                          Adm: {acc.student.admissionNumber} • {acc.student.class?.name || "N/A"}{" "}
                          {acc.student.section ? `- ${acc.student.section.name}` : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <div className="text-sm font-bold text-foreground">
                            ₹{acc.paidAmount.toLocaleString()} / ₹{acc.netFee.toLocaleString()}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Pending: ₹{acc.pendingAmount.toLocaleString()}
                          </div>
                        </div>

                        <button
                          onClick={() => openRecordPaymentModal(acc)}
                          disabled={acc.pendingAmount <= 0}
                          className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-40"
                        >
                          Collect
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Side Column: Quick Shortcuts & Categories */}
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl shadow-xs p-5 space-y-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2.5">
                <Sparkles className="h-4 w-4 text-emerald-500" />
                <span>Quick Operations</span>
              </h3>
              <div className="space-y-2">
                <Link
                  href="/admin/fees/assign"
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors text-sm font-medium text-foreground"
                >
                  <div className="flex items-center gap-2.5">
                    <Users className="h-4 w-4 text-primary" />
                    <span>Assign Fees to Students</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>

                <button
                  onClick={() => setIsStructureModalOpen(true)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors text-sm font-medium text-foreground text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Layers className="h-4 w-4 text-primary" />
                    <span>Create Fee Structure</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>

                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent transition-colors text-sm font-medium text-foreground text-left cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Tag className="h-4 w-4 text-primary" />
                    <span>Add Fee Category</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Fee Categories Widget */}
            <div className="bg-card border border-border rounded-xl shadow-xs p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <h3 className="text-sm font-bold text-foreground">Fee Categories</h3>
                <button
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  + Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => (
                  <span
                    key={c.id}
                    className="px-2.5 py-1 rounded-md text-xs font-medium bg-muted border border-border text-foreground"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Content 2: Student Accounts */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search student name or roll..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Account Statuses</option>
                <option value="PAID">Fully Paid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PENDING">Pending (Not Started)</option>
                <option value="OVERDUE">Overdue Dues</option>
              </select>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <RefreshCw className="h-7 w-7 animate-spin text-primary" />
                <p className="text-sm">Loading student fee accounts...</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground space-y-3">
                <Users className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-base font-semibold text-foreground">No Student Fee Accounts Found</p>
                <p className="text-xs max-w-sm mx-auto">
                  No student fee accounts matched your filter criteria. Use &quot;Assign Fees&quot; to apply fee structures to students.
                </p>
                <Link
                  href="/admin/fees/assign"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Assign Fees
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Class / Section</th>
                      <th className="py-3 px-4 text-center">Net Fee</th>
                      <th className="py-3 px-4 text-center">Paid Amount</th>
                      <th className="py-3 px-4 text-center">Pending Dues</th>
                      <th className="py-3 px-4 text-center">Next Due</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {accounts.map((acc) => (
                      <tr key={acc.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-foreground">{acc.student.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Adm: {acc.student.admissionNumber} {acc.student.rollNumber ? `• Roll: ${acc.student.rollNumber}` : ""}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-muted-foreground">
                          <span className="font-medium text-foreground">{acc.student.class?.name || "N/A"}</span>
                          {acc.student.section && (
                            <span className="ml-1 text-xs px-2 py-0.5 rounded-md bg-muted border border-border">
                              {acc.student.section.name}
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center font-semibold text-foreground">
                          ₹{acc.netFee.toLocaleString()}
                          {(acc.discountAmount > 0 || acc.concessionAmount > 0) && (
                            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                              -₹{(acc.discountAmount + acc.concessionAmount).toLocaleString()} off
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{acc.paidAmount.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-amber-600 dark:text-amber-400">
                          ₹{acc.pendingAmount.toLocaleString()}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {acc.nextDueAmount > 0 ? (
                            <div>
                              <div className="font-semibold text-foreground">₹{acc.nextDueAmount.toLocaleString()}</div>
                              {acc.nextDueDate && (
                                <div className="text-[10px] text-muted-foreground">
                                  Due: {new Date(acc.nextDueDate).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              acc.status === "PAID"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : acc.status === "PARTIALLY_PAID"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : acc.status === "OVERDUE"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            }`}
                          >
                            {acc.status.replace("_", " ")}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/students/${acc.student.id}`}
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                              title="View Student Profile"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Link>

                            <button
                              onClick={() => openRecordPaymentModal(acc)}
                              disabled={acc.pendingAmount <= 0}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs disabled:opacity-40 cursor-pointer"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              <span>Record Payment</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 3: Fee Structures */}
      {activeTab === "structures" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-foreground">Configured Fee Structures</h3>
            <button
              onClick={() => setIsStructureModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>New Structure</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {structures.length === 0 ? (
              <div className="col-span-full py-16 text-center text-muted-foreground bg-card border border-border rounded-xl">
                <Layers className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                <p className="font-semibold text-foreground">No fee structures created yet.</p>
                <p className="text-xs mt-1">Create tuition, annual, or transport fee structures for your classes.</p>
              </div>
            ) : (
              structures.map((s) => (
                <div key={s.id} className="bg-card border border-border rounded-xl p-5 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                        {s.feeCategory?.name || "General"}
                      </span>
                      <h4 className="text-base font-bold text-foreground mt-1">{s.name}</h4>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-foreground">₹{s.amount.toLocaleString()}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">{s.frequency.toLowerCase()}</div>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground space-y-1 border-t border-border pt-2.5">
                    <div>
                      <span className="font-medium text-foreground">Class:</span> {s.class?.name || "All Classes"}{" "}
                      {s.section ? `(Section ${s.section.name})` : "(All Sections)"}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Assigned Students:</span> {s.assignedStudentsCount}
                    </div>
                  </div>

                  {s.installments && s.installments.length > 0 && (
                    <div className="text-xs bg-muted/40 p-2.5 rounded-lg border border-border space-y-1">
                      <div className="font-semibold text-foreground text-[11px]">Installments:</div>
                      {s.installments.map((inst, idx) => (
                        <div key={idx} className="flex justify-between text-muted-foreground text-[11px]">
                          <span>{inst.name}</span>
                          <span>₹{inst.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-border flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        s.isActive
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                    <Link
                      href={`/admin/fees/assign`}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Assign to Students →
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab Content 4: Payment Ledger */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search receipt number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-input bg-background focus:outline-hidden focus:ring-2 focus:ring-primary"
              >
                <option value="ALL">All Payment Methods</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="UPI">UPI</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
            {loading ? (
              <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                <RefreshCw className="h-7 w-7 animate-spin text-primary" />
                <p className="text-sm">Loading payment records...</p>
              </div>
            ) : payments.length === 0 ? (
              <div className="py-20 text-center text-muted-foreground space-y-2">
                <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/40" />
                <p className="text-base font-semibold text-foreground">No Payments Recorded Yet</p>
                <p className="text-xs max-w-sm mx-auto">
                  When manual fees are collected, payments and generated receipts will appear in this ledger.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <th className="py-3 px-4">Receipt No</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Class</th>
                      <th className="py-3 px-4 text-center">Amount</th>
                      <th className="py-3 px-4 text-center">Method</th>
                      <th className="py-3 px-4">Recorded By</th>
                      <th className="py-3 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-sm">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-primary">
                          {p.receiptNumber}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-foreground">
                          {p.student?.name || "Student"}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground">
                          {p.student?.class?.name || "N/A"}{" "}
                          {p.student?.section ? `(${p.student.section.name})` : ""}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                          ₹{p.amount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-muted border border-border">
                            {p.paymentMethod.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-muted-foreground">
                          {p.recordedBy?.name || "Administrator"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link
                            href={`/admin/fees/receipts/${p.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                          >
                            <FileText className="h-3.5 w-3.5" />
                            <span>Receipt</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 5: Categories */}
      {activeTab === "categories" && (
        <div className="space-y-4 max-w-4xl">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold text-foreground">Fee Categories</h3>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="bg-card border border-border rounded-xl shadow-xs divide-y divide-border">
            {categories.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{c.name}</span>
                    <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {c.code}
                    </span>
                  </div>
                  {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                </div>

                <div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      c.isActive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {c.isActive ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal 1: Record Manual Payment */}
      {isPaymentModalOpen && selectedAccountForPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold text-foreground">Record Fee Payment</h3>
                <p className="text-xs text-muted-foreground">
                  Collect manual payment for {selectedAccountForPayment.student.name}
                </p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {paymentSuccessReceipt ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-foreground">Payment Successfully Recorded</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Receipt Generated: <span className="font-mono font-bold text-primary">{paymentSuccessReceipt.receiptNumber}</span>
                  </p>
                  <p className="text-sm font-semibold text-foreground mt-2">
                    Amount: ₹{paymentSuccessReceipt.amount.toLocaleString()} ({paymentSuccessReceipt.paymentMethod})
                  </p>
                </div>

                <div className="flex items-center justify-center gap-3 pt-2">
                  <Link
                    href={`/admin/fees/receipts/${paymentSuccessReceipt.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                  >
                    <FileText className="h-4 w-4" />
                    <span>View & Print Receipt</span>
                  </Link>
                  <button
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleRecordPayment} className="space-y-4">
                {/* Account Summary Banner */}
                <div className="p-3 bg-muted/40 border border-border rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Net Fee:</span>
                    <span className="font-semibold text-foreground">₹{selectedAccountForPayment.netFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Already Paid:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      ₹{selectedAccountForPayment.paidAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1 font-bold">
                    <span>Outstanding Balance:</span>
                    <span className="text-amber-600 dark:text-amber-400">
                      ₹{selectedAccountForPayment.pendingAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Payment Amount (₹) <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={selectedAccountForPayment.pendingAmount}
                      required
                      value={paymentFormData.amount || ""}
                      onChange={(e) =>
                        setPaymentFormData({ ...paymentFormData, amount: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary font-bold text-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Payment Date <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={paymentFormData.paymentDate}
                        onChange={(e) =>
                          setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Payment Method <span className="text-destructive">*</span>
                      </label>
                      <select
                        value={paymentFormData.paymentMethod}
                        onChange={(e) =>
                          setPaymentFormData({ ...paymentFormData, paymentMethod: e.target.value })
                        }
                        className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary"
                      >
                        <option value="CASH">Cash</option>
                        <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                        <option value="CHEQUE">Cheque</option>
                        <option value="UPI">UPI (Manual Record)</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Transaction / Reference ID (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UTR / Cheque No / Reference"
                      value={paymentFormData.transactionId}
                      onChange={(e) =>
                        setPaymentFormData({ ...paymentFormData, transactionId: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Remarks / Notes (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Quarter 1 tuition fee"
                      value={paymentFormData.remarks}
                      onChange={(e) =>
                        setPaymentFormData({ ...paymentFormData, remarks: e.target.value })
                      }
                      className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-accent transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading || paymentFormData.amount <= 0}
                    className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-xs disabled:opacity-50"
                  >
                    {actionLoading ? "Processing..." : "Confirm & Generate Receipt"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal 2: Create Fee Category */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 animate-in fade-in-50 zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Create Fee Category</h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Category Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tuition Fee, Transport Fee"
                  value={categoryFormData.name}
                  onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Category Code <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TUITION, TRANSPORT"
                  value={categoryFormData.code}
                  onChange={(e) =>
                    setCategoryFormData({ ...categoryFormData, code: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief explanation of the fee category..."
                  value={categoryFormData.description}
                  onChange={(e) =>
                    setCategoryFormData({ ...categoryFormData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? "Creating..." : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Create Fee Structure */}
      {isStructureModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-4 animate-in fade-in-50 zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-lg font-bold text-foreground">Configure Fee Structure</h3>
              <button
                onClick={() => setIsStructureModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStructure} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Structure Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Class 1 Annual Tuition 2026-27"
                  value={structureFormData.name}
                  onChange={(e) => setStructureFormData({ ...structureFormData, name: e.target.value })}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Fee Category <span className="text-destructive">*</span>
                  </label>
                  <select
                    required
                    value={structureFormData.feeCategoryId}
                    onChange={(e) =>
                      setStructureFormData({ ...structureFormData, feeCategoryId: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Payment Frequency <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={structureFormData.frequency}
                    onChange={(e) =>
                      setStructureFormData({ ...structureFormData, frequency: e.target.value })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary"
                  >
                    <option value="ANNUAL">Annual (1 Time)</option>
                    <option value="MONTHLY">Monthly (12 Parts)</option>
                    <option value="QUARTERLY">Quarterly (4 Parts)</option>
                    <option value="HALF_YEARLY">Half Yearly (2 Parts)</option>
                    <option value="INSTALLMENT">Custom Installments</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Applicable Class <span className="text-destructive">*</span>
                  </label>
                  <select
                    required
                    value={structureFormData.classId}
                    onChange={(e) =>
                      setStructureFormData({
                        ...structureFormData,
                        classId: e.target.value,
                        sectionId: "",
                      })
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary"
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
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Applicable Section (Optional)
                  </label>
                  <select
                    value={structureFormData.sectionId}
                    onChange={(e) =>
                      setStructureFormData({ ...structureFormData, sectionId: e.target.value })
                    }
                    disabled={!structureFormData.classId}
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
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Base Fee Amount (₹) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 24000"
                  value={structureFormData.amount || ""}
                  onChange={(e) =>
                    setStructureFormData({ ...structureFormData, amount: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Extra details about this fee structure..."
                  value={structureFormData.description}
                  onChange={(e) =>
                    setStructureFormData({ ...structureFormData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-input bg-background focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsStructureModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-border hover:bg-accent transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Fee Structure"}
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
