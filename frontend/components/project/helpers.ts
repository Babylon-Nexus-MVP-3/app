import { Colors } from "@/constants/colors";
import { ApiInvoice, InvoiceStatus, ROLE_DISPLAY } from "./types";

export function statusColor(s: InvoiceStatus): string {
  const map: Record<InvoiceStatus, string> = {
    green: Colors.green,
    amber: Colors.amber,
    red: Colors.red,
    purple: Colors.purple,
    grey: Colors.grey,
    issued: Colors.navy,
  };
  return map[s] ?? Colors.grey;
}

export function statusBg(s: InvoiceStatus): string {
  const map: Record<InvoiceStatus, string> = {
    green: Colors.greenBg,
    amber: Colors.amberBg,
    red: Colors.redBg,
    purple: Colors.purpleBg,
    grey: Colors.greyBg,
    issued: Colors.issuedBg,
  };
  return map[s] ?? Colors.greyBg;
}

export function statusLabel(s: InvoiceStatus): string {
  const map: Record<InvoiceStatus, string> = {
    green: "Paid On Time",
    amber: "Paid Late",
    red: "Overdue / Rejected",
    purple: "Info Pending",
    grey: "Approved",
    issued: "Pending Approval",
  };
  return map[s] ?? "";
}

export function apiStatusToCalStatus(inv: ApiInvoice): InvoiceStatus {
  if (inv.status === "Paid" || inv.status === "Received") {
    return inv.daysOverdue > 0 ? "amber" : "green";
  }
  if (inv.daysOverdue > 0 || inv.status === "Rejected") return "red";
  if (inv.status === "Approved") return "grey";
  return "issued";
}

export function displayRole(role: string): string {
  return ROLE_DISPLAY[role] ?? role;
}

export function invoiceStatusLabel(status: ApiInvoice["status"]): string {
  if (status === "Received") return "Payment Received";
  return status;
}

// Owner, PM, Financier, VIP see all amounts.
// Everyone else sees amounts only for invoices they submitted OR invoices where they are the approver.
// Observer sees no amounts at all.
export function canViewAmount(role: string, inv: ApiInvoice, userId: string): boolean {
  if (role === "Observer") return false;
  if (
    role === "Admin" ||
    role === "Owner" ||
    role === "PM" ||
    role === "Financier" ||
    role === "VIP"
  )
    return true;
  return inv.submittedByUserId === userId || inv.approverRole === role;
}
