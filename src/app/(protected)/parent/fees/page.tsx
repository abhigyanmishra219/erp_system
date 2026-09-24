"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParentChild } from "@/context/ParentChildContext";
import ChildSwitcher from "../components/ChildSwitcher";
import {
  CreditCard,
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  DollarSign,
  Download,
  Printer,
  X,
  FileText,
  ShieldAlert,
  Copy,
  Check,
  Building2,
  Info,
  ChevronRight,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Award,
  BookOpen,
} from "lucide-react";

interface FeeSummary {
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
  academicYearName: string;
}

interface PaymentRecord {
  _id: string;
  receiptNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  transactionId: string;
  remarks: string;
  status: string;
  createdAt: string;
}

interface Installment {
  name: string;
  amount: number;
  dueDate: string;
  sequence: number;
  paidAmount: number;
  status: "PAID" | "PARTIALLY_PAID" | "UNPAID";
}

interface FeeAssignment {
  _id: string;
  feeStructureName: string;
  feeStructureCode: string;
  category: string;
  baseAmount: number;
  discountType: string;
  discountValue: number;
  discountAmount: number;
  concessionReason: string;
  concessionType: string;
  concessionValue: number;
  concessionAmount: number;
  netAmount: number;
  dueSchedule: Installment[];
}

interface StudentInfo {
  _id: string;
  name: string;
  admissionNumber: string;
  rollNumber: string;
  class: string;
  section: string;
}

interface FeeDataResponse {
  student: StudentInfo;
  summary: FeeSummary;
  payments: PaymentRecord[];
  assignments: FeeAssignment[];
  school: {
    name: string;
    currency: string;
  };
}

interface ReceiptDetails {
  receipt: {
    id: string;
    receiptNumber: string;
    paymentDate: string;
    paymentMethod: string;
    transactionId: string;
    amount: number;
    amountInWords: string;
    remarks: string;
    status: string;
    recordedBy: string;
    createdAt: string;
  };
  school: {
    name: string;
    address: string;
    city: string;
    state: string;
    phone: string;
    email: string;
    website: string;
    logo: string;
  };
  student: {
    id: string;
    name: string;
    admissionNumber: string;
    rollNumber: string;
    class: string;
    section: string;
  };
  academicYear: string;
  accountBalance: {
    totalFee: number;
    netFee: number;
    paidAmount: number;
    pendingAmount: number;
    status: string;
  } | null;
}

