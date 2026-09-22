import mongoose, { Schema, Document, Model } from "mongoose";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "LEAVE";

export interface IAttendance extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  academicYearId: mongoose.Types.ObjectId | string;
  classId: mongoose.Types.ObjectId | string;
  sectionId: mongoose.Types.ObjectId | string;
  studentId: mongoose.Types.ObjectId | string;
  date: Date;
  status: AttendanceStatus;
  remarks?: string;
  markedBy: mongoose.Types.ObjectId | string;
  markedByRole: "ADMIN" | "TEACHER" | string;
  editedBy?: mongoose.Types.ObjectId | string | null;
  editedAt?: Date | null;
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
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
    sectionId: {
      type: Schema.Types.ObjectId,
      ref: "Section",
      required: [true, "Section ID is required"],
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student ID is required"],
      index: true,
    },
    date: {
      type: Date,
      required: [true, "Attendance date is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ["PRESENT", "ABSENT", "LATE", "LEAVE"],
      required: [true, "Attendance status is required"],
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Marker user ID is required"],
    },
    markedByRole: {
      type: String,
      required: [true, "Marker role is required"],
      default: "ADMIN",
    },
    editedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    editedAt: {
      type: Date,
      default: null,
    },
    isLocked: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Unique Index: A student has exactly ONE attendance record per school, academic year, and date
AttendanceSchema.index(
  { schoolId: 1, academicYearId: 1, studentId: 1, date: 1 },
  { unique: true, name: "unique_student_attendance_per_date" }
);

// High-efficiency query indexes
AttendanceSchema.index({ schoolId: 1, academicYearId: 1, classId: 1, sectionId: 1, date: 1 });
AttendanceSchema.index({ schoolId: 1, studentId: 1, date: -1 });
AttendanceSchema.index({ schoolId: 1, date: 1, status: 1 });
AttendanceSchema.index({ schoolId: 1, academicYearId: 1, classId: 1, sectionId: 1, date: 1, status: 1 });
AttendanceSchema.index({ schoolId: 1, academicYearId: 1, classId: 1, sectionId: 1, studentId: 1, date: -1 });

const Attendance: Model<IAttendance> =
  (mongoose.models && (mongoose.models.Attendance as Model<IAttendance>)) ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);

export default Attendance;
