import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import CircularProgress from "@/components/CircularProgress";
import { useAuth } from "@/context/AuthContext";
import { CalendarTab } from "@/components/project/CalendarTab";
import { ApiInvoice } from "@/components/project/types";

type Participant = {
  participantId: string;
  name: string | null;
  email: string;
  role: string;
  status: "Pending" | "Accepted";
};

/* ─── Main screen ─── */
export default function AdminProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fetchWithAuth, user } = useAuth();

  const [activeTab, setActiveTab] = useState<"calendar" | "members">("calendar");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [health, setHealth] = useState(0);
  const [change, setChange] = useState<number | null>(null);
  const [overdue, setOverdue] = useState(0);
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`http://localhost:3229/admin/projects/${id}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load project.");
        return;
      }
      setProjectName(data.project?.name ?? "");
      setLocation(data.project?.location ?? "");
      setHealth(data.healthScore ?? 0);
      setChange(data.monthOnMonthHealthChangePct ?? null);
      setOverdue(data.overdueInvoiceCount ?? 0);
      setInvoices(data.invoices ?? []);
      setParticipants(data.participants ?? []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  async function handleDeleteProject() {
    Alert.alert(
      "Archive Project",
      `Are you sure you want to archive "${projectName}"? It will be moved to the Archives tab.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetchWithAuth(`http://localhost:3229/admin/projects/${id}`, {
                method: "DELETE",
              });
              if (!res.ok) {
                const data = await res.json();
                Alert.alert("Error", data.error ?? "Failed to delete project.");
              } else {
                router.replace("/(admin)/archives");
              }
            } catch {
              Alert.alert("Error", "Network error. Please try again.");
            }
          },
        },
      ]
    );
  }

  async function handleRemove(participant: Participant) {
    Alert.alert(
      "Remove Participant",
      `Remove ${participant.email} (${participant.role}) from this project?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const res = await fetchWithAuth(
                `http://localhost:3229/admin/projects/${id}/participants/remove`,
                {
                  method: "DELETE",
                  body: JSON.stringify({ email: participant.email, role: participant.role }),
                }
              );
              const data = await res.json();
              if (!res.ok) {
                Alert.alert("Error", data.error ?? "Failed to remove participant.");
              } else {
                setParticipants((prev) =>
                  prev.filter(
                    (p) => !(p.email === participant.email && p.role === participant.role)
                  )
                );
              }
            } catch {
              Alert.alert("Error", "Network error. Please try again.");
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.header}>
        <SafeAreaView edges={["top"]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={Colors.gold} />
            <Text style={styles.backLabel}>All Projects</Text>
          </TouchableOpacity>

          <Text style={styles.adminBadge}>ADMIN CONSOLE</Text>
          <Text style={styles.headerTitle}>{projectName || "Project"}</Text>
          {!!location && <Text style={styles.headerSub}>{location}</Text>}

          <View style={styles.healthWrap}>
            {loading ? (
              <ActivityIndicator color={Colors.gold} style={{ height: 120 }} />
            ) : (
              <CircularProgress
                value={health}
                size={120}
                label={health >= 75 ? "Healthy" : health >= 50 ? "At Risk" : "Critical"}
              />
            )}
            {change !== null && (
              <Text
                style={[styles.healthTrend, { color: change >= 0 ? Colors.green : Colors.red }]}
              >
                {change >= 0 ? "+" : ""}
                {change}% vs last month
              </Text>
            )}
          </View>

          {overdue > 0 && (
            <View style={styles.overdueAlert}>
              <Text style={styles.overdueAlertText}>{overdue} invoices overdue</Text>
              <Text style={styles.overdueAlertArrow}>›</Text>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      {error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchDetail} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : activeTab === "calendar" ? (
        <CalendarTab
          invoices={invoices}
          role="Admin"
          userId={user?.id ?? ""}
          invoiceAction={async () => null}
        />
      ) : (
        <MembersTab
          participants={participants}
          onRemove={handleRemove}
          onDeleteProject={handleDeleteProject}
        />
      )}

      {/* Tab bar */}
      <View style={styles.subTabBar}>
        {(["calendar", "members"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.subTab, activeTab === t && styles.subTabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.subTabText, activeTab === t && styles.subTabTextActive]}>
              {t === "calendar" ? "📅  Calendar" : "📋  Project Information"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ─── Project Information tab ─── */
function MembersTab({
  participants,
  onRemove,
  onDeleteProject,
}: {
  participants: Participant[];
  onRemove: (p: Participant) => void;
  onDeleteProject: () => void;
}) {
  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionLabel}>MEMBERS</Text>
      {participants.length === 0 ? (
        <Text style={[styles.emptyText, { marginBottom: 24 }]}>No members on this project.</Text>
      ) : (
        <View style={styles.membersCard}>
          {participants.map((p, i) => (
            <View
              key={p.participantId}
              style={[styles.memberRow, i < participants.length - 1 && styles.memberRowBorder]}
            >
              <View style={styles.memberInfo}>
                {p.name && <Text style={styles.memberName}>{p.name}</Text>}
                <Text style={styles.memberEmail}>{p.email}</Text>
                <View style={styles.memberMeta}>
                  <Text style={styles.memberRole}>{p.role}</Text>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: p.status === "Accepted" ? Colors.greenBg : Colors.amberBg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: p.status === "Accepted" ? Colors.green : Colors.amber },
                      ]}
                    >
                      {p.status}
                    </Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => onRemove(p)}
                activeOpacity={0.7}
              >
                <Ionicons name="remove-circle" size={26} color={Colors.red} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.deleteProjectBtn}
        onPress={onDeleteProject}
        activeOpacity={0.8}
      >
        <Ionicons name="trash-outline" size={18} color={Colors.white} />
        <Text style={styles.deleteProjectBtnText}>Archive Project</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.offWhite },
  header: { paddingBottom: 20 },
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
    marginBottom: 4,
  },
  healthWrap: { alignItems: "center", paddingVertical: 16 },
  healthTrend: { fontSize: 13, fontWeight: "600", marginTop: 6 },
  overdueAlert: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: Colors.redBg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  overdueAlertText: { fontSize: 13, color: Colors.red, fontWeight: "600" },
  overdueAlertArrow: { fontSize: 16, color: Colors.red },
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 40 },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: { fontSize: 14, color: Colors.red, textAlign: "center", marginBottom: 12 },
  retryBtn: {
    borderWidth: 1,
    borderColor: Colors.gold,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryBtnText: { fontSize: 13, fontWeight: "600", color: Colors.gold },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: "center" },
  subTabBar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    backgroundColor: Colors.white,
  },
  subTab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: "center",
  },
  subTabActive: {
    borderTopWidth: 2,
    borderTopColor: Colors.gold,
  },
  subTabText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  subTabTextActive: { color: Colors.navy },
  sectionLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  // Members
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  memberRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary, marginBottom: 2 },
  memberEmail: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  memberMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  memberRole: { fontSize: 12, color: Colors.textSecondary, fontWeight: "500" },
  statusPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  removeBtn: { padding: 4 },
  deleteProjectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.red,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 32,
  },
  deleteProjectBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.white,
  },
});
