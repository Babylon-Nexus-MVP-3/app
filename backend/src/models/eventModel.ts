import mongoose, { Schema, Document } from "mongoose";

export type AggregateType = "User" | "Project" | "Invoice";

export type EventType =
  | "UserRegistered"
  | "UserLoggedIn"
  | "UserEmailVerified"
  | "InvoiceSubmitted"
  | "InvoiceApproved"
  | "InvoicePaid"
  | "InvoiceReceived"
  | "InvoiceRejected"
  | "ProjectCreated";

export interface EventDocument extends Document {
  type: EventType;
  aggregateType: AggregateType;
  aggregateId: string;
  userId?: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
}

const eventSchema = new Schema<EventDocument>(
  {
    type: {
      type: String,
      required: true,
      enum: [
        "UserRegistered",
        "UserLoggedIn",
        "UserEmailVerified",
        "InvoiceSubmitted",
        "InvoiceApproved",
        "InvoicePaid",
        "InvoiceReceived",
        "InvoiceRejected",
        "ProjectCreated",
      ],
    },
    aggregateType: {
      type: String,
      required: true,
      enum: ["User", "Project", "Invoice"],
    },
    aggregateId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    payload: { type: Schema.Types.Mixed },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const EventModel = mongoose.model<EventDocument>("Event", eventSchema);
