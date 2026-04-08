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
  hasLicence: boolean;
  hasInsurance: boolean;
}

export const ProjectParticipantSchema = new Schema<ProjectParticipant>({
  projectId: { type: String, ref: "Project", required: true },
  userId: { type: String, ref: "User" },
  role: { type: String, enum: Object.values(UserRole), required: true },
  email: { type: String, required: true, lowercase: true, trim: true },
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
  hasLicence: { type: Boolean },
  hasInsurance: { type: Boolean },
});

ProjectParticipantSchema.index({ projectId: 1, email: 1, role: 1 }, { unique: true });
ProjectParticipantSchema.index({ projectId: 1, userId: 1, status: 1 });
ProjectParticipantSchema.index({ projectId: 1, status: 1 });

export const ProjectParticipantModel = mongoose.model<ProjectParticipant>(
  "ProjectParticipant",
  ProjectParticipantSchema
);
