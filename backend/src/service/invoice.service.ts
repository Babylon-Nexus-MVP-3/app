import { InvoiceModel } from "../models/invoiceModel";
import { EventModel } from "../models/eventModel";
import { ProjectParticipant } from "../models/projectParticipantModel";

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
  projectParticipant: ProjectParticipant
): Promise<string> {
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
