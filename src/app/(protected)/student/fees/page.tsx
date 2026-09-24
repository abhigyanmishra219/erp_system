"use client";

import React, { useState, useEffect, useRef } from "react";
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

interface FeeDataResponse {
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

export default function StudentFeesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [feeData, setFeeData] = useState<FeeDataResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"payments" | "structures">("payments");

  // Receipt Modal State
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptDetails | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  const [copiedTxn, setCopiedTxn] = useState<string | null>(null);

  const receiptPrintRef = useRef<HTMLDivElement>(null);

  const fetchFeeData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/student/fees");
      let json: any = null;
      try {
        json = await res.json();
      } catch {
        throw new Error(res.statusText || `Server returned ${res.status}`);
      }

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load fee information");
      }

      if (json.isEnabled === false) {
        setIsEnabled(false);
        setFeeData(null);
      } else {
        setIsEnabled(true);
        setFeeData(json.data);
      }
    } catch (err: any) {
      console.error("Error fetching fees:", err);
      setError(err.message || "Failed to load fee overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeData();
  }, []);

  const handleViewReceipt = async (paymentId: string) => {
    try {
      setReceiptLoading(true);
      setReceiptError(null);
      const res = await fetch(`/api/student/fees/receipts/${paymentId}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load receipt details");
      }

      setSelectedReceipt(json.data);
    } catch (err: any) {
      console.error("Failed to load receipt:", err);
      setReceiptError(err.message || "Could not retrieve receipt");
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleCopyTransaction = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTxn(text);
    setTimeout(() => setCopiedTxn(null), 2000);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateStr?: string | Date | null) => {
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
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Paid in Full
          </span>
        );
      case "PARTIALLY_PAID":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-500 border border-blue-500/20">
            <Clock className="w-3.5 h-3.5" />
            Partially Paid
          </span>
        );
      case "OVERDUE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-500 border border-rose-500/20">
            <AlertCircle className="w-3.5 h-3.5" />
            Overdue
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20">
            <Clock className="w-3.5 h-3.5" />
            Payment Pending
          </span>
        );
    }
  };

  const getPaymentMethodBadge = (method: string) => {
    const methodClean = method.replace("_", " ");
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-surface-2 text-foreground border border-border">
        {methodClean}
      </span>
    );
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-9 h-9 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground font-medium">Loading your fee summary & receipts...</p>
      </div>
    );
  }

  // 2. Feature Flag Disabled State
  if (!isEnabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Fee Account</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Student fee statements, payment logs, and official receipts.
          </p>
        </div>

        <div className="p-8 sm:p-12 rounded-3xl bg-card border border-border text-center space-y-4 max-w-2xl mx-auto shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-foreground">Fees Module Not Enabled</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            The fee management module has not been enabled for your institution. If you believe this is in error or
            require tuition and invoice assistance, please contact your school administration or bursar office.
          </p>
        </div>
      </div>
    );
  }

  // 3. Error State
  if (error || !feeData) {
    return (
      <div className="p-8 rounded-3xl bg-card border border-destructive/20 text-center space-y-4 max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-foreground">Unable to Load Fee Records</h3>
        <p className="text-xs text-muted-foreground">{error || "No fee records available"}</p>
        <button
          onClick={fetchFeeData}
          className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { summary, payments, assignments, school } = feeData;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Fee Account & Receipts</h1>
            {summary.academicYearName && (
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-semibold">
                {summary.academicYearName}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review your allocated fee structures, installments, payment receipts, and balance summary.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {getStatusBadge(summary.status)}
        </div>
      </div>

      {/* Online Payment Notice */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-1 border border-border flex items-start gap-3 text-xs text-muted-foreground">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-foreground">Payment Notice: </span>
          Online payment gateway is currently not enabled for this student portal. To settle pending fees or submit
          cheques/drafts, please visit the school accounts and administration desk.
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Net Fee */}
        <div className="p-5 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Total Fee</span>
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground tracking-tight">
            {formatCurrency(summary.netFee || summary.totalFee)}
          </p>
          {(summary.discountAmount > 0 || summary.concessionAmount > 0) && (
            <div className="flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
              <TrendingDown className="w-3 h-3" />
              <span>
                Includes {formatCurrency(summary.discountAmount + summary.concessionAmount)} concessions/discounts
              </span>
            </div>
          )}
        </div>

        {/* Paid Fee */}
        <div className="p-5 rounded-2xl bg-card border border-border hover:border-emerald-500/30 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Paid Amount</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-500 tracking-tight">
            {formatCurrency(summary.paidAmount)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {payments.length} verified payment receipt{payments.length === 1 ? "" : "s"}
          </p>
        </div>

        {/* Pending Balance */}
        <div className="p-5 rounded-2xl bg-card border border-border hover:border-amber-500/30 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Pending Balance</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-2xl font-bold tracking-tight ${
              summary.pendingAmount > 0 ? "text-amber-500" : "text-emerald-500"
            }`}
          >
            {formatCurrency(summary.pendingAmount)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {summary.pendingAmount === 0 ? "No outstanding balance" : "Balance due to be settled"}
          </p>
        </div>

        {/* Next Due Date & Amount */}
        <div className="p-5 rounded-2xl bg-card border border-border hover:border-blue-500/30 transition-all space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Next Due Installment</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground tracking-tight">
            {summary.nextDueAmount > 0 ? formatCurrency(summary.nextDueAmount) : "Nil"}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {summary.nextDueDate ? `Due by ${formatDate(summary.nextDueDate)}` : "No upcoming dues"}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("payments")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === "payments"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Payment History ({payments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("structures")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === "structures"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-surface-2"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Fee Breakdown & Schedules ({assignments.length})</span>
        </button>
      </div>

      {/* TAB 1: Payment History */}
      {activeTab === "payments" && (
        <div className="space-y-4">
          {payments.length === 0 ? (
            <div className="p-10 rounded-3xl bg-card border border-border text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-surface-2 text-muted-foreground flex items-center justify-center mx-auto">
                <Receipt className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">No Payments Recorded Yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No fee deposits or payment receipts have been entered by the administration desk for this academic year.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl bg-card border border-border overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-1 text-muted-foreground uppercase text-[10px] tracking-wider border-b border-border">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Receipt No.</th>
                      <th className="py-3 px-4 font-semibold">Payment Date</th>
                      <th className="py-3 px-4 font-semibold">Amount</th>
                      <th className="py-3 px-4 font-semibold">Payment Method</th>
                      <th className="py-3 px-4 font-semibold">Transaction ID</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {payments.map((p) => (
                      <tr key={p._id} className="hover:bg-surface-2/60 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                          {p.receiptNumber}
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground font-medium">
                          {formatDate(p.paymentDate)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-500">
                          {formatCurrency(p.amount)}
                        </td>
                        <td className="py-3.5 px-4">
                          {getPaymentMethodBadge(p.paymentMethod)}
                        </td>
                        <td className="py-3.5 px-4">
                          {p.transactionId ? (
                            <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                              <span>{p.transactionId}</span>
                              <button
                                onClick={() => handleCopyTransaction(p.transactionId)}
                                className="p-1 hover:text-foreground hover:bg-surface-2 rounded transition-colors cursor-pointer"
                                title="Copy Transaction ID"
                              >
                                {copiedTxn === p.transactionId ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/60">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleViewReceipt(p._id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-semibold transition-all cursor-pointer shadow-xs"
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
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Fee Breakdown & Schedules */}
      {activeTab === "structures" && (
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="p-10 rounded-3xl bg-card border border-border text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-surface-2 text-muted-foreground flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-foreground">No Fee Structures Assigned</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No active fee structures have been linked to your student profile for this academic period.
              </p>
            </div>
          ) : (
            assignments.map((assign) => (
              <div
                key={assign._id}
                className="p-5 rounded-2xl bg-card border border-border space-y-4 hover:border-primary/20 transition-all shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                  <div>
                    <h3 className="text-base font-bold text-foreground">{assign.feeStructureName}</h3>
                    <p className="text-xs text-muted-foreground">
                      Category: <span className="font-semibold text-foreground">{assign.category}</span>
                      {assign.feeStructureCode && ` • Code: ${assign.feeStructureCode}`}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm font-bold text-foreground">{formatCurrency(assign.netAmount)}</p>
                    {assign.baseAmount !== assign.netAmount && (
                      <p className="text-[11px] text-muted-foreground line-through">
                        Base: {formatCurrency(assign.baseAmount)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Installments Table */}
                {assign.dueSchedule && assign.dueSchedule.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Installment Due Schedule
                    </h4>
                    <div className="rounded-xl border border-border/80 overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-surface-1 text-muted-foreground text-[10px] uppercase border-b border-border">
                          <tr>
                            <th className="py-2.5 px-3 font-semibold">Installment</th>
                            <th className="py-2.5 px-3 font-semibold">Due Date</th>
                            <th className="py-2.5 px-3 font-semibold">Amount</th>
                            <th className="py-2.5 px-3 font-semibold">Paid</th>
                            <th className="py-2.5 px-3 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {assign.dueSchedule.map((inst, idx) => (
                            <tr key={idx} className="hover:bg-surface-2/40">
                              <td className="py-2.5 px-3 font-semibold text-foreground">{inst.name}</td>
                              <td className="py-2.5 px-3 text-muted-foreground">{formatDate(inst.dueDate)}</td>
                              <td className="py-2.5 px-3 font-bold text-foreground">
                                {formatCurrency(inst.amount)}
                              </td>
                              <td className="py-2.5 px-3 font-medium text-emerald-500">
                                {formatCurrency(inst.paidAmount)}
                              </td>
                              <td className="py-2.5 px-3">
                                {inst.status === "PAID" ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                                    PAID
                                  </span>
                                ) : inst.status === "PARTIALLY_PAID" ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500">
                                    PARTIAL
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500">
                                    UNPAID
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border border-border rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6">
            {/* Modal Controls */}
            <div className="flex items-center justify-between border-b border-border pb-4 print:hidden">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-foreground">Official Fee Receipt</h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintReceipt}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Receipt Body */}
            <div ref={receiptPrintRef} className="space-y-6 text-foreground bg-card p-2 sm:p-4 rounded-xl">
              {/* Institution Header */}
              <div className="text-center border-b border-border/80 pb-4 space-y-1">
                <h3 className="text-lg sm:text-xl font-black text-foreground uppercase tracking-tight">
                  {selectedReceipt.school.name}
                </h3>
                {selectedReceipt.school.address && (
                  <p className="text-xs text-muted-foreground">
                    {selectedReceipt.school.address}
                    {selectedReceipt.school.city ? `, ${selectedReceipt.school.city}` : ""}
                    {selectedReceipt.school.state ? `, ${selectedReceipt.school.state}` : ""}
                  </p>
                )}
                <div className="flex items-center justify-center gap-3 text-[11px] text-muted-foreground pt-1">
                  {selectedReceipt.school.phone && <span>Tel: {selectedReceipt.school.phone}</span>}
                  {selectedReceipt.school.email && <span>Email: {selectedReceipt.school.email}</span>}
                </div>
                <div className="pt-2">
                  <span className="inline-block px-3 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-bold uppercase tracking-wider">
                    Official Fee Deposit Receipt
                  </span>
                </div>
              </div>

              {/* Receipt Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-surface-1 p-4 rounded-2xl border border-border/60">
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Receipt Number</p>
                  <p className="font-mono font-bold text-foreground text-sm mt-0.5">
                    {selectedReceipt.receipt.receiptNumber}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Payment Date</p>
                  <p className="font-medium text-foreground mt-0.5">
                    {formatDate(selectedReceipt.receipt.paymentDate)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Payment Method</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {selectedReceipt.receipt.paymentMethod.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Student Name</p>
                  <p className="font-bold text-foreground text-sm mt-0.5">
                    {selectedReceipt.student.name}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Admission No.</p>
                  <p className="font-mono text-foreground mt-0.5">
                    {selectedReceipt.student.admissionNumber}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Class & Section</p>
                  <p className="font-medium text-foreground mt-0.5">
                    {selectedReceipt.student.class} {selectedReceipt.student.section ? `(${selectedReceipt.student.section})` : ""}
                  </p>
                </div>
              </div>

              {/* Transaction & Amount Box */}
              <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground uppercase">Amount Paid</span>
                  <span className="text-2xl font-black text-emerald-500">
                    {formatCurrency(selectedReceipt.receipt.amount)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">In Words: </span>
                  <span className="italic">{selectedReceipt.receipt.amountInWords}</span>
                </div>
                {selectedReceipt.receipt.transactionId && (
                  <div className="text-[11px] text-muted-foreground font-mono pt-1">
                    <span className="font-sans font-semibold">Transaction ID / Ref: </span>
                    {selectedReceipt.receipt.transactionId}
                  </div>
                )}
                {selectedReceipt.receipt.remarks && (
                  <div className="text-[11px] text-muted-foreground pt-1">
                    <span className="font-semibold">Remarks: </span>
                    {selectedReceipt.receipt.remarks}
                  </div>
                )}
              </div>

              {/* Remaining Balance Summary */}
              {selectedReceipt.accountBalance && (
                <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-surface-1 border border-border/60">
                  <span className="text-muted-foreground">Remaining Account Balance:</span>
                  <span className="font-bold text-foreground">
                    {formatCurrency(selectedReceipt.accountBalance.pendingAmount)}
                  </span>
                </div>
              )}

              {/* Footer Stamp / Signatures */}
              <div className="flex items-end justify-between pt-6 border-t border-border/80 text-xs">
                <div>
                  <p className="text-[10px] text-muted-foreground">Authorized Cashier / Desk:</p>
                  <p className="font-semibold text-foreground mt-0.5">
                    {selectedReceipt.receipt.recordedBy}
                  </p>
                  <p className="text-[10px] text-muted-foreground/80 mt-1">
                    Computer Generated Official Receipt
                  </p>
                </div>
                <div className="text-right">
                  <div className="w-32 border-b border-foreground/30 mb-1"></div>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold">Authorized Stamp</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
