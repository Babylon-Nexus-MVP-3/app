import mongoose, { Schema, Document } from "mongoose";

export type UserRole = "PM" | "Subbie" | "Owner" | "Builder" | "Consultant";

export interface User extends Document {
  name: string;
  email: string;
  passwordHash: string;
  phoneNumber?: string;
  role: UserRole;
  verticalGroup?: string;
  horizontalAttribute?: string;
  licenceNumber?: string | null;
  status: "Pending" | "Active";
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    phoneNumber: { type: String },
    role: {
      type: String,
      required: true,
      enum: ["PM", "Subbie", "Owner", "Builder", "Consultant"],
    },
    verticalGroup: { type: String },
    horizontalAttribute: { type: String },
    licenceNumber: { type: String },
    status: {
      type: String,
      required: true,
      enum: ["Pending", "Active"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  },
);

export const UserModel = mongoose.model<User>("User", userSchema);
