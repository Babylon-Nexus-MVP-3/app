import mongoose from "mongoose";
import { UserModel, UserRole } from "../models/userModel";
import { Project, ProjectModel } from "../models/projectModel";
import { ProjectParticipantModel } from "../models/projectParticipantModel";
import { Invoice, InvoiceModel } from "../models/invoiceModel";
import { ProjectError } from "./project.service";
import { notifyProjectDeleted, notifyProjectParticipantRemoved } from "./notification.service";
import { fullName } from "../utils/name";

export class AdminError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function notifyAdminSafely(run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch {
    // intentionally silent — the admin action is already committed
  }
}

/** A project row in the admin console lists. */
export interface AdminProjectSummary {
  _id: string;
  name: string;
  location: string;
  council: string;
  daNumber?: string;
  status: Project["status"];
  createdAt: Date;
}

export async function listActiveProjects(): Promise<AdminProjectSummary[]> {
  const projects = await ProjectModel.find({ status: "Active" }).sort({ createdAt: -1 }).lean();
  return projects.map((p) => ({
    _id: p._id.toString(),
    name: p.name,
    location: p.location,
    council: p.council,
    daNumber: p.daNumber,
    status: p.status,
    createdAt: p.createdAt,
  }));
}

export async function listInactiveProjects(): Promise<AdminProjectSummary[]> {
  const projects = await ProjectModel.find({ status: "Inactive" })
    .setOptions({ bypassSoftDelete: true })
    .sort({ createdAt: -1 })
    .lean();
  return projects.map((p) => ({
    _id: p._id.toString(),
    name: p.name,
    location: p.location,
    council: p.council,
    daNumber: p.daNumber,
    status: p.status,
    createdAt: p.createdAt,
  }));
}

export interface RemoveProjectParticipantInput {
  projectId: string;
  email?: string;
  role?: string;
}

export async function removeProjectParticipant(
  input: RemoveProjectParticipantInput
): Promise<{ removedCount: number }> {
  const projectId = input.projectId?.toString();
  const email = input.email?.trim();
  const role = input.role?.trim();

  if (!projectId) throw new AdminError("projectId is required", 400);
  if (!email) throw new AdminError("email is required", 400);
  if (!role) throw new AdminError("role is required", 400);

  if (!Object.values(UserRole).includes(role as UserRole)) {
    throw new AdminError("Invalid role", 400);
  }
  const validatedRole = role as UserRole;

  if (!mongoose.isValidObjectId(projectId)) {
    throw new AdminError("Invalid project id", 400);
  }

  const project = await ProjectModel.findById(projectId);
  if (!project) throw new AdminError("Project does not exist", 404);

  const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const emailRegex = new RegExp(`^${escapedEmail}$`, "i");

  const deletedAcceptedUserIds: string[] = [];
  const participantsToDelete = await ProjectParticipantModel.find({
    projectId,
    email: { $regex: emailRegex },
    role: validatedRole,
  }).select("status userId role email");

  if (participantsToDelete.length === 0) {
    throw new AdminError("Participant not found", 404);
  }

  for (const p of participantsToDelete) {
    if (p.status === "Accepted" && p.userId) deletedAcceptedUserIds.push(p.userId);
  }

  // Keep a snapshot of the current display-only role fields so we only touch the matching one.
  const pmIdBefore = project.pmId;
  const ownerIdBefore = project.ownerId;
  const builderIdBefore = project.builderId;

  const deleteResult = await ProjectParticipantModel.deleteMany({
    projectId,
    email: { $regex: emailRegex },
    role: validatedRole,
  });

  const removedCount = deleteResult.deletedCount ?? 0;

  // If we just removed the current PM/Owner/Builder user for this project,
  // keep the display fields in sync with what's left after deletion.
  if (role === UserRole.PM && pmIdBefore && deletedAcceptedUserIds.includes(pmIdBefore)) {
    const replacement = await ProjectParticipantModel.findOne({
      projectId,
      status: "Accepted",
      role: UserRole.PM,
      userId: { $exists: true, $ne: "" },
    }).select("userId");

    if (replacement?.userId) {
      project.pmId = replacement.userId;
    } else {
      project.pmId = undefined;
    }
  }

  if (role === UserRole.Owner && ownerIdBefore && deletedAcceptedUserIds.includes(ownerIdBefore)) {
    const replacement = await ProjectParticipantModel.findOne({
      projectId,
      status: "Accepted",
      role: UserRole.Owner,
      userId: { $exists: true, $ne: "" },
    }).select("userId");

    if (replacement?.userId) {
      project.ownerId = replacement.userId;
    } else {
      project.ownerId = undefined;
    }
  }

  if (
    role === UserRole.Builder &&
    builderIdBefore &&
    deletedAcceptedUserIds.includes(builderIdBefore)
  ) {
    const replacement = await ProjectParticipantModel.findOne({
      projectId,
      status: "Accepted",
      role: UserRole.Builder,
      userId: { $exists: true, $ne: "" },
    }).select("userId");

    if (replacement?.userId) {
      project.builderId = replacement.userId;
    } else {
      project.builderId = undefined;
    }
  }

  await project.save();

  await notifyAdminSafely(() => notifyProjectParticipantRemoved(projectId, deletedAcceptedUserIds));

  return { removedCount };
}

