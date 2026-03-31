import mongoose, { Document, Schema } from "mongoose";
import { Project } from "./projectModel";
import { ProjectParticipant } from "./projectParticipantModel";
import { Invoice } from "./invoiceModel";
import { EventDocument } from "./eventModel";

export interface DeletedProjectDocument extends Document {
  deletedAt: Date;
  project: Project;
  events: EventDocument[];
  invoices: Invoice[];
  participants: ProjectParticipant[];
}

// DeletedProjectModel.ts
const DeletedProjectSchema = new Schema<DeletedProjectDocument>({
  deletedAt: { type: Date, required: true },
  project: { type: Schema.Types.Mixed, required: true },
  events: [{ type: Schema.Types.Mixed }],
  invoices: [{ type: Schema.Types.Mixed }],
  participants: [{ type: Schema.Types.Mixed }],
});

export const DeletedProjectModel = mongoose.model<DeletedProjectDocument>(
  "DeletedProject",
  DeletedProjectSchema
);
