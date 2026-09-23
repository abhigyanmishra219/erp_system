import mongoose from "mongoose";
import Student from "@/models/Student";
import AcademicYear from "@/models/AcademicYear";
import FeePayment, { PAYMENT_METHODS, PaymentMethod } from "@/models/FeePayment";
import { IValidationError } from "@/models/ImportSession";

export interface ValidatedFeeRow {
  rowNumber: number;
  data: {
    studentId: mongoose.Types.ObjectId;
    studentName: string;
    admissionNumber: string;
    academicYearId: mongoose.Types.ObjectId;
    academicYearName: string;
    amount: number;
    paymentDate: Date;
    paymentMethod: PaymentMethod;
    receiptNumber: string;
    transactionId: string;
    remarks: string;
  };
}

export class FeeImportValidator {
  public static async validateRows(
    schoolId: string,
    rows: Array<{ rowNumber: number; data: Record<string, any> }>
  ): Promise<{
    validRows: ValidatedFeeRow[];
    errors: IValidationError[];
    summary: { total: number; valid: number; invalid: number };
  }> {
    const errors: IValidationError[] = [];
    const validRows: ValidatedFeeRow[] = [];

    const [students, academicYears, existingPayments] = await Promise.all([
      Student.find({ schoolId }).select("_id admissionNumber studentId firstName lastName").lean(),
      AcademicYear.find({ schoolId }).lean(),
      FeePayment.find({ schoolId }).select("receiptNumber").lean(),
    ]);

    const studentMap = new Map<string, any>();
    students.forEach((s) => {
      studentMap.set(s.admissionNumber.toUpperCase().trim(), s);
      if (s.studentId) studentMap.set(s.studentId.toUpperCase().trim(), s);
    });

    const yearMap = new Map<string, any>();
    academicYears.forEach((ay) => yearMap.set(ay.name.toLowerCase().trim(), ay));

    const existingReceipts = new Set(existingPayments.map((p) => p.receiptNumber.toUpperCase().trim()));
    const fileReceipts = new Set<string>();

    for (const { rowNumber, data } of rows) {
      let hasError = false;

      // 1. Admission Number
      const rawAdm = String(data.admissionNumber || "").trim();
      let studentDoc = null;
      if (!rawAdm) {
        errors.push({
          rowNumber,
          field: "admissionNumber",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Student Admission Number is required.",
        });
        hasError = true;
      } else {
        studentDoc = studentMap.get(rawAdm.toUpperCase());
        if (!studentDoc) {
          errors.push({
            rowNumber,
            field: "admissionNumber",
            value: rawAdm,
            errorCode: "INVALID_REFERENCE",
            message: `Student with Admission No '${rawAdm}' not found in your school.`,
          });
          hasError = true;
        }
      }

      // 2. Academic Year
      const rawYear = String(data.academicYear || "").trim();
      let yearDoc = null;
      if (!rawYear) {
        errors.push({
          rowNumber,
          field: "academicYear",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Academic Year is required.",
        });
        hasError = true;
      } else {
        yearDoc = yearMap.get(rawYear.toLowerCase());
        if (!yearDoc) {
          errors.push({
            rowNumber,
            field: "academicYear",
            value: rawYear,
            errorCode: "INVALID_REFERENCE",
            message: `Academic Year '${rawYear}' does not exist in your school.`,
          });
          hasError = true;
        }
      }

      // 3. Amount
      const rawAmount = typeof data.amount === "number" ? data.amount : parseFloat(String(data.amount || "").replace(/[^0-9.]/g, ""));
      if (isNaN(rawAmount) || rawAmount <= 0) {
        errors.push({
          rowNumber,
          field: "amount",
          value: String(data.amount || ""),
          errorCode: "INVALID_NUMBER",
          message: "Amount must be a positive number greater than zero.",
        });
        hasError = true;
      }

      // 4. Payment Date
      const rawDate = data.paymentDate;
      let paymentDate: Date | null = null;
      if (!rawDate) {
        errors.push({
          rowNumber,
          field: "paymentDate",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Payment Date is required.",
        });
        hasError = true;
      } else {
        paymentDate = new Date(rawDate);
        if (isNaN(paymentDate.getTime())) {
          errors.push({
            rowNumber,
            field: "paymentDate",
            value: String(rawDate),
            errorCode: "INVALID_DATE",
            message: "Invalid Payment Date format. Use YYYY-MM-DD.",
          });
          hasError = true;
        }
      }

      // 5. Payment Method
      const rawMethod = String(data.paymentMethod || "CASH").trim().toUpperCase();
      let paymentMethod: PaymentMethod = "CASH";
      if (PAYMENT_METHODS.includes(rawMethod as PaymentMethod)) {
        paymentMethod = rawMethod as PaymentMethod;
      } else {
        errors.push({
          rowNumber,
          field: "paymentMethod",
          value: rawMethod,
          errorCode: "INVALID_ENUM",
          message: `Invalid payment method '${rawMethod}'. Accepted: ${PAYMENT_METHODS.join(", ")}.`,
        });
        hasError = true;
      }

      // 6. Receipt Number Uniqueness
      const rawReceipt = String(data.receiptNumber || "").trim();
      if (!rawReceipt) {
        errors.push({
          rowNumber,
          field: "receiptNumber",
          value: "",
          errorCode: "REQUIRED_FIELD",
          message: "Receipt Number is required.",
        });
        hasError = true;
      } else {
        const normReceipt = rawReceipt.toUpperCase();
        if (fileReceipts.has(normReceipt)) {
          errors.push({
            rowNumber,
            field: "receiptNumber",
            value: rawReceipt,
            errorCode: "DUPLICATE_IN_FILE",
            message: `Duplicate Receipt Number '${rawReceipt}' appears multiple times in uploaded file.`,
          });
          hasError = true;
        } else if (existingReceipts.has(normReceipt)) {
          errors.push({
            rowNumber,
            field: "receiptNumber",
            value: rawReceipt,
            errorCode: "DUPLICATE_IN_DATABASE",
            message: `A fee payment with Receipt Number '${rawReceipt}' already exists.`,
          });
          hasError = true;
        } else {
          fileReceipts.add(normReceipt);
        }
      }

      if (!hasError && studentDoc && yearDoc && rawAmount > 0 && paymentDate && rawReceipt) {
        validRows.push({
          rowNumber,
          data: {
            studentId: studentDoc._id,
            studentName: `${studentDoc.firstName} ${studentDoc.lastName}`.trim(),
            admissionNumber: studentDoc.admissionNumber,
            academicYearId: yearDoc._id,
            academicYearName: yearDoc.name,
            amount: rawAmount,
            paymentDate,
            paymentMethod,
            receiptNumber: rawReceipt.toUpperCase(),
            transactionId: String(data.transactionId || "").trim(),
            remarks: String(data.remarks || "").trim(),
          },
        });
      }
    }

    return {
      validRows,
      errors,
      summary: {
        total: rows.length,
        valid: validRows.length,
        invalid: rows.length - validRows.length,
      },
    };
  }
}
