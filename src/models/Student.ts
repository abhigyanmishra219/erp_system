import mongoose, { Schema, Document, Model } from "mongoose";

export type StudentStatus = "ACTIVE" | "INACTIVE" | "TRANSFERRED" | "GRADUATED";
export type StudentGender = "MALE" | "FEMALE" | "OTHER";

export interface IAcademicRecord {
  academicYearId: mongoose.Types.ObjectId | string;
  classId: mongoose.Types.ObjectId | string;
  sectionId: mongoose.Types.ObjectId | string;
  rollNumber?: string;
  yearName?: string;
  className?: string;
  sectionName?: string;
  status: string;
  startDate?: Date;
  endDate?: Date;
}

export interface ITransferDetails {
  reason?: string;
  targetSchool?: string;
  transferCertificateNumber?: string;
  transferDate?: Date;
  notes?: string;
}

export interface IStudent extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  admissionNumber: string;
  studentId?: string;
  rollNumber?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth: Date;
  gender: StudentGender;
  bloodGroup?: string;
  avatarUrl?: string;

  // Current Academic Placement
  academicYearId: mongoose.Types.ObjectId | string;
  classId: mongoose.Types.ObjectId | string;
  sectionId: mongoose.Types.ObjectId | string;
  admissionDate: Date;
  status: StudentStatus;

  // Address & Contacts
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  emergencyContact?: {
    name?: string;
    relationship?: string;
    phone?: string;
  };
  medicalInfo?: {
    allergies?: string[];
    conditions?: string[];
    medications?: string[];
    notes?: string;
  };

  // History & Lifecycle
  academicHistory: IAcademicRecord[];
  transferDetails?: ITransferDetails;

  // Associated User Login Account
  userId?: mongoose.Types.ObjectId | string | null;

  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const AcademicRecordSchema = new Schema<IAcademicRecord>(
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

const StudentSchema = new Schema<IStudent>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    admissionNumber: {
      type: String,
      required: [true, "Admission Number is required"],
      trim: true,
      uppercase: true,
    },
    studentId: {
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
      trim: true,
      lowercase: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    dateOfBirth: {
      type: Date,
      required: [true, "Date of birth is required"],
    },
    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
      required: [true, "Gender is required"],
    },
    bloodGroup: {
      type: String,
      trim: true,
      default: "",
    },
    avatarUrl: {
      type: String,
      trim: true,
      default: "",
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
    address: {
      street: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      postalCode: { type: String, trim: true, default: "" },
      country: { type: String, trim: true, default: "" },
    },
    emergencyContact: {
      name: { type: String, trim: true, default: "" },
      relationship: { type: String, trim: true, default: "" },
      phone: { type: String, trim: true, default: "" },
    },
    medicalInfo: {
      allergies: { type: [String], default: [] },
      conditions: { type: [String], default: [] },
      medications: { type: [String], default: [] },
      notes: { type: String, default: "" },
    },
    academicHistory: {
      type: [AcademicRecordSchema],
      default: [],
    },
    transferDetails: {
      reason: { type: String, trim: true, default: "" },
      targetSchool: { type: String, trim: true, default: "" },
      transferCertificateNumber: { type: String, trim: true, default: "" },
      transferDate: { type: Date },
      notes: { type: String, trim: true, default: "" },
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

// Compound indexes for multi-tenant isolation and fast lookups
StudentSchema.index({ schoolId: 1, admissionNumber: 1 }, { unique: true });
StudentSchema.index(
  { schoolId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: {
      email: { $type: "string", $gt: "" },
    },
  }
);
StudentSchema.index({ schoolId: 1, status: 1 });
StudentSchema.index({ schoolId: 1, academicYearId: 1, classId: 1, sectionId: 1 });
StudentSchema.index({ schoolId: 1, firstName: 1, lastName: 1 });

const Student: Model<IStudent> =
  mongoose.models.Student || mongoose.model<IStudent>("Student", StudentSchema);

export default Student;
