import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSchoolAdmin } from "@/lib/auth/requireSchoolAdmin";
import FeePayment from "@/models/FeePayment";
import Student from "@/models/Student";
import School from "@/models/School";
import AcademicYear from "@/models/AcademicYear";
import StudentFeeAccount from "@/models/StudentFeeAccount";
import connectToDatabase from "@/lib/db";

// Helper to convert number to words (Indian numbering system)
function numberToWordsINR(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return "Zero Rupees Only";

  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(num: number): string {
    if (num < 20) return a[num];
    const digit = num % 10;
    if (num < 100) return b[Math.floor(num / 10)] + (digit ? " " + a[digit] : "");
    if (num < 1000)
      return (
        a[Math.floor(num / 100)] +
        " Hundred" +
        (num % 100 !== 0 ? " and " + inWords(num % 100) : "")
      );
    if (num < 100000)
      return (
        inWords(Math.floor(num / 1000)) +
        " Thousand" +
        (num % 1000 !== 0 ? " " + inWords(num % 1000) : "")
      );
    if (num < 10000000)
      return (
        inWords(Math.floor(num / 100000)) +
        " Lakh" +
        (num % 100000 !== 0 ? " " + inWords(num % 100000) : "")
      );
    return (
      inWords(Math.floor(num / 10000000)) +
      " Crore" +
      (num % 10000000 !== 0 ? " " + inWords(num % 10000000) : "")
    );
  }

  return inWords(rounded) + " Rupees Only";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const auth = await requireSchoolAdmin(req);
  if (!auth.success) return auth.response;

  const { schoolId } = auth.context;
  const { paymentId } = await params;

  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_ID", message: "Invalid payment ID" } },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const payment = await FeePayment.findOne({ _id: paymentId, schoolId })
      .populate("recordedBy", "name email")
      .lean();

    if (!payment) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Payment record not found" } },
        { status: 404 }
      );
    }

    const [school, student, academicYear, feeAccount] = await Promise.all([
      School.findById(schoolId).lean(),
      Student.findById(payment.studentId)
        .populate("classId", "name code")
        .populate("sectionId", "name code")
        .lean(),
      AcademicYear.findById(payment.academicYearId).lean(),
      StudentFeeAccount.findById(payment.feeAccountId).lean(),
    ]);

    if (!school || !student) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "School or Student metadata not found" } },
        { status: 404 }
      );
    }

    const studentFullName = `${student.firstName} ${student.lastName}`.trim();
    const amountInWords = numberToWordsINR(payment.amount);

    return NextResponse.json({
      success: true,
      data: {
        receipt: {
          id: payment._id.toString(),
          receiptNumber: payment.receiptNumber,
          paymentDate: payment.paymentDate,
          paymentMethod: payment.paymentMethod,
          transactionId: payment.transactionId || "",
          amount: payment.amount,
          amountInWords,
          remarks: payment.remarks || "",
          status: payment.status,
          recordedBy: payment.recordedBy ? (payment.recordedBy as any).name : "School Administrator",
          createdAt: payment.createdAt,
        },
        school: {
          name: school.name,
          address: school.address || "",
          city: school.city || "",
          state: school.state || "",
          phone: school.phone || "",
          email: school.email || "",
          website: school.website || "",
          logo: school.logo || school.branding?.logo || "",
        },
        student: {
          id: student._id.toString(),
          name: studentFullName,
          admissionNumber: student.admissionNumber,
          rollNumber: student.rollNumber || "",
          class: student.classId ? (student.classId as any).name : "N/A",
          section: student.sectionId ? (student.sectionId as any).name : "N/A",
        },
        academicYear: academicYear ? academicYear.name : "",
        accountBalance: feeAccount
          ? {
              totalFee: feeAccount.totalFee,
              netFee: feeAccount.netFee,
              paidAmount: feeAccount.paidAmount,
              pendingAmount: feeAccount.pendingAmount,
              status: feeAccount.status,
            }
          : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: error.message || "Failed to fetch receipt data" } },
      { status: 500 }
    );
  }
}
