import mongoose, { Schema, Document } from "mongoose";
import { UserRole } from "./userModel";

export const InvoiceStatus = {
  Pending: "Pending",
  Approved: "Approved",
  Paid: "Paid",
  Recieved: "Recieved",
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export interface Invoice extends Document {
  projectId: string;
  submittingParty: string;
  submittingCategory: string;
  description: string;
  amount: number;
  dateSubmitted: Date;
  dateDue: Date;
  datePaid?: Date;
  dateReceived?: Date;
  status: InvoiceStatus;
  approverRole: UserRole;
}

const invoiceSchema = new Schema<Invoice>(
  {
    // @ts-expect-error Mongoose ObjectId typing mismatch between runtime and @types
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    submittingParty: { type: String, required: true },
    submittingCategory: { type: String, required: true },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    dateSubmitted: { type: Schema.Types.Date, required: true },
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
    },
  },
  { timestamps: true }
);

export const InvoiceModel = mongoose.model<Invoice>("Invoice", invoiceSchema);
