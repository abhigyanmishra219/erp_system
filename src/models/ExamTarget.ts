import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExamTarget extends Document {
  _id: mongoose.Types.ObjectId;
  schoolId: mongoose.Types.ObjectId;
  examId: mongoose.Types.ObjectId;
  academicYearId: mongoose.Types.ObjectId;
  classId: mongoose.Types.ObjectId;
  sectionId: mongoose.Types.ObjectId;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  updatedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ExamTargetSchema = new Schema<IExamTarget>(
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
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      required: [true, "Section ID is required"],
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

// Compound Unique Index: One exam target per (school, exam, class, section)
ExamTargetSchema.index(
  { schoolId: 1, examId: 1, classId: 1, sectionId: 1 },
  { unique: true }
);
ExamTargetSchema.index({ schoolId: 1, classId: 1, sectionId: 1, isActive: 1 });

const ExamTarget: Model<IExamTarget> =
  mongoose.models.ExamTarget ||
  mongoose.model<IExamTarget>("ExamTarget", ExamTargetSchema);

export default ExamTarget;
