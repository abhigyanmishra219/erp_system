import mongoose, { Schema, Document, Model } from "mongoose";

export type StudyMaterialType =
  | "PDF"
  | "IMAGE"
  | "DOCUMENT"
  | "PRESENTATION"
  | "VIDEO"
  | "EXTERNAL_LINK";

export interface IStudyMaterial extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  academicYearId: mongoose.Types.ObjectId | string;
  classId: mongoose.Types.ObjectId | string;
  subjectId: mongoose.Types.ObjectId | string;
  topic: string;
  title: string;
  description: string;
  type: StudyMaterialType;
  url: string;
  fileName?: string;
  fileSize?: number | null;
  mimeType?: string;
  teacherId: mongoose.Types.ObjectId | string;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const StudyMaterialSchema = new Schema<IStudyMaterial>(
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
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      required: [true, "Subject ID is required"],
      index: true,
    },
    topic: {
      type: String,
      required: [true, "Topic is required"],
      trim: true,
      maxlength: [120, "Topic cannot exceed 120 characters"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    type: {
      type: String,
      enum: ["PDF", "IMAGE", "DOCUMENT", "PRESENTATION", "VIDEO", "EXTERNAL_LINK"],
      required: [true, "Study material type is required"],
      index: true,
    },
    url: {
      type: String,
      required: [true, "Material URL or resource link is required"],
      trim: true,
    },
    fileName: {
      type: String,
      trim: true,
      default: "",
    },
    fileSize: {
      type: Number,
      default: null,
    },
    mimeType: {
      type: String,
      trim: true,
      default: "",
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher ID is required"],
      index: true,
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

// Hierarchy and Query Indexes
StudyMaterialSchema.index({
  schoolId: 1,
  academicYearId: 1,
  classId: 1,
  subjectId: 1,
  topic: 1,
  isActive: 1,
});
StudyMaterialSchema.index({ schoolId: 1, teacherId: 1, isActive: 1, createdAt: -1 });
StudyMaterialSchema.index({ schoolId: 1, type: 1, isActive: 1 });

const StudyMaterial: Model<IStudyMaterial> =
  (mongoose.models && (mongoose.models.StudyMaterial as Model<IStudyMaterial>)) ||
  mongoose.model<IStudyMaterial>("StudyMaterial", StudyMaterialSchema);

export default StudyMaterial;
