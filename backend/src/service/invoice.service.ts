import { InvoiceModel, InvoiceStatus } from "../models/invoiceModel";
import { EventModel, EventType } from "../models/eventModel";
import { ProjectModel } from "../models/projectModel";
import { ProjectParticipantModel } from "../models/projectParticipantModel";
import { ProjectError } from "./project.service";
import { UserModel, UserRole } from "../models/userModel";

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
    payload: { submittingParty, submittingCategory, dateDue, description, amount, projectId },
  });

  return invoice._id.toString();
}

async function getInvoiceForAction(invoiceId: string, projectId: string, userId: string) {
  const invoice = await InvoiceModel.findOne({ _id: invoiceId, projectId });
  if (!invoice) {
    throw new InvoiceError("Invoice not found", 404);
  }

  const participant = await ProjectParticipantModel.findOne({
    projectId,
    userId,
    status: "Accepted",
  });
  if (!participant) {
    throw new InvoiceError("User not part of project", 403);
  }

  return { invoice, participant };
}

export async function approveInvoice(
  invoiceId: string,
  projectId: string,
  userId: string
): Promise<void> {
  const { invoice, participant } = await getInvoiceForAction(invoiceId, projectId, userId);

  if (participant.role !== invoice.approverRole) {
    throw new InvoiceError("You are not authorised to approve this invoice", 403);
  }

  if (invoice.status !== InvoiceStatus.Pending) {
    throw new InvoiceError("Invoice must be in Pending status to approve");
  }

  invoice.status = InvoiceStatus.Approved;
  await invoice.save();

  await EventModel.create({
    type: "InvoiceApproved",
    aggregateType: "Invoice",
    aggregateId: invoiceId,
    userId,
    payload: { projectId },
  });
}

export async function markInvoicePaid(
  invoiceId: string,
  projectId: string,
  userId: string
): Promise<void> {
  const { invoice, participant } = await getInvoiceForAction(invoiceId, projectId, userId);

  if (participant.role !== invoice.approverRole) {
    throw new InvoiceError("You are not authorised to mark this invoice as paid", 403);
  }

  if (invoice.status !== InvoiceStatus.Approved) {
    throw new InvoiceError("Invoice must be Approved before marking as paid");
  }

  invoice.status = InvoiceStatus.Paid;
  invoice.datePaid = new Date();
  await invoice.save();

  await EventModel.create({
    type: "InvoicePaid",
    aggregateType: "Invoice",
    aggregateId: invoiceId,
    userId,
    payload: { projectId },
  });
}

export async function markInvoiceReceived(
  invoiceId: string,
  projectId: string,
  userId: string
): Promise<void> {
  const { invoice } = await getInvoiceForAction(invoiceId, projectId, userId);

  if (invoice.submittedByUserId.toString() !== userId) {
    throw new InvoiceError("Only the invoice submitter can mark it as received", 403);
  }

  if (invoice.status !== InvoiceStatus.Paid) {
    throw new InvoiceError("Invoice must be Paid before marking as received");
  }

  invoice.status = InvoiceStatus.Received;
  invoice.dateReceived = new Date();
  await invoice.save();

  await EventModel.create({
    type: "InvoiceReceived",
    aggregateType: "Invoice",
    aggregateId: invoiceId,
    userId,
    payload: { projectId },
  });
}

export async function rejectInvoice(
  invoiceId: string,
  projectId: string,
  userId: string,
  rejectionReason?: string
): Promise<void> {
  const { invoice, participant } = await getInvoiceForAction(invoiceId, projectId, userId);

  if (participant.role !== invoice.approverRole) {
    throw new InvoiceError("You are not authorised to reject this invoice", 403);
  }

  if (invoice.status !== InvoiceStatus.Pending) {
    throw new InvoiceError("Invoice can only be rejected when Pending");
  }

  invoice.status = InvoiceStatus.Rejected;
  if (rejectionReason) invoice.rejectionReason = rejectionReason;
  await invoice.save();

  await EventModel.create({
    type: "InvoiceRejected",
    aggregateType: "Invoice",
    aggregateId: invoiceId,
    userId,
    payload: { projectId, rejectionReason },
  });
}

/* ─── Audit Log ─── */

export interface AuditLogEvent {
  type: EventType;
  actorName: string;
  actorRole: string;
  timestamp: Date;
  rejectionReason?: string;
}

export interface InvoiceAuditEntry {
  invoiceId: string;
  description: string;
  amount: number;
  status: InvoiceStatus;
  submittingParty: string;
  submittingCategory: string;
  dateSubmitted: Date;
  dateDue: Date;
  events: AuditLogEvent[];
}

