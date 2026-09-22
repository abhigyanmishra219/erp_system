import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClassSubject extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  academicYearId: mongoose.Types.ObjectId | string;
  classId: mongoose.Types.ObjectId | string;
  subjectId: mongoose.Types.ObjectId | string;
  maximumMarks: number;
  passingMarks: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const ClassSubjectSchema = new Schema<IClassSubject>(
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
    maximumMarks: {
      type: Number,
      required: [true, "Maximum marks is required"],
      default: 100,
      min: [1, "Maximum marks must be greater than 0"],
    },
    passingMarks: {
      type: Number,
      required: [true, "Passing marks is required"],
      default: 33,
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

// Compound unique index: duplicate subject assignment to same class in same academic year prevented
ClassSubjectSchema.index(
  { schoolId: 1, academicYearId: 1, classId: 1, subjectId: 1 },
  { unique: true }
);
ClassSubjectSchema.index({ schoolId: 1, classId: 1, isActive: 1 });
ClassSubjectSchema.index({ schoolId: 1, subjectId: 1, isActive: 1 });

const ClassSubject: Model<IClassSubject> =
  (mongoose.models && (mongoose.models.ClassSubject as Model<IClassSubject>)) ||
  mongoose.model<IClassSubject>("ClassSubject", ClassSubjectSchema);

export default ClassSubject;
