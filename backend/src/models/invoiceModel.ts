import mongoose, { Schema, Document } from "mongoose";

export type InvoiceStatus = "Pending" | "Approved" | "Paid" | "Received";

export interface Invoice extends Document {
  projectId: string;
  submittingParty: string;
  submittingCategory: string;
  description: string;
  dateSubmitted: Date;
  dateDue: Date;
  datePaid?: Date;
  dateReceived?: Date;
  status: InvoiceStatus;
}

const invoiceSchema = new Schema<Invoice>(
  {
    // @ts-expect-error Mongoose ObjectId typing mismatch between runtime and @types
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
    submittingParty: { type: String, required: true },
    submittingCategory: { type: String, required: true },
    description: { type: String, required: true },
    dateSubmitted: { type: Schema.Types.Date, required: true },
    dateDue: { type: Schema.Types.Date, required: true },
    datePaid: { type: Schema.Types.Date },
    dateReceived: { type: Schema.Types.Date },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Paid", "Received"],
      default: "Pending",
      required: true,
    },
  },
  { timestamps: true }
);

export const InvoiceModel = mongoose.model<Invoice>("Invoice", invoiceSchema);
