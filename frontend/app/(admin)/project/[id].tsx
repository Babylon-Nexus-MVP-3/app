import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";

export default function AdminProjectDetail() {
  const { id, name, location, createdAt } = useLocalSearchParams<{
    id: string;
    name: string;
    location: string;
    createdAt: string;
  }>();

  const submittedDate = createdAt
    ? new Date(createdAt).toLocaleDateString("en-AU", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.header}>
        <SafeAreaView edges={["top"]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.gold} />
            <Text style={styles.backLabel}>Approvals</Text>
          </TouchableOpacity>
          <Text style={styles.adminBadge}>PROJECT DETAILS</Text>
          <Text style={styles.headerTitle}>{name || "Unnamed Project"}</Text>
          <Text style={styles.headerSub}>{location}</Text>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Overview ── */}
        <Text style={styles.sectionLabel}>OVERVIEW</Text>
        <View style={styles.detailCard}>
          <Row label="Project Name" value={name || "—"} />
          <Row label="Location" value={location || "—"} />
          <Row label="Date Submitted" value={submittedDate} last />
        </View>

        {/* ── Creator ── */}
        <Text style={styles.sectionLabel}>CREATOR</Text>
        <View style={styles.detailCard}>
          <View style={styles.pendingBanner}>
            <Ionicons name="time-outline" size={15} color={Colors.amber} />
            <Text style={styles.pendingBannerText}>
              Creator details will load once connected to the backend.
            </Text>
          </View>
          <Row label="Name" value="—" />
          <Row label="Email" value="—" />
          <Row label="Role on Project" value="—" last />
        </View>

        {/* ── Invited Members ── */}
        <Text style={styles.sectionLabel}>INVITED MEMBERS</Text>
        <View style={styles.detailCard}>
          <View style={styles.pendingBanner}>
            <Ionicons name="time-outline" size={15} color={Colors.amber} />
            <Text style={styles.pendingBannerText}>
              Invited members will load once connected to the backend.
            </Text>
          </View>
          <View style={styles.emptyMembers}>
            <Text style={styles.emptyMembersText}>No member data available yet.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  header: {
    paddingBottom: 24,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 16,
    paddingTop: 12,
    marginBottom: 16,
  },
  backLabel: {
    fontSize: 14,
    color: Colors.gold,
    fontWeight: "600",
  },
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
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    paddingHorizontal: 20,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 4,
  },
  detailCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginBottom: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  pendingBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.amberBg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(243,156,18,0.15)",
  },
  pendingBannerText: {
    fontSize: 12,
    color: Colors.amber,
    fontWeight: "500",
    flex: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  rowLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  rowValue: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: "600",
    maxWidth: "55%",
    textAlign: "right",
  },
  emptyMembers: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyMembersText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});