export default function ParentFeesPage() {
  const { children, selectedChild, selectedChildId, isLoading: isChildrenLoading } = useParentChild();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feeData, setFeeData] = useState<FeeDataResponse | null>(null);
  const [isModuleEnabled, setIsModuleEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<"history" | "breakdown">("history");

  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptDetails | null>(null);
  const [loadingReceipt, setLoadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const fetchFees = useCallback(async (studentId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/parent/fees?studentId=${studentId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || "Failed to load fee information");
      }

      if (json.isEnabled === false) {
        setIsModuleEnabled(false);
        setFeeData(null);
        return;
      }

      setIsModuleEnabled(true);
      setFeeData(json.data || null);
    } catch (err: any) {
      console.error("Error loading parent fees:", err);
      setError(err.message || "Failed to load fee details");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedChildId) {
      fetchFees(selectedChildId);
    }
  }, [selectedChildId, fetchFees]);

  const handleOpenReceipt = async (paymentId: string) => {
    if (!selectedChildId) return;
    try {
      setLoadingReceipt(true);
      setReceiptError(null);
      setSelectedReceipt(null);

      const res = await fetch(
        `/api/parent/fees/receipts/${paymentId}?studentId=${selectedChildId}`
      );
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.message || "Failed to fetch receipt");
      }

      setSelectedReceipt(json.data);
    } catch (err: any) {
      console.error("Error fetching receipt:", err);
      setReceiptError(err.message || "Could not load receipt");
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "N/A";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Fully Paid
          </span>
        );
      case "PARTIALLY_PAID":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            Partially Paid
          </span>
        );
      case "OVERDUE":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Payment Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Payment Pending
          </span>
        );
    }
  };

  // Module Disabled State
  if (!loading && !isModuleEnabled) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fee Management</h1>
            <p className="text-slate-500 text-sm mt-0.5">Parent financial overview and receipts</p>
          </div>
          <ChildSwitcher />
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-2xl mx-auto shadow-sm">
          <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Fee Module Not Enabled</h2>
          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            The online fee management portal is currently not activated for your institution. For any fee inquiries or offline payment details, please contact the school administration desk.
          </p>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 text-left">
            <span className="font-semibold text-slate-700 block mb-1">Administrative Note:</span>
            School administration can enable the Fee module via School Settings &gt; Module Management.
          </div>
        </div>
      </div>
    );
  }

  const summary = feeData?.summary;
  const payments = feeData?.payments || [];
  const assignments = feeData?.assignments || [];
  const student = feeData?.student;

  const paidPercentage =
    summary && summary.netFee > 0
      ? Math.min(100, Math.round((summary.paidAmount / summary.netFee) * 100))
      : 0;

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header & Child Switcher */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <CreditCard className="h-4 w-4" />
            <span>Financial Accounts</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Fee Management</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Monitor fees, payment history, installments, and download official receipts for your child.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <ChildSwitcher />
          {selectedChildId && (
            <button
              onClick={() => fetchFees(selectedChildId)}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* No Children Guard */}
      {!isChildrenLoading && (!children || children.length === 0) && (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No Linked Students Found</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Your parent account is not currently linked to any active student records in the school system.
          </p>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 h-32" />
          ))}
        </div>
      )}

      {/* Error Alert */}
      {!loading && error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Main Content Area */}
      {!loading && !error && selectedChildId && summary && (
        <>
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Net Fee */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-indigo-200 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Net Fee</p>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">
                    {formatCurrency(summary.netFee)}
                  </h3>
                </div>
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Base: {formatCurrency(summary.totalFee)}</span>
                {summary.discountAmount + summary.concessionAmount > 0 && (
                  <span className="text-emerald-600 font-medium">
                    -{formatCurrency(summary.discountAmount + summary.concessionAmount)} saved
                  </span>
                )}
              </div>
            </div>

            {/* Paid Amount */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-200 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Paid</p>
                  <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                    {formatCurrency(summary.paidAmount)}
                  </h3>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                  <span>Settled</span>
                  <span className="font-semibold text-slate-700">{paidPercentage}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${paidPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Pending Amount */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-amber-200 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Balance</p>
                  <h3 className="text-2xl font-bold text-amber-600 mt-1">
                    {formatCurrency(summary.pendingAmount)}
                  </h3>
                </div>
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-slate-500">Status:</span>
                {getStatusBadge(summary.status)}
              </div>
            </div>

            {/* Next Due Date */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Next Due Date</p>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">
                    {summary.nextDueDate ? formatDate(summary.nextDueDate) : "No Due Pending"}
                  </h3>
                </div>
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>Due Amount:</span>
                <span className="font-bold text-slate-800">
                  {summary.nextDueAmount > 0 ? formatCurrency(summary.nextDueAmount) : "₹0"}
                </span>
              </div>
            </div>
          </div>

          {/* Online Payment Notice */}
          <div className="bg-gradient-to-r from-indigo-50/80 via-blue-50/60 to-slate-50 p-4 rounded-2xl border border-indigo-100 flex items-start gap-3">
            <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 leading-relaxed">
              <span className="font-bold text-indigo-900 block mb-0.5">
                School Payment Settlement Advisory
              </span>
              Online fee payment integration will be available in future releases. To make fee payments, submit cheques, or settle dues, please visit the school accounts office directly.
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
            <button
              onClick={() => setActiveTab("history")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === "history"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <Receipt className="h-4 w-4" />
              <span>Payment History &amp; Receipts</span>
              <span
                className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === "history" ? "bg-indigo-700 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {payments.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("breakdown")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all ${
                activeTab === "breakdown"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              <span>Fee Structure &amp; Installments</span>
              <span
                className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                  activeTab === "breakdown" ? "bg-indigo-700 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {assignments.length}
              </span>
            </button>
          </div>

          {/* TAB 1: PAYMENT HISTORY & RECEIPTS */}
          {activeTab === "history" && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">Recorded Payment Transactions</h3>
                  <p className="text-xs text-slate-500">
                    Official ledger of all verified fee receipts issued to {student?.name || "your child"}.
                  </p>
                </div>
              </div>

              {payments.length === 0 ? (
                <div className="p-12 text-center">
                  <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-slate-700 mb-1">No Payments Recorded</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No payment transactions have been logged yet for this academic period.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-semibold">
                        <th className="p-4 pl-6">Receipt No.</th>
                        <th className="p-4">Payment Date</th>
                        <th className="p-4">Amount Paid</th>
                        <th className="p-4">Payment Mode</th>
                        <th className="p-4">Transaction / Reference</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 pr-6 text-right">Receipt Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => (
                        <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 pl-6 font-bold text-slate-900 font-mono">
                            {p.receiptNumber}
                          </td>
                          <td className="p-4 text-slate-600">{formatDate(p.paymentDate)}</td>
                          <td className="p-4 font-bold text-emerald-700 text-sm">
                            {formatCurrency(p.amount)}
                          </td>
                          <td className="p-4">
                            <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 font-medium">
                              {p.paymentMethod.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="p-4 text-slate-500 font-mono text-[11px]">
                            {p.transactionId || "—"}
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" />
                              VERIFIED
                            </span>
                          </td>
                          <td className="p-4 pr-6 text-right">
                            <button
                              onClick={() => handleOpenReceipt(p._id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: FEE STRUCTURE BREAKDOWN */}
          {activeTab === "breakdown" && (
            <div className="space-y-6">
              {assignments.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <h4 className="text-base font-bold text-slate-700 mb-1">No Fee Structure Assigned</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    No fee structure is currently assigned for this academic session.
                  </p>
                </div>
              ) : (
                assignments.map((a) => (
                  <div
                    key={a._id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                  >
                    <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base">{a.feeStructureName}</h3>
                          {a.feeStructureCode && (
                            <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[11px] font-mono">
                              {a.feeStructureCode}
                            </span>
                          )}
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[11px] font-semibold">
                            {a.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Base Amount: {formatCurrency(a.baseAmount)} • Net Amount: {formatCurrency(a.netAmount)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <p className="text-xs text-slate-400 uppercase font-semibold">Net Payable</p>
                          <p className="text-xl font-black text-indigo-700">{formatCurrency(a.netAmount)}</p>
                        </div>
                      </div>
                    </div>

                    {/* Installments Table */}
                    <div className="p-5">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                        Installment Schedule
                      </h4>
                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-slate-600 uppercase font-semibold border-b border-slate-200">
                              <th className="p-3 pl-4">Installment</th>
                              <th className="p-3">Due Date</th>
                              <th className="p-3">Amount</th>
                              <th className="p-3">Paid Amount</th>
                              <th className="p-3 pr-4">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {a.dueSchedule.map((inst, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="p-3 pl-4 font-semibold text-slate-900">{inst.name}</td>
                                <td className="p-3 text-slate-600">{formatDate(inst.dueDate)}</td>
                                <td className="p-3 font-bold text-slate-800">
                                  {formatCurrency(inst.amount)}
                                </td>
                                <td className="p-3 font-semibold text-emerald-700">
                                  {formatCurrency(inst.paidAmount)}
                                </td>
                                <td className="p-3 pr-4">
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                      inst.status === "PAID"
                                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                        : inst.status === "PARTIALLY_PAID"
                                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                                        : "bg-amber-50 text-amber-700 border border-amber-200"
                                    }`}
                                  >
                                    {inst.status.replace(/_/g, " ")}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* RECEIPT MODAL VIEWER */}
      {(selectedReceipt || loadingReceipt) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <Receipt className="h-5 w-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-lg">Official Fee Receipt</h3>
              </div>
              <div className="flex items-center gap-2">
                {selectedReceipt && (
                  <button
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Print Receipt</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {loadingReceipt && (
              <div className="p-12 text-center">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Loading official receipt...</p>
              </div>
            )}

            {selectedReceipt && (
              <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto" ref={printRef}>
                {/* School Header */}
                <div className="text-center border-b border-slate-200 pb-5">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-tight">
                    {selectedReceipt.school.name}
                  </h2>
                  <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center justify-center gap-2">
                    {selectedReceipt.school.address && <span>{selectedReceipt.school.address}</span>}
                    {selectedReceipt.school.phone && <span>• Tel: {selectedReceipt.school.phone}</span>}
                    {selectedReceipt.school.email && <span>• Email: {selectedReceipt.school.email}</span>}
                  </div>
                  <div className="mt-3 inline-block px-3 py-1 bg-slate-900 text-white font-bold text-xs rounded-full uppercase tracking-wider">
                    Official Fee Payment Receipt
                  </div>
                </div>

                {/* Receipt Meta & Student Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                    <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">
                      Receipt Details
                    </p>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Receipt No:</span>
                      <span className="font-bold text-slate-900 font-mono">
                        {selectedReceipt.receipt.receiptNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Payment Date:</span>
                      <span className="font-semibold text-slate-800">
                        {formatDate(selectedReceipt.receipt.paymentDate)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Payment Mode:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedReceipt.receipt.paymentMethod.replace(/_/g, " ")}
                      </span>
                    </div>
                    {selectedReceipt.receipt.transactionId && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Transaction ID:</span>
                        <span className="font-mono text-slate-800">
                          {selectedReceipt.receipt.transactionId}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
                    <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">
                      Student Details
                    </p>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Student Name:</span>
                      <span className="font-bold text-slate-900">{selectedReceipt.student.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Admission No:</span>
                      <span className="font-bold text-slate-900">
                        {selectedReceipt.student.admissionNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Class &amp; Section:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedReceipt.student.class} - {selectedReceipt.student.section}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Academic Year:</span>
                      <span className="font-semibold text-slate-800">
                        {selectedReceipt.academicYear}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Payment Amount Box */}
                <div className="bg-emerald-50/80 p-5 rounded-xl border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                      Amount Paid
                    </span>
                    <h3 className="text-2xl font-black text-emerald-700 mt-0.5">
                      {formatCurrency(selectedReceipt.receipt.amount)}
                    </h3>
                    <p className="text-xs text-emerald-900 font-medium italic mt-1">
                      ({selectedReceipt.receipt.amountInWords})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-sm">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      PAYMENT RECEIVED
                    </span>
                  </div>
                </div>

                {/* Account Balance Summary */}
                {selectedReceipt.accountBalance && (
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <span className="text-slate-400 block">Total Net Fee</span>
                      <span className="font-bold text-slate-800">
                        {formatCurrency(selectedReceipt.accountBalance.netFee)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Cumulative Paid</span>
                      <span className="font-bold text-emerald-600">
                        {formatCurrency(selectedReceipt.accountBalance.paidAmount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block">Balance Pending</span>
                      <span className="font-bold text-amber-600">
                        {formatCurrency(selectedReceipt.accountBalance.pendingAmount)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Footer Signatures */}
                <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
                  <span>Issued By: {selectedReceipt.receipt.recordedBy}</span>
                  <span>System Generated Document</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
