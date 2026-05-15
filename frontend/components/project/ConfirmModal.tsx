import React, { useState, useEffect } from "react";
import { ActivityIndicator, Modal, TextInput, TouchableOpacity, View } from "react-native";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { ACTION_LABEL, ACTION_WORD, ApiInvoice, InvoiceActionType } from "./types";
import { styles } from "./styles";

export function ConfirmModal({
  visible,
  action,
  invoice,
  onClose,
  onConfirm,
  loading,
  error,
  showAmount = true,
}: {
  visible: boolean;
  action: InvoiceActionType | null;
  invoice: ApiInvoice | null;
  onClose: () => void;
  onConfirm: (rejectionReason?: string) => void;
  loading: boolean;
  error: string | null;
  showAmount?: boolean;
}) {
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (visible) {
      setTyped("");
      setReason("");
    }
  }, [visible]);

  if (!action || !invoice) return null;

  const word = ACTION_WORD[action];
  const isReject = action === "reject";
  const isValid = isReject ? true : typed.trim().toLowerCase() === word;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmBox}>
          <AppText style={styles.confirmTitle}>{ACTION_LABEL[action]}</AppText>
          <AppText style={styles.confirmInvDesc} numberOfLines={2}>
            {invoice.description}
          </AppText>
          {showAmount && invoice.amount != null && (
            <AppText style={styles.confirmInvAmt}>${invoice.amount.toLocaleString()}</AppText>
          )}

          {isReject ? (
            <>
              <AppText style={styles.confirmFieldLabel}>Reason (optional)</AppText>
              <TextInput
                style={styles.confirmReasonInput}
                placeholder="e.g. Invoice details are incorrect"
                placeholderTextColor={Colors.grey500}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </>
          ) : (
            <>
              <AppText style={styles.confirmHint}>
                Type <AppText style={{ fontFamily: Fonts.extraBold }}>{word}</AppText> to confirm
              </AppText>
              <TextInput
                style={styles.confirmTypeInput}
                value={typed}
                onChangeText={setTyped}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={word}
                placeholderTextColor={Colors.grey500}
              />
            </>
          )}

          {error && <AppText style={styles.confirmError}>{error}</AppText>}

          <View style={styles.confirmBtnRow}>
            <TouchableOpacity style={styles.confirmCancelBtn} onPress={onClose} disabled={loading}>
              <AppText style={styles.confirmCancelText}>Cancel</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmActionBtn,
                isReject && { backgroundColor: Colors.red },
                !isValid && { opacity: 0.35 },
              ]}
              onPress={() => onConfirm(isReject ? reason || undefined : undefined)}
              disabled={!isValid || loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <AppText style={styles.confirmActionText}>{ACTION_LABEL[action]}</AppText>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
