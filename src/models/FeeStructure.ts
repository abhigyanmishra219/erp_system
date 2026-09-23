import mongoose, { Schema, Document, Model } from "mongoose";

export type FeeFrequency =
  | "MONTHLY"
  | "QUARTERLY"
  | "HALF_YEARLY"
  | "ANNUAL"
  | "INSTALLMENT";

export const FEE_FREQUENCIES: FeeFrequency[] = [
  "MONTHLY",
  "QUARTERLY",
  "HALF_YEARLY",
  "ANNUAL",
  "INSTALLMENT",
];

export interface IFeeInstallment {
  name: string;
  amount: number;
  dueDate: Date;
  sequence: number;
}

export interface IFeeStructure extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  academicYearId: mongoose.Types.ObjectId | string;
  feeCategoryId: mongoose.Types.ObjectId | string;
  name: string;
  description?: string;
  classId: mongoose.Types.ObjectId | string;
  sectionId?: mongoose.Types.ObjectId | string | null;
  amount: number;
  frequency: FeeFrequency;
  installments: IFeeInstallment[];
  effectiveFrom?: Date;
  effectiveTo?: Date;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const FeeInstallmentSchema = new Schema<IFeeInstallment>(
  {
    name: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: [0, "Installment amount cannot be negative"] },
    dueDate: { type: Date, required: true },
    sequence: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const FeeStructureSchema = new Schema<IFeeStructure>(
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
    feeCategoryId: {
      type: Schema.Types.ObjectId,
      ref: "FeeCategory",
      required: [true, "Fee Category ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Fee structure name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class ID is required"],
      index: true,
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      default: null,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Fee amount is required"],
      min: [1, "Fee amount must be greater than zero"],
    },
    frequency: {
      type: String,
      enum: FEE_FREQUENCIES,
      default: "ANNUAL",
      required: true,
    },
    installments: {
      type: [FeeInstallmentSchema],
      default: [],
    },
    effectiveFrom: {
      type: Date,
    },
    effectiveTo: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
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

// Indexes
FeeStructureSchema.index({ schoolId: 1, academicYearId: 1, classId: 1, sectionId: 1 });
FeeStructureSchema.index({ schoolId: 1, isActive: 1 });

const FeeStructure: Model<IFeeStructure> =
  mongoose.models.FeeStructure ||
  mongoose.model<IFeeStructure>("FeeStructure", FeeStructureSchema);

export default FeeStructure;
