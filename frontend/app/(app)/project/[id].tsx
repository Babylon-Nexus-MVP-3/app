import { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import CircularProgress from "@/components/CircularProgress";
import { useAuth } from "@/context/AuthContext";

/* ─── Types & helpers ─── */
type InvoiceStatus = "green" | "amber" | "red" | "purple" | "grey" | "issued";

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
    issued: "#E8EAF0",
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

// Dummy data. Need to replace with API calls once endpoints have been built.
// Feb 2026 calendar — 28 days (matching prototype)
const CALENDAR_STATUS: InvoiceStatus[] = [
  "green",
  "green",
  "green",
  "green",
  "green",
  "green",
  "green",
  "green",
  "grey",
  "amber",
  "green",
  "green",
  "green",
  "red",
  "green",
  "green",
  "grey",
  "green",
  "green",
  "amber",
  "green",
  "green",
  "green",
  "green",
  "green",
  "purple",
  "green",
  "green",
];

const OVERDUE_BY_PROJECT: Record<
  string,
  { id: number; from: string; date: string; days: number; status: InvoiceStatus }[]
> = {
  "1": [
    { id: 101, from: "JK Electrical", date: "Feb 3, 2026", days: 20, status: "amber" },
    { id: 102, from: "AceTech HVAC", date: "Feb 1, 2026", days: 22, status: "amber" },
  ],
  "2": [
    { id: 201, from: "Smith Plumbing", date: "Jan 28, 2026", days: 26, status: "red" },
    { id: 202, from: "Metro Concrete", date: "Jan 20, 2026", days: 34, status: "red" },
    { id: 203, from: "SafeGuard Fire", date: "Feb 5, 2026", days: 18, status: "amber" },
  ],
  "3": [
    { id: 301, from: "Apex Roofing", date: "Jan 15, 2026", days: 39, status: "red" },
    { id: 302, from: "ClearView Glass", date: "Jan 22, 2026", days: 32, status: "red" },
    { id: 303, from: "UrbanScape Land", date: "Feb 1, 2026", days: 22, status: "amber" },
    { id: 304, from: "SafeGuard Fire", date: "Feb 3, 2026", days: 20, status: "amber" },
    { id: 305, from: "Elite Plumbing", date: "Feb 5, 2026", days: 18, status: "amber" },
  ],
  "4": [],
};

const SUB_INVOICES = [
  {
    id: 1,
    date: "Feb 3, 2026",
    amt: 45000,
    status: "amber" as InvoiceStatus,
    days: 20,
    desc: "Electrical rough-in — Level 2",
  },
  {
    id: 2,
    date: "Jan 15, 2026",
    amt: 38000,
    status: "green" as InvoiceStatus,
    days: 0,
    desc: "Electrical fit-off — Level 1",
  },
];

const BUILDER_INVOICES = [
  {
    id: 1,
    from: "JK Electrical",
    date: "Feb 3, 2026",
    amt: 45000,
    status: "amber" as InvoiceStatus,
    days: 20,
    desc: "Electrical rough-in",
  },
  {
    id: 2,
    from: "Smith Plumbing",
    date: "Jan 28, 2026",
    amt: 32000,
    status: "red" as InvoiceStatus,
    days: 26,
    desc: "Main drainage install",
  },
  {
    id: 3,
    from: "SafeGuard Fire",
    date: "Feb 10, 2026",
    amt: 28000,
    status: "green" as InvoiceStatus,
    days: 0,
    desc: "Fire systems Level 1",
  },
  {
    id: 4,
    from: "Metro Concrete",
    date: "Feb 14, 2026",
    amt: 185000,
    status: "grey" as InvoiceStatus,
    days: 9,
    desc: "Slab pour Level 6",
  },
  {
    id: 5,
    from: "AceTech HVAC",
    date: "Feb 5, 2026",
    amt: 67000,
    status: "amber" as InvoiceStatus,
    days: 18,
    desc: "HVAC ducting Level 3",
  },
];

const OWNER_INVOICES = [
  { id: 1, from: "JK Electrical", amt: 45000, status: "amber" as InvoiceStatus, days: 20 },
  { id: 2, from: "Smith Plumbing", amt: 32000, status: "red" as InvoiceStatus, days: 26 },
  { id: 3, from: "Metro Concrete", amt: 185000, status: "red" as InvoiceStatus, days: 34 },
  { id: 4, from: "SafeGuard Fire", amt: 28000, status: "green" as InvoiceStatus, days: 0 },
  { id: 5, from: "AceTech HVAC", amt: 67000, status: "amber" as InvoiceStatus, days: 22 },
];

const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];
// Feb 2026 starts on Sunday — 6 empty cells in Mon-start grid
const EMPTY_CELLS = 6;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Cap at 46px so cells stay compact on large/tablet screens
const DAY_CELL = Math.min(Math.floor((SCREEN_WIDTH - 40 - 24) / 7), 46);

