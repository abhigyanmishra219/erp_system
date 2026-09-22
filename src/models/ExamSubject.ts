import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExamSubject extends Document {
  _id: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;
  examId: mongoose.Types.ObjectId;
  academicYearId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  subjectId: mongoose.Types.ObjectId;
  examDate?: Date;
  maximumMarks: number;
  passingMarks: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExamSubjectSchema = new Schema<IExamSubject>(
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
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: [true, "Academic Year ID is required"],
      index: true,
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class ID is required"],
      index: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject ID is required"],
      index: true,
    },
    examDate: {
      type: Date,
      default: null,
    },
    maximumMarks: {
      type: Number,
      required: [true, "Maximum marks are required"],
      min: [1, "Maximum marks must be greater than zero"],
    },
    passingMarks: {
      type: Number,
      required: [true, "Passing marks are required"],
      min: [0, "Passing marks cannot be negative"],
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

// Compound Unique Index: One exam subject per (school, exam, class, subject)
ExamSubjectSchema.index(
  { schoolId: 1, examId: 1, classId: 1, subjectId: 1 },
  { unique: true }
);
ExamSubjectSchema.index({ schoolId: 1, examId: 1, isActive: 1 });

const ExamSubject: Model<IExamSubject> =
  mongoose.models.ExamSubject ||
  mongoose.model<IExamSubject>("ExamSubject", ExamSubjectSchema);

export default ExamSubject;
