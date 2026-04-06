import mongoose, { Schema, Document } from "mongoose";

export interface RefreshToken extends Document {
  user: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  revokedAt?: Date;
}

const refreshTokenSchema = new Schema<RefreshToken>(
  {
    // @ts-expect-error Mongoose ObjectId typing mismatch between runtime and @types
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    revokedAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const RefreshTokenModel = mongoose.model<RefreshToken>("RefreshToken", refreshTokenSchema);