/* ─── Main screen ─── */
export default function ProjectDetail() {
  const params = useLocalSearchParams<{
    id: string;
    name: string;
    subtitle: string;
    role: string;
    health: string;
    overdue: string;
    change: string;
  }>();

  const id = params.id ?? "1";
  const name = params.name ?? "Project";
  const role = params.role ?? "Subcontractor";
  const health = parseInt(params.health ?? "0");
  const overdue = parseInt(params.overdue ?? "0");
  const change = parseInt(params.change ?? "0");

  const [activeTab, setActiveTab] = useState<"calendar" | "myspace">("calendar");
  const [builderActions, setBuilderActions] = useState<Record<number, "paid" | "info">>({});

  const overdueList = OVERDUE_BY_PROJECT[id] ?? [];

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.header}>
        <SafeAreaView edges={["top"]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backLabel}>All Projects</Text>
          </TouchableOpacity>

          <Text style={styles.headerProjectName}>{name}</Text>

          <View style={styles.healthWrap}>
            <CircularProgress
              value={health}
              size={120}
              label={health >= 75 ? "Healthy" : health >= 50 ? "At Risk" : "Critical"}
            />
            <Text style={[styles.healthTrend, { color: change >= 0 ? Colors.green : Colors.red }]}>
              {change >= 0 ? "+" : ""}
              {change}% vs last month
            </Text>
          </View>

          {overdue > 0 && (
            <View style={styles.overdueAlert}>
              <Text style={styles.overdueAlertText}>{overdue} invoices overdue</Text>
              <Text style={styles.overdueAlertArrow}>›</Text>
            </View>
          )}
        </SafeAreaView>
      </LinearGradient>

      {/* Sub-tab bar */}
      <View style={styles.subTabBar}>
        {(["calendar", "myspace"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.subTab, activeTab === t && styles.subTabActive]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.subTabText, activeTab === t && styles.subTabTextActive]}>
              {t === "calendar" ? "📅  Calendar" : "👤  My Space"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "calendar" ? (
        <CalendarTab overdueList={overdueList} />
      ) : (
        <MySpaceTab
          role={role}
          projectId={id}
          builderActions={builderActions}
          setBuilderActions={setBuilderActions}
        />
      )}
    </View>
  );
}

