import mongoose, { Schema, Document } from "mongoose";

export type InvoiceStatus = "Pending" | "Approved" | "Paid" | "Recieved";

export interface Invoice extends Document {
  projectId: string;
  submittingParty: string;
  submittingCategory: string;
  description: string;
  dateSubmitted: Date;
  dateDue: Date;
  datePaid: Date;
  dateRecieved: Date;
  status: InvoiceStatus;
}

const invoiceSchema = new Schema<Invoice>({
  projectId: { type: String, required: true },
  submittingParty: { type: String, required: true },
  submittingCategory: { type: String, required: true },
  description: { type: String, required: true },
  dateSubmitted: { type: Schema.Types.Date, required: true },
  dateDue: { type: Schema.Types.Date },
  datePaid: { type: Schema.Types.Date },
  dateRecieved: { type: Schema.Types.Date },
  status: { type: String, enum: ["Pending", "Approved", "Paid", "Recieved"], default: "Pending" },
});

export const InvoiceModel = mongoose.model<Invoice>("Invoice", invoiceSchema);
