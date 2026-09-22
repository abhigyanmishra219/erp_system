import mongoose, { Schema, Document, Model } from "mongoose";

export type ExamStatus = "DRAFT" | "SCHEDULED" | "ONGOING" | "COMPLETED" | "PUBLISHED";

export interface IExam extends Document {
  _id: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;
  academicYearId: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status: ExamStatus;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema = new Schema<IExam>(
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
    name: {
      type: String,
      required: [true, "Exam name is required"],
      trim: true,
      maxlength: [100, "Exam name cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
      default: "",
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
      enum: ["DRAFT", "SCHEDULED", "ONGOING", "COMPLETED", "PUBLISHED"],
      default: "SCHEDULED",
      index: true,
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

// Compound Indexes for fast tenant & session queries
ExamSchema.index({ schoolId: 1, academicYearId: 1, status: 1 });
ExamSchema.index({ schoolId: 1, isActive: 1, startDate: -1 });

const Exam: Model<IExam> =
  mongoose.models.Exam || mongoose.model<IExam>("Exam", ExamSchema);

export default Exam;
