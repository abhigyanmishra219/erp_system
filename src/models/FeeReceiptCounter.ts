import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFeeReceiptCounter extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  academicYearId: mongoose.Types.ObjectId | string;
  prefix: string;
  seq: number;
  updatedAt: Date;
}

const FeeReceiptCounterSchema = new Schema<IFeeReceiptCounter>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: true,
      index: true,
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: true,
      index: true,
    },
    prefix: {
      type: String,
      default: "REC",
      trim: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

FeeReceiptCounterSchema.index(
  { schoolId: 1, academicYearId: 1, prefix: 1 },
  { unique: true }
);

const FeeReceiptCounter: Model<IFeeReceiptCounter> =
  mongoose.models.FeeReceiptCounter ||
  mongoose.model<IFeeReceiptCounter>("FeeReceiptCounter", FeeReceiptCounterSchema);

export default FeeReceiptCounter;
