import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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

/* ─── Types ─── */
type InvoiceStatus = "green" | "amber" | "red" | "purple" | "grey" | "issued";

type ApiInvoice = {
  id: string;
  submittingParty: string;
  description: string;
  dateSubmitted: string;
  dateDue: string;
  amount?: number;
  status: "Pending" | "Approved" | "Paid" | "Received" | "Rejected";
  daysOverdue: number;
};

type Participant = {
  email: string;
  role: string;
  status: "Pending" | "Accepted";
};

/* ─── Calendar helpers ─── */
function statusColor(s: InvoiceStatus): string {
  const map: Record<InvoiceStatus, string> = {
    green: Colors.green,
    amber: Colors.amber,
    red: Colors.red,
    purple: Colors.purple,
    grey: Colors.grey,
    issued: Colors.navy,
  };
  return map[s] ?? Colors.grey;
}

function statusBg(s: InvoiceStatus): string {
  const map: Record<InvoiceStatus, string> = {
    green: Colors.greenBg,
    amber: Colors.amberBg,
    red: Colors.redBg,
    purple: Colors.purpleBg,
    grey: Colors.greyBg,
    issued: Colors.issuedBg,
  };
  return map[s] ?? Colors.greyBg;
}

function statusLabel(s: InvoiceStatus): string {
  const map: Record<InvoiceStatus, string> = {
    green: "Paid",
    amber: "Warning",
    red: "Overdue",
    purple: "Info Pending",
    grey: "Buffer",
    issued: "Issued",
  };
  return map[s] ?? "";
}

function apiStatusToCalStatus(inv: ApiInvoice): InvoiceStatus {
  if (inv.status === "Paid" || inv.status === "Received") {
    return inv.daysOverdue > 0 ? "amber" : "green";
  }
  if (inv.daysOverdue > 0 || inv.status === "Rejected") return "red";
  if (inv.status === "Approved") return "grey";
  return "issued";
}

const SEVERITY: Record<InvoiceStatus, number> = {
  red: 5,
  amber: 4,
  purple: 3,
  issued: 2,
  grey: 1,
  green: 0,
};

const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DAY_CELL = Math.min(Math.floor((SCREEN_WIDTH - 40 - 24) / 7), 46);

