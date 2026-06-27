import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { HEADER_HIT_SLOP } from "@/constants/touch";
import { AppText } from "@/components/AppText";

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
      <View style={{ backgroundColor: Colors.vouchGreen }}>
        <SafeAreaView edges={["top"]}>
          <TouchableOpacity
            onPress={() => router.replace("/(admin)/approvals")}
            style={styles.backBtn}
            hitSlop={HEADER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Back to approvals"
          >
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
            <AppText style={styles.backLabel}>Approvals</AppText>
          </TouchableOpacity>

          <AppText style={styles.adminBadge}>ADMIN CONSOLE</AppText>
          <AppText style={styles.headerTitle}>{name || "Project"}</AppText>
          {!!location && <AppText style={styles.headerSub}>{location}</AppText>}
          {!!createdAt && (
            <AppText style={styles.headerDate}>
              Submitted {new Date(createdAt).toLocaleDateString("en-AU")}
            </AppText>
          )}
          <View style={{ height: 20 }} />
        </SafeAreaView>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <AppText style={styles.sectionLabel}>PROJECT DETAILS</AppText>
        <View style={[styles.membersCard, { marginBottom: 24 }]}>
          <InfoRow label="Location" value={location ?? ""} />
          <InfoRow label="Council" value={council ?? ""} last={!daNumber} />
          {!!daNumber && <InfoRow label="DA Number" value={daNumber} last />}
        </View>

        <AppText style={styles.sectionLabel}>MEMBERS</AppText>
        <View style={styles.membersCard}>
          {allMembers.length === 0 ? (
            <AppText style={styles.emptyText}>No members listed.</AppText>
          ) : (
            allMembers.map((m, i) => (
              <View
                key={`${m.email}-${i}`}
                style={[styles.memberRow, i < allMembers.length - 1 && styles.memberRowBorder]}
              >
                <View style={styles.memberInfo}>
                  {m.name && <AppText style={styles.memberName}>{m.name}</AppText>}
                  <AppText style={styles.memberEmail}>{m.email}</AppText>
                  <View style={styles.rolePillRow}>
                    <View style={styles.rolePill}>
                      <AppText style={styles.rolePillText}>{m.role}</AppText>
                    </View>
                    {i === 0 && creatorObj && (
                      <View style={styles.creatorPill}>
                        <AppText style={styles.creatorPillText}>Creator</AppText>
                      </View>
                    )}
                  </View>
                  {(m.hasLicence != null || m.hasInsurance != null) && (
                    <View style={styles.complianceRow}>
                      {m.hasLicence != null && (
                        <View style={m.hasLicence ? styles.badgeGreen : styles.badgeRed}>
                          <AppText
                            style={m.hasLicence ? styles.badgeGreenText : styles.badgeRedText}
                          >
                            {m.hasLicence ? "✓ Licenced" : "✗ No Licence"}
                          </AppText>
                        </View>
                      )}
                      {m.hasInsurance != null && (
                        <View style={m.hasInsurance ? styles.badgeGreen : styles.badgeRed}>
                          <AppText
                            style={m.hasInsurance ? styles.badgeGreenText : styles.badgeRedText}
                          >
                            {m.hasInsurance ? "✓ Insured" : "✗ Not Insured"}
                          </AppText>
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
      <AppText style={styles.infoLabel}>{label}</AppText>
      <AppText style={styles.infoValue}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.grey100 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    minWidth: 44,
    marginBottom: 12,
    alignSelf: "flex-start",
    writingDirection: "ltr",
  },
  backLabel: { fontSize: 13, color: Colors.white, fontFamily: Fonts.semiBold },
  adminBadge: {
    fontSize: 10,
    color: Colors.white,
    fontFamily: Fonts.semiBold,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.extraBold,
    color: Colors.white,
    paddingHorizontal: 20,
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 13,
    color: Colors.white,
    fontFamily: Fonts.regular,
    paddingHorizontal: 20,
    marginBottom: 2,
  },
  headerDate: {
    fontSize: 12,
    color: Colors.white,
    fontFamily: Fonts.regular,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 16, paddingTop: 24, paddingBottom: 40 },
  sectionLabel: {
    fontSize: 12,
    color: Colors.grey500,
    fontFamily: Fonts.bold,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  membersCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  memberRow: { paddingHorizontal: 16, paddingVertical: 14 },
  memberRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.black, marginBottom: 2 },
  memberEmail: { fontSize: 12, color: Colors.grey500, fontFamily: Fonts.regular, marginBottom: 6 },
  rolePillRow: { flexDirection: "row", gap: 6 },
  rolePill: {
    backgroundColor: Colors.grey100,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rolePillText: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.grey700 },
  creatorPill: {
    backgroundColor: Colors.vouchGreenLight,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  creatorPillText: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.vouchGreen },
  complianceRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
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
  infoLabel: { fontSize: 13, color: Colors.grey700, fontFamily: Fonts.medium },
  infoValue: {
    fontSize: 13,
    color: Colors.black,
    fontFamily: Fonts.semiBold,
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
  emptyText: { fontSize: 14, color: Colors.grey500, fontFamily: Fonts.regular, padding: 16 },
});
