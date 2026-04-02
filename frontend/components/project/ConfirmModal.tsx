import React, { useState, useEffect } from "react";
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from "react-native";
import { Colors } from "@/constants/colors";
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
  // Reject: no type-to-confirm — reason field is sufficient
  const isValid = isReject ? true : typed.trim().toLowerCase() === word;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>{ACTION_LABEL[action]}</Text>
          <Text style={styles.confirmInvDesc} numberOfLines={2}>
            {invoice.description}
          </Text>
          {showAmount && invoice.amount != null && (
            <Text style={styles.confirmInvAmt}>${invoice.amount.toLocaleString()}</Text>
          )}

          {isReject ? (
            <>
              <Text style={styles.confirmFieldLabel}>Reason (optional)</Text>
              <TextInput
                style={styles.confirmReasonInput}
                placeholder="e.g. Invoice details are incorrect"
                placeholderTextColor={Colors.textSecondary}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </>
          ) : (
            <>
              <Text style={styles.confirmHint}>
                Type <Text style={{ fontWeight: "800" }}>{word}</Text> to confirm
              </Text>
              <TextInput
                style={styles.confirmTypeInput}
                value={typed}
                onChangeText={setTyped}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={word}
                placeholderTextColor={Colors.textSecondary}
              />
            </>
          )}

          {error && <Text style={styles.confirmError}>{error}</Text>}

          <View style={styles.confirmBtnRow}>
            <TouchableOpacity style={styles.confirmCancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.confirmCancelText}>Cancel</Text>
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
                <Text style={styles.confirmActionText}>{ACTION_LABEL[action]}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
