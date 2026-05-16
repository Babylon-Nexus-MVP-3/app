import mongoose, { Schema, Document, Types } from "mongoose";

export interface VouchNotificationDocument extends Document {
  recipientUserId: Types.ObjectId;
  type: "vouch_request" | "vouch_received";
  requestId?: Types.ObjectId;
  fromName: string;
  fromCompany: string;
  projectName?: string;
  toBusinessName?: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vouchNotificationSchema = new Schema<VouchNotificationDocument>(
  {
    recipientUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["vouch_request", "vouch_received"], default: "vouch_request" },
    requestId: { type: Schema.Types.ObjectId, ref: "VouchRequest" },
    fromName: { type: String, required: true },
    fromCompany: { type: String, required: true },
    projectName: { type: String },
    toBusinessName: { type: String },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

vouchNotificationSchema.index({ recipientUserId: 1, createdAt: -1 });

export const VouchNotificationModel = mongoose.model<VouchNotificationDocument>(
  "VouchNotification",
  vouchNotificationSchema
);
