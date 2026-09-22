import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudentParent extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  studentId: mongoose.Types.ObjectId | string;
  parentId: mongoose.Types.ObjectId | string;
  relationship: "FATHER" | "MOTHER" | "GUARDIAN" | "OTHER";
  isPrimaryGuardian: boolean;
  isEmergencyContact: boolean;
  canPickup: boolean;
  notes?: string;
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentParentSchema = new Schema<IStudentParent>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student ID is required"],
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Parent",
      required: [true, "Parent ID is required"],
      index: true,
    },
    relationship: {
      type: String,
      enum: ["FATHER", "MOTHER", "GUARDIAN", "OTHER"],
      default: "GUARDIAN",
    },
    isPrimaryGuardian: {
      type: Boolean,
      default: false,
    },
    isEmergencyContact: {
      type: Boolean,
      default: false,
    },
    canPickup: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      trim: true,
      default: "",
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

// Compound indexes
StudentParentSchema.index(
  { schoolId: 1, studentId: 1, parentId: 1 },
  { unique: true }
);
StudentParentSchema.index({ schoolId: 1, parentId: 1 });
StudentParentSchema.index({ schoolId: 1, studentId: 1, isPrimaryGuardian: 1 });

const StudentParent: Model<IStudentParent> =
  mongoose.models.StudentParent ||
  mongoose.model<IStudentParent>("StudentParent", StudentParentSchema);

export default StudentParent;
