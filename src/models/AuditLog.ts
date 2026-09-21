import mongoose, { Schema, Document, Model } from "mongoose";
import { UserRole, USER_ROLES } from "@/lib/constants/roles";

export const AUDIT_ACTIONS = [
  "SCHOOL_CREATED",
  "SCHOOL_UPDATED",
  "SCHOOL_STATUS_CHANGED",
  "SCHOOL_DELETED",
  "USER_CREATED",
  "USER_UPDATED",
  "USER_STATUS_CHANGED",
  "PLATFORM_SETTINGS_CHANGED",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId | string;
  userRole: UserRole;
  action: AuditAction | string;
  entityType: "SCHOOL" | "USER" | "PLATFORM" | string;
  entityId?: string | null;
  schoolId?: mongoose.Types.ObjectId | string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    userRole: {
      type: String,
      enum: USER_ROLES,
      required: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      default: null,
      index: true,
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      default: null,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: false, // We use explicit createdAt
  }
);

// Compound index for timeline queries
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ schoolId: 1, createdAt: -1 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
