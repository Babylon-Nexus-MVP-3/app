import React, { useState } from "react";
import { Modal, ScrollView, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { HEADER_HIT_SLOP } from "@/constants/touch";
import { AppText } from "@/components/AppText";
import { Fonts } from "@/constants/fonts";
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
  const insets = useSafeAreaInsets();
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
        <View style={{ backgroundColor: Colors.vouchGreen, paddingTop: insets.top }}>
          <View style={styles.detailHeader}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.backBtn}
                hitSlop={HEADER_HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Ionicons name="arrow-back" size={20} color={Colors.white} />
                <AppText style={styles.backLabel}>My Space</AppText>
              </TouchableOpacity>
            </View>
            <View style={styles.detailTitleRow}>
              <AppText style={styles.detailTitle}>{inv.invoiceNumber ?? "Invoice Details"}</AppText>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusBg(calStatus), marginLeft: 10 },
                ]}
              >
                <AppText style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
                  {invoiceStatusLabel(inv.status)}
                </AppText>
              </View>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.detailBody}
          contentContainerStyle={[styles.detailBodyContent, hasActions && { paddingBottom: 96 }]}
          showsVerticalScrollIndicator={false}
        >
          <AppText style={styles.detailDesc}>{inv.description}</AppText>

          <View style={styles.detailSection}>
            <View style={styles.detailRow}>
              <AppText style={styles.detailKey}>Submitted by</AppText>
              <View style={{ flex: 2, alignItems: "flex-end" }}>
                <AppText style={[styles.detailVal, { flex: 0 }]}>{inv.submittingParty}</AppText>
                {!!inv.submittedByName && (
                  <AppText style={styles.detailSubVal}>{inv.submittedByName}</AppText>
                )}
              </View>
            </View>
            <View style={styles.detailRow}>
              <AppText style={styles.detailKey}>Category</AppText>
              <AppText style={styles.detailVal}>{inv.submittingCategory}</AppText>
            </View>
            <View style={styles.detailRow}>
              <AppText style={styles.detailKey}>Date submitted</AppText>
              <AppText style={styles.detailVal}>
                {new Date(inv.dateSubmitted).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </AppText>
            </View>
            <View style={styles.detailRow}>
              <AppText style={styles.detailKey}>Due date</AppText>
              <AppText style={styles.detailVal}>
                {new Date(inv.dateDue).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </AppText>
            </View>
            {showAmount && inv.amount != null && (
              <View style={styles.detailRow}>
                <AppText style={styles.detailKey}>Amount</AppText>
                <AppText
                  style={[styles.detailVal, { fontFamily: Fonts.bold, color: Colors.vouchGreen }]}
                >
                  ${inv.amount.toLocaleString()}
                </AppText>
              </View>
            )}
            <View style={styles.detailRow}>
              <AppText style={styles.detailKey}>Approver</AppText>
              <View style={{ flex: 2, alignItems: "flex-end" }}>
                <AppText style={[styles.detailVal, { flex: 0 }]}>
                  {displayRole(inv.approverRole)}
                </AppText>
                {inv.status === "Pending" && inv.approverNames && inv.approverNames.length > 0 && (
                  <AppText style={styles.detailSubVal}>{inv.approverNames.join(", ")}</AppText>
                )}
              </View>
            </View>
            {inv.daysOverdue > 0 &&
              inv.status !== "Paid" &&
              inv.status !== "Received" &&
              inv.status !== "Rejected" && (
                <View style={styles.detailRow}>
                  <AppText style={styles.detailKey}>Overdue by</AppText>
                  <AppText
                    style={[styles.detailVal, { color: Colors.red, fontFamily: Fonts.semiBold }]}
                  >
                    {inv.daysOverdue} days
                  </AppText>
                </View>
              )}
            {inv.status === "Rejected" && inv.rejectionReason && (
              <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
                <AppText style={styles.detailKey}>Rejection reason</AppText>
                <AppText style={[styles.detailVal, { color: Colors.red }]}>
                  {inv.rejectionReason}
                </AppText>
              </View>
            )}
          </View>
        </ScrollView>

        {hasActions && (
          <View style={styles.detailFooter}>
            {canApprove && (
              <View style={styles.detailFooterRow}>
                <TouchableOpacity
                  style={[styles.detailActionBtn, { backgroundColor: Colors.green, flex: 1 }]}
                  onPress={() => openConfirm("approve")}
                >
                  <AppText style={styles.detailActionBtnText}>Approve</AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.detailActionBtn, { backgroundColor: Colors.red, flex: 1 }]}
                  onPress={() => openConfirm("reject")}
                >
                  <AppText style={styles.detailActionBtnText}>Reject</AppText>
                </TouchableOpacity>
              </View>
            )}
            {canPay && (
              <TouchableOpacity
                style={[styles.detailActionBtn, { backgroundColor: Colors.green }]}
                onPress={() => openConfirm("paid")}
              >
                <AppText style={styles.detailActionBtnText}>Mark as Paid</AppText>
              </TouchableOpacity>
            )}
            {canReceive && (
              <TouchableOpacity
                style={[styles.detailActionBtn, { backgroundColor: Colors.vouchGreen }]}
                onPress={() => openConfirm("received")}
              >
                <AppText style={styles.detailActionBtnText}>Confirm Receipt</AppText>
              </TouchableOpacity>
            )}
          </View>
        )}
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
