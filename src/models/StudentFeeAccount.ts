import mongoose, { Schema, Document, Model } from "mongoose";

export type FeeAccountStatus = "PAID" | "PARTIALLY_PAID" | "PENDING" | "OVERDUE";

export interface IStudentFeeAccount extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  academicYearId: mongoose.Types.ObjectId | string;
  studentId: mongoose.Types.ObjectId | string;
  totalFee: number;
  discountAmount: number;
  concessionAmount: number;
  netFee: number;
  paidAmount: number;
  pendingAmount: number;
  lateFeeAmount: number;
  nextDueAmount: number;
  nextDueDate: Date | null;
  status: FeeAccountStatus;
  createdAt: Date;
  updatedAt: Date;
}

const StudentFeeAccountSchema = new Schema<IStudentFeeAccount>(
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
    totalFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    concessionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    netFee: {
      type: Number,
      default: 0,
      min: 0,
    },
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    pendingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    lateFeeAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextDueAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    nextDueDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["PAID", "PARTIALLY_PAID", "PENDING", "OVERDUE"],
      default: "PENDING",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// One fee account per student per academic year per school
StudentFeeAccountSchema.index(
  { schoolId: 1, academicYearId: 1, studentId: 1 },
  { unique: true }
);

const StudentFeeAccount: Model<IStudentFeeAccount> =
  mongoose.models.StudentFeeAccount ||
  mongoose.model<IStudentFeeAccount>("StudentFeeAccount", StudentFeeAccountSchema);

export default StudentFeeAccount;
