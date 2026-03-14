import { InvoiceModel } from "../models/invoiceModel";
import { EventModel } from "../models/eventModel";
import { ProjectModel } from "../models/projectModel";
import { ProjectParticipantModel } from "../models/projectParticipantModel";
import { ProjectError } from "./project.service";

export class InvoiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export interface SubmitInvoiceInput {
  submittingParty: string;
  submittingCategory: string;
  dateDue: Date;
  description: string;
}

export async function submitInvoice(
  input: SubmitInvoiceInput,
  projectId: string,
  userId: string
): Promise<string> {
  const project = await ProjectModel.findById(projectId);
  if (!project) {
    throw new ProjectError("Project Does not Exist");
  }

  const projectParticipant = await ProjectParticipantModel.findOne({ projectId, userId });
  if (!projectParticipant) {
    throw new InvoiceError("User not part of project");
  }

  const submittingParty = input.submittingParty.trim();
  const submittingCategory = input.submittingCategory.trim();
  const dateDue = input.dateDue;
  const description = input.description.trim();

  if (!submittingParty || !submittingCategory || !dateDue || !description) {
    throw new InvoiceError(
      "Required fields missing: submittingParty, submittingCategory, dateDue, description"
    );
  }

  const invoice = await InvoiceModel.create({
    projectId,
    submittingParty,
    submittingCategory,
    dateSubmitted: new Date(Date.now()),
    dateDue,
    description,
  });

  await EventModel.create({
    type: "InvoiceSubmitted",
    aggregateType: "Invoice",
    aggregateId: invoice._id.toString(),
    userId: projectParticipant.userId,
    payload: { submittingParty, submittingCategory, dateDue, description },
  });

  return invoice._id.toString();
}
