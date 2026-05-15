import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Colors } from "@/constants/colors";
import { AppText } from "@/components/AppText";
import { ApiInvoice } from "./types";
import { apiStatusToCalStatus, invoiceStatusLabel, statusBg, statusColor } from "./helpers";
import { styles } from "./styles";

export function MyInvoiceCard({
  inv,
  onReceived,
  onTap,
}: {
  inv: ApiInvoice;
  onReceived: () => void;
  onTap: () => void;
}) {
  const calStatus = apiStatusToCalStatus(inv);
  const canConfirm = inv.status === "Paid";
  const isDone = inv.status === "Received";
  return (
    <TouchableOpacity
      style={[styles.invoiceCard, { borderLeftColor: statusColor(calStatus) }]}
      onPress={onTap}
      activeOpacity={0.85}
    >
      <View style={styles.invoiceRow}>
        <AppText style={[styles.invoiceName, { flex: 1 }]} numberOfLines={1}>
          {inv.description}
        </AppText>
        <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
          <AppText style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
            {invoiceStatusLabel(inv.status)}
          </AppText>
        </View>
      </View>
      {inv.invoiceNumber ? (
        <View style={styles.invoiceNumPill}>
          <AppText style={styles.invoiceNumText}>{inv.invoiceNumber}</AppText>
        </View>
      ) : null}
      <View style={styles.invoiceRow}>
        <AppText style={styles.invoiceDate}>
          Due: {new Date(inv.dateDue).toLocaleDateString("en-AU")}
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {inv.amount != null && (
            <AppText style={styles.invoiceAmt}>${inv.amount.toLocaleString()}</AppText>
          )}
          {!isDone && inv.daysOverdue > 0 && !canConfirm && inv.status !== "Rejected" && (
            <AppText style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
              {inv.daysOverdue}d overdue
            </AppText>
          )}
        </View>
      </View>
      {canConfirm && (
        <TouchableOpacity style={styles.confirmBtn} onPress={onReceived}>
          <AppText style={styles.confirmBtnText}>Confirm Receipt</AppText>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

export function ApprovalCard({
  inv,
  onApprove,
  onPaid,
  onReject,
  onTap,
  showAmount = true,
}: {
  inv: ApiInvoice;
  onApprove: () => void;
  onPaid: () => void;
  onReject: () => void;
  onTap: () => void;
  showAmount?: boolean;
}) {
  const calStatus = apiStatusToCalStatus(inv);
  const canApprove = inv.status === "Pending";
  const canPay = inv.status === "Approved";
  const isDone = inv.status === "Paid" || inv.status === "Received";
  const isRejected = inv.status === "Rejected";
  return (
    <TouchableOpacity
      style={[styles.invoiceCard, { borderLeftColor: statusColor(calStatus) }]}
      onPress={onTap}
      activeOpacity={0.85}
    >
      <View style={styles.invoiceRow}>
        <View style={{ flex: 1 }}>
          <AppText style={styles.invoiceName}>{inv.submittingParty}</AppText>
          <AppText style={styles.invoiceDate} numberOfLines={1}>
            {inv.description}
          </AppText>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          {showAmount && inv.amount != null && (
            <AppText style={styles.invoiceAmt}>${inv.amount.toLocaleString()}</AppText>
          )}
          <View
            style={[styles.statusBadge, { backgroundColor: statusBg(calStatus), marginTop: 4 }]}
          >
            <AppText style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
              {invoiceStatusLabel(inv.status)}
            </AppText>
          </View>
        </View>
      </View>
      {inv.invoiceNumber ? (
        <View style={styles.invoiceNumPill}>
          <AppText style={styles.invoiceNumText}>{inv.invoiceNumber}</AppText>
        </View>
      ) : null}
      <AppText style={styles.invoiceDate}>
        Due: {new Date(inv.dateDue).toLocaleDateString("en-AU")}
      </AppText>
      {inv.daysOverdue > 0 && !isDone && inv.status !== "Rejected" && (
        <AppText style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
          {inv.daysOverdue} days overdue
        </AppText>
      )}
      {(canApprove || canPay) && (
        <View style={styles.actionRow}>
          {canApprove && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.green }]}
                onPress={onApprove}
              >
                <AppText style={styles.actionBtnText}>Approve</AppText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.red }]}
                onPress={onReject}
              >
                <AppText style={styles.actionBtnText}>Reject</AppText>
              </TouchableOpacity>
            </>
          )}
          {canPay && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.green }]}
              onPress={onPaid}
            >
              <AppText style={styles.actionBtnText}>Mark as Paid</AppText>
            </TouchableOpacity>
          )}
        </View>
      )}
      {isRejected && (
        <AppText style={[styles.invoiceDays, { color: Colors.red, marginTop: 6 }]}>
          ✗ Rejected
        </AppText>
      )}
    </TouchableOpacity>
  );
}
