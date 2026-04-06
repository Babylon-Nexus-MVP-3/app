import mongoose, { Schema, Document } from "mongoose";
import { UserRole } from "./userModel";

export const InvoiceStatus = {
  Pending: "Pending",
  Approved: "Approved",
  Paid: "Paid",
  Received: "Received",
  Rejected: "Rejected",
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export interface Invoice extends Document {
  invoiceNumber: string;
  projectId: mongoose.Types.ObjectId;
  submittingParty: string;
  submittingCategory: string;
  submittedByUserId: mongoose.Types.ObjectId;
  description: string;
  amount: number;
  dateSubmitted: Date;
  dateDue: Date;
  datePaid?: Date;
  dateReceived?: Date;
  status: InvoiceStatus;
  approverRole: UserRole;
  rejectionReason?: string;
  escalationsSent: number[];
}

const invoiceSchema = new Schema<Invoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    submittingParty: { type: String, required: true },
    submittingCategory: { type: String, required: true },
    submittedByUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    dateSubmitted: { type: Schema.Types.Date, required: true, default: Date.now },
    dateDue: { type: Schema.Types.Date, required: true },
    datePaid: { type: Schema.Types.Date },
    dateReceived: { type: Schema.Types.Date },
    status: {
      type: String,
      enum: Object.values(InvoiceStatus),
      default: "Pending",
      required: true,
    },
    approverRole: {
      type: String,
      enum: Object.values(UserRole),
      required: true,
    },
    rejectionReason: { type: String },
    escalationsSent: { type: [Number], required: true, default: [] },
  },
  { timestamps: true }
);

invoiceSchema.index({ projectId: 1 });
invoiceSchema.index({ projectId: 1, status: 1 });
invoiceSchema.index({ submittedByUserId: 1 });

export const InvoiceModel = mongoose.model<Invoice>("Invoice", invoiceSchema);
