import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITeacherAssignment extends Document {
  schoolId: mongoose.Types.ObjectId | string;
  teacherId: mongoose.Types.ObjectId | string;
  academicYearId: mongoose.Types.ObjectId | string;
  classId: mongoose.Types.ObjectId | string;
  sectionId: mongoose.Types.ObjectId | string;
  subjectId?: mongoose.Types.ObjectId | string | null;
  assignmentType: "SUBJECT_TEACHER" | "CLASS_TEACHER" | "BOTH";
  isClassTeacher: boolean;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId | string;
  updatedBy: mongoose.Types.ObjectId | string;
  createdAt: Date;
  updatedAt: Date;
}

const TeacherAssignmentSchema = new Schema<ITeacherAssignment>(
  {
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      required: [true, "School ID is required"],
      index: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher ID is required"],
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
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      default: null,
      index: true,
    },
    assignmentType: {
      type: String,
      enum: ["SUBJECT_TEACHER", "CLASS_TEACHER", "BOTH"],
      default: "SUBJECT_TEACHER",
    },
    isClassTeacher: {
      type: Boolean,
      default: false,
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

// Indexes
TeacherAssignmentSchema.index({
  schoolId: 1,
  teacherId: 1,
  academicYearId: 1,
  classId: 1,
  sectionId: 1,
  subjectId: 1,
  isActive: 1,
});

// Partial Unique Index: A teacher can be active Class Teacher of ONLY ONE section per academic year
TeacherAssignmentSchema.index(
  { schoolId: 1, academicYearId: 1, teacherId: 1 },
  {
    unique: true,
    partialFilterExpression: { isClassTeacher: true, isActive: true },
    name: "unique_active_teacher_class_teacher_per_year",
  }
);

// Partial Unique Index: A section can have only ONE active Class Teacher per academic year
TeacherAssignmentSchema.index(
  { schoolId: 1, academicYearId: 1, classId: 1, sectionId: 1 },
  {
    unique: true,
    partialFilterExpression: { isClassTeacher: true, isActive: true },
    name: "unique_active_section_class_teacher_per_year",
  }
);

TeacherAssignmentSchema.index({ schoolId: 1, teacherId: 1, isActive: 1 });

const TeacherAssignment: Model<ITeacherAssignment> =
  mongoose.models.TeacherAssignment ||
  mongoose.model<ITeacherAssignment>("TeacherAssignment", TeacherAssignmentSchema);

export default TeacherAssignment;
