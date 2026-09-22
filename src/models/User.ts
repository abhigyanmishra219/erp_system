import mongoose, { Schema, Document, Model } from "mongoose";

import { USER_ROLES, UserRole } from "@/lib/constants/roles";
export { USER_ROLES, type UserRole };

export interface IUser extends Document {
  name?: string;
  email: string;
  password?: string;
  role: UserRole;
  schoolId?: mongoose.Types.ObjectId | string | null;
  studentId?: mongoose.Types.ObjectId | string | null;
  parentId?: mongoose.Types.ObjectId | string | null;
  teacherId?: mongoose.Types.ObjectId | string | null;
  mustChangePassword: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: [true, "Email address is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
      select: false, // Do not return password by default in queries
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "SYSTEM_ADMIN",
      required: true,
    },
    schoolId: {
      type: Schema.Types.ObjectId,
      ref: "School",
      default: null,
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      default: null,
      index: true,
    },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Parent",
      default: null,
      index: true,
    },
    teacherId: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      default: null,
      index: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent mongoose model overwrite error during Next.js hot reload
if (mongoose.models && mongoose.models.User) {
  const existingModel = mongoose.models.User as Model<IUser>;
  // Re-register if schema paths for schoolId or mustChangePassword are missing
  if (
    !existingModel.schema ||
    !existingModel.schema.paths ||
    !existingModel.schema.paths.schoolId ||
    !existingModel.schema.paths.mustChangePassword
  ) {
    delete (mongoose.models as Record<string, unknown>).User;
  }
}

const User: Model<IUser> =
  (mongoose.models && (mongoose.models.User as Model<IUser>)) ||
  mongoose.model<IUser>("User", UserSchema);

export default User;

