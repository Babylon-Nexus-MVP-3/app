import mongoose, { Document, Schema } from "mongoose";
import { Project } from "./projectModel";
import { ProjectParticipant } from "./projectParticipantModel";
import { Invoice } from "./invoiceModel";
import { EventDocument } from "./eventModel";

export interface DeletedProjectDocument extends Document {
  deletedAt: Date;
  project: Project;
  projectEvents: EventDocument[];
  invoices: Invoice[];
  invoiceEvents: EventDocument[];
  participants: ProjectParticipant[];
}

// DeletedProjectModel.ts
const DeletedProjectSchema = new Schema<DeletedProjectDocument>({
  deletedAt: { type: Date, required: true },
  project: { type: Schema.Types.Mixed, required: true },
  projectEvents: [{ type: Schema.Types.Mixed }],
  invoices: [{ type: Schema.Types.Mixed }],
  invoiceEvents: [{ type: Schema.Types.Mixed }],
  participants: [{ type: Schema.Types.Mixed }],
});

export const DeletedProjectModel = mongoose.model<DeletedProjectDocument>(
  "DeletedProject",
  DeletedProjectSchema
);
