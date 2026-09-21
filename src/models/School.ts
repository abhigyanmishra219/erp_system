import mongoose, { Schema, Document, Model } from "mongoose";
import {
  SCHOOL_PLANS,
  SCHOOL_STATUSES,
  SUBSCRIPTION_STATUSES,
  SCHOOL_MODULES,
  SchoolPlan,
  SchoolStatus,
  SubscriptionStatus,
  SchoolModule,
} from "@/lib/validation/school";

export interface ISchool extends Document {
  name: string;
  code: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  logo?: string;
  website?: string;
  plan: string;
  studentLimit: number;
  subscriptionStartDate: Date;
  subscriptionExpiryDate: Date;
  subscriptionStatus: SubscriptionStatus;
  status: SchoolStatus;
  enabledModules: SchoolModule[];
  isDeleted: boolean;
  deletedAt: Date | null;
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const SchoolSchema = new Schema<ISchool>(
  {
    name: {
      type: String,
      required: [true, "School name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "School code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    address: {
      type: String,
      trim: true,
      default: "",
    },
    city: {
      type: String,
      trim: true,
      default: "",
    },
    state: {
      type: String,
      trim: true,
      default: "",
    },
    country: {
      type: String,
      trim: true,
      default: "India",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    logo: {
      type: String,
      trim: true,
      default: "",
    },
    website: {
      type: String,
      trim: true,
      default: "",
    },
    plan: {
      type: String,
      required: true,
      default: "BASIC",
      uppercase: true,
      trim: true,
      index: true,
    },
    studentLimit: {
      type: Number,
      default: 200,
      min: 1,
    },
    subscriptionStartDate: {
      type: Date,
      default: Date.now,
    },
    subscriptionExpiryDate: {
      type: Date,
      required: true,
    },
    subscriptionStatus: {
      type: String,
      enum: SUBSCRIPTION_STATUSES,
      default: "TRIAL",
      index: true,
    },
    status: {
      type: String,
      enum: SCHOOL_STATUSES,
      default: "ACTIVE",
      index: true,
    },
    enabledModules: {
      type: [String],
      enum: SCHOOL_MODULES,
      default: [
        "ATTENDANCE",
        "ASSIGNMENTS",
        "EXAMS",
        "RESULTS",
        "FEES",
        "NOTICES",
      ],
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
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

// Compound indexes for efficient search & filtering
SchoolSchema.index({ isDeleted: 1, status: 1, plan: 1 });
SchoolSchema.index({ isDeleted: 1, createdAt: -1 });

const School: Model<ISchool> =
  (mongoose.models && (mongoose.models.School as Model<ISchool>)) ||
  mongoose.model<ISchool>("School", SchoolSchema);

export default School;
