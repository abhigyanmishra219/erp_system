import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAcademicYear extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: "ACTIVE" | "INACTIVE";
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const AcademicYearSchema = new Schema<IAcademicYear>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Academic year name is required (e.g. 2026-27)"],
      trim: true,
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "INACTIVE",
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

// Compound unique index: A school cannot have duplicate academic year names
AcademicYearSchema.index({ schoolId: 1, name: 1 }, { unique: true });
AcademicYearSchema.index({ schoolId: 1, status: 1 });
AcademicYearSchema.index({ schoolId: 1, startDate: -1 });

const AcademicYear: Model<IAcademicYear> =
  (mongoose.models && (mongoose.models.AcademicYear as Model<IAcademicYear>)) ||
  mongoose.model<IAcademicYear>("AcademicYear", AcademicYearSchema);

export default AcademicYear;
