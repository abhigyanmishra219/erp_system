import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireStudent } from "@/lib/auth/requireStudent";
import { requireModule } from "@/lib/subscription-guard";
import connectToDatabase from "@/lib/db";
import FeePayment from "@/models/FeePayment";
import Student from "@/models/Student";
import School from "@/models/School";
import AcademicYear from "@/models/AcademicYear";
import StudentFeeAccount from "@/models/StudentFeeAccount";

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
  try {
    const auth = await requireStudent(req);
    if (!auth.success) return auth.response;

    const subCheck = requireModule(auth.context.school, "FEES");
    if (!subCheck.allowed) return subCheck.response;

    const { school, schoolId, student, studentId } = auth.context;

    const { paymentId } = await params;
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return NextResponse.json(
        { success: false, message: "Invalid payment ID format" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Enforce student ownership: Payment must belong to the authenticated student and school
    const payment = await FeePayment.findOne({
      _id: paymentId,
      schoolId,
      studentId,
      status: "ACTIVE",
    })
      .populate("recordedBy", "name email")
      .lean();

    if (!payment) {
      return NextResponse.json(
        { success: false, message: "Payment receipt not found or access denied." },
        { status: 404 }
      );
    }

    const [studentDoc, academicYear, feeAccount] = await Promise.all([
      Student.findById(studentId)
        .populate("classId", "name code")
        .populate("sectionId", "name code")
        .lean(),
      AcademicYear.findById(payment.academicYearId).lean(),
      StudentFeeAccount.findById(payment.feeAccountId).lean(),
    ]);

    const studentFullName = studentDoc
      ? `${studentDoc.firstName} ${studentDoc.lastName}`.trim()
      : `${student.firstName} ${student.lastName}`.trim();

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
          recordedBy: payment.recordedBy ? (payment.recordedBy as any).name : "School Accounts Desk",
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
          id: studentId,
          name: studentFullName,
          admissionNumber: studentDoc?.admissionNumber || student.admissionNumber,
          rollNumber: studentDoc?.rollNumber || student.rollNumber || "",
          class: studentDoc?.classId ? (studentDoc.classId as any).name : "N/A",
          section: studentDoc?.sectionId ? (studentDoc.sectionId as any).name : "N/A",
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
    console.error("Error fetching payment receipt:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch payment receipt" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed" },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed" },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed" },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, message: "Method Not Allowed" },
    { status: 405 }
  );
}
