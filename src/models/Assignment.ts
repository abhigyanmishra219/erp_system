import mongoose, { Schema, Document, Model } from "mongoose";

export type AssignmentStatus = "PUBLISHED" | "DRAFT" | "ARCHIVED";

export interface IAssignmentAttachment {
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  type: "FILE" | "EXTERNAL_LINK";
}

export interface IAssignment extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  academicYearId: mongoose.Types.ObjectId | string;
  classId: mongoose.Types.ObjectId | string;
  sectionId: mongoose.Types.ObjectId | string;
  subjectId: mongoose.Types.ObjectId | string;
  teacherId: mongoose.Types.ObjectId | string;
  title: string;
  description: string;
  assignedDate: Date;
  dueDate: Date;
  maximumMarks?: number | null;
  attachments: IAssignmentAttachment[];
  status: AssignmentStatus;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentAttachmentSchema = new Schema<IAssignmentAttachment>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true, default: "" },
    size: { type: Number, default: null },
    type: { type: String, enum: ["FILE", "EXTERNAL_LINK"], default: "EXTERNAL_LINK" },
  },
  { _id: false }
);

const AssignmentSchema = new Schema<IAssignment>(
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
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher ID is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Assignment title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Assignment description is required"],
      trim: true,
    },
    assignedDate: {
      type: Date,
      required: [true, "Assigned date is required"],
      index: true,
    },
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
      index: true,
    },
    maximumMarks: {
      type: Number,
      default: null,
      min: [0, "Maximum marks cannot be negative"],
    },
    attachments: {
      type: [AssignmentAttachmentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["PUBLISHED", "DRAFT", "ARCHIVED"],
      default: "PUBLISHED",
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

// High-efficiency Compound Indexes
AssignmentSchema.index({
  schoolId: 1,
  academicYearId: 1,
  classId: 1,
  sectionId: 1,
  subjectId: 1,
  isActive: 1,
  dueDate: 1,
});
AssignmentSchema.index({ schoolId: 1, teacherId: 1, isActive: 1, createdAt: -1 });
AssignmentSchema.index({ schoolId: 1, status: 1, dueDate: 1 });

const Assignment: Model<IAssignment> =
  (mongoose.models && (mongoose.models.Assignment as Model<IAssignment>)) ||
  mongoose.model<IAssignment>("Assignment", AssignmentSchema);

export default Assignment;
