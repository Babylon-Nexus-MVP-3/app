import mongoose, { Schema, Document } from "mongoose";

export interface Project extends Document {
  location: string;
  council: string;
  ownerId: string;
  builderId: string;
  pmId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<Project>(
  {
    location: { type: String, required: true },
    council: { type: String, required: true },
    ownerId: { type: String, required: true },
    builderId: { type: String, required: true },
    pmId: { type: String, required: true },
    status: { type: String, required: true },
  },
  {
    timestamps: true,
  }
);

export const ProjectModel = mongoose.model<Project>("Project", projectSchema);
