import mongoose, { Schema, Document, Model } from "mongoose";
import { UserRole } from "@/lib/constants/roles";

export type NoticeTargetType =
  | "SCHOOL"
  | "TEACHERS"
  | "STUDENTS"
  | "PARENTS"
  | "CLASS"
  | "SECTION";

export type NoticeStatus = "DRAFT" | "PUBLISHED" | "EXPIRED" | "ARCHIVED";

export interface INoticeAttachment {
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  type: "FILE" | "EXTERNAL_LINK";
}

export interface INotice extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  title: string;
  description: string;
  targetType: NoticeTargetType;
  targetClassId?: mongoose.Types.ObjectId | string | null;
  targetSectionId?: mongoose.Types.ObjectId | string | null;
  targetRoles: UserRole[];
  attachments: INoticeAttachment[];
  status: NoticeStatus;
  publishedAt?: Date | null;
  expiresAt?: Date | null;
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NoticeAttachmentSchema = new Schema<INoticeAttachment>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    mimeType: { type: String, trim: true, default: "" },
    size: { type: Number, default: null },
    type: { type: String, enum: ["FILE", "EXTERNAL_LINK"], default: "FILE" },
  },
  { _id: false }
);

const NoticeSchema = new Schema<INotice>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Notice title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      required: [true, "Notice description is required"],
      trim: true,
    },
    targetType: {
      type: String,
      enum: ["SCHOOL", "TEACHERS", "STUDENTS", "PARENTS", "CLASS", "SECTION"],
      required: [true, "Target audience type is required"],
      index: true,
    },
    targetClassId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      default: null,
      index: true,
    },
    targetSectionId: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      default: null,
      index: true,
    },
    targetRoles: {
      type: [String],
      default: [],
    },
    attachments: {
      type: [NoticeAttachmentSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["DRAFT", "PUBLISHED", "EXPIRED", "ARCHIVED"],
      default: "DRAFT",
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
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

// Compound indexes for fast tenant filtering & active status lookups
NoticeSchema.index({ schoolId: 1, status: 1, publishedAt: -1 });
NoticeSchema.index({ schoolId: 1, targetType: 1, isActive: 1 });
NoticeSchema.index({ schoolId: 1, targetClassId: 1, targetSectionId: 1 });

const Notice: Model<INotice> =
  mongoose.models.Notice || mongoose.model<INotice>("Notice", NoticeSchema);

export default Notice;
