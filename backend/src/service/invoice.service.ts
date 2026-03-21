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
 *  Create a hashmap with Type Safety to map allowed roles that can approve based on the role
 *  that submits. For example an invoice submitted by a subbie can be either approved by
 *  Builder or PM or Owner depending on fallback chain.
 */
const APPROVAL_ROUTING: Partial<Record<UserRole, UserRole[]>> = {
  [UserRole.Subbie]: [UserRole.Builder, UserRole.PM, UserRole.Owner],
  [UserRole.Consultant]: [UserRole.Builder, UserRole.PM, UserRole.Owner],
  [UserRole.Builder]: [UserRole.Owner],
  [UserRole.PM]: [UserRole.Owner],
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

  if (!submittingParty || !submittingCategory || !dateDue || !description || amount == null) {
    throw new InvoiceError(
      "Required fields missing: submittingParty, submittingCategory, dateDue, description, amount"
    );
  }

  if (amount <= 0) {
    throw new InvoiceError("Invalid amount. Amount must be a positive number");
  }

  const fallbackChain = APPROVAL_ROUTING[participant.role as UserRole];
  if (!fallbackChain) {
    throw new InvoiceError("Your role is not permitted to submit invoices");
  }

  // Finds all current roles active within the project
  const acceptedRoles = await ProjectParticipantModel.distinct("role", {
    projectId,
    status: "Accepted",
  });

  // Checks whether any of the current roles are included within the acceptable fallback chain
  const resolvedApproverRole = fallbackChain.find((r) => acceptedRoles.includes(r)) ?? null;
  if (!resolvedApproverRole) {
    throw new InvoiceError(
      `Cannot submit invoice: none of the required approver roles are on this project yet.
      Please Invite them before submitting this invoice`
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
    approverRole: resolvedApproverRole,
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
