import mongoose, { Schema, Document, Model } from "mongoose";

export type ImportType =
  | "STUDENTS"
  | "PARENTS"
  | "TEACHERS"
  | "CLASSES"
  | "SECTIONS"
  | "FEES";

export type ImportStatus =
  | "UPLOADED"
  | "MAPPED"
  | "VALIDATED"
  | "IMPORTING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

export interface IValidationError {
  rowNumber: number;
  field: string;
  value: string;
  errorCode: string;
  message: string;
  isWarning?: boolean;
}

export interface IImportSession extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  userId: mongoose.Types.ObjectId | string;
  type: ImportType;
  status: ImportStatus;
  fileName: string;
  fileSize: number;
  parsedHeaders: string[];
  columnMapping: Record<string, string>; // ERP Field Key -> Excel Header
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedRows: number;
  failedRows: number;
  skippedRows: number;
  // Raw parsed rows stored temporarily during wizard workflow
  rowsData: any[];
  validationErrors: IValidationError[];
  summary?: Record<string, unknown>;
  errorMessage?: string;
  createdAt: Date;
  completedAt?: Date;
}

const ValidationErrorSchema = new Schema<IValidationError>(
  {
    rowNumber: { type: Number, required: true },
    field: { type: String, required: true },
    value: { type: String, default: "" },
    errorCode: { type: String, required: true },
    message: { type: String, required: true },
    isWarning: { type: Boolean, default: false },
  },
  { _id: false }
);

const ImportSessionSchema = new Schema<IImportSession>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    type: {
      type: String,
      enum: ["STUDENTS", "PARENTS", "TEACHERS", "CLASSES", "SECTIONS", "FEES"],
      required: true,
    },
    status: {
      type: String,
      enum: [
        "UPLOADED",
        "MAPPED",
        "VALIDATED",
        "IMPORTING",
        "COMPLETED",
        "FAILED",
        "CANCELLED",
      ],
      default: "UPLOADED",
      index: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    parsedHeaders: {
      type: [String],
      default: [],
    },
    columnMapping: {
      type: Map,
      of: String,
      default: {},
    },
    totalRows: {
      type: Number,
      default: 0,
    },
    validRows: {
      type: Number,
      default: 0,
    },
    invalidRows: {
      type: Number,
      default: 0,
    },
    importedRows: {
      type: Number,
      default: 0,
    },
    failedRows: {
      type: Number,
      default: 0,
    },
    skippedRows: {
      type: Number,
      default: 0,
    },
    rowsData: {
      type: Schema.Types.Mixed,
      default: [],
    },
    validationErrors: {
      type: [ValidationErrorSchema],
      default: [],
    },
    summary: {
      type: Schema.Types.Mixed,
      default: {},
    },
    errorMessage: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400 * 2, // 48 Hours TTL auto-cleanup for temporary import storage
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: false,
  }
);

// Compound indexes
ImportSessionSchema.index({ schoolId: 1, userId: 1, createdAt: -1 });
ImportSessionSchema.index({ schoolId: 1, status: 1 });

const ImportSession: Model<IImportSession> =
  mongoose.models.ImportSession ||
  mongoose.model<IImportSession>("ImportSession", ImportSessionSchema);

export default ImportSession;
