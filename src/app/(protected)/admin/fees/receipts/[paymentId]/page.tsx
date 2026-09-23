"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Calendar,
  CreditCard,
  User,
  Hash,
  AlertCircle,
  FileText
} from "lucide-react";

interface ReceiptData {
  receiptNumber: string;
  paymentDate: string;
  amount: number;
  amountInWords: string;
  paymentMode: string;
  referenceNumber?: string;
  bankName?: string;
  remarks?: string;
  school: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    logo?: string;
  };
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    admissionNumber: string;
    rollNumber?: string;
    class?: { _id: string; name: string };
    section?: { _id: string; name: string };
    parentName?: string;
  };
  account: {
    totalFee: number;
    paidAmount: number;
    pendingAmount: number;
    concessionAmount: number;
    discountAmount: number;
    status: string;
  };
  recordedBy?: {
    name: string;
  };
}

export default function FeeReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params?.paymentId as string;

  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paymentId) return;

    async function fetchReceipt() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/fees/payments/${paymentId}/receipt`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load fee receipt");
        }
        setReceipt(json.data);
      } catch (err: any) {
        setError(err.message || "Failed to load fee receipt");
      } finally {
        setLoading(false);
      }
    }

    fetchReceipt();
  }, [paymentId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 font-medium text-sm">Generating Fee Receipt...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Receipt Not Available</h2>
          <p className="text-slate-400 text-sm mb-6">{error || "Could not retrieve receipt details."}</p>
          <button
            onClick={() => router.back()}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium text-sm transition flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        </div>
      </div>
    );
  }

  const studentName = `${receipt.student.firstName} ${receipt.student.lastName}`.trim();
  const formattedDate = new Date(receipt.paymentDate).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric"
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6">
      {/* Top Action Bar (Hidden during Print) */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition text-sm font-medium bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Payments
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl text-sm font-semibold transition shadow-lg shadow-indigo-600/20"
          >
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
        </div>
      </div>

      {/* Printable Receipt Paper Container */}
      <div
        id="printable-receipt"
        className="max-w-3xl mx-auto bg-white text-slate-900 rounded-2xl shadow-2xl p-8 sm:p-12 border border-slate-200 print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:rounded-none"
      >
        {/* Receipt Header */}
        <div className="border-b-2 border-slate-900 pb-6 mb-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {receipt.school.name || "School Administration"}
              </h1>
              {receipt.school.address && (
                <p className="text-xs text-slate-600 max-w-md">{receipt.school.address}</p>
              )}
              <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-1">
                {receipt.school.phone && <span>Tel: {receipt.school.phone}</span>}
                {receipt.school.email && <span>Email: {receipt.school.email}</span>}
              </div>
            </div>

            <div className="text-right">
              <div className="inline-block bg-slate-900 text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider mb-2">
                Official Fee Receipt
              </div>
              <p className="text-sm font-black text-slate-900 font-mono">
                {receipt.receiptNumber}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Date: {formattedDate}</p>
            </div>
          </div>
        </div>

        {/* Student & Payment Summary Bar */}
        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs mb-6">
          <div>
            <span className="text-slate-400 font-medium uppercase tracking-wider block text-[10px]">
              Student Details
            </span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{studentName}</p>
            <p className="text-slate-600 mt-0.5">
              Adm No: <span className="font-semibold text-slate-800">{receipt.student.admissionNumber}</span>
              {receipt.student.rollNumber && ` | Roll: ${receipt.student.rollNumber}`}
            </p>
            <p className="text-slate-600 mt-0.5">
              Class:{" "}
              <span className="font-semibold text-slate-800">
                {receipt.student.class?.name || "N/A"}{" "}
                {receipt.student.section?.name ? `(${receipt.student.section.name})` : ""}
              </span>
            </p>
          </div>

          <div className="text-right">
            <span className="text-slate-400 font-medium uppercase tracking-wider block text-[10px]">
              Payment Details
            </span>
            <p className="text-sm font-bold text-emerald-700 mt-0.5">
              Mode: {receipt.paymentMode.toUpperCase()}
            </p>
            {receipt.referenceNumber && (
              <p className="text-slate-600 mt-0.5">
                Ref / Txn No: <span className="font-mono font-medium">{receipt.referenceNumber}</span>
              </p>
            )}
            {receipt.bankName && (
              <p className="text-slate-600 mt-0.5">Bank: {receipt.bankName}</p>
            )}
            {receipt.recordedBy?.name && (
              <p className="text-slate-500 mt-0.5 text-[11px]">
                Collected By: {receipt.recordedBy.name}
              </p>
            )}
          </div>
        </div>

        {/* Payment Line Item Table */}
        <table className="w-full text-left text-xs mb-6 border-collapse">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-100 text-slate-700">
              <th className="py-2.5 px-3 font-bold uppercase text-[10px]">Description</th>
              <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            <tr>
              <td className="py-3 px-3">
                <div className="font-semibold text-slate-900">Academic / Tuition Fee Collection</div>
                <div className="text-[11px] text-slate-500">
                  Payment receipt towards student institutional fee account
                </div>
                {receipt.remarks && (
                  <div className="text-[11px] text-slate-600 italic mt-0.5">
                    Note: {receipt.remarks}
                  </div>
                )}
              </td>
              <td className="py-3 px-3 text-right font-bold text-slate-900 text-sm">
                ₹{receipt.amount.toLocaleString("en-IN")}
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-900 font-bold">
              <td className="py-3 px-3 text-right uppercase text-[11px] text-slate-700">Total Amount Paid:</td>
              <td className="py-3 px-3 text-right text-base text-slate-900 font-black">
                ₹{receipt.amount.toLocaleString("en-IN")}
              </td>
            </tr>
          </tfoot>
        </table>

        {/* Amount in Words */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs mb-8">
          <span className="text-slate-500 font-medium">Amount in words:</span>{" "}
          <span className="font-bold text-slate-900">{receipt.amountInWords}</span>
        </div>

        {/* Student Fee Account Status Snapshot */}
        <div className="grid grid-cols-3 gap-4 border border-slate-200 rounded-xl p-4 bg-slate-50/50 text-xs mb-10">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Total Applicable Fee</span>
            <span className="font-bold text-slate-900 text-sm">
              ₹{receipt.account.totalFee.toLocaleString("en-IN")}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Total Paid Till Date</span>
            <span className="font-bold text-emerald-700 text-sm">
              ₹{receipt.account.paidAmount.toLocaleString("en-IN")}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Remaining Dues</span>
            <span className="font-bold text-rose-600 text-sm">
              ₹{receipt.account.pendingAmount.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Signatures & Verification */}
        <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-200 text-xs">
          <div>
            <div className="h-12 flex items-end">
              <span className="text-[11px] text-slate-400 italic">Electronic verification recorded</span>
            </div>
            <p className="font-medium text-slate-700 pt-2 border-t border-slate-300">
              Student / Parent Signature
            </p>
          </div>
          <div className="text-right">
            <div className="h-12 flex items-end justify-end">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> Authenticated
              </span>
            </div>
            <p className="font-medium text-slate-700 pt-2 border-t border-slate-300">
              Authorized Cashier / Accountant
            </p>
          </div>
        </div>

        {/* Footer Terms */}
        <div className="mt-8 pt-4 border-t border-dashed border-slate-200 text-[10px] text-slate-400 text-center">
          This is a computer-generated fee receipt and does not require a physical stamp. Fees once paid are non-refundable according to institutional guidelines.
        </div>
      </div>
    </div>
  );
}
