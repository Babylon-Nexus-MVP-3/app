import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { HEADER_HIT_SLOP } from "@/constants/touch";
import CircularProgress from "@/components/CircularProgress";
import { useAuth } from "@/context/AuthContext";
import { CalendarTab } from "@/components/project/CalendarTab";
import { FinancierMySpace } from "@/components/project/MySpaceViews";
import { InvoiceDetailModal } from "@/components/project/InvoiceDetailModal";
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

  const [activeTab, setActiveTab] = useState<"calendar" | "members" | "invoices">("calendar");
  const [detailInvoice, setDetailInvoice] = useState<ApiInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [projectStatus, setProjectStatus] = useState("");
  const [health, setHealth] = useState(0);
  const [change, setChange] = useState<number | null>(null);
  const [overdue, setOverdue] = useState(0);
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);

  const fetchDetail = useCallback(
    async (silent = false) => {
      if (!id) return;
      if (!silent) setLoading(true);
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
        setProjectStatus(data.project?.status ?? "");
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
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id]
  );

  useFocusEffect(
    useCallback(() => {
      fetchDetail();
    }, [fetchDetail])
  );

  const scrollRef = useRef<ScrollView>(null);
  const [refreshing, setRefreshing] = useState(false);
  async function handleRefresh() {
    setRefreshing(true);
    await fetchDetail(true);
    setRefreshing(false);
  }

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
      {/* Fixed top nav bar */}
      <View style={{ backgroundColor: Colors.navy }}>
        <SafeAreaView edges={["top"]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={HEADER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Back to all projects"
          >
            <Ionicons name="chevron-back" size={20} color={Colors.gold} />
            <Text style={styles.backLabel}>All Projects</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      {/* Scrollable content: header body + tab content */}
      <View style={{ flex: 1 }}>
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: "50%",
            backgroundColor: Colors.navy,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: Colors.offWhite,
          }}
        />
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1, backgroundColor: "transparent" }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.gold}
              colors={[Colors.gold]}
            />
          }
        >
          {/* Header body — scrolls away */}
          <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.header}>
            <Text style={styles.adminBadge}>ADMIN CONSOLE</Text>
            <Text style={styles.headerTitle}>{projectName || "Project"}</Text>
            {!!location && <Text style={styles.headerSub}>{location}</Text>}

            <View style={styles.healthWrap}>
              {loading ? (
                <ActivityIndicator color={Colors.gold} style={{ height: 100 }} />
              ) : (
                <CircularProgress
                  value={health}
                  size={100}
                  textScale={0.72}
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
              </View>
            )}
          </LinearGradient>

          {error ? (
            <View style={styles.centerBox}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={() => fetchDetail()} style={styles.retryBtn}>
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
          ) : activeTab === "invoices" ? (
            <>
              <FinancierMySpace invoices={invoices} onTapInvoice={setDetailInvoice} />
              <InvoiceDetailModal
                visible={detailInvoice !== null}
                inv={detailInvoice}
                viewerRole="Admin"
                userId={user?.id ?? ""}
                invoiceAction={async () => null}
                onClose={() => setDetailInvoice(null)}
              />
            </>
          ) : (
            <MembersTab
              participants={participants}
              onRemove={handleRemove}
              onDeleteProject={handleDeleteProject}
              isArchived={projectStatus === "Inactive"}
            />
          )}
        </ScrollView>
      </View>

      {/* Fixed tab bar */}
      <View style={styles.subTabBar}>
        {(["calendar", "invoices", "members"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.subTab, activeTab === t && styles.subTabActive]}
            onPress={() => {
              setActiveTab(t);
              scrollRef.current?.scrollTo({ y: 0, animated: false });
            }}
          >
            <Text style={[styles.subTabText, activeTab === t && styles.subTabTextActive]}>
              {t === "calendar"
                ? "📅  Calendar"
                : t === "invoices"
                  ? "🧾  All Invoices"
                  : "📋  Project Information"}
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
  isArchived,
}: {
  participants: Participant[];
  onRemove: (p: Participant) => void;
  onDeleteProject: () => void;
  isArchived: boolean;
}) {
  return (
    <View style={styles.bodyContent}>
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

      {!isArchived && (
        <TouchableOpacity
          style={styles.deleteProjectBtn}
          onPress={onDeleteProject}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.white} />
          <Text style={styles.deleteProjectBtnText}>Archive Project</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.offWhite },
  header: { paddingBottom: 12 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 36,
    minWidth: 44,
    marginBottom: 4,
    alignSelf: "flex-start",
    direction: "ltr",
  },
  backLabel: { fontSize: 13, color: Colors.gold, fontWeight: "600" },
  adminBadge: {
    fontSize: 9,
    color: Colors.goldLight,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.white,
    paddingHorizontal: 20,
    marginBottom: 0,
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    paddingHorizontal: 20,
    marginBottom: 2,
  },
  healthWrap: { alignItems: "center", paddingVertical: 8 },
  compactHeaderRow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    gap: 14,
  },
  compactHeaderInfo: { flex: 1 },
  compactHeaderName: { fontSize: 15, fontWeight: "800", color: Colors.white, marginBottom: 2 },
  compactHeaderSub: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 2 },
  compactHeaderTrend: { fontSize: 11, fontWeight: "600" },
  compactHeaderOverdue: { fontSize: 11, fontWeight: "600", color: Colors.red, marginTop: 2 },
  healthTrend: { fontSize: 12, fontWeight: "600", marginTop: 4 },
  overdueAlert: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 32,
    marginBottom: 6,
    backgroundColor: Colors.redBg,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  overdueAlertText: { fontSize: 11, color: Colors.red, fontWeight: "600" },
  overdueAlertArrow: { fontSize: 14, color: Colors.red },
  body: { flex: 1 },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
    backgroundColor: Colors.offWhite,
  },
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
  subTabText: { fontSize: 11, fontWeight: "600", color: Colors.textSecondary },
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
