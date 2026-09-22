import mongoose, { Schema, Document, Model } from "mongoose";

export type ParentRelationship = "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";
export type ParentStatus = "ACTIVE" | "INACTIVE";

export interface IParent extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  relationship: ParentRelationship;
  occupation?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  status: ParentStatus;
  userId?: mongoose.Types.ObjectId | string | null;
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const ParentSchema = new Schema<IParent>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    relationship: {
      type: String,
      enum: ["FATHER", "MOTHER", "GUARDIAN", "OTHER"],
      default: "FATHER",
    },
    occupation: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      street: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      postalCode: { type: String, trim: true, default: "" },
      country: { type: String, trim: true, default: "" },
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
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
  },
  {
    timestamps: true,
  }
);

// Unique email per school for tenant isolation
ParentSchema.index({ schoolId: 1, email: 1 }, { unique: true });
ParentSchema.index({ schoolId: 1, status: 1 });
ParentSchema.index({ schoolId: 1, firstName: 1, lastName: 1 });

const Parent: Model<IParent> =
  mongoose.models.Parent || mongoose.model<IParent>("Parent", ParentSchema);

export default Parent;
