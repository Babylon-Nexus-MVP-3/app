import mongoose, { Schema, Document } from "mongoose";

export interface VouchReference {
  name: string;
  company: string;
  mobile: string;
  email?: string;
  relationship: string;
  project: string;
}

export interface VouchProfile extends Document {
  userId: mongoose.Types.ObjectId;
  // Step 1 — identity
  name: string;
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
    name: { type: String, required: true },
    company: { type: String, required: true },
    mobile: { type: String, required: true },
    email: { type: String },
    relationship: { type: String, required: true },
    project: { type: String, default: "" },
  },
  { _id: false }
);

const vouchProfileSchema = new Schema<VouchProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    name: { type: String, required: true },
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
  { timestamps: true }
);

export const VouchProfileModel = mongoose.model<VouchProfile>("VouchProfile", vouchProfileSchema);
