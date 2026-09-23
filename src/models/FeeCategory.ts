import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFeeCategory extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const FeeCategorySchema = new Schema<IFeeCategory>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Fee category name is required"],
      trim: true,
    },
    code: {
      type: String,
      required: [true, "Fee category code is required"],
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
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

// Compound indexes for tenant isolation and uniqueness
FeeCategorySchema.index({ schoolId: 1, code: 1 }, { unique: true });
FeeCategorySchema.index({ schoolId: 1, isActive: 1 });

const FeeCategory: Model<IFeeCategory> =
  mongoose.models.FeeCategory ||
  mongoose.model<IFeeCategory>("FeeCategory", FeeCategorySchema);

export default FeeCategory;