/* ─── Calendar tab ─── */
function CalendarTab({ overdueList }: { overdueList: (typeof OVERDUE_BY_PROJECT)["1"] }) {
  const [selectedDay, setSelectedDay] = useState<{ day: number; status: InvoiceStatus } | null>(
    null
  );

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
    >
      {/* Month header */}
      <View style={styles.monthRow}>
        <Text style={styles.monthArrow}>‹</Text>
        <Text style={styles.monthTitle}>February 2026</Text>
        <Text style={styles.monthArrow}>›</Text>
      </View>

      {/* Calendar grid */}
      <View style={styles.calGrid}>
        {WEEK_DAYS.map((d, i) => (
          <View key={`h${i}`} style={{ width: DAY_CELL, alignItems: "center", paddingVertical: 4 }}>
            <Text style={styles.weekDay}>{d}</Text>
          </View>
        ))}
        {Array(EMPTY_CELLS)
          .fill(null)
          .map((_, i) => (
            <View key={`e${i}`} style={{ width: DAY_CELL, height: DAY_CELL }} />
          ))}
        {CALENDAR_STATUS.map((status, i) => {
          const day = i + 1;
          const selected = selectedDay?.day === day;
          return (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayCell,
                { width: DAY_CELL, height: DAY_CELL, backgroundColor: statusColor(status) + "25" },
                selected && styles.dayCellSelected,
              ]}
              onPress={() => setSelectedDay(selected ? null : { day, status })}
              activeOpacity={0.7}
            >
              <Text style={styles.dayNum}>{day}</Text>
              <View style={[styles.dayDot, { backgroundColor: statusColor(status) }]} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected day detail */}
      {selectedDay && (
        <View style={[styles.dayDetail, { borderLeftColor: statusColor(selectedDay.status) }]}>
          <Text style={styles.dayDetailTitle}>February {selectedDay.day}</Text>
          <Text style={[styles.dayDetailStatus, { color: statusColor(selectedDay.status) }]}>
            {statusLabel(selectedDay.status)}
          </Text>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        {(["green", "purple", "grey", "amber", "red"] as InvoiceStatus[]).map((s) => (
          <View key={s} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: statusColor(s) }]} />
            <Text style={styles.legendLabel}>{statusLabel(s)}</Text>
          </View>
        ))}
      </View>

      {/* Overdue invoices */}
      {overdueList.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>OVERDUE INVOICES</Text>
          {overdueList.map((inv) => (
            <View
              key={inv.id}
              style={[styles.invoiceCard, { borderLeftColor: statusColor(inv.status) }]}
            >
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceName}>{inv.from}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusBg(inv.status) }]}>
                  <Text style={[styles.statusBadgeText, { color: statusColor(inv.status) }]}>
                    {statusLabel(inv.status)}
                  </Text>
                </View>
              </View>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceDate}>Issued: {inv.date}</Text>
                <Text style={[styles.invoiceDays, { color: statusColor(inv.status) }]}>
                  {inv.days} days overdue
                </Text>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

/* ─── My Space tab (role router) ─── */
function MySpaceTab({
  role,
  projectId,
  builderActions,
  setBuilderActions,
}: {
  role: string;
  projectId: string;
  builderActions: Record<number, "paid" | "info">;
  setBuilderActions: (
    fn: (p: Record<number, "paid" | "info">) => Record<number, "paid" | "info">
  ) => void;
}) {
  if (role === "Subcontractor") return <SubMySpace />;
  if (role === "Builder")
    return <BuilderMySpace builderActions={builderActions} setBuilderActions={setBuilderActions} />;
  if (role === "Owner" || role === "Financier") return <OwnerMySpace />;
  if (role === "Project Manager") return <PMMySpace projectId={projectId} />;
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>My Space</Text>
      <Text style={styles.placeholderSub}>View for {role} — coming soon</Text>
    </View>
  );
}

/* ─── Subcontractor ─── */
function SubMySpace() {
  const [confirmed, setConfirmed] = useState<Record<number, boolean>>({});
  const outstanding = SUB_INVOICES.filter((i) => i.status !== "green");
  const paid = SUB_INVOICES.filter((i) => i.status === "green");

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statBoxLabel}>Outstanding</Text>
          <Text style={[styles.statBoxNum, { color: Colors.amber }]}>
            ${(outstanding.reduce((a, i) => a + i.amt, 0) / 1000).toFixed(0)}K
          </Text>
          <Text style={styles.statBoxSub}>
            {outstanding.length} invoice{outstanding.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statBoxLabel}>Paid</Text>
          <Text style={[styles.statBoxNum, { color: Colors.green }]}>
            ${(paid.reduce((a, i) => a + i.amt, 0) / 1000).toFixed(0)}K
          </Text>
          <Text style={styles.statBoxSub}>
            {paid.length} invoice{paid.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>MY INVOICES</Text>
      {SUB_INVOICES.map((inv) => (
        <View
          key={inv.id}
          style={[styles.invoiceCard, { borderLeftColor: statusColor(inv.status) }]}
        >
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceName}>{inv.desc}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBg(inv.status) }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor(inv.status) }]}>
                {statusLabel(inv.status)}
              </Text>
            </View>
          </View>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceDate}>{inv.date}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={styles.invoiceAmt}>${(inv.amt / 1000).toFixed(0)}K</Text>
              {inv.status === "green" &&
                (confirmed[inv.id] ? (
                  <Text style={styles.confirmedText}>✓ Confirmed</Text>
                ) : (
                  <TouchableOpacity
                    style={styles.confirmBtn}
                    onPress={() => setConfirmed((p) => ({ ...p, [inv.id]: true }))}
                  >
                    <Text style={styles.confirmBtnText}>Confirm Receipt</Text>
                  </TouchableOpacity>
                ))}
              {inv.status !== "green" && inv.days > 0 && (
                <Text style={[styles.invoiceDays, { color: statusColor(inv.status) }]}>
                  {inv.days} days overdue
                </Text>
              )}
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

