import mongoose, { Schema, Document, Model } from "mongoose";
import { IAssignmentAttachment } from "./Assignment";

export type SubmissionStatus = "PENDING" | "SUBMITTED" | "LATE" | "REVIEWED";

export interface IAssignmentSubmission extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  assignmentId: mongoose.Types.ObjectId | string;
  studentId: mongoose.Types.ObjectId | string;
  academicYearId: mongoose.Types.ObjectId | string;
  classId: mongoose.Types.ObjectId | string;
  sectionId: mongoose.Types.ObjectId | string;
  submittedAt: Date;
  status: SubmissionStatus;
  content: string;
  attachments: IAssignmentAttachment[];
  marks?: number | null;
  feedback?: string;
  reviewedBy?: mongoose.Types.ObjectId | string | null;
  reviewedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionAttachmentSchema = new Schema<IAssignmentAttachment>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true, default: "" },
    size: { type: Number, default: null },
    type: { type: String, enum: ["FILE", "EXTERNAL_LINK"], default: "EXTERNAL_LINK" },
  },
  { _id: false }
);

const AssignmentSubmissionSchema = new Schema<IAssignmentSubmission>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assignment",
      required: [true, "Assignment ID is required"],
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student ID is required"],
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
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "SUBMITTED", "LATE", "REVIEWED"],
      default: "SUBMITTED",
      index: true,
    },
    content: {
      type: String,
      trim: true,
      default: "",
    },
    attachments: {
      type: [SubmissionAttachmentSchema],
      default: [],
    },
    marks: {
      type: Number,
      default: null,
      min: [0, "Marks cannot be negative"],
    },
    feedback: {
      type: String,
      trim: true,
      default: "",
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
  },
  {
    timestamps: true,
  }
);

// Compound Unique Index: One submission document per student per assignment per school
AssignmentSubmissionSchema.index(
  { schoolId: 1, assignmentId: 1, studentId: 1 },
  { unique: true, name: "unique_student_assignment_submission" }
);

// High-efficiency Query Indexes
AssignmentSubmissionSchema.index({ schoolId: 1, assignmentId: 1, status: 1 });
AssignmentSubmissionSchema.index({ schoolId: 1, studentId: 1, status: 1 });
AssignmentSubmissionSchema.index({ schoolId: 1, academicYearId: 1, classId: 1, sectionId: 1 });

const AssignmentSubmission: Model<IAssignmentSubmission> =
  (mongoose.models && (mongoose.models.AssignmentSubmission as Model<IAssignmentSubmission>)) ||
  mongoose.model<IAssignmentSubmission>("AssignmentSubmission", AssignmentSubmissionSchema);

export default AssignmentSubmission;
