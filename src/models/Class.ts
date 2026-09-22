import mongoose, { Schema, Document, Model } from "mongoose";

export interface IClass extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  academicYearId: mongoose.Types.ObjectId | string;
  name: string;
  code?: string;
  displayOrder: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const ClassSchema = new Schema<IClass>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: [true, "Academic Year ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Class name is required (e.g. Class 10, Grade 1, Nursery)"],
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    displayOrder: {
      type: Number,
      default: 0,
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

// Compound unique index: duplicate class names within same school + academic year prevented
ClassSchema.index({ schoolId: 1, academicYearId: 1, name: 1 }, { unique: true });
ClassSchema.index({ schoolId: 1, academicYearId: 1, displayOrder: 1 });
ClassSchema.index({ schoolId: 1, isActive: 1 });

const Class: Model<IClass> =
  (mongoose.models && (mongoose.models.Class as Model<IClass>)) ||
  mongoose.model<IClass>("Class", ClassSchema);

export default Class;
