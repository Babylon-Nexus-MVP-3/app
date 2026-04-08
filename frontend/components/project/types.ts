export type InvoiceStatus = "green" | "amber" | "red" | "purple" | "grey" | "issued";

export type ApiInvoice = {
  id: string;
  invoiceNumber: string;
  submittingParty: string;
  submittingCategory: string;
  description: string;
  dateSubmitted: string;
  dateDue: string;
  amount?: number;
  status: "Pending" | "Approved" | "Paid" | "Received" | "Rejected";
  daysOverdue: number;
  approverRole: string;
  submittedByUserId: string;
  submittedByName?: string | null;
  approverNames?: string[];
  rejectionReason?: string;
};

export type InvoiceActionType = "approve" | "paid" | "received" | "reject";

export const ACTION_WORD: Record<InvoiceActionType, string> = {
  approve: "approve",
  paid: "paid",
  received: "received",
  reject: "reject",
};

export const ACTION_LABEL: Record<InvoiceActionType, string> = {
  approve: "Approve Invoice",
  paid: "Mark as Paid",
  received: "Confirm Receipt",
  reject: "Reject Invoice",
};

export const SEVERITY: Record<InvoiceStatus, number> = {
  red: 5,
  amber: 4,
  purple: 3,
  issued: 2,
  grey: 1,
  green: 0,
};

export const ROLE_DISPLAY: Record<string, string> = {
  PM: "Project Manager",
  Subbie: "Subcontractor",
};

export const ROLE_API: Record<string, string> = {
  "Project Manager": "PM",
  Subcontractor: "Subbie",
};

export const INVITE_ROLES = [
  "Subcontractor",
  "Builder",
  "Project Manager",
  "Owner",
  "Consultant",
  "Financier",
  "VIP",
  "Observer",
] as const;

export type InviteRole = (typeof INVITE_ROLES)[number];

export const INVOICE_UPLOADER_ROLES = ["Subbie", "Builder", "Consultant", "PM"];

export type Participant = {
  participantId: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  hasLicence?: boolean | null;
  hasInsurance?: boolean | null;
};
