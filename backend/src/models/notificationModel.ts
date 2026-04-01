import mongoose, { Document, Schema } from "mongoose";

export const NotificationType = {
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
  recipientUserId: string;
  projectId: string;
  invoiceId?: string;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    // @ts-expect-error Mongoose ObjectId typing mismatch between runtime and @types
    recipientUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // @ts-expect-error Mongoose ObjectId typing mismatch between runtime and @types
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    // @ts-expect-error Mongoose ObjectId typing mismatch between runtime and @types
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
