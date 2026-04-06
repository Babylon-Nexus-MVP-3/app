import { UserModel, UserRole } from "../models/userModel";
import { ProjectModel } from "../models/projectModel";
import { ProjectParticipantModel } from "../models/projectParticipantModel";
import { InvoiceModel } from "../models/invoiceModel";
import { hashCode } from "../utils/authHelper";
import { sendInviteEmail } from "./email.service";
import { ProjectError } from "./project.service";
import { randomInt } from "crypto";
import { notifyProjectApproved } from "./notification.service";

export class AdminError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function generateOTP(): string {
  return randomInt(100000, 999999).toString();
}

async function notifyAdminSafely(run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch {
    // intentionally silent — project approval is already committed
  }
}

export async function listPendingProjects(): Promise<any[]> {
  const projects = await ProjectModel.find({ status: "Pending" }).sort({ createdAt: -1 }).lean();

  const projectIds = projects.map((p) => p._id.toString());
  const allParticipants = await ProjectParticipantModel.find({
    projectId: { $in: projectIds },
  }).lean();

  const acceptedUserIds = allParticipants
    .filter((p) => p.status === "Accepted" && p.userId)
    .map((p) => p.userId!);

  const creatorUsers = await UserModel.find({ _id: { $in: acceptedUserIds } })
    .select("name email")
    .lean();
  const creatorUserMap = Object.fromEntries(creatorUsers.map((u) => [u._id.toString(), u]));

  return projects.map((p) => {
    const projectId = p._id.toString();
    const participants = allParticipants.filter((pp) => pp.projectId === projectId);

    const creatorParticipant = participants.find((pp) => pp.status === "Accepted" && pp.userId);
    let creator = null;
    if (creatorParticipant) {
      const user = creatorUserMap[creatorParticipant.userId!];
      creator = {
        name: user?.name ?? "—",
        email: creatorParticipant.email,
        role: creatorParticipant.role,
      };
    }

    const invitees = participants
      .filter((pp) => pp.status === "Pending")
      .map((pp) => ({ email: pp.email, role: pp.role }));

    return {
      _id: projectId,
      name: p.name,
      location: p.location,
      council: p.council,
      status: p.status,
      createdAt: p.createdAt,
      creator,
      invitees,
    };
  });
}

export async function listActiveProjects(): Promise<any[]> {
  const projects = await ProjectModel.find({ status: "Active" }).sort({ createdAt: -1 }).lean();
  return projects.map((p) => ({
    _id: p._id.toString(),
    name: p.name,
    location: p.location,
    council: p.council,
    status: p.status,
    createdAt: p.createdAt,
  }));
}

export async function listInactiveProjects(): Promise<any[]> {
  const projects = await ProjectModel.find({ status: "Inactive" }).sort({ createdAt: -1 }).lean();
  return projects.map((p) => ({
    _id: p._id.toString(),
    name: p.name,
    location: p.location,
    council: p.council,
    status: p.status,
    createdAt: p.createdAt,
  }));
}

export async function approveProject(projectId: string): Promise<void> {
  const project = await ProjectModel.findOneAndUpdate(
    { _id: projectId, status: "Pending" },
    { $set: { status: "Active" } },
    { returnDocument: "after" }
  );
  if (!project) {
    throw new AdminError("Project not found or already processed", 404);
  }

  const pendingParticipants = await ProjectParticipantModel.find({
    projectId,
    status: "Pending",
  });

  await notifyAdminSafely(() => notifyProjectApproved(projectId, project.name));

  for (const participant of pendingParticipants) {
    if (!participant.email) continue;

    const inviteCode = generateOTP();
    participant.inviteCode = hashCode(inviteCode);
    participant.dateInvited = new Date();
    await participant.save();

    await sendInviteEmail(participant.email, inviteCode, project.location).catch((err) => {
      console.error(`Failed to send invite email to ${participant.email}:`, err);
    });
  }
}

export async function rejectProject(projectId: string): Promise<void> {
  const result = await ProjectModel.updateOne(
    { _id: projectId, status: "Pending" },
    { $set: { status: "Rejected" } }
  );
  if (result.matchedCount === 0) {
    throw new AdminError("Project not found or already processed", 404);
  }
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

  const project = await ProjectModel.findById(projectId);
  if (!project) throw new AdminError("Project does not exist", 404);

  const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const emailRegex = new RegExp(`^${escapedEmail}$`, "i");

  const deletedAcceptedUserIds: string[] = [];
  const participantsToDelete = await ProjectParticipantModel.find({
    projectId,
    email: { $regex: emailRegex },
    role,
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
    role,
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

  return { removedCount };
}

export async function deleteProject(projectId: string) {
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

  return { success: true };
}

function computeHealthScore(invoices: any[]): number {
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
  const project = await ProjectModel.findById(projectId).lean();
  if (!project) throw new AdminError("Project not found", 404);

  const participants = await ProjectParticipantModel.find({ projectId })
    .select("_id email role status userId")
    .sort({ status: 1, role: 1 })
    .lean();

  const acceptedUserIds = participants.filter((p) => p.userId).map((p) => p.userId!);
  const participantUsers = await UserModel.find({ _id: { $in: acceptedUserIds } })
    .select("name")
    .lean();
  const participantUserMap = Object.fromEntries(
    participantUsers.map((u) => [u._id.toString(), u.name])
  );

  const now = new Date();
  const invoicesRaw = await InvoiceModel.find({ projectId }).sort({ dateSubmitted: -1 }).lean();

  const invoices = invoicesRaw.map((i: any) => {
    const due = new Date(i.dateDue);
    const paidDate: Date | undefined = i.datePaid ?? i.dateReceived;
    const overdueBase = paidDate ?? now;
    const daysOverdue =
      overdueBase.getTime() > due.getTime()
        ? Math.ceil((overdueBase.getTime() - due.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
    return {
      id: i._id.toString(),
      submittingParty: i.submittingParty,
      description: i.description,
      dateSubmitted: i.dateSubmitted,
      dateDue: i.dateDue,
      amount: i.amount,
      status: i.status,
      daysOverdue,
    };
  });

  const overdueInvoiceCount = invoicesRaw.filter((i: any) => {
    if (i.status === "Paid" || i.status === "Received") return false;
    return new Date(i.dateDue).getTime() < now.getTime();
  }).length;

  const healthScore = computeHealthScore(invoicesRaw);

  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const currentMonthInvoices = invoicesRaw.filter((i: any) => {
    const due = new Date(i.dateDue);
    return due >= currentMonthStart && due < nextMonthStart;
  });
  const prevMonthInvoices = invoicesRaw.filter((i: any) => {
    const due = new Date(i.dateDue);
    return due >= prevMonthStart && due < currentMonthStart;
  });

  const prevMonthHealth = computeHealthScore(prevMonthInvoices);
  const currentMonthHealth = computeHealthScore(currentMonthInvoices);
  const prevMonthHadPaid = prevMonthInvoices.some(
    (i: any) => i.status === "Paid" || i.status === "Received"
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
    },
    participants: participants.map((p) => ({
      participantId: p._id.toString(),
      name: p.userId ? (participantUserMap[p.userId] ?? null) : null,
      email: p.email,
      role: p.role,
      status: p.status,
    })),
    healthScore,
    overdueInvoiceCount,
    monthOnMonthHealthChangePct,
    invoices,
  };
}
