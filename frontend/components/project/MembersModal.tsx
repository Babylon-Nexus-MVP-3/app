import React from "react";
import { Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { HEADER_HIT_SLOP } from "@/constants/touch";
import { Participant } from "./types";
import { displayRole } from "./helpers";
import { styles } from "./styles";

export function MembersModal({
  visible,
  participants,
  onClose,
}: {
  visible: boolean;
  participants: Participant[];
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
        <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.membersHeader}>
          <SafeAreaView edges={["top"]}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.detailBackBtn}
              hitSlop={HEADER_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Text style={styles.detailBackArrow}>‹</Text>
              <Text style={styles.detailBackLabel}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.membersTitle}>Project Members</Text>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.membersBody} showsVerticalScrollIndicator={false}>
          {accepted.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>ACTIVE ({accepted.length})</Text>
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

function MemberRow({ participant: p }: { participant: Participant }) {
  const displayName = p.name ?? p.email;
  const showEmail = p.name !== null;

  return (
    <View style={styles.memberRow}>
      <View style={styles.memberAvatar}>
        <Text style={styles.memberAvatarText}>{displayName.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{displayName}</Text>
        {showEmail && <Text style={styles.memberEmail}>{p.email}</Text>}
      </View>
      <View style={styles.memberRolePill}>
        <Text style={styles.memberRolePillText}>{displayRole(p.role)}</Text>
      </View>
    </View>
  );
}
