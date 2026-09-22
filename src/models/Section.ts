import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISection extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  academicYearId: mongoose.Types.ObjectId | string;
  classId: mongoose.Types.ObjectId | string;
  name: string;
  code?: string;
  capacity: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const SectionSchema = new Schema<ISection>(
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
    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Section name is required (e.g. A, B, Red, Blue)"],
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    capacity: {
      type: Number,
      default: 40,
      min: [1, "Capacity must be at least 1"],
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

// Compound unique index: duplicate section names within same school + academic year + class prevented
SectionSchema.index({ schoolId: 1, academicYearId: 1, classId: 1, name: 1 }, { unique: true });
SectionSchema.index({ schoolId: 1, classId: 1, isActive: 1 });

const Section: Model<ISection> =
  (mongoose.models && (mongoose.models.Section as Model<ISection>)) ||
  mongoose.model<ISection>("Section", SectionSchema);

export default Section;
