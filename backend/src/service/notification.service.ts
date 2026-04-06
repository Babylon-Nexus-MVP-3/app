import { InvoiceModel, InvoiceStatus } from "../models/invoiceModel";
import { NotificationModel, NotificationType } from "../models/notificationModel";
import { ProjectModel } from "../models/projectModel";
import { ProjectParticipantModel } from "../models/projectParticipantModel";
import { UserRole } from "../models/userModel";

export class NotificationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

interface CreateNotificationInput {
  recipientUserId: string;
  projectId: string;
  invoiceId?: string;
  type: NotificationType;
  message: string;
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  await NotificationModel.create({
    recipientUserId: input.recipientUserId,
    projectId: input.projectId,
    invoiceId: input.invoiceId,
    type: input.type,
    message: input.message,
    read: false,
  });
}

export async function getNotificationsForUser(userId: string) {
  if (!userId) throw new NotificationError("Authentication Required", 401);

  const notifications = await NotificationModel.find({ recipientUserId: userId })
    .sort({ createdAt: -1 })
    .lean();

  const projectIds = [...new Set(notifications.map((n: any) => n.projectId.toString()))];
  const projects =
    projectIds.length > 0
      ? await ProjectModel.find({ _id: { $in: projectIds } })
          .select("name")
          .lean()
      : [];
  const projectNameById = new Map(projects.map((p: any) => [p._id.toString(), p.name as string]));

  return notifications.map((n: any) => ({
    id: n._id.toString(),
    recipientUserId: n.recipientUserId.toString(),
    projectId: n.projectId.toString(),
    projectName: projectNameById.get(n.projectId.toString()) ?? "Project",
    invoiceId: n.invoiceId ? n.invoiceId.toString() : null,
    type: n.type,
    message: n.message,
    read: n.read,
    createdAt: n.createdAt,
  }));
}

export async function markAllNotificationsRead(userId: string): Promise<number> {
  if (!userId) throw new NotificationError("Authentication Required", 401);

  const result = await NotificationModel.updateMany(
    { recipientUserId: userId, read: false },
    { $set: { read: true } }
  );

  return result.modifiedCount;
}

async function getAcceptedProjectUserIdsByRole(
  projectId: string,
  role: UserRole
): Promise<string[]> {
  const participants = await ProjectParticipantModel.find({
    projectId,
    status: "Accepted",
    role,
    userId: { $exists: true, $ne: null },
  })
    .select("userId")
    .lean();

  return participants.map((p: any) => p.userId.toString());
}

async function getAcceptedProjectUserIds(projectId: string): Promise<string[]> {
  const participants = await ProjectParticipantModel.find({
    projectId,
    status: "Accepted",
    userId: { $exists: true, $ne: null },
  })
    .select("userId")
    .lean();

  return participants.map((p: any) => p.userId.toString());
}

function unique(ids: string[]): string[] {
  return Array.from(new Set(ids));
}

export async function notifyInvoiceSubmitted(
  invoiceId: string,
  projectId: string,
  approverRole: UserRole,
  submittingParty: string
): Promise<void> {
  const recipientIds = unique(await getAcceptedProjectUserIdsByRole(projectId, approverRole));
  const message = `${submittingParty} submitted invoice for your approval.`;

  await Promise.all(
    recipientIds.map((recipientUserId) =>
      createNotification({
        recipientUserId,
        projectId,
        invoiceId,
        type: NotificationType.InvoiceSubmitted,
        message,
      })
    )
  );
}

export async function notifyInvoiceApproved(
  invoiceId: string,
  projectId: string,
  submitterUserId: string
): Promise<void> {
  await createNotification({
    recipientUserId: submitterUserId,
    projectId,
    invoiceId,
    type: NotificationType.InvoiceApproved,
    message: "Your invoice has been approved.",
  });
}

export async function notifyInvoicePaid(
  invoiceId: string,
  projectId: string,
  submitterUserId: string
): Promise<void> {
  await createNotification({
    recipientUserId: submitterUserId,
    projectId,
    invoiceId,
    type: NotificationType.InvoicePaid,
    message: "Your invoice has been marked as paid.",
  });
}

export async function notifyInvoiceRejected(
  invoiceId: string,
  projectId: string,
  submitterUserId: string,
  rejectionReason?: string
): Promise<void> {
  const message = rejectionReason
    ? `Your invoice was rejected. Reason: ${rejectionReason}`
    : "Your invoice was rejected.";

  await createNotification({
    recipientUserId: submitterUserId,
    projectId,
    invoiceId,
    type: NotificationType.InvoiceRejected,
    message,
  });
}

export async function notifyInvoiceReceived(
  invoiceId: string,
  projectId: string,
  approverRole: UserRole
): Promise<void> {
  const recipientIds = unique(await getAcceptedProjectUserIdsByRole(projectId, approverRole));

  await Promise.all(
    recipientIds.map((recipientUserId) =>
      createNotification({
        recipientUserId,
        projectId,
        invoiceId,
        type: NotificationType.InvoiceReceived,
        message: "Invoice has been marked as received by the submitter.",
      })
    )
  );
}

function getOverdueMilestones(daysOverdue: number): number[] {
  const milestones = [14, 21, 28];
  return milestones.filter((m) => daysOverdue >= m);
}

function overdueTypeForMilestone(milestone: number): NotificationType {
  if (milestone === 14) return NotificationType.InvoiceOverdue14;
  if (milestone === 21) return NotificationType.InvoiceOverdue21;
  return NotificationType.InvoiceOverdue28;
}

export async function runOverdueInvoiceEscalations(now: Date = new Date()): Promise<number> {
  const activeInvoices = await InvoiceModel.find({
    status: { $in: [InvoiceStatus.Pending, InvoiceStatus.Approved] },
    dateDue: { $lt: now },
  });

  let notificationsCreated = 0;

  for (const invoice of activeInvoices) {
    const dueTime = new Date(invoice.dateDue).getTime();
    const nowTime = now.getTime();
    const daysOverdue = Math.floor((nowTime - dueTime) / (1000 * 60 * 60 * 24));

    const targetMilestones = getOverdueMilestones(daysOverdue);
    const sentSet = new Set<number>(invoice.escalationsSent ?? []);
    const unsentMilestones = targetMilestones.filter((m) => !sentSet.has(m));
    if (unsentMilestones.length === 0) continue;

    const recipientIds = unique(await getAcceptedProjectUserIds(invoice.projectId.toString()));
    const invoiceId = invoice._id.toString();
    const projectId = invoice.projectId.toString();

    for (const milestone of unsentMilestones) {
      const type = overdueTypeForMilestone(milestone);
      const message =
        milestone === 14
          ? `Invoice ${invoice.invoiceNumber} is overdue by 14 days (SOPA threshold reached).`
          : milestone === 21
            ? `Invoice ${invoice.invoiceNumber} is overdue by 21 days.`
            : `Invoice ${invoice.invoiceNumber} is overdue by 28 days.`;

      await Promise.all(
        recipientIds.map((recipientUserId) =>
          createNotification({
            recipientUserId,
            projectId,
            invoiceId,
            type,
            message,
          })
        )
      );

      notificationsCreated += recipientIds.length;
      sentSet.add(milestone);
    }

    invoice.escalationsSent = Array.from(sentSet).sort((a, b) => a - b);
    await invoice.save();
  }

  return notificationsCreated;
}
