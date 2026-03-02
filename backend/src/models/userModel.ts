import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "PM" | "Subbie" | "Owner" | "Builder" | "Consultant";

export interface User extends Document {
  id: string;
  name: string;
  email: string;
  password: string;
  phoneNumber?: string;
  verticalGroup?: string;
  horizontalAttribute?: string;
  licenceNumber?: string | null;
  status: "Pending" | "Active";
  role: UserRole;
  loginAttempts: number;
  lockUntil?: Date;
  accountLocked: boolean;
  verificationCode?: string | null;
  verificationCodeExpiry?: Date | null;
  resetCode?: string | null;
  resetCodeExpiry?: Date | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    name: { type: String, required: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: { type: String, required: true },
    phoneNumber: { type: String },
    verticalGroup: { type: String },
    horizontalAttribute: { type: String },
    licenceNumber: { type: String },
    status: {
      type: String,
      required: true,
      enum: ["Pending", "Active"],
      default: "Pending",
    },
    role: {
      type: String,
      enum: ["PM", "Subbie", "Owner", "Builder", "Consultant"],
      required: true,
    },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    accountLocked: { type: Boolean, default: false },
    verificationCode: { type: String, unique: true, sparse: true },
    verificationCodeExpiry: { type: Date },
    resetCode: { type: String },
    resetCodeExpiry: { type: Date },
    emailVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  },
);

export const UserModel = mongoose.model<User>("User", userSchema);
