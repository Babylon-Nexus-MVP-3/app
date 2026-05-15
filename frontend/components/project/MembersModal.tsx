import React from "react";
import { Modal, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { HEADER_HIT_SLOP } from "@/constants/touch";
import { AppText } from "@/components/AppText";
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
  const accepted = participants.filter((p) => p.status === "Accepted");
  const acceptedEmails = new Set(accepted.map((p) => p.email));
  const pending = participants.filter(
    (p) => p.status !== "Accepted" && !acceptedEmails.has(p.email)
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.membersContainer}>
        <SafeAreaView edges={["top"]} style={{ backgroundColor: Colors.vouchGreen }}>
          <View style={styles.membersHeader}>
            <View style={styles.headerTopRow}>
              <TouchableOpacity
                onPress={onClose}
                style={styles.backBtn}
                hitSlop={HEADER_HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Back"
              >
                <Ionicons name="arrow-back" size={20} color={Colors.white} />
                <AppText style={styles.backLabel}>Back</AppText>
              </TouchableOpacity>
            </View>
            <AppText style={styles.membersTitle}>Project Information</AppText>
          </View>
        </SafeAreaView>

        <ScrollView contentContainerStyle={styles.membersBody} showsVerticalScrollIndicator={false}>
          <AppText style={styles.sectionLabel}>PROJECT DETAILS</AppText>
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
              <AppText style={[styles.sectionLabel, { marginTop: 24 }]}>
                ACTIVE ({accepted.length})
              </AppText>
              {accepted.map((p) => (
                <MemberRow key={p.participantId} participant={p} />
              ))}
            </>
          )}

          {pending.length > 0 && (
            <>
              <AppText style={[styles.sectionLabel, { marginTop: 24 }]}>
                PENDING ({pending.length})
              </AppText>
              {pending.map((p) => (
                <MemberRow key={p.participantId} participant={p} />
              ))}
            </>
          )}

          {participants.length === 0 && <AppText style={styles.emptyText}>No members yet.</AppText>}
        </ScrollView>
      </View>
    </Modal>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[memberStyles.infoRow, last && memberStyles.infoRowLast]}>
      <AppText style={memberStyles.infoLabel}>{label}</AppText>
      <AppText style={memberStyles.infoValue}>{value}</AppText>
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
      <AppText style={value ? memberStyles.badgeGreenText : memberStyles.badgeRedText}>
        {value ? `✓ ${trueLabel}` : `✗ ${falseLabel}`}
      </AppText>
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
        <AppText style={styles.memberAvatarText}>{displayName.charAt(0).toUpperCase()}</AppText>
      </View>
      <View style={styles.memberInfo}>
        <AppText style={styles.memberName}>{displayName}</AppText>
        {showEmail && <AppText style={styles.memberEmail}>{p.email}</AppText>}
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
        <AppText style={styles.memberRolePillText}>{displayRole(p.role)}</AppText>
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
    borderBottomColor: Colors.grey100,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { fontSize: 13, color: Colors.grey500, fontFamily: Fonts.medium },
  infoValue: {
    fontSize: 13,
    color: Colors.black,
    fontFamily: Fonts.semiBold,
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
  badgeGreenText: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.green },
  badgeRed: {
    backgroundColor: Colors.redBg,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeRedText: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.red },
});
