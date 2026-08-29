import mongoose, { Schema, Document } from "mongoose";
import { fullName } from "../utils/name";

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
  firstName: string;
  lastName: string;
  /** Derived virtual — `firstName lastName`. Not stored; never assign to it. */
  readonly name: string;
  email?: string;
  password?: string;
  mobile?: string;
  mobileVerified?: boolean;
  abn?: string;
  businessName?: string;
  businessTrade?: string;
  businessState?: string;
  status: "Pending" | "Active" | "Rejected";
  role: UserRole;
  loginAttempts: number;
  lockUntil?: Date;
  accountLocked: boolean;
  verificationCode?: string | null;
  verificationCodeExpiry?: Date | null;
  pendingEmail?: string | null;
  emailChangeCode?: string | null;
  emailChangeCodeExpiry?: Date | null;
  resetCode?: string | null;
  resetCodeExpiry?: Date | null;
  emailVerified: boolean;
  accountExpiresAt?: Date | null;
  pushToken?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<User>(
  {
    firstName: { type: String, required: true },
    // Not required: plenty of people go by a single name, and forcing a surname
    // is what produced the literal "-" values in legacy rows.
    lastName: { type: String, default: "" },
    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      lowercase: true,
    },
    password: { type: String, required: false },
    mobile: { type: String },
    mobileVerified: { type: Boolean, default: false },
    abn: { type: String, unique: true, sparse: true },
    businessName: { type: String },
    businessTrade: { type: String },
    businessState: { type: String },
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
    pendingEmail: { type: String, default: null },
    emailChangeCode: { type: String, default: null },
    emailChangeCodeExpiry: { type: Date, default: null },
    resetCode: { type: String },
    resetCodeExpiry: { type: Date },
    emailVerified: { type: Boolean, default: false },
    accountExpiresAt: { type: Date, index: { expireAfterSeconds: 0 } },
    pushToken: { type: String, default: null },
    deletedAt: { type: Date, default: null, index: { expireAfterSeconds: 30 * 24 * 60 * 60 } },
  },
  {
    timestamps: true,
    // Virtuals must be serialised so the composed `name` survives toObject/toJSON.
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Display name is derived, never stored, so the two fields stay the single
// source of truth. Note `.lean()` and `.select()` queries do not return
// virtuals — those must select "firstName lastName" and compose with fullName().
userSchema.virtual("name").get(function (this: { firstName?: string; lastName?: string }) {
  return fullName(this.firstName, this.lastName);
});

export const UserModel = mongoose.model<User>("User", userSchema);
