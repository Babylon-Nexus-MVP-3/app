import mongoose, { Schema, Document } from "mongoose";
import { fullName } from "../utils/name";

export interface GivenVouch extends Document {
  fromUserId: mongoose.Types.ObjectId;
  toAbn: string;
  toBusinessName: string;
  attributes: string[];
  note?: string;
  requestId?: mongoose.Types.ObjectId;
  recipientFirstName?: string;
  recipientLastName?: string;
  /** Derived virtual — `recipientFirstName recipientLastName`. Not stored. */
  readonly recipientName?: string;
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
    recipientFirstName: { type: String },
    recipientLastName: { type: String, default: "" },
    recipientEmail: { type: String },
    recipientMobile: { type: String },
  },
  // Virtuals must be serialised: the composed display name is what live app
  // builds still read off these documents.
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

givenVouchSchema.index({ toAbn: 1 });
givenVouchSchema.index({ fromUserId: 1 });

givenVouchSchema.virtual("recipientName").get(function (this: {
  recipientFirstName?: string;
  recipientLastName?: string;
}) {
  return fullName(this.recipientFirstName, this.recipientLastName);
});

export const GivenVouchModel = mongoose.model<GivenVouch>("GivenVouch", givenVouchSchema);