export interface AuditLogResult {
  projectName: string;
  generatedAt: Date;
  viewerName: string;
  viewerRole: string;
  summary: {
    totalInvoices: number;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
  };
  entries: InvoiceAuditEntry[];
}

const AUDIT_LOG_ROLES: UserRole[] = [
  UserRole.Admin,
  UserRole.Owner,
  UserRole.Builder,
  UserRole.PM,
  UserRole.Financier,
  UserRole.VIP,
  UserRole.Observer,
  UserRole.Subbie,
  UserRole.Consultant,
];

// Subbies and Consultants can only see their own invoices
const RESTRICTED_ROLES: UserRole[] = [UserRole.Subbie, UserRole.Consultant];

export async function getProjectAuditLog(
  projectId: string,
  userId: string
): Promise<AuditLogResult> {
  const project = await ProjectModel.findById(projectId);
  if (!project) {
    throw new ProjectError("Project not found", 404);
  }

  const participant = await ProjectParticipantModel.findOne({
    projectId,
    userId,
    status: "Accepted",
  });
  if (!participant || !AUDIT_LOG_ROLES.includes(participant.role as UserRole)) {
    throw new InvoiceError("You do not have access to the audit log", 403);
  }

  const isRestricted = RESTRICTED_ROLES.includes(participant.role as UserRole);
  const invoiceQuery = isRestricted ? { projectId, submittedByUserId: userId } : { projectId };

  const invoices = await InvoiceModel.find(invoiceQuery).sort({ dateSubmitted: 1 });

  // Collect all accepted participants to build actor info map
  const allParticipants = await ProjectParticipantModel.find({
    projectId,
    status: "Accepted",
  });

  const participantUserIds = allParticipants.filter((p) => p.userId).map((p) => p.userId as string);

  const users = await UserModel.find({ _id: { $in: participantUserIds } }).select("_id name");

  const userNameMap = new Map<string, string>();
  for (const u of users) {
    userNameMap.set(u._id.toString(), u.name);
  }

  const participantRoleMap = new Map<string, string>();
  for (const p of allParticipants) {
    if (p.userId) participantRoleMap.set(p.userId, p.role);
  }

  // Build audit entries
  const invoiceIds = invoices.map((inv) => inv._id.toString());
  const allEvents = await EventModel.find({
    aggregateType: "Invoice",
    aggregateId: { $in: invoiceIds },
  }).sort({ createdAt: 1 });

  // Group events by invoiceId
  const eventsByInvoice = new Map<string, typeof allEvents>();
  for (const ev of allEvents) {
    const key = ev.aggregateId;
    if (!eventsByInvoice.has(key)) eventsByInvoice.set(key, []);
    eventsByInvoice.get(key)!.push(ev);
  }

  const entries: InvoiceAuditEntry[] = invoices.map((inv) => {
    const invId = inv._id.toString();
    const rawEvents = eventsByInvoice.get(invId) ?? [];

    const events: AuditLogEvent[] = rawEvents.map((ev) => {
      const actorId = ev.userId?.toString() ?? "";
      return {
        type: ev.type,
        actorName: userNameMap.get(actorId) ?? "Unknown",
        actorRole: participantRoleMap.get(actorId) ?? "Unknown",
        timestamp: ev.createdAt,
        rejectionReason:
          ev.type === "InvoiceRejected"
            ? (ev.payload?.rejectionReason as string | undefined)
            : undefined,
      };
    });

    return {
      invoiceId: invId,
      description: inv.description,
      amount: inv.amount,
      status: inv.status,
      submittingParty: inv.submittingParty,
      submittingCategory: inv.submittingCategory,
      dateSubmitted: inv.dateSubmitted,
      dateDue: inv.dateDue,
      events,
    };
  });

  // Summary stats
  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidInvoices = invoices.filter(
    (inv) => inv.status === InvoiceStatus.Paid || inv.status === InvoiceStatus.Received
  );
  const paidAmount = paidInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const outstandingAmount = totalAmount - paidAmount;

  const viewer = await UserModel.findById(userId).select("name");

  return {
    projectName: project.name,
    generatedAt: new Date(),
    viewerName: viewer?.name ?? "Unknown",
    viewerRole: participant.role,
    summary: {
      totalInvoices: invoices.length,
      totalAmount,
      paidAmount,
      outstandingAmount,
    },
    entries,
  };
}
