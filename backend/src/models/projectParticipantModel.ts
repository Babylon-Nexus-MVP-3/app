import mongoose, { Schema, Document } from "mongoose";

export interface ProjectParticipant extends Document {
  projectId: string;
  userId: string;
  role: string;
  email: string;
  inviteCode: string;
  trade: string;
  dateInvited: Date;
  status: "Pending" | "Accepted";
}

export const ProjectParticipantSchema = new Schema<ProjectParticipant>({
  projectId: { type: String, ref: "Project", required: true },
  userId: { type: String, ref: "User" },
  role: { type: String },
  email: { type: String, required: true },
  inviteCode: { type: String },
  trade: { type: String },
  dateInvited: { type: Date },
  status: { type: String },
});

export const ProjectParticipantModel = mongoose.model<ProjectParticipant>(
  "ProjectParticipant",
  ProjectParticipantSchema
);
