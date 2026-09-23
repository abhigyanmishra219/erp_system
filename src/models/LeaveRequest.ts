import mongoose, { Schema, Document, Model } from "mongoose";

export const LEAVE_APPLICANT_ROLES = ["STUDENT", "PARENT", "TEACHER"] as const;
export type LeaveApplicantRole = (typeof LEAVE_APPLICANT_ROLES)[number];

export const LEAVE_STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"] as const;
export type LeaveStatus = (typeof LEAVE_STATUSES)[number];

export interface ILeaveAttachment {
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
}

export interface ILeaveRequest extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  applicantUserId: mongoose.Types.ObjectId | string;
  applicantRole: LeaveApplicantRole;
  studentId?: mongoose.Types.ObjectId | string | null;
  teacherId?: mongoose.Types.ObjectId | string | null;
  fromDate: Date;
  toDate: Date;
  reason: string;
  attachments: ILeaveAttachment[];
  status: LeaveStatus;
  reviewedBy?: mongoose.Types.ObjectId | string | null;
  reviewedAt?: Date | null;
  rejectionReason?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LeaveAttachmentSchema = new Schema<ILeaveAttachment>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true, default: "" },
    size: { type: Number, default: null },
  },
  { _id: false }
);

const LeaveRequestSchema = new Schema<ILeaveRequest>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    applicantUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Applicant User ID is required"],
      index: true,
    },
    applicantRole: {
      type: String,
      enum: LEAVE_APPLICANT_ROLES,
      required: [true, "Applicant role is required"],
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      default: null,
      index: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
      index: true,
    },
    fromDate: {
      type: Date,
      required: [true, "From date is required"],
      index: true,
    },
    toDate: {
      type: Date,
      required: [true, "To date is required"],
      index: true,
    },
    reason: {
      type: String,
      required: [true, "Leave reason is required"],
      trim: true,
      maxlength: [1000, "Reason cannot exceed 1000 characters"],
    },
    attachments: {
      type: [LeaveAttachmentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: LEAVE_STATUSES,
      default: "PENDING",
      index: true,
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
    rejectionReason: {
      type: String,
      trim: true,
      default: null,
      maxlength: [1000, "Rejection reason cannot exceed 1000 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for optimal leave queries and timeline sorting
LeaveRequestSchema.index({ schoolId: 1, applicantUserId: 1, status: 1, createdAt: -1 });
LeaveRequestSchema.index({ schoolId: 1, studentId: 1, status: 1 });
LeaveRequestSchema.index({ schoolId: 1, teacherId: 1, status: 1 });
LeaveRequestSchema.index({ schoolId: 1, status: 1, fromDate: -1 });
LeaveRequestSchema.index({ schoolId: 1, isActive: 1, createdAt: -1 });

const LeaveRequest: Model<ILeaveRequest> =
  (mongoose.models && (mongoose.models.LeaveRequest as Model<ILeaveRequest>)) ||
  mongoose.model<ILeaveRequest>("LeaveRequest", LeaveRequestSchema);

export default LeaveRequest;
