import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITeacher extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  teacherId: string;
  employeeId?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  photo?: string;
  dateOfBirth?: Date;
  gender: "MALE" | "FEMALE" | "OTHER";
  phone?: string;
  email?: string;
  alternatePhone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  qualification?: string;
  department?: string;
  designation?: string;
  joiningDate?: Date;
  status: "ACTIVE" | "INACTIVE";
  userId?: mongoose.Types.ObjectId | string | null;
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherSchema = new Schema<ITeacher>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    teacherId: {
      type: String,
      required: [true, "Teacher ID is required"],
      trim: true,
    },
    employeeId: {
      type: String,
      trim: true,
      default: "",
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    middleName: {
      type: String,
      trim: true,
      default: "",
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },
    photo: {
      type: String,
      trim: true,
      default: "",
    },
    dateOfBirth: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER"],
      default: "MALE",
      required: true,
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
    alternatePhone: {
      type: String,
      trim: true,
      default: "",
    },
    address: {
      street: { type: String, trim: true, default: "" },
      city: { type: String, trim: true, default: "" },
      state: { type: String, trim: true, default: "" },
      postalCode: { type: String, trim: true, default: "" },
      country: { type: String, trim: true, default: "India" },
    },
    qualification: {
      type: String,
      trim: true,
      default: "",
    },
    department: {
      type: String,
      trim: true,
      default: "",
    },
    designation: {
      type: String,
      trim: true,
      default: "Teacher",
    },
    joiningDate: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
      index: true,
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

// Indexes
TeacherSchema.index({ schoolId: 1, teacherId: 1 }, { unique: true });

TeacherSchema.index(
  { schoolId: 1, email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: "string", $gt: "" } },
  }
);

TeacherSchema.index(
  { schoolId: 1, employeeId: 1 },
  {
    unique: true,
    partialFilterExpression: { employeeId: { $type: "string", $gt: "" } },
  }
);

TeacherSchema.index({ schoolId: 1, status: 1 });
TeacherSchema.index({ schoolId: 1, department: 1 });
TeacherSchema.index({ schoolId: 1, firstName: 1, lastName: 1 });

const Teacher: Model<ITeacher> =
  mongoose.models.Teacher || mongoose.model<ITeacher>("Teacher", TeacherSchema);

export default Teacher;
