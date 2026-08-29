import mongoose, { Schema, Document } from "mongoose";
import { fullName } from "../utils/name";

export interface VouchRequest extends Document {
  fromUserId: mongoose.Types.ObjectId;
  fromFirstName: string;
  fromLastName: string;
  /** Derived virtual — `fromFirstName fromLastName`. Not stored. */
  readonly fromName?: string;
  /** The sender's business. Not a person, so it stays one field. */
  fromCompany: string;
  fromAbn: string;
  toEmail: string;
  /**
   * Legacy — requests are addressed by email now. Still read when matching an
   * inbound request to a user, because requests sent before that change carry a
   * mobile and no longer get one written.
   */
  toMobile: string;
  relationship: string;
  projectName: string;
  status: "pending" | "responded" | "ignored";
  respondedAt?: Date;
  /** When the reference was last nudged — drives the nudge cooldown. */
  lastSentAt?: Date;
  /** When we last reminded the *sender* that this request is going unanswered. */
  lastNudgeReminderAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const vouchRequestSchema = new Schema<VouchRequest>(
  {
    fromUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    fromFirstName: { type: String, required: true },
    fromLastName: { type: String, default: "" },
    fromCompany: { type: String, required: true },
    fromAbn: { type: String, required: true },
    toEmail: { type: String, required: true },
    toMobile: { type: String, default: "" },
    relationship: { type: String, required: true },
    projectName: { type: String, default: "" },
    status: { type: String, enum: ["pending", "responded", "ignored"], default: "pending" },
    respondedAt: { type: Date },
    lastSentAt: { type: Date, default: Date.now },
    lastNudgeReminderAt: { type: Date },
  },
  // Virtuals must be serialised: the composed display name is what live app
  // builds still read off these documents.
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

vouchRequestSchema.index({ fromUserId: 1 });
vouchRequestSchema.index({ toEmail: 1, status: 1 });
vouchRequestSchema.index({ toMobile: 1, status: 1 });

vouchRequestSchema.virtual("fromName").get(function (this: {
  fromFirstName?: string;
  fromLastName?: string;
}) {
  return fullName(this.fromFirstName, this.fromLastName);
});

export const VouchRequestModel = mongoose.model<VouchRequest>("VouchRequest", vouchRequestSchema);
