import mongoose, { Schema, Document } from "mongoose";
import { UserRole } from "./userModel";

export interface ProjectParticipant extends Document {
  projectId: string;
  userId?: string;
  role: UserRole;
  email: string;
  inviteCode?: string;
  trade?: string;
  dateInvited?: Date;
  dateAccepted?: Date;
  status: "Pending" | "Accepted";
}

export const ProjectParticipantSchema = new Schema<ProjectParticipant>({
  projectId: { type: String, ref: "Project", required: true },
  userId: { type: String, ref: "User" },
  role: { type: String, enum: Object.values(UserRole), required: true },
  email: { type: String, required: true },
  inviteCode: { type: String },
  trade: { type: String },
  dateInvited: { type: Date },
  dateAccepted: { type: Date },
  status: {
    type: String,
    enum: ["Pending", "Accepted"],
    required: true,
    default: "Pending",
  },
});

export const ProjectParticipantModel = mongoose.model<ProjectParticipant>(
  "ProjectParticipant",
  ProjectParticipantSchema
);
