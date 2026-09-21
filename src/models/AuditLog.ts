import mongoose, { Schema, Document, Model } from "mongoose";
import { UserRole, USER_ROLES } from "@/lib/constants/roles";
import { AUDIT_ACTIONS, AuditAction } from "@/lib/constants/audit";
export { AUDIT_ACTIONS, type AuditAction };

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId | string;
  userRole: UserRole;
  action: AuditAction | string;
  entityType: "SCHOOL" | "USER" | "PLAN" | "SUBSCRIPTION" | "PLATFORM" | string;
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
AuditLogSchema.index({ action: 1, createdAt: -1 });
AuditLogSchema.index({ createdAt: -1 });

const AuditLog: Model<IAuditLog> =
  (mongoose.models && (mongoose.models.AuditLog as Model<IAuditLog>)) ||
  mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
