import { ProjectModel } from "../models/projectModel";
import { ProjectParticipantModel } from "../models/projectParticipantModel";
import { InvoiceModel, InvoiceStatus } from "../models/invoiceModel";
import { UserRole } from "../models/userModel";
import { AuthError } from "./auth.service";
import { ProjectError } from "./project.service";

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function addMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, 1, 0, 0, 0, 0);
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function isPaidStatus(status: InvoiceStatus): boolean {
  return status === "Paid" || status === "Received";
}

export interface ProjectInvoiceListItem {
  id: string;
  submittingParty: string;
  description: string;
  dateSubmitted: Date;
  dateDue: Date;
  amount?: number;
  status: InvoiceStatus;
  daysOverdue: number;
  approverRole: string;
  submittedByUserId: string;
}

export interface GetProjectDetailsResult {
  project: {
    id: string;
    name?: string;
    location: string;
    council: string;
  };
  userRole: UserRole;
  healthScore: number; // 0-100
  overdueInvoiceCount: number;
  monthOnMonthHealthChangePct: number | null;
  invoices: ProjectInvoiceListItem[];
}

function computeHealthScoreByDueDate(invoices: any[], now: Date): number {
  const paid = invoices.filter((i) => isPaidStatus(i.status));
  if (paid.length === 0) return 100;

  const onTime = paid.filter((i) => {
    const paidDate: Date | undefined = i.datePaid ?? i.dateReceived;
    if (!paidDate) return false;
    return paidDate.getTime() <= new Date(i.dateDue).getTime();
  });

  return Math.round((onTime.length / paid.length) * 100);
}

export async function getProjectDetails(
  projectId: string,
  userId: string,
  now: Date = new Date()
): Promise<GetProjectDetailsResult> {
  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) {
    throw new AuthError("Authentication Required", 401);
  }

  const project = await ProjectModel.findById(projectId).lean();
  if (!project) {
    throw new ProjectError("Project Does not Exist", 404);
  }

  const participant = await ProjectParticipantModel.findOne({
    projectId,
    userId: normalizedUserId,
    status: "Accepted",
  })
    .select("role")
    .lean();

  // ProjectParticipant is the source of truth for the user's role on this project
  // (Project.pmId / ownerId / builderId are display-only, synced on invite accept).
  const userRole = participant?.role;
  if (!userRole) {
    throw new AuthError("Forbidden", 403);
  }

  const invoicesRaw = await InvoiceModel.find({ projectId }).sort({ dateSubmitted: -1 }).lean();

  const invoices: ProjectInvoiceListItem[] = invoicesRaw.map((i: any) => {
    const due = new Date(i.dateDue);
    const paidDate: Date | undefined = i.datePaid ?? i.dateReceived;

    const overdueBase = paidDate ?? now;
    const overdue = overdueBase.getTime() > due.getTime() ? daysBetween(due, overdueBase) : 0;

    return {
      id: i._id.toString(),
      submittingParty: i.submittingParty,
      description: i.description,
      dateSubmitted: i.dateSubmitted,
      dateDue: i.dateDue,
      amount: i.amount,
      status: i.status,
      daysOverdue: overdue,
      approverRole: i.approverRole,
      submittedByUserId: i.submittedByUserId.toString(),
    };
  });

  const overdueInvoiceCount = invoicesRaw.filter((i: any) => {
    if (isPaidStatus(i.status)) return false;
    return new Date(i.dateDue).getTime() < now.getTime();
  }).length;

  const healthScore = computeHealthScoreByDueDate(invoicesRaw, now);

  const currentMonthStart = startOfMonth(now);
  const nextMonthStart = addMonths(currentMonthStart, 1);
  const prevMonthStart = addMonths(currentMonthStart, -1);

  const currentMonthInvoices = invoicesRaw.filter((i: any) => {
    const due = new Date(i.dateDue);
    return due >= currentMonthStart && due < nextMonthStart;
  });
  const prevMonthInvoices = invoicesRaw.filter((i: any) => {
    const due = new Date(i.dateDue);
    return due >= prevMonthStart && due < currentMonthStart;
  });

  const currentMonthHealth = computeHealthScoreByDueDate(currentMonthInvoices, now);
  const prevMonthHealth = computeHealthScoreByDueDate(prevMonthInvoices, now);

  const prevMonthHadPaid = prevMonthInvoices.some((i: any) => isPaidStatus(i.status));
  // Avoid NaN when prev month had paid invoices but 0% on-time health (divide by 0).
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
    userRole,
    healthScore,
    overdueInvoiceCount,
    monthOnMonthHealthChangePct,
    invoices,
  };
}