export async function deleteProject(projectId: string) {
  if (!mongoose.isValidObjectId(projectId)) {
    throw new ProjectError("Invalid project id", 400);
  }
  const project = await ProjectModel.findOne({ _id: projectId });

  if (!project) {
    throw new ProjectError("Project does not exist");
  }
  if (project.status === "Inactive") {
    throw new ProjectError("Project is already inactive");
  }

  project.status = "Inactive";
  project.isDeleted = true;
  project.deletedAt = new Date();
  await project.save();

  await notifyAdminSafely(() => notifyProjectDeleted(projectId));

  return { success: true };
}

function computeHealthScore(
  invoices: Pick<Invoice, "status" | "datePaid" | "dateReceived" | "dateDue">[]
): number {
  const paid = invoices.filter((i) => i.status === "Paid" || i.status === "Received");
  if (paid.length === 0) return 100;
  const onTime = paid.filter((i) => {
    const paidDate: Date | undefined = i.datePaid ?? i.dateReceived;
    if (!paidDate) return false;
    return paidDate.getTime() <= new Date(i.dateDue).getTime();
  });
  return Math.round((onTime.length / paid.length) * 100);
}

export async function getAdminProjectDetail(projectId: string) {
  if (!mongoose.isValidObjectId(projectId)) {
    throw new AdminError("Invalid project id", 400);
  }
  const project = await ProjectModel.findById(projectId)
    .setOptions({ bypassSoftDelete: true })
    .lean();
  if (!project) throw new AdminError("Project not found", 404);

  const participants = await ProjectParticipantModel.find({ projectId })
    .select("_id email role status userId hasInsurance hasLicence")
    .sort({ status: 1, role: 1 })
    .lean();

  const acceptedUserIds = participants.filter((p) => p.userId).map((p) => p.userId!);
  const participantUsers = await UserModel.find({ _id: { $in: acceptedUserIds } })
    .select("firstName lastName")
    .lean();
  const participantUserMap = Object.fromEntries(
    participantUsers.map((u) => [u._id.toString(), fullName(u.firstName, u.lastName)])
  );

  const now = new Date();
  const invoicesRaw = await InvoiceModel.find({ projectId }).sort({ dateSubmitted: -1 }).lean();

  const invoices = invoicesRaw.map((i) => {
    const due = new Date(i.dateDue);
    const paidDate: Date | undefined = i.datePaid ?? i.dateReceived;
    const overdueBase = paidDate ?? now;
    const daysOverdue =
      overdueBase.getTime() > due.getTime()
        ? Math.ceil((overdueBase.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
    return {
      id: i._id.toString(),
      invoiceNumber: i.invoiceNumber,
      submittingParty: i.submittingParty,
      submittingCategory: i.submittingCategory,
      description: i.description,
      dateSubmitted: i.dateSubmitted,
      dateDue: i.dateDue,
      amount: i.amount,
      status: i.status,
      approverRole: i.approverRole,
      submittedByUserId: i.submittedByUserId?.toString(),
      rejectionReason: i.rejectionReason,
      daysOverdue,
    };
  });

  const overdueInvoiceCount = invoicesRaw.filter((i) => {
    if (i.status === "Paid" || i.status === "Received") return false;
    return new Date(i.dateDue).getTime() < now.getTime();
  }).length;

  const healthScore = computeHealthScore(invoicesRaw);

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const currentMonthInvoices = invoicesRaw.filter((i) => {
    const due = new Date(i.dateDue);
    return due >= currentMonthStart && due < nextMonthStart;
  });
  const prevMonthInvoices = invoicesRaw.filter((i) => {
    const due = new Date(i.dateDue);
    return due >= prevMonthStart && due < currentMonthStart;
  });

  const prevMonthHealth = computeHealthScore(prevMonthInvoices);
  const currentMonthHealth = computeHealthScore(currentMonthInvoices);
  const prevMonthHadPaid = prevMonthInvoices.some(
    (i) => i.status === "Paid" || i.status === "Received"
  );
  const monthOnMonthHealthChangePct =
    !prevMonthHadPaid || prevMonthHealth === 0
      ? null
      : Math.round(((currentMonthHealth - prevMonthHealth) / prevMonthHealth) * 100);

  return {
    project: {
      id: project._id.toString(),
      name: project.name,
      location: project.location,
      council: project.council,
      daNumber: project.daNumber,
      status: project.status,
    },
    participants: participants.map((p) => ({
      participantId: p._id.toString(),
      name: p.userId ? (participantUserMap[p.userId] ?? null) : null,
      email: p.email,
      role: p.role,
      status: p.status,
      hasInsurance: p.hasInsurance,
      hasLicence: p.hasLicence,
    })),
    healthScore,
    overdueInvoiceCount,
    monthOnMonthHealthChangePct,
    invoices,
  };
}
