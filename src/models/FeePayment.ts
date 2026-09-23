import mongoose, { Schema, Document, Model } from "mongoose";

export type PaymentMethod =
  | "CASH"
  | "BANK_TRANSFER"
  | "CHEQUE"
  | "UPI"
  | "OTHER";

export const PAYMENT_METHODS: PaymentMethod[] = [
  "CASH",
  "BANK_TRANSFER",
  "CHEQUE",
  "UPI",
  "OTHER",
];

export interface IFeePayment extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  academicYearId: mongoose.Types.ObjectId | string;
  studentId: mongoose.Types.ObjectId | string;
  feeAccountId: mongoose.Types.ObjectId | string;
  amount: number;
  paymentDate: Date;
  paymentMethod: PaymentMethod;
  transactionId?: string;
  receiptNumber: string;
  remarks?: string;
  status: "ACTIVE" | "REVERSED";
  reversedAt?: Date;
  reversedBy?: mongoose.Types.ObjectId | string;
  reversalReason?: string;
  recordedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const FeePaymentSchema = new Schema<IFeePayment>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: [true, "Academic Year ID is required"],
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student ID is required"],
      index: true,
    },
    feeAccountId: {
      type: Schema.Types.ObjectId,
      ref: "StudentFeeAccount",
      required: [true, "Fee Account ID is required"],
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [1, "Payment amount must be greater than zero"],
    },
    paymentDate: {
      type: Date,
      required: [true, "Payment date is required"],
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      enum: PAYMENT_METHODS,
      required: [true, "Payment method is required"],
    },
    transactionId: {
      type: String,
      trim: true,
      default: "",
    },
    receiptNumber: {
      type: String,
      required: [true, "Receipt number is required"],
      trim: true,
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "REVERSED"],
      default: "ACTIVE",
      index: true,
    },
    reversedAt: {
      type: Date,
    },
    reversedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reversalReason: {
      type: String,
      trim: true,
      default: "",
    },
    recordedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast lookup and receipt uniqueness
FeePaymentSchema.index({ schoolId: 1, receiptNumber: 1 }, { unique: true });
FeePaymentSchema.index({ schoolId: 1, academicYearId: 1, studentId: 1 });
FeePaymentSchema.index({ feeAccountId: 1 });
FeePaymentSchema.index({ schoolId: 1, paymentDate: -1 });

const FeePayment: Model<IFeePayment> =
  mongoose.models.FeePayment ||
  mongoose.model<IFeePayment>("FeePayment", FeePaymentSchema);

export default FeePayment;
