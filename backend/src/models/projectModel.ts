import mongoose, { Schema, Document } from "mongoose";

export type ProjectStatus = "Pending" | "Active" | "Rejected" | "Inactive";

export interface Project extends Document {
  name: string;
  location: string;
  council: string;
  ownerId?: string;
  builderId?: string;
  pmId?: string;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<Project>(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    council: { type: String, required: true },
    ownerId: { type: String },
    builderId: { type: String },
    pmId: { type: String },
    status: {
      type: String,
      enum: ["Pending", "Active", "Rejected", "Inactive"],
      default: "Pending",
    },
  },
  {
    timestamps: true,
  }
);

export const ProjectModel = mongoose.model<Project>("Project", projectSchema);
