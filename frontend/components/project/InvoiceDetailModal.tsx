import React, { useState } from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { ApiInvoice, InvoiceActionType } from "./types";
import {
  apiStatusToCalStatus,
  canViewAmount,
  displayRole,
  invoiceStatusLabel,
  statusBg,
  statusColor,
} from "./helpers";
import { styles } from "./styles";
import { ConfirmModal } from "./ConfirmModal";

export function InvoiceDetailModal({
  visible,
  inv,
  viewerRole,
  userId,
  invoiceAction,
  onClose,
}: {
  visible: boolean;
  inv: ApiInvoice | null;
  viewerRole: string;
  userId: string;
  invoiceAction: (
    action: InvoiceActionType,
    invoiceId: string,
    rejectionReason?: string
  ) => Promise<string | null>;
  onClose: () => void;
}) {
  const [confirmAction, setConfirmAction] = useState<InvoiceActionType | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function openConfirm(action: InvoiceActionType) {
    setConfirmAction(action);
    setConfirmError(null);
  }
  function closeConfirm() {
    setConfirmAction(null);
  }
  async function handleConfirm(reason?: string) {
    if (!confirmAction || !inv) return;
    setConfirmLoading(true);
    setConfirmError(null);
    const err = await invoiceAction(confirmAction, inv.id, reason);
    setConfirmLoading(false);
    if (err) {
      setConfirmError(err);
    } else {
      closeConfirm();
      onClose();
    }
  }

  if (!inv) return null;

  const showAmount = canViewAmount(viewerRole, inv, userId);
  const calStatus = apiStatusToCalStatus(inv);
  const canApprove = viewerRole === inv.approverRole && inv.status === "Pending";
  const canPay = viewerRole === inv.approverRole && inv.status === "Approved";
  const canReceive = userId === inv.submittedByUserId && inv.status === "Paid";
  const hasActions = canApprove || canPay || canReceive;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.detailScreen}>
        <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.detailHeader}>
          <SafeAreaView edges={["top"]}>
            <TouchableOpacity onPress={onClose} style={styles.detailBackBtn}>
              <Text style={styles.detailBackArrow}>‹</Text>
              <Text style={styles.detailBackLabel}>My Space</Text>
            </TouchableOpacity>
            <Text style={styles.detailTitle}>
              {inv.invoiceNumber ? `${inv.invoiceNumber} — Invoice` : "Invoice Details"}
            </Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusBg(calStatus),
                  alignSelf: "center",
                  marginTop: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                },
              ]}
            >
              <Text
                style={[styles.statusBadgeText, { color: statusColor(calStatus), fontSize: 14 }]}
              >
                {invoiceStatusLabel(inv.status)}
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView
          style={styles.detailBody}
          contentContainerStyle={styles.detailBodyContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.detailDesc}>{inv.description}</Text>

          <View style={styles.detailSection}>
            <Text style={styles.detailSectionLabel}>DETAILS</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Submitted by</Text>
              <Text style={styles.detailVal}>{inv.submittingParty}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Category</Text>
              <Text style={styles.detailVal}>{inv.submittingCategory}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Date submitted</Text>
              <Text style={styles.detailVal}>
                {new Date(inv.dateSubmitted).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Due date</Text>
              <Text style={styles.detailVal}>
                {new Date(inv.dateDue).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
            {showAmount && inv.amount != null && (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Amount</Text>
                <Text style={[styles.detailVal, { fontWeight: "700", color: Colors.navy }]}>
                  ${inv.amount.toLocaleString()}
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Approver</Text>
              <Text style={styles.detailVal}>{displayRole(inv.approverRole)}</Text>
            </View>
            {inv.daysOverdue > 0 && inv.status !== "Paid" && inv.status !== "Received" && (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Overdue by</Text>
                <Text style={[styles.detailVal, { color: Colors.red, fontWeight: "600" }]}>
                  {inv.daysOverdue} days
                </Text>
              </View>
            )}
            {inv.status === "Rejected" && inv.rejectionReason && (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Rejection reason</Text>
                <Text style={[styles.detailVal, { color: Colors.red }]}>
                  {inv.rejectionReason}
                </Text>
              </View>
            )}
          </View>

          {hasActions && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionLabel}>ACTIONS</Text>
              {canApprove && (
                <>
                  <TouchableOpacity
                    style={[styles.detailActionBtn, { backgroundColor: Colors.green }]}
                    onPress={() => openConfirm("approve")}
                  >
                    <Text style={styles.detailActionBtnText}>Approve Invoice</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.detailActionBtn,
                      { backgroundColor: Colors.red, marginTop: 10 },
                    ]}
                    onPress={() => openConfirm("reject")}
                  >
                    <Text style={styles.detailActionBtnText}>Reject Invoice</Text>
                  </TouchableOpacity>
                </>
              )}
              {canPay && (
                <TouchableOpacity
                  style={[styles.detailActionBtn, { backgroundColor: Colors.green }]}
                  onPress={() => openConfirm("paid")}
                >
                  <Text style={styles.detailActionBtnText}>Mark as Paid</Text>
                </TouchableOpacity>
              )}
              {canReceive && (
                <TouchableOpacity
                  style={[styles.detailActionBtn, { backgroundColor: Colors.navy }]}
                  onPress={() => openConfirm("received")}
                >
                  <Text style={styles.detailActionBtnText}>Confirm Receipt</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      <ConfirmModal
        visible={confirmAction !== null}
        action={confirmAction}
        invoice={inv}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        loading={confirmLoading}
        error={confirmError}
        showAmount={showAmount}
      />
    </Modal>
  );
}
