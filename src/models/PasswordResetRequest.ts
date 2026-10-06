import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPasswordResetRequest extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  verifiedAt?: Date | null;
  resetTokenHash?: string | null;
  resetTokenExpiresAt?: Date | null;
  usedAt?: Date | null;
  createdAt: Date;
  ttlExpiresAt: Date;
}

const PasswordResetRequestSchema = new Schema<IPasswordResetRequest>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      index: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    resetTokenHash: {
      type: String,
      default: null,
      index: true,
    },
    resetTokenExpiresAt: {
      type: Date,
      default: null,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    ttlExpiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // Clean up after 24 hours
      index: { expires: 0 }, // MongoDB TTL index
    },
  },
  {
    timestamps: false,
  }
);

// Prevent mongoose model overwrite error during Next.js hot reload
if (mongoose.models && mongoose.models.PasswordResetRequest) {
  delete (mongoose.models as Record<string, unknown>).PasswordResetRequest;
}

const PasswordResetRequest: Model<IPasswordResetRequest> =
  (mongoose.models &&
    (mongoose.models.PasswordResetRequest as Model<IPasswordResetRequest>)) ||
  mongoose.model<IPasswordResetRequest>(
    "PasswordResetRequest",
    PasswordResetRequestSchema
  );

export default PasswordResetRequest;
