import mongoose, { Document, Schema, Types } from "mongoose";

export const NotificationType = {
  ProjectPendingApproval: "ProjectPendingApproval",
  ProjectApproved: "ProjectApproved",
  ProjectRejected: "ProjectRejected",
  ProjectDeleted: "ProjectDeleted",
  InvoiceSubmitted: "InvoiceSubmitted",
  InvoiceApproved: "InvoiceApproved",
  InvoicePaid: "InvoicePaid",
  InvoiceRejected: "InvoiceRejected",
  InvoiceReceived: "InvoiceReceived",
  InvoiceOverdue14: "InvoiceOverdue14",
  InvoiceOverdue21: "InvoiceOverdue21",
  InvoiceOverdue28: "InvoiceOverdue28",
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export interface NotificationDocument extends Document {
  recipientUserId: Types.ObjectId;
  projectId: Types.ObjectId;
  invoiceId?: Types.ObjectId;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    recipientUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: "Invoice" },
    type: { type: String, enum: Object.values(NotificationType), required: true },
    message: { type: String, required: true },
    read: { type: Boolean, required: true, default: false },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientUserId: 1, createdAt: -1 });

export const NotificationModel = mongoose.model<NotificationDocument>(
  "Notification",
  notificationSchema
);
