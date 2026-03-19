import { InvoiceModel, InvoiceStatus } from "../models/invoiceModel";
import { EventModel } from "../models/eventModel";
import { ProjectModel } from "../models/projectModel";
import { ProjectParticipantModel } from "../models/projectParticipantModel";
import { ProjectError } from "./project.service";
import { UserRole } from "../models/userModel";

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
  amount: number;
}

/**
 *  Create a hashmap with Type Safety
 *  Record<K, V> describes an object
 *  Where Every key must be of type K and and every value must be of type V
 *
 *  Partial makes keys optional ie Owner is UserRole doesnt need an explicit key
 *  since owner doesnt submit invoices
 */
const APPROVAL_ROUTING: Partial<Record<UserRole, UserRole>> = {
  [UserRole.Subbie]: UserRole.Builder,
  [UserRole.Consultant]: UserRole.Builder,
  [UserRole.Builder]: UserRole.Owner,
  [UserRole.PM]: UserRole.Owner,
};

export async function submitInvoice(
  input: SubmitInvoiceInput,
  projectId: string,
  userId: string
): Promise<string> {
  const project = await ProjectModel.findById(projectId);
  if (!project) {
    throw new ProjectError("Project Does not Exist");
  }

  const participant = await ProjectParticipantModel.findOne({
    projectId,
    userId,
    status: "Accepted",
  });
  if (!participant) {
    throw new InvoiceError("User not part of project");
  }

  const submittingParty = input.submittingParty?.trim();
  const submittingCategory = input.submittingCategory?.trim();
  const dateDue = input.dateDue;
  const description = input.description?.trim();
  const amount = input.amount;

  if (!submittingParty || !submittingCategory || !dateDue || !description || !amount) {
    throw new InvoiceError(
      "Required fields missing: submittingParty, submittingCategory, dateDue, description, amount"
    );
  }

  const approverRole = APPROVAL_ROUTING[participant.role as UserRole];
  if (!approverRole) {
    throw new InvoiceError("Your role is not permitted to submit invoices");
  }

  const approverExists = await ProjectParticipantModel.exists({
    projectId,
    role: approverRole,
    status: "Accepted",
  });

  // Instead of fall back prevent invoice submission until the valid approver role is part of the
  // project
  if (!approverExists) {
    throw new InvoiceError(
      `No accepted ${approverRole} on this project yet. Invoices cannot be submitted until they join.`
    );
  }

  const invoice = await InvoiceModel.create({
    projectId,
    submittingParty,
    submittingCategory,
    submittedByUserId: userId,
    description,
    amount,
    dateSubmitted: new Date(Date.now()),
    dateDue,
    status: InvoiceStatus.Pending,
    approverRole,
  });

  await EventModel.create({
    type: "InvoiceSubmitted",
    aggregateType: "Invoice",
    aggregateId: invoice._id.toString(),
    userId,
    payload: { submittingParty, submittingCategory, dateDue, description, projectId },
  });

  return invoice._id.toString();
}
