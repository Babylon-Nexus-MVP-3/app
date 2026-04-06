import mongoose, { Schema, Document } from "mongoose";

// All valid user roles — `as const` locks values to literal types and keeps the object;
export const UserRole = {
  Admin: "Admin",
  Owner: "Owner",
  Builder: "Builder",
  PM: "PM",
  Subbie: "Subbie",
  Consultant: "Consultant",
  Financier: "Financier",
  VIP: "VIP",
  Observer: "Observer",
} as const;

// Derives a union type from the values: "Admin" | "Owner" | "Builder" | ...
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export interface User extends Document {
  id: string;
  name: string;
  email: string;
  password: string;
  status: "Pending" | "Active" | "Rejected";
  role: UserRole;
  loginAttempts: number;
  lockUntil?: Date;
  accountLocked: boolean;
  verificationCode?: string | null;
  verificationCodeExpiry?: Date | null;
  resetCode?: string | null;
  resetCodeExpiry?: Date | null;
  emailVerified: boolean;
  accountExpiresAt?: Date | null;
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
    status: {
      type: String,
      required: true,
      enum: ["Pending", "Active", "Rejected"],
      default: "Pending",
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
    },
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
    accountLocked: { type: Boolean, default: false },
    verificationCode: { type: String, unique: true, sparse: true },
    verificationCodeExpiry: { type: Date },
    resetCode: { type: String },
    resetCodeExpiry: { type: Date },
    emailVerified: { type: Boolean, default: false },
    accountExpiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
  },
  {
    timestamps: true,
  }
);

export const UserModel = mongoose.model<User>("User", userSchema);
