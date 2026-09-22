import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISubject extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  name: string;
  code: string;
  description?: string;
  subjectType: "CORE" | "ELECTIVE";
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const SubjectSchema = new Schema<ISubject>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Subject name is required (e.g. Mathematics)"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Subject code is required (e.g. MATH)"],
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    subjectType: {
      type: String,
      enum: ["CORE", "ELECTIVE"],
      default: "CORE",
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

// Compound unique index: duplicate subject codes within same school prevented
SubjectSchema.index({ schoolId: 1, code: 1 }, { unique: true });
SubjectSchema.index({ schoolId: 1, isActive: 1 });

const Subject: Model<ISubject> =
  (mongoose.models && (mongoose.models.Subject as Model<ISubject>)) ||
  mongoose.model<ISubject>("Subject", SubjectSchema);

export default Subject;
