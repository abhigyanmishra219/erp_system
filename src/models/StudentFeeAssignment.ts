import mongoose, { Schema, Document, Model } from "mongoose";

export type FeeReductionType = "FIXED" | "PERCENTAGE" | "NONE";

export interface IScheduledInstallment {
  name: string;
  amount: number;
  dueDate: Date;
  sequence: number;
  paidAmount: number;
  status: "UNPAID" | "PARTIALLY_PAID" | "PAID";
}

export interface IStudentFeeAssignment extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  academicYearId: mongoose.Types.ObjectId | string;
  studentId: mongoose.Types.ObjectId | string;
  feeStructureId: mongoose.Types.ObjectId | string;
  baseAmount: number;
  discountType: FeeReductionType;
  discountValue: number;
  discountAmount: number;
  concessionReason?: string;
  concessionType: FeeReductionType;
  concessionValue: number;
  concessionAmount: number;
  netAmount: number;
  dueSchedule: IScheduledInstallment[];
  status: "ACTIVE" | "CANCELLED";
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const ScheduledInstallmentSchema = new Schema<IScheduledInstallment>(
  {
    name: { type: String, required: true },
    amount: { type: Number, required: true },
    dueDate: { type: Date, required: true },
    sequence: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["UNPAID", "PARTIALLY_PAID", "PAID"],
      default: "UNPAID",
    },
  },
  { _id: false }
);

const StudentFeeAssignmentSchema = new Schema<IStudentFeeAssignment>(
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
    feeStructureId: {
      type: Schema.Types.ObjectId,
      ref: "FeeStructure",
      required: [true, "Fee Structure ID is required"],
      index: true,
    },
    baseAmount: {
      type: Number,
      required: true,
      min: [0, "Base amount cannot be negative"],
    },
    discountType: {
      type: String,
      enum: ["FIXED", "PERCENTAGE", "NONE"],
      default: "NONE",
    },
    discountValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    concessionReason: {
      type: String,
      trim: true,
      default: "",
    },
    concessionType: {
      type: String,
      enum: ["FIXED", "PERCENTAGE", "NONE"],
      default: "NONE",
    },
    concessionValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    concessionAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    netAmount: {
      type: Number,
      required: true,
      min: [0, "Net amount cannot be negative"],
    },
    dueSchedule: {
      type: [ScheduledInstallmentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["ACTIVE", "CANCELLED"],
      default: "ACTIVE",
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate assignment of the same fee structure to the same student in an academic year
StudentFeeAssignmentSchema.index(
  { schoolId: 1, academicYearId: 1, studentId: 1, feeStructureId: 1 },
  { unique: true }
);

const StudentFeeAssignment: Model<IStudentFeeAssignment> =
  mongoose.models.StudentFeeAssignment ||
  mongoose.model<IStudentFeeAssignment>("StudentFeeAssignment", StudentFeeAssignmentSchema);

export default StudentFeeAssignment;
