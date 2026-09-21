import mongoose, { Schema, Document, Model } from "mongoose";

import { USER_ROLES, UserRole } from "@/lib/constants/roles";
export { USER_ROLES, type UserRole };

export interface IUser extends Document {
  name?: string;
  email: string;
  password?: string;
  role: UserRole;
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
const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
