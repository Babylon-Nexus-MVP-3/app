import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import { HEADER_HIT_SLOP } from "@/constants/touch";

type Member = {
  name?: string;
  email: string;
  role: string;
  hasLicence?: boolean | null;
  hasInsurance?: boolean | null;
};

export default function ApprovalProjectDetail() {
  const { name, location, council, daNumber, createdAt, creator, invitees } = useLocalSearchParams<{
    name: string;
    location: string;
    council: string;
    daNumber: string;
    createdAt: string;
    creator: string;
    invitees: string;
  }>();

  const creatorObj: Member | null = creator ? JSON.parse(creator) : null;
  const inviteeList: Member[] = invitees ? JSON.parse(invitees) : [];
  const allMembers: Member[] = [...(creatorObj ? [creatorObj] : []), ...inviteeList];

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.header}>
        <SafeAreaView edges={["top"]}>
          <TouchableOpacity
            onPress={() => router.replace("/(admin)/approvals")}
            style={styles.backBtn}
            hitSlop={HEADER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Back to approvals"
          >
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backLabel}>Approvals</Text>
          </TouchableOpacity>

          <Text style={styles.adminBadge}>ADMIN CONSOLE</Text>
          <Text style={styles.headerTitle}>{name || "Project"}</Text>
          {!!location && <Text style={styles.headerSub}>{location}</Text>}
          {!!createdAt && (
            <Text style={styles.headerDate}>
              Submitted {new Date(createdAt).toLocaleDateString("en-AU")}
            </Text>
          )}
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>PROJECT DETAILS</Text>
        <View style={[styles.membersCard, { marginBottom: 24 }]}>
          <InfoRow label="Location" value={location ?? ""} />
          <InfoRow label="Council" value={council ?? ""} last={!daNumber} />
          {!!daNumber && <InfoRow label="DA Number" value={daNumber} last />}
        </View>

        <Text style={styles.sectionLabel}>MEMBERS</Text>
        <View style={styles.membersCard}>
          {allMembers.length === 0 ? (
            <Text style={styles.emptyText}>No members listed.</Text>
          ) : (
            allMembers.map((m, i) => (
              <View
                key={`${m.email}-${i}`}
                style={[styles.memberRow, i < allMembers.length - 1 && styles.memberRowBorder]}
              >
                <View style={styles.memberInfo}>
                  {m.name && <Text style={styles.memberName}>{m.name}</Text>}
                  <Text style={styles.memberEmail}>{m.email}</Text>
                  <View style={styles.rolePillRow}>
                    <View style={styles.rolePill}>
                      <Text style={styles.rolePillText}>{m.role}</Text>
                    </View>
                    {i === 0 && creatorObj && (
                      <View style={styles.creatorPill}>
                        <Text style={styles.creatorPillText}>Creator</Text>
                      </View>
                    )}
                  </View>
                  {(m.hasLicence != null || m.hasInsurance != null) && (
                    <View style={styles.complianceRow}>
                      {m.hasLicence != null && (
                        <View style={m.hasLicence ? styles.badgeGreen : styles.badgeRed}>
                          <Text style={m.hasLicence ? styles.badgeGreenText : styles.badgeRedText}>
                            {m.hasLicence ? "✓ Licenced" : "✗ No Licence"}
                          </Text>
                        </View>
                      )}
                      {m.hasInsurance != null && (
                        <View style={m.hasInsurance ? styles.badgeGreen : styles.badgeRed}>
                          <Text
                            style={m.hasInsurance ? styles.badgeGreenText : styles.badgeRedText}
                          >
                            {m.hasInsurance ? "✓ Insured" : "✗ Not Insured"}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, last && styles.infoRowLast]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.offWhite },
  header: { paddingBottom: 24 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    minWidth: 44,
    marginBottom: 12,
    alignSelf: "flex-start",
    direction: "ltr",
  },
  backArrow: { fontSize: 24, color: Colors.gold, lineHeight: 26 },
  backLabel: { fontSize: 14, color: Colors.gold, fontWeight: "600" },
  adminBadge: {
    fontSize: 10,
    color: Colors.goldLight,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.white,
    paddingHorizontal: 20,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    paddingHorizontal: 20,
    marginBottom: 2,
  },
  headerDate: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    paddingHorizontal: 20,
    marginTop: 4,
  },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  membersCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  memberRow: { paddingHorizontal: 16, paddingVertical: 14 },
  memberRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary, marginBottom: 2 },
  memberEmail: { fontSize: 12, color: Colors.textSecondary, marginBottom: 6 },
  rolePillRow: { flexDirection: "row", gap: 6 },
  rolePill: {
    backgroundColor: Colors.greyBg ?? "rgba(0,0,0,0.06)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rolePillText: { fontSize: 11, fontWeight: "600", color: Colors.textSecondary },
  creatorPill: {
    backgroundColor: Colors.issuedBg ?? Colors.navy + "18",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  creatorPillText: { fontSize: 11, fontWeight: "700", color: Colors.navy },
  complianceRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
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
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
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
  emptyText: { fontSize: 14, color: Colors.textSecondary, padding: 16 },
});
