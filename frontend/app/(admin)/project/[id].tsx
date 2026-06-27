import { API_BASE_URL } from "@/constants/api";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { HEADER_HIT_SLOP } from "@/constants/touch";
import CircularProgress from "@/components/CircularProgress";
import { useAuth } from "@/context/AuthContext";
import { CalendarTab } from "@/components/project/CalendarTab";
import { FinancierMySpace } from "@/components/project/MySpaceViews";
import { InvoiceDetailModal } from "@/components/project/InvoiceDetailModal";
import { ApiInvoice } from "@/components/project/types";
import { AppText } from "@/components/AppText";

type Participant = {
  participantId: string;
  name: string | null;
  email: string;
  role: string;
  status: "Pending" | "Accepted";
  hasLicence?: boolean | null;
  hasInsurance?: boolean | null;
};

/* ─── Main screen ─── */
export default function AdminProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fetchWithAuth, user } = useAuth();

  const [activeTab, setActiveTab] = useState<"calendar" | "invoices" | "members">("calendar");
  const [detailInvoice, setDetailInvoice] = useState<ApiInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [council, setCouncil] = useState("");
  const [daNumber, setDaNumber] = useState<string | undefined>(undefined);
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
        const res = await fetchWithAuth(`${API_BASE_URL}/admin/projects/${id}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Failed to load project.");
          return;
        }
        setProjectName(data.project?.name ?? "");
        setLocation(data.project?.location ?? "");
        setCouncil(data.project?.council ?? "");
        setDaNumber(data.project?.daNumber);
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

  async function doDeleteProject() {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/admin/projects/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        const msg = data.error ?? "Failed to archive project.";
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("Error", msg);
      } else {
        router.replace("/(admin)/archives");
      }
    } catch {
      const msg = "Network error. Please try again.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
    }
  }

  function handleDeleteProject() {
    const msg = `Are you sure you want to archive "${projectName}"? It will be moved to the Archives tab.`;
    if (Platform.OS === "web") {
      if (!window.confirm(msg)) return;
      void doDeleteProject();
    } else {
      Alert.alert("Archive Project", msg, [
        { text: "Cancel", style: "cancel" },
        { text: "Archive", style: "destructive", onPress: () => void doDeleteProject() },
      ]);
    }
  }

  async function doRemove(participant: Participant) {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/admin/projects/${id}/participants/remove`, {
        method: "DELETE",
        body: JSON.stringify({ email: participant.email, role: participant.role }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = data.error ?? "Failed to remove participant.";
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("Error", msg);
      } else {
        setParticipants((prev) =>
          prev.filter((p) => !(p.email === participant.email && p.role === participant.role))
        );
      }
    } catch {
      const msg = "Network error. Please try again.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Error", msg);
    }
  }

  function handleRemove(participant: Participant) {
    const msg = `Remove ${participant.email} (${participant.role}) from this project?`;
    if (Platform.OS === "web") {
      if (!window.confirm(msg)) return;
      void doRemove(participant);
    } else {
      Alert.alert("Remove Participant", msg, [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => void doRemove(participant) },
      ]);
    }
  }

  return (
    <View style={styles.screen}>
      {/* Fixed top nav bar */}
      <View style={{ backgroundColor: Colors.vouchGreen }}>
        <SafeAreaView edges={["top"]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={HEADER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Back to all projects"
          >
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
            <AppText style={styles.backLabel}>All Projects</AppText>
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
            backgroundColor: Colors.vouchGreen,
          }}
        />
        <View
          style={{
            position: "absolute",
            top: "50%",
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: Colors.grey100,
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
              tintColor={Colors.white}
              colors={[Colors.vouchGreen]}
            />
          }
        >
          {/* Header body — scrolls away */}
          <View style={[styles.header, { backgroundColor: Colors.vouchGreen }]}>
            <AppText style={styles.adminBadge}>ADMIN CONSOLE</AppText>
            <AppText style={styles.headerTitle}>{projectName || "Project"}</AppText>
            {!!location && <AppText style={styles.headerSub}>{location}</AppText>}

            <View style={styles.healthWrap}>
              {loading ? (
                <ActivityIndicator color={Colors.white} style={{ height: 100 }} />
              ) : (
                <CircularProgress
                  value={health}
                  size={100}
                  textScale={0.72}
                  label={health >= 75 ? "Healthy" : health >= 50 ? "At Risk" : "Critical"}
                />
              )}
              {change !== null && (
                <AppText
                  style={[styles.healthTrend, { color: change >= 0 ? Colors.green : Colors.red }]}
                >
                  {change >= 0 ? "+" : ""}
                  {change}% vs last month
                </AppText>
              )}
            </View>

            {overdue > 0 && (
              <View style={styles.overdueAlert}>
                <AppText style={styles.overdueAlertText}>{overdue} invoices overdue</AppText>
              </View>
            )}
          </View>

          {error ? (
            <View style={styles.centerBox}>
              <AppText style={styles.errorText}>{error}</AppText>
              <TouchableOpacity
                onPress={() => fetchDetail()}
                style={styles.retryBtn}
                accessibilityRole="button"
                accessibilityLabel="Retry loading project"
              >
                <AppText style={styles.retryBtnText}>Retry</AppText>
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
              location={location}
              council={council}
              daNumber={daNumber}
              onRemove={handleRemove}
              onDeleteProject={handleDeleteProject}
              isArchived={projectStatus === "Inactive"}
            />
          )}
        </ScrollView>
      </View>

      {/* Sub-tab bar */}
      <View style={styles.subTabBar}>
        {(["calendar", "invoices", "members"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.subTab, activeTab === t && styles.subTabActive]}
            onPress={() => {
              setActiveTab(t);
              scrollRef.current?.scrollTo({ y: 0, animated: false });
            }}
            accessibilityRole="tab"
            accessibilityLabel={
              t === "calendar" ? "Calendar" : t === "invoices" ? "All Invoices" : "Project Info"
            }
            accessibilityState={{ selected: activeTab === t }}
          >
            <Ionicons
              name={
                t === "calendar"
                  ? "calendar-outline"
                  : t === "invoices"
                    ? "receipt-outline"
                    : "information-circle-outline"
              }
              size={16}
              color={activeTab === t ? Colors.white : Colors.whiteInactive}
              style={{ marginBottom: 2 }}
            />
            <AppText style={[styles.subTabText, activeTab === t && styles.subTabTextActive]}>
              {t === "calendar" ? "Calendar" : t === "invoices" ? "All Invoices" : "Project Info"}
            </AppText>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ─── Project Information tab ─── */
function MembersTab({
  participants,
  location,
  council,
  daNumber,
  onRemove,
  onDeleteProject,
  isArchived,
}: {
  participants: Participant[];
  location: string;
  council: string;
  daNumber?: string;
  onRemove: (p: Participant) => void;
  onDeleteProject: () => void;
  isArchived: boolean;
}) {
  return (
    <View style={styles.bodyContent}>
      <AppText style={styles.sectionLabel}>PROJECT DETAILS</AppText>
      <View style={[styles.membersCard, { marginBottom: 24 }]}>
        <InfoRow label="Location" value={location} />
        <InfoRow label="Council" value={council} last={!daNumber} />
        {!!daNumber && <InfoRow label="DA Number" value={daNumber} last />}
      </View>

      <AppText style={styles.sectionLabel}>MEMBERS</AppText>
      {participants.length === 0 ? (
        <AppText style={[styles.emptyText, { marginBottom: 24 }]}>
          No members on this project.
        </AppText>
      ) : (
        <View style={styles.membersCard}>
          {participants.map((p, i) => (
            <View
              key={p.participantId}
              style={[styles.memberRow, i < participants.length - 1 && styles.memberRowBorder]}
            >
              <View style={styles.memberInfo}>
                {p.name && <AppText style={styles.memberName}>{p.name}</AppText>}
                <AppText style={styles.memberEmail}>{p.email}</AppText>
                <View style={styles.memberMeta}>
                  <AppText style={styles.memberRole}>{p.role}</AppText>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: p.status === "Accepted" ? Colors.greenBg : Colors.amberBg,
                      },
                    ]}
                  >
                    <AppText
                      style={[
                        styles.statusPillText,
                        { color: p.status === "Accepted" ? Colors.green : Colors.amber },
                      ]}
                    >
                      {p.status}
                    </AppText>
                  </View>
                </View>
                {(p.hasLicence != null || p.hasInsurance != null) && (
                  <View style={styles.complianceRow}>
                    {p.hasLicence != null && (
                      <View style={p.hasLicence ? styles.badgeGreen : styles.badgeRed}>
                        <AppText style={p.hasLicence ? styles.badgeGreenText : styles.badgeRedText}>
                          {p.hasLicence ? "✓ Licenced" : "✗ No Licence"}
                        </AppText>
                      </View>
                    )}
                    {p.hasInsurance != null && (
                      <View style={p.hasInsurance ? styles.badgeGreen : styles.badgeRed}>
                        <AppText
                          style={p.hasInsurance ? styles.badgeGreenText : styles.badgeRedText}
                        >
                          {p.hasInsurance ? "✓ Insured" : "✗ Not Insured"}
                        </AppText>
                      </View>
                    )}
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => onRemove(p)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Remove ${p.name ?? p.email} from project`}
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
          accessibilityRole="button"
          accessibilityLabel="Archive Project"
        >
          <Ionicons name="trash-outline" size={18} color={Colors.white} />
          <AppText style={styles.deleteProjectBtnText}>Archive Project</AppText>
        </TouchableOpacity>
      )}
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
  header: { paddingBottom: 12 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 36,
    minWidth: 44,
    marginBottom: 4,
    alignSelf: "flex-start",
    writingDirection: "ltr",
  },
  backLabel: { fontSize: 13, color: Colors.white, fontFamily: Fonts.semiBold },
  adminBadge: {
    fontSize: 9,
    color: Colors.white,
    fontFamily: Fonts.semiBold,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    paddingHorizontal: 20,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: Fonts.extraBold,
    color: Colors.white,
    paddingHorizontal: 20,
  },
  headerSub: {
    fontSize: 12,
    color: Colors.white,
    fontFamily: Fonts.regular,
    paddingHorizontal: 20,
    marginBottom: 2,
  },
  healthWrap: { alignItems: "center", paddingVertical: 8 },
  healthTrend: { fontSize: 12, fontFamily: Fonts.semiBold, marginTop: 4 },
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
  overdueAlertText: { fontSize: 11, color: Colors.red, fontFamily: Fonts.semiBold },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 40,
    backgroundColor: Colors.grey100,
  },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  errorText: {
    fontSize: 14,
    color: Colors.red,
    fontFamily: Fonts.semiBold,
    textAlign: "center",
    marginBottom: 12,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: Colors.vouchGreen,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryBtnText: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.vouchGreen },
  emptyText: {
    fontSize: 14,
    color: Colors.grey500,
    fontFamily: Fonts.regular,
    textAlign: "center",
  },
  subTabBar: {
    flexDirection: "row",
    backgroundColor: Colors.vouchGreen,
    paddingBottom: 8,
  },
  subTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderTopWidth: 2,
    borderTopColor: "transparent",
  },
  subTabActive: { borderTopColor: Colors.white },
  subTabText: { fontSize: 11, fontFamily: Fonts.semiBold, color: Colors.whiteInactive },
  subTabTextActive: { color: Colors.white },
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
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  memberRowBorder: { borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.05)" },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.black, marginBottom: 2 },
  memberEmail: { fontSize: 12, color: Colors.grey500, fontFamily: Fonts.regular, marginBottom: 4 },
  memberMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  memberRole: { fontSize: 12, color: Colors.grey500, fontFamily: Fonts.medium },
  statusPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusPillText: { fontSize: 11, fontFamily: Fonts.bold },
  removeBtn: { padding: 4 },
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
  deleteProjectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.red,
    borderRadius: 28,
    paddingVertical: 14,
    marginTop: 32,
  },
  deleteProjectBtnText: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.white },
});
