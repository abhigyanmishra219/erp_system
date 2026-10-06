import mongoose, { Schema, Document, Model } from "mongoose";
import { StudentStatus, IAcademicRecord, ITransferDetails } from "./Student";

export interface IStudentEnrollment extends Document {
  studentId: mongoose.Types.ObjectId | string;
  schoolId: mongoose.Types.ObjectId | string;
  academicYearId: mongoose.Types.ObjectId | string;
  classId: mongoose.Types.ObjectId | string;
  sectionId: mongoose.Types.ObjectId | string;
  admissionNumber: string;
  studentIdCode?: string;
  rollNumber?: string;
  admissionDate: Date;
  status: StudentStatus;
  academicHistory: IAcademicRecord[];
  transferDetails?: ITransferDetails;
  isDeleted: boolean;
  deletedAt: Date | null;
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const AcademicRecordSubSchema = new Schema<IAcademicRecord>(
  {
    academicYearId: { type: Schema.Types.ObjectId, ref: "AcademicYear", required: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    sectionId: { type: Schema.Types.ObjectId, ref: "Section", required: true },
    rollNumber: { type: String, trim: true, default: "" },
    yearName: { type: String, trim: true, default: "" },
    className: { type: String, trim: true, default: "" },
    sectionName: { type: String, trim: true, default: "" },
    status: { type: String, default: "ACTIVE" },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date },
  },
  { _id: false }
);

const StudentEnrollmentSchema = new Schema<IStudentEnrollment>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student reference ID is required"],
      index: true,
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School reference ID is required"],
      index: true,
    },
    academicYearId: {
      type: Schema.Types.ObjectId,
      ref: "AcademicYear",
      required: [true, "Academic Year is required"],
      index: true,
    },
    classId: {
      type: Schema.Types.ObjectId,
      ref: "Class",
      required: [true, "Class is required"],
      index: true,
    },
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      required: [true, "Section is required"],
      index: true,
    },
    admissionNumber: {
      type: String,
      required: [true, "Admission Number is required"],
      trim: true,
      uppercase: true,
    },
    studentIdCode: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    rollNumber: {
      type: String,
      trim: true,
      default: "",
    },
    admissionDate: {
      type: Date,
      required: [true, "Admission date is required"],
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE", "TRANSFERRED", "GRADUATED"],
      default: "ACTIVE",
      index: true,
    },
    academicHistory: {
      type: [AcademicRecordSubSchema],
      default: [],
    },
    transferDetails: {
      reason: { type: String, trim: true, default: "" },
      targetSchool: { type: String, trim: true, default: "" },
      transferCertificateNumber: { type: String, trim: true, default: "" },
      transferDate: { type: Date },
      notes: { type: String, trim: true, default: "" },
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

// Compound indexes for strict tenant isolation and uniqueness constraints
// 1. A student cannot have duplicate active enrollments in the same school
StudentEnrollmentSchema.index(
  { studentId: 1, schoolId: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

// 2. Admission number must be unique per school among active enrollments
StudentEnrollmentSchema.index(
  { schoolId: 1, admissionNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

// 3. Fast lookup indexes for directory listing and tenant isolation
StudentEnrollmentSchema.index({ schoolId: 1, isDeleted: 1, status: 1 });
StudentEnrollmentSchema.index({ schoolId: 1, academicYearId: 1, classId: 1, sectionId: 1, isDeleted: 1 });
StudentEnrollmentSchema.index({ studentId: 1, isDeleted: 1 });

const StudentEnrollment: Model<IStudentEnrollment> =
  mongoose.models.StudentEnrollment ||
  mongoose.model<IStudentEnrollment>("StudentEnrollment", StudentEnrollmentSchema);

export default StudentEnrollment;
