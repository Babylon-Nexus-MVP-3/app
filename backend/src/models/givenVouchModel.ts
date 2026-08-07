import mongoose, { Schema, Document } from "mongoose";

export interface GivenVouch extends Document {
  fromUserId: mongoose.Types.ObjectId;
  toAbn: string;
  toBusinessName: string;
  attributes: string[];
  note?: string;
  requestId?: mongoose.Types.ObjectId;
  recipientName?: string;
  recipientEmail?: string;
  recipientMobile?: string;
  createdAt: Date;
  updatedAt: Date;
}

const givenVouchSchema = new Schema<GivenVouch>(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    toAbn: { type: String, required: true },
    toBusinessName: { type: String, default: "" },
    attributes: { type: [String], required: true },
    note: { type: String },
    requestId: { type: Schema.Types.ObjectId, ref: "VouchRequest" },
    recipientName: { type: String },
    recipientEmail: { type: String },
    recipientMobile: { type: String },
  },
  { timestamps: true }
);

givenVouchSchema.index({ toAbn: 1 });
givenVouchSchema.index({ fromUserId: 1 });
// Prevents a double-tap or slow-network retry from registering the same
// vouch twice — the app already blocks this at the request layer, but only
// a DB-level constraint closes the race between two concurrent requests.
givenVouchSchema.index({ fromUserId: 1, toAbn: 1 }, { unique: true });

export const GivenVouchModel = mongoose.model<GivenVouch>("GivenVouch", givenVouchSchema);
