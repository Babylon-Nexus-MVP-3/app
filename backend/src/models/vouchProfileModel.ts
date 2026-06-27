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
  idType: "passport" | "licence" | "trade-licence";
  idNumber: string;
  idExpiry: string;
  // Step 2 — projects
  currentProjectName: string;
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  value: string;
  pastProjectName: string;
  pastSuburb: string;
  pastState: string;
  pastPostcode: string;
  pastMonthYear: string;
  pastValue: string;
  // Step 3 — references
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
    idType: { type: String, enum: ["passport", "licence", "trade-licence"], required: true },
    idNumber: { type: String, required: true },
    idExpiry: { type: String, required: true },
    currentProjectName: { type: String, required: true },
    address: { type: String, required: true },
    suburb: { type: String, required: true },
    state: { type: String, required: true },
    postcode: { type: String, required: true },
    value: { type: String, required: true },
    pastProjectName: { type: String, default: "" },
    pastSuburb: { type: String, default: "" },
    pastState: { type: String, default: "" },
    pastPostcode: { type: String, default: "" },
    pastMonthYear: { type: String, default: "" },
    pastValue: { type: String, default: "" },
    references: { type: [vouchReferenceSchema], required: true },
    submittedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: true }
);

export const VouchProfileModel = mongoose.model<VouchProfile>("VouchProfile", vouchProfileSchema);