/* ─── Builder ─── */
function BuilderMySpace({
  builderActions,
  setBuilderActions,
}: {
  builderActions: Record<number, "paid" | "info">;
  setBuilderActions: (
    fn: (p: Record<number, "paid" | "info">) => Record<number, "paid" | "info">
  ) => void;
}) {
  const paidInvs = BUILDER_INVOICES.filter((i) => builderActions[i.id] === "paid");
  const outInvs = BUILDER_INVOICES.filter((i) => builderActions[i.id] !== "paid");
  const valTotal = BUILDER_INVOICES.reduce((a, i) => a + i.amt, 0);
  const valPaid = paidInvs.reduce((a, i) => a + i.amt, 0);
  const valOut = outInvs.reduce((a, i) => a + i.amt, 0);

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.invoiceCard, { borderLeftColor: Colors.navy, marginBottom: 16 }]}>
        <Text style={[styles.sectionLabel, { marginBottom: 12 }]}>PAYMENT SUMMARY</Text>
        <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
          {[
            [
              "Received",
              BUILDER_INVOICES.length,
              `$${(valTotal / 1000).toFixed(0)}K`,
              Colors.textPrimary,
            ],
            ["Paid", paidInvs.length, `$${(valPaid / 1000).toFixed(0)}K`, Colors.green],
            ["Outstanding", outInvs.length, `$${(valOut / 1000).toFixed(0)}K`, Colors.amber],
          ].map(([label, count, val, color]) => (
            <View key={label as string} style={{ alignItems: "center" }}>
              <Text style={styles.statBoxLabel}>{label as string}</Text>
              <Text style={[styles.statBoxNum, { color: color as string, fontSize: 18 }]}>
                {val as string}
              </Text>
              <Text style={styles.statBoxSub}>{count as number} invoices</Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.sectionLabel}>ALL INVOICES</Text>
      {BUILDER_INVOICES.map((inv) => {
        const acted = builderActions[inv.id];
        const displayColor =
          acted === "paid"
            ? Colors.green
            : acted === "info"
              ? Colors.purple
              : statusColor(inv.status);
        return (
          <View key={inv.id} style={[styles.invoiceCard, { borderLeftColor: displayColor }]}>
            <View style={styles.invoiceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.invoiceName}>{inv.from}</Text>
                <Text style={styles.invoiceDate}>
                  {inv.desc} · {inv.date}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.invoiceAmt}>${(inv.amt / 1000).toFixed(0)}K</Text>
                <Text style={[styles.statusBadgeText, { color: displayColor }]}>
                  {acted === "paid"
                    ? "✓ Paid"
                    : acted === "info"
                      ? "ℹ Info Req."
                      : statusLabel(inv.status)}
                </Text>
              </View>
            </View>
            {inv.days > 0 && !acted && (
              <Text
                style={[styles.invoiceDays, { color: statusColor(inv.status), marginBottom: 8 }]}
              >
                {inv.days} days overdue
              </Text>
            )}
            {!acted && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: Colors.green }]}
                  onPress={() => setBuilderActions((p) => ({ ...p, [inv.id]: "paid" }))}
                >
                  <Text style={styles.actionBtnText}>I Have Paid</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: Colors.purple }]}
                  onPress={() => setBuilderActions((p) => ({ ...p, [inv.id]: "info" }))}
                >
                  <Text style={styles.actionBtnText}>More Info</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

