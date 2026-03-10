import mongoose, { Schema, Document } from "mongoose";

export interface Project extends Document {
  location: string;
  council: string;
  ownerId?: string;
  builderId?: string;
  pmId?: string;
  status?: string;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<Project>(
  {
    location: { type: String, required: true },
    council: { type: String, required: true },
    ownerId: { type: String },
    builderId: { type: String },
    pmId: { type: String },
    status: { type: String, default: "Draft" },
  },
  {
    timestamps: true,
  }
);

export const ProjectModel = mongoose.model<Project>("Project", projectSchema);
