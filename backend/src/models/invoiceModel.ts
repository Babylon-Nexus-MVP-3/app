import mongoose, { Schema, Document } from "mongoose";

export interface Invoice extends Document {
  submittingParty: string;
  submittingCategory: string;
  dateDue: Date;
  description: string;
}

const invoiceSchema = new Schema<Invoice>({
  submittingParty: { type: String, required: true },
  submittingCategory: { type: String, required: true },
  dateDue: { type: Schema.Types.Date, required: true },
  description: { type: String, required: true },
});

export const InvoiceModel = mongoose.model<Invoice>("Invoice", invoiceSchema);
