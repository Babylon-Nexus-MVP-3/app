import mongoose, { Schema, Document } from "mongoose";

export interface Otp extends Document {
  mobile: string;
  code: string; // hashed
  expiresAt: Date;
  used: boolean;
}

const otpSchema = new Schema<Otp>({
  mobile: { type: String, required: true, index: true },
  code: { type: String, required: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  used: { type: Boolean, default: false },
});

export const OtpModel = mongoose.model<Otp>("Otp", otpSchema);
