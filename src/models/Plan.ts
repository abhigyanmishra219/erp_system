import mongoose, { Schema, Document, Model } from "mongoose";
import { SCHOOL_MODULES, SchoolModule } from "@/lib/validation/school";

export const BILLING_PERIODS = ["MONTHLY", "QUARTERLY", "YEARLY"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

export interface IPlan extends Document {
  name: string;
  code: string;
  description: string;
  maxStudents: number;
  storageLimit: number; // in Megabytes (MB)
  maxAdmins: number;
  enabledModules: SchoolModule[];
  price: number;
  currency: string;
  billingPeriod: BillingPeriod;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    name: {
      type: String,
      required: [true, "Plan name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Plan code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    maxStudents: {
      type: Number,
      required: [true, "Maximum students limit is required"],
      min: [1, "Max students must be at least 1"],
      default: 200,
    },
    storageLimit: {
      type: Number,
      required: [true, "Storage limit is required"],
      min: [100, "Storage limit must be at least 100 MB"],
      default: 5120, // 5 GB in MB
    },
    maxAdmins: {
      type: Number,
      required: true,
      min: [1, "Max admins must be at least 1"],
      default: 2,
    },
    enabledModules: {
      type: [String],
      enum: SCHOOL_MODULES,
      default: [
        "ATTENDANCE",
        "ASSIGNMENTS",
        "STUDY_MATERIAL",
        "EXAMS",
        "RESULTS",
        "FEES",
        "NOTICES",
        "NOTIFICATIONS",
      ],
    },
    price: {
      type: Number,
      required: [true, "Plan price is required"],
      min: [0, "Price cannot be negative"],
      default: 0,
    },
    currency: {
      type: String,
      trim: true,
      uppercase: true,
      default: "INR",
    },
    billingPeriod: {
      type: String,
      enum: BILLING_PERIODS,
      default: "YEARLY",
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

// Compound index for active plans search & sort
PlanSchema.index({ isActive: 1, code: 1 });
PlanSchema.index({ createdAt: -1 });

// Prevent mongoose model overwrite error during Next.js hot reload
const Plan: Model<IPlan> =
  (mongoose.models && (mongoose.models.Plan as Model<IPlan>)) ||
  mongoose.model<IPlan>("Plan", PlanSchema);

export default Plan;
