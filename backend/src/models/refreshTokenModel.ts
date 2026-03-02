import mongoose, { Schema, Document, Types } from "mongoose";

export interface RefreshToken extends Document {
  user: Types.ObjectId;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date;
}

const refreshTokenSchema = new Schema<RefreshToken>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const RefreshTokenModel = mongoose.model<RefreshToken>("RefreshToken", refreshTokenSchema);
