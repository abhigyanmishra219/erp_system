import mongoose, { Schema, Document, Model } from "mongoose";

export type ResultStatus = "DRAFT" | "REVIEWED" | "PUBLISHED";

export interface IExamResult extends Document {
  _id: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;
  examId: mongoose.Types.ObjectId;
  examSubjectId: mongoose.Types.ObjectId;
  academicYearId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  sectionId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  marks: number | null;
  grade: string;
  isPassed: boolean;
  remarks?: string;
  status: ResultStatus;
  enteredBy: mongoose.Types.ObjectId;
  reviewedBy?: mongoose.Types.ObjectId | null;
  reviewedAt?: Date | null;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ExamResultSchema = new Schema<IExamResult>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    examId: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      required: [true, "Exam ID is required"],
      index: true,
    },
    examSubjectId: {
      type: Schema.Types.ObjectId,
      ref: "ExamSubject",
      required: [true, "Exam Subject ID is required"],
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
    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class ID is required"],
      index: true,
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      required: [true, "Section ID is required"],
      index: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject ID is required"],
      index: true,
    },
    marks: {
      type: Number,
      default: null,
    },
    grade: {
      type: String,
      default: "",
      trim: true,
    },
    isPassed: {
      type: Boolean,
      default: false,
    },
    remarks: {
      type: String,
      trim: true,
      maxlength: [500, "Remarks cannot exceed 500 characters"],
      default: "",
    },
    status: {
      type: String,
      enum: ["DRAFT", "REVIEWED", "PUBLISHED"],
      default: "DRAFT",
      index: true,
    },
    enteredBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Unique Index: One result per student per exam subject
ExamResultSchema.index(
  { schoolId: 1, examId: 1, examSubjectId: 1, studentId: 1 },
  { unique: true }
);

// Query Optimization Indexes
ExamResultSchema.index({ schoolId: 1, examId: 1, classId: 1, sectionId: 1, subjectId: 1 });
ExamResultSchema.index({ schoolId: 1, studentId: 1, examId: 1, status: 1 });
ExamResultSchema.index({ schoolId: 1, examId: 1, status: 1 });

const ExamResult: Model<IExamResult> =
  mongoose.models.ExamResult ||
  mongoose.model<IExamResult>("ExamResult", ExamResultSchema);

export default ExamResult;