/* ─── Main screen ─── */
export default function AdminProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { fetchWithAuth } = useAuth();

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
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

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
              <Text style={[styles.healthTrend, { color: change >= 0 ? Colors.green : Colors.red }]}>
                {change >= 0 ? "+" : ""}{change}% vs last month
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
        <CalendarTab invoices={invoices} />
      ) : (
        <MembersTab participants={participants} onRemove={handleRemove} />
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
              {t === "calendar" ? "📅  Calendar" : "👥  Members"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

/* ─── Calendar tab ─── */
function CalendarTab({ invoices }: { invoices: ApiInvoice[] }) {
  const [selectedDay, setSelectedDay] = useState<{ day: number; status: InvoiceStatus } | null>(
    null
  );

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const emptyBefore = firstDow === 0 ? 6 : firstDow - 1;
  const monthName = now.toLocaleString("en-AU", { month: "long", year: "numeric" });

  const dayStatusMap = new Map<number, InvoiceStatus>();
  for (const inv of invoices) {
    const due = new Date(inv.dateDue);
    if (due.getFullYear() !== year || due.getMonth() !== month) continue;
    const day = due.getDate();
    const calStatus = apiStatusToCalStatus(inv);
    const existing = dayStatusMap.get(day);
    if (!existing || SEVERITY[calStatus] > SEVERITY[existing]) {
      dayStatusMap.set(day, calStatus);
    }
  }

  const overdueList = invoices.filter(
    (i) => i.daysOverdue > 0 && i.status !== "Paid" && i.status !== "Received"
  );

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.monthRow}>
        <Text style={styles.monthTitle}>{monthName}</Text>
      </View>

      <View style={styles.calGrid}>
        {WEEK_DAYS.map((d, i) => (
          <View key={`h${i}`} style={{ width: DAY_CELL, alignItems: "center", paddingVertical: 4 }}>
            <Text style={styles.weekDay}>{d}</Text>
          </View>
        ))}
        {Array(emptyBefore)
          .fill(null)
          .map((_, i) => (
            <View key={`e${i}`} style={{ width: DAY_CELL, height: DAY_CELL }} />
          ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const status = dayStatusMap.get(day);
          const selected = selectedDay?.day === day;
          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayCell,
                {
                  width: DAY_CELL,
                  height: DAY_CELL,
                  backgroundColor: status ? statusColor(status) + "25" : "transparent",
                },
                selected && styles.dayCellSelected,
              ]}
              onPress={() => (status ? setSelectedDay(selected ? null : { day, status }) : undefined)}
              activeOpacity={status ? 0.7 : 1}
            >
              <Text style={styles.dayNum}>{day}</Text>
              {status && <View style={[styles.dayDot, { backgroundColor: statusColor(status) }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {selectedDay && (
        <View style={[styles.dayDetail, { borderLeftColor: statusColor(selectedDay.status) }]}>
          <Text style={styles.dayDetailTitle}>
            {now.toLocaleString("en-AU", { month: "long" })} {selectedDay.day}
          </Text>
          <Text style={[styles.dayDetailStatus, { color: statusColor(selectedDay.status) }]}>
            {statusLabel(selectedDay.status)}
          </Text>
        </View>
      )}

      <View style={styles.legend}>
        {(["green", "purple", "grey", "amber", "red"] as InvoiceStatus[]).map((s) => (
          <View key={s} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: statusColor(s) }]} />
            <Text style={styles.legendLabel}>{statusLabel(s)}</Text>
          </View>
        ))}
      </View>

      {overdueList.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>OVERDUE INVOICES</Text>
          {overdueList.map((inv) => {
            const calStatus = apiStatusToCalStatus(inv);
            return (
              <View
                key={inv.id}
                style={[styles.invoiceCard, { borderLeftColor: statusColor(calStatus) }]}
              >
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceName}>{inv.submittingParty}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
                    <Text style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
                      {statusLabel(calStatus)}
                    </Text>
                  </View>
                </View>
                <View style={styles.invoiceRow}>
                  <Text style={styles.invoiceDate}>
                    Due: {new Date(inv.dateDue).toLocaleDateString("en-AU")}
                  </Text>
                  <Text style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
                    {inv.daysOverdue} days overdue
                  </Text>
                </View>
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

/* ─── Members tab ─── */
function MembersTab({
  participants,
  onRemove,
}: {
  participants: Participant[];
  onRemove: (p: Participant) => void;
}) {
  if (participants.length === 0) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.emptyText}>No members on this project.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.sectionLabel}>MEMBERS</Text>
      <View style={styles.membersCard}>
        {participants.map((p, i) => (
          <View
            key={`${p.email}-${p.role}`}
            style={[styles.memberRow, i < participants.length - 1 && styles.memberRowBorder]}
          >
            <View style={styles.memberInfo}>
              <Text style={styles.memberEmail}>{p.email}</Text>
              <View style={styles.memberMeta}>
                <Text style={styles.memberRole}>{p.role}</Text>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: p.status === "Accepted" ? Colors.greenBg : Colors.amberBg },
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
  // Calendar
  monthRow: { alignItems: "center", marginBottom: 12 },
  monthTitle: { fontSize: 15, fontWeight: "700", color: Colors.textPrimary },
  calGrid: { flexDirection: "row", flexWrap: "wrap", gap: 2, marginBottom: 16, justifyContent: "center" },
  weekDay: { fontSize: 11, fontWeight: "600", color: Colors.textSecondary },
  dayCell: { borderRadius: 8, alignItems: "center", justifyContent: "center" },
  dayCellSelected: { borderWidth: 2, borderColor: Colors.navy },
  dayNum: { fontSize: 12, fontWeight: "600", color: Colors.textPrimary },
  dayDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  dayDetail: {
    borderLeftWidth: 3,
    borderRadius: 8,
    backgroundColor: Colors.white,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  dayDetailTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary, marginBottom: 2 },
  dayDetailStatus: { fontSize: 13, fontWeight: "600" },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: Colors.textSecondary },
  invoiceCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  invoiceRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  invoiceName: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
  invoiceDate: { fontSize: 12, color: Colors.textSecondary },
  invoiceDays: { fontSize: 12, fontWeight: "600" },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
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
  memberEmail: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary, marginBottom: 4 },
  memberMeta: { flexDirection: "row", alignItems: "center", gap: 8 },
  memberRole: { fontSize: 12, color: Colors.textSecondary, fontWeight: "500" },
  statusPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  statusPillText: { fontSize: 11, fontWeight: "700" },
  removeBtn: { padding: 4 },
});
