import React from "react";
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { HEADER_HIT_SLOP } from "@/constants/touch";
import { Participant } from "./types";
import { displayRole } from "./helpers";
import { styles } from "./styles";

type ProjectInfo = {
  name: string;
  location: string;
  council: string;
  daNumber?: string;
};

export function MembersModal({
  visible,
  participants,
  projectInfo,
  onClose,
}: {
  visible: boolean;
  participants: Participant[];
  projectInfo: ProjectInfo;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const accepted = participants.filter((p) => p.status === "Accepted");
  const acceptedEmails = new Set(accepted.map((p) => p.email));
  const pending = participants.filter(
    (p) => p.status !== "Accepted" && !acceptedEmails.has(p.email)
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.membersContainer}>
        <LinearGradient
          colors={[Colors.navy, Colors.navyLight]}
          style={[styles.membersHeader, { paddingTop: insets.top }]}
        >
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.backBtn}
              hitSlop={HEADER_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Text style={styles.backArrow}>‹</Text>
              <Text style={styles.backLabel}>Back</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.membersTitle}>Project Information</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.membersBody} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionLabel}>PROJECT DETAILS</Text>
          <View style={memberStyles.infoCard}>
            <InfoRow label="Name" value={projectInfo.name} />
            <InfoRow label="Location" value={projectInfo.location} />
            <InfoRow label="Council" value={projectInfo.council} last={!projectInfo.daNumber} />
            {projectInfo.daNumber && (
              <InfoRow label="DA Number" value={projectInfo.daNumber} last />
            )}
          </View>

          {accepted.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
                ACTIVE ({accepted.length})
              </Text>
              {accepted.map((p) => (
                <MemberRow key={p.participantId} participant={p} />
              ))}
            </>
          )}

          {pending.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
                PENDING ({pending.length})
              </Text>
              {pending.map((p) => (
                <MemberRow key={p.participantId} participant={p} />
              ))}
            </>
          )}

          {participants.length === 0 && <Text style={styles.emptyText}>No members yet.</Text>}
        </ScrollView>
      </View>
    </Modal>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[memberStyles.infoRow, last && memberStyles.infoRowLast]}>
      <Text style={memberStyles.infoLabel}>{label}</Text>
      <Text style={memberStyles.infoValue}>{value}</Text>
    </View>
  );
}

function ComplianceBadge({
  value,
  trueLabel,
  falseLabel,
}: {
  value: boolean;
  trueLabel: string;
  falseLabel: string;
}) {
  return (
    <View style={value ? memberStyles.badgeGreen : memberStyles.badgeRed}>
      <Text style={value ? memberStyles.badgeGreenText : memberStyles.badgeRedText}>
        {value ? `✓ ${trueLabel}` : `✗ ${falseLabel}`}
      </Text>
    </View>
  );
}

function MemberRow({ participant: p }: { participant: Participant }) {
  const displayName = p.name ?? p.email;
  const showEmail = p.name !== null;
  const showCompliance = p.hasLicence != null || p.hasInsurance != null;

  return (
    <View style={styles.memberRow}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{displayName}</Text>
        {showEmail && <Text style={styles.memberEmail}>{p.email}</Text>}
        {showCompliance && (
          <View style={memberStyles.badgeRow}>
            {p.hasLicence != null && (
              <ComplianceBadge value={p.hasLicence} trueLabel="Licenced" falseLabel="No Licence" />
            )}
            {p.hasInsurance != null && (
              <ComplianceBadge
                value={p.hasInsurance}
                trueLabel="Insured"
                falseLabel="Not Insured"
              />
            )}
          </View>
        )}
      </View>
      <View style={styles.memberRolePill}>
        <Text style={styles.memberRolePillText}>{displayRole(p.role)}</Text>
      </View>
    </View>
  );
}

const memberStyles = StyleSheet.create({
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.offWhite,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { fontSize: 13, color: Colors.textSecondary, fontWeight: "500" },
  infoValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  badgeGreen: {
    backgroundColor: Colors.greenBg,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeGreenText: { fontSize: 10, fontWeight: "700", color: Colors.green },
  badgeRed: {
    backgroundColor: Colors.redBg,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeRedText: { fontSize: 10, fontWeight: "700", color: Colors.red },
});
