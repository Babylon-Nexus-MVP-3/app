import mongoose, { Schema, Document, Types } from "mongoose";

export interface VouchNotificationDocument extends Document {
  recipientUserId: Types.ObjectId;
  requestId: Types.ObjectId;
  fromName: string;
  fromCompany: string;
  projectName: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const vouchNotificationSchema = new Schema<VouchNotificationDocument>(
  {
    recipientUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestId: { type: Schema.Types.ObjectId, ref: "VouchRequest", required: true },
    fromName: { type: String, required: true },
    fromCompany: { type: String, required: true },
    projectName: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

vouchNotificationSchema.index({ recipientUserId: 1, createdAt: -1 });

export const VouchNotificationModel = mongoose.model<VouchNotificationDocument>(
  "VouchNotification",
  vouchNotificationSchema
);
