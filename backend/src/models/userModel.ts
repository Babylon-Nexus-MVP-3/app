/**
 * @file User Model
 * @description Defines the Mongoose schema and model for the User entity.
 * Add all user-related fields here.
 */
import mongoose, { Schema, Document } from "mongoose";

/**
 * Interface representing a User document in MongoDB.
 * Add a new property here whenever you add a field to `userSchema`.
 *
 * NOTE: interface is used as Mongoose schemas are runtime definitions
 * (MongoDB doesn't know about TypeScript), and interface ensures compile-time type safety.
 * Both must be kept in sync. Without this, all Mongoose returned documents would be typed as `any`.
 *
 */
export interface User extends Document {
  // Add user field types here
  name: string;
  email: string;
  password: string;
  refreshTokens: string[];
  pushTokens: string[];
  role: "owner" | "financier" | "builder" | "project_manager" | "subcontractor" | "consultant";
  loginAttempts: number;
  lockUntil: Date;
  accountLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
  verificationCode: string;
  verificationCodeExpiry: Date;
  resetCode: string;
  resetCodeExpiry: Date;
  emailVerified: boolean;
}

/**
 * Mongoose schema for the User model.
 * Define the shape, types, and validation rules for User documents here.
 *
 * @see {@link https://mongoosejs.com/docs/guide.html} Mongoose Schema Guide
 */
const userSchema = new Schema<User>({
  // Add user fields here, for example:
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  refreshTokens: { type: [String], default: [] },
  pushTokens: { type: [String], default: [] },
  role: {
    type: String,
    enum: ["owner", "financier", "builder", "project_manager", "subcontractor", "consultant"],
  },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  accountLocked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  verificationCode: { type: String, unique: true, sparse: true },
  verificationCodeExpiry: { type: Date },
  resetCode: { type: String },
  resetCodeExpiry: { type: Date },
  emailVerified: { type: Boolean, default: false },
});

/**
 * Mongoose model for the User collection.
 * Use this to query, create, update, and delete User documents.
 *
 * @example
 * const user = await UserModel.create({ name: "John", email: "john@example.com" });
 */
export const UserModel = mongoose.model<User>("User", userSchema);
