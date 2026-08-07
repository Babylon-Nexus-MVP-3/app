import mongoose, { Schema, Document } from "mongoose";

export interface VouchRequest extends Document {
  fromUserId: mongoose.Types.ObjectId;
  fromName: string;
  fromCompany: string;
  fromAbn: string;
  toEmail: string;
  toMobile: string;
  relationship: string;
  projectName: string;
  status: "pending" | "responded" | "ignored";
  respondedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const vouchRequestSchema = new Schema<VouchRequest>(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fromName: { type: String, required: true },
    fromCompany: { type: String, required: true },
    fromAbn: { type: String, required: true },
    toEmail: { type: String, default: "" },
    toMobile: { type: String, required: true },
    relationship: { type: String, required: true },
    projectName: { type: String, default: "" },
    status: { type: String, enum: ["pending", "responded", "ignored"], default: "pending" },
    respondedAt: { type: Date },
  },
  { timestamps: true }
);

vouchRequestSchema.index({ fromUserId: 1 });
vouchRequestSchema.index({ toEmail: 1, status: 1 });
vouchRequestSchema.index({ toMobile: 1, status: 1 });

export const VouchRequestModel = mongoose.model<VouchRequest>("VouchRequest", vouchRequestSchema);
