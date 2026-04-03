import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

type Member = { name?: string; email: string; role: string };

export default function ApprovalProjectDetail() {
  const { name, location, createdAt, creator, invitees } = useLocalSearchParams<{
    name: string;
    location: string;
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
          >
            <Ionicons name="chevron-back" size={20} color={Colors.gold} />
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
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.offWhite },
  header: { paddingBottom: 24 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 12,
  },
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
  memberRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
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
  emptyText: { fontSize: 14, color: Colors.textSecondary, padding: 16 },
});
