import mongoose, { Schema, Document, Model } from "mongoose";

export type NotificationType =
  | "NOTICE"
  | "ASSIGNMENT"
  | "ATTENDANCE"
  | "RESULT"
  | "FEE"
  | "EXAM"
  | "TIMETABLE"
  | "LEAVE";

export type NotificationReferenceType =
  | "NOTICE"
  | "ASSIGNMENT"
  | "ATTENDANCE"
  | "RESULT"
  | "FEE"
  | "EXAM"
  | "TIMETABLE"
  | "LEAVE"
  | "NONE";

export interface INotification extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  recipientUserId: mongoose.Types.ObjectId | string;
  type: NotificationType;
  title: string;
  message: string;
  referenceType: NotificationReferenceType;
  referenceId?: string | null;
  actionUrl?: string | null;
  isRead: boolean;
  readAt?: Date | null;
  expiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    recipientUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recipient user ID is required"],
      index: true,
    },
    type: {
      type: String,
      enum: [
        "NOTICE",
        "ASSIGNMENT",
        "ATTENDANCE",
        "RESULT",
        "FEE",
        "EXAM",
        "TIMETABLE",
      ],
      required: [true, "Notification type is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Notification title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    message: {
      type: String,
      required: [true, "Notification message is required"],
      trim: true,
      maxlength: [500, "Message cannot exceed 500 characters"],
    },
    referenceType: {
      type: String,
      enum: [
        "NOTICE",
        "ASSIGNMENT",
        "ATTENDANCE",
        "RESULT",
        "FEE",
        "EXAM",
        "TIMETABLE",
        "NONE",
      ],
      default: "NONE",
    },
    referenceId: {
      type: String,
      default: null,
    },
    actionUrl: {
      type: String,
      default: null,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for user inbox queries and publication idempotency
NotificationSchema.index({ schoolId: 1, recipientUserId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ schoolId: 1, recipientUserId: 1, referenceType: 1, referenceId: 1, type: 1 });

const Notification: Model<INotification> =
  mongoose.models.Notification ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
