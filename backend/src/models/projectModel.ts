import mongoose, { Schema, Document } from "mongoose";

export type ProjectStatus = "Pending" | "Active" | "Rejected";

export interface Project extends Document {
  name: string;
  location: string;
  council: string;
  ownerId?: string;
  builderId?: string;
  pmId?: string;
  status: ProjectStatus;
  isDeleted: boolean;
  deletedAt?: Date;
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
      enum: ["Pending", "Active", "Rejected"],
      default: "Pending",
    },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Automatically exclude soft-deleted docs from all queries
projectSchema.pre(/^find/, function (this: mongoose.Query<any, any>) {
  if (this.getOptions().bypassSoftDelete) return;
  this.where({ isDeleted: { $ne: true } });
});

export const ProjectModel = mongoose.model<Project>("Project", projectSchema);