/* ─── Owner / Financier ─── */
function OwnerMySpace() {
  const stats = {
    raised: 18,
    paid: 11,
    outstanding: 7,
    valRaised: 1850000,
    valPaid: 1120000,
    valOut: 730000,
  };
  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.statRow}>
        {[
          [
            "Total Raised",
            stats.raised,
            `$${(stats.valRaised / 1000).toFixed(0)}K`,
            Colors.textPrimary,
          ],
          ["Paid", stats.paid, `$${(stats.valPaid / 1000).toFixed(0)}K`, Colors.green],
          ["Outstanding", stats.outstanding, `$${(stats.valOut / 1000).toFixed(0)}K`, Colors.amber],
        ].map(([label, count, val, color]) => (
          <View key={label as string} style={styles.statBox}>
            <Text style={styles.statBoxLabel}>{label as string}</Text>
            <Text style={[styles.statBoxNum, { color: color as string, fontSize: 18 }]}>
              {val as string}
            </Text>
            <Text style={styles.statBoxSub}>{count as number} invoices</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>ALL INVOICES</Text>
      {OWNER_INVOICES.map((inv) => (
        <View
          key={inv.id}
          style={[styles.invoiceCard, { borderLeftColor: statusColor(inv.status) }]}
        >
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceName}>{inv.from}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBg(inv.status) }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor(inv.status) }]}>
                {statusLabel(inv.status)}
              </Text>
            </View>
          </View>
          <View style={styles.invoiceRow}>
            <Text style={styles.invoiceAmt}>${(inv.amt / 1000).toFixed(0)}K</Text>
            {inv.days > 0 && (
              <Text style={[styles.invoiceDays, { color: statusColor(inv.status) }]}>
                {inv.days} days overdue
              </Text>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

/* ─── Project Manager ─── */
const INVITE_ROLES = ["Subbie", "Builder", "Owner", "Consultant"] as const;
type InviteRole = (typeof INVITE_ROLES)[number];

function PMMySpace({ projectId }: { projectId: string }) {
  const { fetchWithAuth } = useAuth();
  const counts = { green: 18, purple: 2, grey: 3, amber: 4, red: 1, total: 28 };

  const [modalVisible, setModalVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("Subbie");
  const [inviteTrade, setInviteTrade] = useState("");
  const [loading, setLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function openModal() {
    setInviteEmail("");
    setInviteRole("Subbie");
    setInviteTrade("");
    setInviteCode(null);
    setError(null);
    setModalVisible(true);
  }

  async function handleInvite() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`http://localhost:3229/project/${projectId}/invite`, {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          trade: inviteTrade.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send invite");
      } else {
        setInviteCode(data.participant.inviteCode);
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>INVOICE STATUS OVERVIEW</Text>
        {(["green", "amber", "red", "purple", "grey"] as const).map((s) => (
          <View key={s} style={[styles.invoiceCard, { borderLeftColor: statusColor(s) }]}>
            <View style={styles.invoiceRow}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10 }}>
                <View style={[styles.statusDot, { backgroundColor: statusColor(s) }]} />
                <Text style={styles.invoiceName}>{statusLabel(s)}</Text>
              </View>
              <Text style={[styles.invoiceAmt, { color: statusColor(s) }]}>
                {counts[s]} invoices
              </Text>
            </View>
          </View>
        ))}
        <View style={[styles.invoiceCard, { borderLeftColor: Colors.navy, marginTop: 4 }]}>
          <View style={styles.invoiceRow}>
            <Text style={[styles.invoiceName, { fontWeight: "800" }]}>Total</Text>
            <Text style={styles.invoiceAmt}>{counts.total} invoices</Text>
          </View>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>TEAM</Text>
        <TouchableOpacity style={styles.inviteBtn} onPress={openModal}>
          <Text style={styles.inviteBtnText}>+ Invite Team Member</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.inviteScreen}>
          <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.inviteHeader}>
            <SafeAreaView edges={["top"]}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.inviteBackBtn}>
                <Text style={styles.inviteBackArrow}>‹</Text>
                <Text style={styles.inviteBackLabel}>My Space</Text>
              </TouchableOpacity>
              <Text style={styles.inviteTitle}>
                {inviteCode ? "Invite Sent" : "Invite Team Member"}
              </Text>
            </SafeAreaView>
          </LinearGradient>

          <ScrollView
            style={styles.inviteBody}
            contentContainerStyle={styles.inviteBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {inviteCode ? (
              <View style={styles.inviteSuccess}>
                <View style={styles.inviteSuccessIcon}>
                  <Text style={{ fontSize: 36, color: Colors.green }}>✓</Text>
                </View>
                <Text style={styles.inviteSuccessTitle}>Invite Sent!</Text>
                <Text style={styles.inviteSuccessHint}>Share this code with {inviteEmail}:</Text>
                <View style={styles.inviteCodeBox}>
                  <Text style={styles.inviteCodeText}>{inviteCode}</Text>
                </View>
                <Text style={styles.inviteCodeNote}>
                  The invitee will use this code to join the project.
                </Text>
                <TouchableOpacity
                  style={styles.invitePrimaryBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.invitePrimaryBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.inviteFieldLabel}>Email</Text>
                <TextInput
                  style={styles.inviteInput}
                  placeholder="name@company.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.inviteFieldLabel}>Role</Text>
                <View style={styles.inviteRoleRow}>
                  {INVITE_ROLES.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[
                        styles.inviteRoleChip,
                        inviteRole === r && styles.inviteRoleChipActive,
                      ]}
                      onPress={() => setInviteRole(r)}
                    >
                      <Text
                        style={[
                          styles.inviteRoleChipText,
                          inviteRole === r && styles.inviteRoleChipTextActive,
                        ]}
                      >
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.inviteFieldLabel}>Trade</Text>
                <TextInput
                  style={styles.inviteInput}
                  placeholder="e.g. Electrical, Plumbing"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={inviteTrade}
                  onChangeText={setInviteTrade}
                />

                {error && <Text style={styles.inviteError}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.invitePrimaryBtn, { marginTop: 8 }]}
                  onPress={handleInvite}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.navy} />
                  ) : (
                    <Text style={styles.invitePrimaryBtnText}>Send Invite</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

/* ─── Styles ─── */
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.offWhite },

  // Header
  header: { paddingBottom: 20 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 8,
  },
  backArrow: { fontSize: 20, color: "rgba(255,255,255,0.5)" },
  backLabel: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "500" },
  headerProjectName: {
    fontSize: 16,
    color: Colors.white,
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "center",
    marginBottom: 12,
  },
  healthWrap: { alignItems: "center", marginBottom: 12 },
  healthTrend: { fontSize: 13, fontWeight: "600", marginTop: 8 },
  overdueAlert: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
    marginHorizontal: 24,
    backgroundColor: "rgba(231,76,60,0.15)",
    borderRadius: 10,
    paddingVertical: 8,
  },
  overdueAlertText: { fontSize: 13, color: Colors.red, fontWeight: "600" },
  overdueAlertArrow: { fontSize: 16, color: Colors.red },

  // Sub-tab bar
  subTabBar: { flexDirection: "row", backgroundColor: Colors.navy, paddingBottom: 12 },
  subTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  subTabActive: { borderBottomColor: Colors.gold },
  subTabText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.4)" },
  subTabTextActive: { color: Colors.gold },

  // Body
  body: { flex: 1 },
  bodyContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32 },

  // Calendar
  monthRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  monthTitle: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary },
  monthArrow: { fontSize: 22, color: Colors.textSecondary, width: 28, textAlign: "center" },
  calGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 16 },
  weekDay: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  dayCell: { borderRadius: 8, alignItems: "center", justifyContent: "center" },
  dayCellSelected: { borderWidth: 1.5, borderColor: Colors.gold },
  dayNum: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
  dayDot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },
  dayDetail: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  dayDetailTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary, marginBottom: 4 },
  dayDetailStatus: { fontSize: 13, fontWeight: "600" },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    marginBottom: 24,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 11, color: Colors.textSecondary },

  // Invoices
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  invoiceCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  invoiceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  invoiceName: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary, flex: 1 },
  invoiceDate: { fontSize: 12, color: Colors.textSecondary },
  invoiceDays: { fontSize: 12, fontWeight: "600" },
  invoiceAmt: { fontSize: 16, fontWeight: "800", color: Colors.textPrimary },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  statusBadgeText: { fontSize: 11, fontWeight: "600" },
  statusDot: { width: 10, height: 10, borderRadius: 5 },

  // My Space stats
  statRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statBox: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  statBoxLabel: { fontSize: 11, color: Colors.textSecondary, fontWeight: "600", marginBottom: 4 },
  statBoxNum: { fontSize: 22, fontWeight: "800", marginBottom: 2 },
  statBoxSub: { fontSize: 12, color: Colors.textSecondary },

  // Subcontractor
  confirmedText: { fontSize: 12, color: Colors.green, fontWeight: "600" },
  confirmBtn: {
    backgroundColor: Colors.green,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  confirmBtnText: { fontSize: 12, fontWeight: "700", color: Colors.white },

  // Builder
  actionRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { fontSize: 12, fontWeight: "700", color: Colors.white },

  // Placeholder
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  placeholderText: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary, marginBottom: 8 },
  placeholderSub: { fontSize: 14, color: Colors.textSecondary },

  // Invite button (in PM My Space list)
  inviteBtn: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
  },
  inviteBtnText: { color: Colors.gold, fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },

  // Invite full-screen modal
  inviteScreen: { flex: 1, backgroundColor: Colors.navy },
  inviteHeader: { paddingBottom: 20 },
  inviteBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 8,
  },
  inviteBackArrow: { fontSize: 20, color: "rgba(255,255,255,0.5)" },
  inviteBackLabel: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "500" },
  inviteTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: Colors.white,
    paddingHorizontal: 20,
    marginBottom: 4,
  },

  inviteBody: { flex: 1, backgroundColor: Colors.navy },
  inviteBodyContent: { padding: 24, paddingBottom: 48 },

  inviteFieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.gold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  inviteInput: {
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.gold + "40",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: Colors.white,
  },
  inviteRoleRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 20 },
  inviteRoleChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  inviteRoleChipActive: { borderColor: Colors.gold, backgroundColor: Colors.gold + "26" },
  inviteRoleChipText: { fontSize: 14, fontWeight: "500", color: "rgba(255,255,255,0.7)" },
  inviteRoleChipTextActive: { color: Colors.gold, fontWeight: "700" },
  inviteError: { color: Colors.red, fontSize: 13, fontWeight: "600", marginBottom: 8 },
  invitePrimaryBtn: {
    height: 54,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  invitePrimaryBtnText: { fontSize: 16, fontWeight: "700", color: Colors.navy, letterSpacing: 0.5 },

  // Invite success state
  inviteSuccess: { alignItems: "center", paddingTop: 40 },
  inviteSuccessIcon: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: Colors.green + "26",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  inviteSuccessTitle: { fontSize: 24, fontWeight: "800", color: Colors.white, marginBottom: 8 },
  inviteSuccessHint: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 20,
    textAlign: "center",
  },
  inviteCodeBox: {
    backgroundColor: Colors.gold + "1A",
    borderWidth: 1.5,
    borderColor: Colors.gold + "66",
    borderRadius: 14,
    paddingVertical: 20,
    paddingHorizontal: 40,
    marginBottom: 12,
  },
  inviteCodeText: { fontSize: 36, fontWeight: "800", color: Colors.gold, letterSpacing: 8 },
  inviteCodeNote: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    marginBottom: 32,
  },
});
