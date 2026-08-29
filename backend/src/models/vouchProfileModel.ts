import mongoose, { Schema, Document } from "mongoose";
import { fullName } from "../utils/name";

export interface VouchReference {
  firstName: string;
  lastName: string;
  /** Derived virtual — `firstName lastName`. Not stored. */
  readonly name?: string;
  /** The reference's employer. A business, not a person, so it stays one field. */
  company: string;
  /** Legacy — references are contacted by email now. Kept so older profiles load. */
  mobile?: string;
  email: string;
  relationship: string;
  project: string;
}

export interface VouchProfile extends Document {
  userId: mongoose.Types.ObjectId;
  // Step 1 — identity. Mirrored from the user record, never from the request body.
  firstName: string;
  lastName: string;
  /** Derived virtual — `firstName lastName`. Not stored. */
  readonly name?: string;
  abn: string;
  trade: string;
  idType: "trade-licence";
  /** Licence class, e.g. "Electrical" — distinct from the free-text business trade. */
  tradeType: string;
  idNumber: string;
  idExpiry: string;
  /** State that issued the licence. */
  idState: string;
  // References the user has asked for vouches from
  references: VouchReference[];
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const vouchReferenceSchema = new Schema<VouchReference>(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, default: "" },
    company: { type: String, required: true },
    mobile: { type: String, default: "" },
    email: { type: String, required: true },
    relationship: { type: String, required: true },
    project: { type: String, default: "" },
  },
  { _id: false, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const vouchProfileSchema = new Schema<VouchProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    firstName: { type: String, required: true },
    lastName: { type: String, default: "" },
    abn: { type: String, required: true },
    trade: { type: String, required: true },
    // Trade licence is the only accepted ID — driver's licence and passport were
    // removed to simplify verification. Legacy documents may still hold the old
    // values; nothing revalidates them, and any save from the app overwrites them.
    idType: { type: String, enum: ["trade-licence"], default: "trade-licence", required: true },
    tradeType: { type: String, default: "" },
    idNumber: { type: String, required: true },
    idExpiry: { type: String, required: true },
    idState: { type: String, default: "" },
    references: { type: [vouchReferenceSchema], required: true },
    submittedAt: { type: Date, required: true, default: Date.now },
  },
  // Virtuals must be serialised: the composed display name is what live app
  // builds still read off these documents.
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

const nameGetter = function (this: { firstName?: string; lastName?: string }) {
  return fullName(this.firstName, this.lastName);
};
// Display-only; `.lean()` and `.select()` queries do not return virtuals.
vouchReferenceSchema.virtual("name").get(nameGetter);
vouchProfileSchema.virtual("name").get(nameGetter);

export const VouchProfileModel = mongoose.model<VouchProfile>("VouchProfile", vouchProfileSchema);
