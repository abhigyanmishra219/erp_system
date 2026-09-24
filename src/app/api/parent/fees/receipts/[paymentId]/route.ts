import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireParent } from "@/lib/auth/requireParent";
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
    const auth = await requireParent(req);
    if (!auth.success) return auth.response;

    const subCheck = requireModule(auth.context.school, "FEES");
    if (!subCheck.allowed) return subCheck.response;

    const { school, schoolId, childIds } = auth.context;

    if (!childIds || childIds.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NO_CHILDREN", message: "No linked children found." } },
        { status: 403 }
      );
    }

    const { paymentId } = await params;
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "Invalid payment ID format" } },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedStudentId = searchParams.get("studentId");

    let activeStudentId = childIds[0];
    if (requestedStudentId) {
      if (!childIds.includes(requestedStudentId)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "FORBIDDEN_CHILD_ACCESS",
              message: "Access denied. The requested student is not linked to your parent account.",
            },
          },
          { status: 403 }
        );
      }
      activeStudentId = requestedStudentId;
    }

    await connectToDatabase();

    // 2. Enforce parent-child ownership: Payment must belong to the authorized child, school, and active
    const payment = await FeePayment.findOne({
      _id: paymentId,
      schoolId,
      studentId: { $in: childIds }, // Can only view payments belonging to parent's linked children
      status: "ACTIVE",
    })
      .populate("recordedBy", "name email")
      .lean();

    if (!payment) {
      return NextResponse.json(
        { success: false, error: { code: "RECEIPT_NOT_FOUND", message: "Payment receipt not found or access denied." } },
        { status: 404 }
      );
    }

    // Double check specific child match if provided
    if (requestedStudentId && payment.studentId.toString() !== requestedStudentId) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN_CHILD_ACCESS", message: "This receipt does not belong to the selected child." } },
        { status: 403 }
      );
    }

    const targetStudentId = payment.studentId;

    const [studentDoc, academicYear, feeAccount] = await Promise.all([
      Student.findById(targetStudentId)
        .populate("classId", "name code")
        .populate("sectionId", "name code")
        .lean(),
      AcademicYear.findById(payment.academicYearId).lean(),
      StudentFeeAccount.findById(payment.feeAccountId).lean(),
    ]);

    const studentFullName = studentDoc
      ? `${studentDoc.firstName} ${studentDoc.lastName}`.trim()
      : "Student";

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
          website: (school.website && !school.website.includes("localhost")) ? school.website : "",
          logo: (school.logo && !school.logo.includes("localhost")) ? (school.logo || school.branding?.logo || "") : "",
        },
        student: {
          id: targetStudentId.toString(),
          name: studentFullName,
          admissionNumber: studentDoc?.admissionNumber || "",
          rollNumber: studentDoc?.rollNumber || "",
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
    console.error("Error fetching parent payment receipt:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch payment receipt",
        },
      },
      { status: 500 }
    );
  }
}

// Read-only Security Enforcement
export async function POST() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" } },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" } },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" } },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Method Not Allowed" } },
    { status: 405 }
  );
}
