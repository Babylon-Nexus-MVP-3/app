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
  // @ts-expect-error Mongoose ObjectId typing mismatch between runtime and @types
  projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true },
  // @ts-expect-error Mongoose ObjectId typing mismatch between runtime and @types
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  role: { type: String },
  email: { type: String, required: true },
  inviteCode: { type: String },
  trade: { type: String, required: true },
  dateInvited: { type: Date },
  status: { type: String },
});

export const ProjectParticipantModel = mongoose.model<ProjectParticipant>(
  "ProjectParticipant",
  ProjectParticipantSchema
);
