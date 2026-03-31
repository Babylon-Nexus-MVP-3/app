import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { Colors } from "@/constants/colors";
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
        <Text style={[styles.invoiceName, { flex: 1 }]} numberOfLines={1}>
          {inv.description}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
            {invoiceStatusLabel(inv.status)}
          </Text>
        </View>
      </View>
      {inv.invoiceNumber ? (
        <View style={styles.invoiceNumPill}>
          <Text style={styles.invoiceNumText}>{inv.invoiceNumber}</Text>
        </View>
      ) : null}
      <View style={styles.invoiceRow}>
        <Text style={styles.invoiceDate}>
          Due: {new Date(inv.dateDue).toLocaleDateString("en-AU")}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {inv.amount != null && (
            <Text style={styles.invoiceAmt}>${inv.amount.toLocaleString()}</Text>
          )}
          {!isDone && inv.daysOverdue > 0 && !canConfirm && inv.status !== "Rejected" && (
            <Text style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
              {inv.daysOverdue}d overdue
            </Text>
          )}
        </View>
      </View>
      {canConfirm && (
        <TouchableOpacity style={styles.confirmBtn} onPress={onReceived}>
          <Text style={styles.confirmBtnText}>Confirm Receipt</Text>
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
          <Text style={styles.invoiceName}>{inv.submittingParty}</Text>
          <Text style={styles.invoiceDate} numberOfLines={1}>
            {inv.description}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          {showAmount && inv.amount != null && (
            <Text style={styles.invoiceAmt}>${inv.amount.toLocaleString()}</Text>
          )}
          <View
            style={[styles.statusBadge, { backgroundColor: statusBg(calStatus), marginTop: 4 }]}
          >
            <Text style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
              {invoiceStatusLabel(inv.status)}
            </Text>
          </View>
        </View>
      </View>
      {inv.invoiceNumber ? (
        <View style={styles.invoiceNumPill}>
          <Text style={styles.invoiceNumText}>{inv.invoiceNumber}</Text>
        </View>
      ) : null}
      <Text style={styles.invoiceDate}>
        Due: {new Date(inv.dateDue).toLocaleDateString("en-AU")}
      </Text>
      {inv.daysOverdue > 0 && !isDone && inv.status !== "Rejected" && (
        <Text style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
          {inv.daysOverdue} days overdue
        </Text>
      )}
      {(canApprove || canPay) && (
        <View style={styles.actionRow}>
          {canApprove && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.green }]}
                onPress={onApprove}
              >
                <Text style={styles.actionBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.red }]}
                onPress={onReject}
              >
                <Text style={styles.actionBtnText}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
          {canPay && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.green }]}
              onPress={onPaid}
            >
              <Text style={styles.actionBtnText}>Mark as Paid</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {isRejected && (
        <Text style={[styles.invoiceDays, { color: Colors.red, marginTop: 6 }]}>✗ Rejected</Text>
      )}
    </TouchableOpacity>
  );
}
