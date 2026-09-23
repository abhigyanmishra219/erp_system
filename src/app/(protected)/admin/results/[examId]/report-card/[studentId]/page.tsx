"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Printer,
  ChevronLeft,
  GraduationCap,
  Calendar,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  School as SchoolIcon,
  RefreshCw,
  Award,
} from "lucide-react";
import { ReportCardData } from "@/lib/services/reportCardService";

export default function PrintableReportCardPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;
  const studentId = params.studentId as string;

  const [reportCard, setReportCard] = useState<ReportCardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadReportCard() {
      if (!examId || !studentId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/exams/${examId}/results/report-card/${studentId}`);
        const data = await res.json();
        if (data.success && data.data?.reportCard) {
          setReportCard(data.data.reportCard);
        } else {
          setError(data.error?.message || "Failed to load report card data");
        }
      } catch (err: any) {
        setError(err.message || "Network error loading report card");
      } finally {
        setLoading(false);
      }
    }
    loadReportCard();
  }, [examId, studentId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium">Generating official report card...</p>
      </div>
    );
  }

  if (error || !reportCard) {
    return (
      <div className="py-24 text-center text-muted-foreground flex flex-col items-center justify-center gap-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h2 className="text-xl font-bold text-foreground">Report Card Not Found</h2>
        <p className="text-sm max-w-md">{error || "Unable to find report card for the requested student."}</p>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Results
        </button>
      </div>
    );
  }

  const { school, student, exam, academic, attendance, gradingScales, resultStatus, generatedAt } = reportCard;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Action Bar (Hidden on Print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-accent text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Back to Results</span>
          </button>
          <div className="h-4 w-px bg-border hidden sm:block" />
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                resultStatus === "PUBLISHED"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : resultStatus === "REVIEWED"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              {resultStatus === "PUBLISHED" ? "Official Published Report" : `Status: ${resultStatus}`}
            </span>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs cursor-pointer"
        >
          <Printer className="h-4 w-4" />
          <span>Print Report Card</span>
        </button>
      </div>

      {/* Printable Report Card Container */}
      <div
        id="printable-report-card"
        className="bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-10 shadow-lg print:border-none print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full"
      >
        {/* School Header */}
        <div className="text-center border-b-2 border-slate-200 dark:border-slate-800 pb-6 mb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            {school.logo ? (
              <img src={school.logo} alt={school.name} className="h-14 w-14 object-contain rounded-lg" />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
                {school.name.charAt(0)}
              </div>
            )}
            <div className="text-left">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">
                {school.name}
              </h1>
              {school.tagline && (
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 italic">
                  {school.tagline}
                </p>
              )}
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 max-w-xl mx-auto space-y-0.5 mt-2">
            {school.address && <div>{school.address}, {school.city}, {school.state} - {school.pincode}</div>}
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {school.phone && <span>Tel: {school.phone}</span>}
              {school.email && <span>• Email: {school.email}</span>}
              {school.website && <span>• Web: {school.website}</span>}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="inline-block px-4 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-bold uppercase tracking-widest text-slate-800 dark:text-slate-200">
              Academic Performance Report Card
            </div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-1">
              {exam.name} • {exam.academicYear?.name}
            </div>
          </div>
        </div>

        {/* Student Profile Snapshot */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 mb-6 text-xs">
          <div className="md:col-span-1 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 pb-3 md:pb-0 md:pr-4">
            <div className="w-20 h-20 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 mb-1.5 shadow-xs">
              {student.photo ? (
                <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                <User className="h-10 w-10 text-slate-400" />
              )}
            </div>
            <span className="font-bold text-sm text-slate-900 dark:text-white text-center">
              {student.name}
            </span>
          </div>

          <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-y-2.5 gap-x-4 pl-0 md:pl-2">
            <div>
              <span className="text-slate-600 dark:text-slate-400 block">Admission No</span>
              <span className="font-semibold text-slate-900 dark:text-white">{student.admissionNumber}</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400 block">Roll Number</span>
              <span className="font-semibold text-slate-900 dark:text-white">{student.rollNumber || "N/A"}</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400 block">Class & Section</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {student.class.name} - Section {student.section.name}
              </span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400 block">Date of Birth</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {student.dob ? new Date(student.dob).toLocaleDateString() : "N/A"}
              </span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400 block">Father's Name</span>
              <span className="font-semibold text-slate-900 dark:text-white">{student.fatherName || "N/A"}</span>
            </div>
            <div>
              <span className="text-slate-600 dark:text-slate-400 block">Mother's Name</span>
              <span className="font-semibold text-slate-900 dark:text-white">{student.motherName || "N/A"}</span>
            </div>
          </div>
        </div>

        {/* Marks Breakdown Table */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
            Subject Evaluation
          </h3>
          <table className="w-full border-collapse text-xs border border-slate-200 dark:border-slate-800">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-800">
                <th className="py-2 px-3 text-left w-12">#</th>
                <th className="py-2 px-3 text-left">Subject</th>
                <th className="py-2 px-3 text-center w-24">Max Marks</th>
                <th className="py-2 px-3 text-center w-24">Pass Marks</th>
                <th className="py-2 px-3 text-center w-28">Marks Obtained</th>
                <th className="py-2 px-3 text-center w-20">Grade</th>
                <th className="py-2 px-3 text-center w-24">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {academic.subjects.map((sub, idx) => (
                <tr key={sub.subjectId} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">{idx + 1}</td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-white">
                    {sub.subjectName}
                    {sub.subjectCode && (
                      <span className="ml-1 text-[10px] text-slate-600 dark:text-slate-400 font-mono">
                        ({sub.subjectCode})
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-center font-medium">{sub.maximumMarks}</td>
                  <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">{sub.passingMarks}</td>
                  <td className="py-2.5 px-3 text-center font-bold text-slate-900 dark:text-white">
                    {sub.marks !== null ? sub.marks : <span className="text-slate-400 italic">Absent / NA</span>}
                  </td>
                  <td className="py-2.5 px-3 text-center font-bold">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[11px] ${
                        sub.isPassed
                          ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                          : "bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300"
                      }`}
                    >
                      {sub.grade}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400 text-[11px]">
                    {sub.remarks || (sub.isPassed ? "Pass" : "Fail")}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Table Summary Footer */}
            <tfoot>
              <tr className="bg-slate-100 dark:bg-slate-900 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white">
                <td colSpan={2} className="py-2.5 px-3 text-right uppercase tracking-wider">
                  Grand Total:
                </td>
                <td className="py-2.5 px-3 text-center">{academic.totalMaximumMarks}</td>
                <td className="py-2.5 px-3 text-center text-slate-600 dark:text-slate-400">—</td>
                <td className="py-2.5 px-3 text-center text-sm font-extrabold text-blue-700 dark:text-blue-400">
                  {academic.totalObtainedMarks}
                </td>
                <td className="py-2.5 px-3 text-center text-sm font-extrabold">{academic.overallGrade}</td>
                <td className="py-2.5 px-3 text-center font-bold">
                  <span
                    className={
                      academic.isPassed
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-red-700 dark:text-red-400"
                    }
                  >
                    {academic.statusText}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Aggregate Metrics & Attendance Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Aggregate Summary */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2.5">
              Overall Academic Performance
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="block text-[11px] text-slate-600 dark:text-slate-400">Percentage</span>
                <span className="text-base font-extrabold text-slate-900 dark:text-white">
                  {academic.percentage.toFixed(1)}%
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="block text-[11px] text-slate-600 dark:text-slate-400">Overall Grade</span>
                <span className="text-base font-extrabold text-blue-600 dark:text-blue-400">
                  {academic.overallGrade}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="block text-[11px] text-slate-600 dark:text-slate-400">Result</span>
                <span
                  className={`text-base font-extrabold ${
                    academic.isPassed ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  }`}
                >
                  {academic.statusText}
                </span>
              </div>
            </div>
          </div>

          {/* Attendance Integration */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2.5">
              Attendance Record (Session)
            </h4>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="block text-[10px] text-slate-600 dark:text-slate-400">Working Days</span>
                <span className="text-xs font-bold text-slate-900 dark:text-white">{attendance.totalSessions}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="block text-[10px] text-slate-600 dark:text-slate-400">Present</span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{attendance.present}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="block text-[10px] text-slate-600 dark:text-slate-400">Absent</span>
                <span className="text-xs font-bold text-red-600 dark:text-red-400">{attendance.absent}</span>
              </div>
              <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <span className="block text-[10px] text-slate-600 dark:text-slate-400">Attendance %</span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {attendance.attendancePercentage.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Grading Scale Legend */}
        {gradingScales && gradingScales.length > 0 && (
          <div className="mb-8 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] bg-slate-50/50 dark:bg-slate-900/30">
            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Grading Scale Key:
            </span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600 dark:text-slate-400">
              {gradingScales.map((scale) => (
                <span key={scale.grade}>
                  <strong className="text-slate-900 dark:text-white">{scale.grade}</strong>: {scale.minPercentage}% - {scale.maxPercentage}%
                  {scale.description && ` (${scale.description})`}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Signature & Endorsement Block */}
        <div className="mt-14 pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-8 text-center text-xs">
          <div>
            <div className="h-10 border-b border-dashed border-slate-400 dark:border-slate-600 mb-2"></div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Class Teacher Signature</span>
          </div>
          <div>
            <div className="h-10 border-b border-dashed border-slate-400 dark:border-slate-600 mb-2"></div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Exam Controller Signature</span>
          </div>
          <div>
            <div className="h-10 border-b border-dashed border-slate-400 dark:border-slate-600 mb-2"></div>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Principal Signature & Seal</span>
          </div>
        </div>

        {/* Generation Timestamp footer */}
        <div className="mt-8 text-center text-[10px] text-slate-600 dark:text-slate-400">
          Generated automatically by {school.name} ERP System on {new Date(generatedAt).toLocaleString()}
        </div>
      </div>

      {/* Embedded Print CSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              @page {
                size: A4 portrait;
                margin: 0;
              }
              html, body {
                margin: 0 !important;
                padding: 0 !important;
                background: #ffffff !important;
                color: #000000 !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              nav, aside, header, footer, .print\\:hidden, [role="navigation"] {
                display: none !important;
              }
              #printable-report-card {
                border: none !important;
                box-shadow: none !important;
                padding: 10mm 12mm !important;
                margin: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                background: #ffffff !important;
                color: #000000 !important;
              }
              a[href]::after {
                content: none !important;
              }
            }
          `,
        }}
      />
    </div>
  );
}
