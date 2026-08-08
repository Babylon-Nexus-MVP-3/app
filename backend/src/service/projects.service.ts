import { ProjectModel } from "../models/projectModel";
import { ProjectParticipantModel } from "../models/projectParticipantModel";
import { InvoiceModel, InvoiceStatus } from "../models/invoiceModel";

function isPaidStatus(status: InvoiceStatus): boolean {
  return status === "Paid" || status === "Received";
}

function isOverdue(invoice: any, now: Date): boolean {
  if (isPaidStatus(invoice.status) || invoice.status === "Rejected") return false;
  return new Date(invoice.dateDue).getTime() < now.getTime();
}

function computeHealthScore(invoices: any[], now: Date): number {
  const paid = invoices.filter((i) => isPaidStatus(i.status));
  if (paid.length === 0) return 100;
  const onTime = paid.filter((i) => {
    const paidDate: Date | undefined = i.datePaid ?? i.dateReceived;
    if (!paidDate) return false;
    return paidDate.getTime() <= new Date(i.dateDue).getTime();
  });
  return Math.round((onTime.length / paid.length) * 100);
}

export interface ListProjectsResult {
  projects: any[];
  total: number;
}

export async function listAssociatedProjects(userId: string): Promise<ListProjectsResult> {
  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) {
    return { projects: [], total: 0 };
  }

  const participants = await ProjectParticipantModel.find({
    userId: normalizedUserId,
    status: "Accepted",
  })
    .select("projectId role")
    .lean();

  const participantProjectIds = participants.map((p) => p.projectId);
  const roleByProjectId = new Map<string, string>(
    participants.map((p) => [p.projectId, p.role as string])
  );

  const orClauses: Record<string, unknown>[] = [
    { ownerId: normalizedUserId },
    { builderId: normalizedUserId },
    { pmId: normalizedUserId },
  ];

  if (participantProjectIds.length > 0) {
    orClauses.push({ _id: { $in: participantProjectIds } });
  }

  const projects = await ProjectModel.find({
    $or: orClauses,
    status: "Active",
  })
    .sort({ createdAt: -1 })
    .lean();

  const projectIds = projects.map((p: any) => p._id.toString());

  const allInvoices =
    projectIds.length > 0 ? await InvoiceModel.find({ projectId: { $in: projectIds } }).lean() : [];

  const invoicesByProject = new Map<string, any[]>();
  for (const inv of allInvoices) {
    const pid = inv.projectId.toString();
    if (!invoicesByProject.has(pid)) invoicesByProject.set(pid, []);
    invoicesByProject.get(pid)!.push(inv);
  }

  const now = new Date();

  const projectsWithRole = projects.map((p: any) => {
    const projectId = p._id.toString();
    const participantRole = roleByProjectId.get(projectId);

    const inferredRole =
      participantRole ??
      (p.pmId === normalizedUserId
        ? "PM"
        : p.ownerId === normalizedUserId
          ? "Owner"
          : p.builderId === normalizedUserId
            ? "Builder"
            : undefined);

    const invoices = invoicesByProject.get(projectId) ?? [];
    const healthScore = computeHealthScore(invoices, now);
    const overdueInvoiceCount = invoices.filter((i) => isOverdue(i, now)).length;

    return { ...p, userRole: inferredRole, healthScore, overdueInvoiceCount };
  });

  return { projects: projectsWithRole, total: projectsWithRole.length };
}

export interface ProjectHistoryEntry {
  id: string;
  name: string;
  location: string;
  council: string;
  status: string;
  role?: string;
  startedAt: Date;
}

/**
 * Every project the user is or has been part of, whatever its current status.
 * `listAssociatedProjects` deliberately returns only Active projects for the
 * working view; this is the record of involvement over time, so an archived or
 * inactive project still counts as work the user did.
 */
export async function listProjectHistory(userId: string): Promise<ProjectHistoryEntry[]> {
  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) return [];

  const participants = await ProjectParticipantModel.find({
    userId: normalizedUserId,
    status: "Accepted",
  })
    .select("projectId role")
    .lean();

  const roleByProjectId = new Map<string, string>(
    participants.map((p) => [p.projectId, p.role as string])
  );

  const orClauses: Record<string, unknown>[] = [
    { ownerId: normalizedUserId },
    { builderId: normalizedUserId },
    { pmId: normalizedUserId },
  ];
  if (participants.length > 0) {
    orClauses.push({ _id: { $in: participants.map((p) => p.projectId) } });
  }

  // Deleted projects are excluded — soft-deleted records aren't history the
  // user should still see. Rejected ones never became real projects either.
  const projects = await ProjectModel.find({
    $or: orClauses,
    isDeleted: { $ne: true },
    status: { $ne: "Rejected" },
  })
    .sort({ createdAt: -1 })
    .lean();

  return projects.map((p: any) => {
    const projectId = p._id.toString();
    const role =
      roleByProjectId.get(projectId) ??
      (p.pmId === normalizedUserId
        ? "PM"
        : p.ownerId === normalizedUserId
          ? "Owner"
          : p.builderId === normalizedUserId
            ? "Builder"
            : undefined);

    return {
      id: projectId,
      name: p.name,
      location: p.location,
      council: p.council,
      status: p.status,
      role,
      startedAt: p.createdAt,
    };
  });
}
