import React, { useState, useEffect } from "react";
import * as Clipboard from "expo-clipboard";
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

/* ─── API types ─── */
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

const SEVERITY: Record<InvoiceStatus, number> = {
  red: 5,
  amber: 4,
  purple: 3,
  issued: 2,
  grey: 1,
  green: 0,
};

function apiStatusToCalStatus(inv: ApiInvoice): InvoiceStatus {
  if (inv.status === "Paid" || inv.status === "Received") {
    return inv.daysOverdue > 0 ? "amber" : "green";
  }
  if (inv.daysOverdue > 0 || inv.status === "Rejected") return "red";
  if (inv.status === "Approved") return "grey";
  return "issued";
}

const WEEK_DAYS = ["M", "T", "W", "T", "F", "S", "S"];

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Cap at 46px so cells stay compact on large/tablet screens
const DAY_CELL = Math.min(Math.floor((SCREEN_WIDTH - 40 - 24) / 7), 46);

/* ─── Main screen ─── */
export default function ProjectDetail() {
  const params = useLocalSearchParams<{ id: string; name: string }>();
  const id = params.id ?? "";
  const nameParam = params.name ?? "Project";

  const { fetchWithAuth } = useAuth();
  const [activeTab, setActiveTab] = useState<"calendar" | "myspace">("calendar");
  const [builderActions, setBuilderActions] = useState<Record<string, "paid" | "info">>({});

  const [projectName, setProjectName] = useState(nameParam);
  const [health, setHealth] = useState(0);
  const [overdue, setOverdue] = useState(0);
  const [change, setChange] = useState<number | null>(null);
  const [role, setRole] = useState("Member");
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);

  const INVOICE_UPLOADER_ROLES = ["Subbie", "Builder", "Consultant", "PM"];
  const isInvoiceUploader = INVOICE_UPLOADER_ROLES.includes(role);

  // ── Raise Invoice state ──
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [invDesc, setInvDesc] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invDueDate, setInvDueDate] = useState("");
  const [invSubmittingParty, setInvSubmittingParty] = useState("");
  const [invCategory, setInvCategory] = useState("");
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceSuccess, setInvoiceSuccess] = useState(false);

  function openInvoice() {
    setInvDesc("");
    setInvAmount("");
    setInvDueDate("");
    setInvSubmittingParty("");
    setInvCategory("");
    setInvoiceError(null);
    setInvoiceSuccess(false);
    setInvoiceVisible(true);
  }

  async function handleAddInvoice() {
    setInvoiceLoading(true);
    setInvoiceError(null);
    try {
      const res = await fetchWithAuth(`http://localhost:3229/project/${id}/invoice`, {
        method: "POST",
        body: JSON.stringify({
          submittingParty: invSubmittingParty.trim(),
          submittingCategory: invCategory.trim(),
          description: invDesc.trim(),
          amount: parseFloat(invAmount),
          dateDue: invDueDate.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInvoiceError(data.error ?? "Failed to submit invoice");
      } else {
        setInvoiceSuccess(true);
      }
    } catch {
      setInvoiceError("Network error. Please try again.");
    } finally {
      setInvoiceLoading(false);
    }
  }
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchWithAuth(`http://localhost:3229/project/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProjectName(data.project?.name ?? nameParam);
          setHealth(data.healthScore ?? 0);
          setOverdue(data.overdueInvoiceCount ?? 0);
          setChange(data.monthOnMonthHealthChangePct ?? null);
          setRole(data.userRole ?? "Member");
          setInvoices(data.invoices ?? []);
        }
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <View style={styles.screen}>
      {/* Header */}
      <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.header}>
        <SafeAreaView edges={["top"]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>‹</Text>
            <Text style={styles.backLabel}>All Projects</Text>
          </TouchableOpacity>

          <Text style={styles.headerProjectName}>{projectName}</Text>

          <View style={styles.healthWrap}>
            {dataLoading ? (
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

      {activeTab === "calendar" ? (
        <CalendarTab invoices={invoices} />
      ) : (
        <MySpaceTab
          role={role}
          projectId={id}
          invoices={invoices}
          builderActions={builderActions}
          setBuilderActions={setBuilderActions}
        />
      )}

      {/* Bottom tab bar */}
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

      {/* Floating + FAB — only on My Space tab for invoice-uploading roles */}
      {activeTab === "myspace" && isInvoiceUploader && (
        <TouchableOpacity style={styles.fab} onPress={openInvoice}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}

      {/* ── Raise Invoice modal ── */}
      <Modal visible={invoiceVisible} animationType="slide" presentationStyle="fullScreen">
        <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={styles.raiseBody}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {invoiceSuccess ? (
              <View style={[styles.inviteSuccess, { marginTop: 80 }]}>
                <View style={styles.inviteSuccessIcon}>
                  <Text style={{ fontSize: 36, color: Colors.green }}>✓</Text>
                </View>
                <Text style={styles.inviteSuccessTitle}>Invoice Submitted!</Text>
                <Text style={styles.inviteSuccessHint}>Your invoice has been submitted successfully.</Text>
                <TouchableOpacity
                  style={[styles.invitePrimaryBtn, { alignSelf: "stretch", marginTop: 24 }]}
                  onPress={() => setInvoiceVisible(false)}
                >
                  <Text style={styles.invitePrimaryBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity onPress={() => setInvoiceVisible(false)} style={styles.raiseBack}>
                  <Text style={styles.raiseBackArrow}>←</Text>
                </TouchableOpacity>

                <Text style={styles.raiseTitle}>Raise Invoice</Text>
                <Text style={styles.raiseSubtitle}>{projectName}</Text>

                <Text style={styles.raiseFieldLabel}>Invoice Date</Text>
                <View style={styles.raiseDateWrap}>
                  <TextInput
                    style={[styles.raiseInput, { flex: 1, marginBottom: 0, borderWidth: 0, backgroundColor: "transparent", paddingHorizontal: 0 }]}
                    placeholder="dd/mm/yyyy"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={invDueDate}
                    onChangeText={setInvDueDate}
                  />
                  <Text style={styles.raiseCalIcon}>📅</Text>
                </View>

                <Text style={styles.raiseFieldLabel}>Amount ($)</Text>
                <TextInput
                  style={styles.raiseInput}
                  placeholder="e.g. 45000"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={invAmount}
                  onChangeText={setInvAmount}
                  keyboardType="numeric"
                />

                <Text style={styles.raiseFieldLabel}>Description</Text>
                <TextInput
                  style={[styles.raiseInput, styles.raiseMultiline]}
                  placeholder="e.g. Electrical rough-in — Level 3"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={invDesc}
                  onChangeText={setInvDesc}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <Text style={styles.raiseFieldLabel}>Submitting Party</Text>
                <TextInput
                  style={styles.raiseInput}
                  placeholder="e.g. ABC Electrical"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={invSubmittingParty}
                  onChangeText={setInvSubmittingParty}
                />

                <Text style={styles.raiseFieldLabel}>Category</Text>
                <TextInput
                  style={styles.raiseInput}
                  placeholder="e.g. Electrical, Plumbing"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={invCategory}
                  onChangeText={setInvCategory}
                />

                {invoiceError && <Text style={styles.inviteError}>{invoiceError}</Text>}

                <TouchableOpacity
                  style={styles.raisePrimaryBtn}
                  onPress={handleAddInvoice}
                  disabled={invoiceLoading}
                >
                  {invoiceLoading ? (
                    <ActivityIndicator color={Colors.navy} />
                  ) : (
                    <Text style={styles.raisePrimaryBtnText}>Submit Invoice</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </LinearGradient>
      </Modal>
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
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const emptyBefore = firstDow === 0 ? 6 : firstDow - 1;
  const monthName = now.toLocaleString("en-AU", { month: "long", year: "numeric" });

  // Map each day of the month to its worst invoice status
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
      {/* Month header */}
      <View style={styles.monthRow}>
        <Text style={styles.monthArrow}>‹</Text>
        <Text style={styles.monthTitle}>{monthName}</Text>
        <Text style={styles.monthArrow}>›</Text>
      </View>

      {/* Calendar grid */}
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
              onPress={() =>
                status ? setSelectedDay(selected ? null : { day, status }) : undefined
              }
              activeOpacity={status ? 0.7 : 1}
            >
              <Text style={styles.dayNum}>{day}</Text>
              {status && <View style={[styles.dayDot, { backgroundColor: statusColor(status) }]} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected day detail */}
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

/* ─── Invite roles (used in MySpaceTab modal) ─── */
const INVITE_ROLES = [
  "Subbie",
  "Builder",
  "Owner",
  "Consultant",
  "Financier",
  "VIP",
  "Observer",
] as const;
type InviteRole = (typeof INVITE_ROLES)[number];

const INVOICE_UPLOADER_ROLES = ["Subbie", "Builder", "Consultant", "PM"];

/* ─── My Space tab (role router) ─── */
function MySpaceTab({
  role,
  projectId,
  invoices,
  builderActions,
  setBuilderActions,
}: {
  role: string;
  projectId: string;
  invoices: ApiInvoice[];
  builderActions: Record<string, "paid" | "info">;
  setBuilderActions: React.Dispatch<React.SetStateAction<Record<string, "paid" | "info">>>;
}) {
  const { fetchWithAuth } = useAuth();
  const isInvoiceUploader = INVOICE_UPLOADER_ROLES.includes(role);

  // ── Invite modal state ──
  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("Subbie");
  const [inviteTrade, setInviteTrade] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function openInvite() {
    setInviteEmail("");
    setInviteRole("Subbie");
    setInviteTrade("");
    setInviteCode(null);
    setInviteError(null);
    setInviteVisible(true);
  }

  async function handleInvite() {
    setInviteLoading(true);
    setInviteError(null);
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
        setInviteError(data.error ?? "Failed to send invite");
      } else {
        setInviteCode(data.participant.inviteCode);
      }
    } catch {
      setInviteError("Network error. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  }

  let content: React.ReactNode;
  if (role === "Builder")
    content = (
      <BuilderMySpace
        invoices={invoices}
        builderActions={builderActions}
        setBuilderActions={setBuilderActions}
      />
    );
  else if (isInvoiceUploader) content = <InvoiceUploaderView invoices={invoices} />;
  else if (role === "Owner" || role === "Financier") content = <OwnerMySpace invoices={invoices} />;
  else
    content = (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>My Space</Text>
        <Text style={styles.placeholderSub}>View for {role} — coming soon</Text>
      </View>
    );

  return (
    <View style={{ flex: 1 }}>
      {content}

      {/* Invite footer — always visible */}
      <View style={styles.inviteFooter}>
        <TouchableOpacity style={styles.inviteBtn} onPress={openInvite}>
          <Text style={styles.inviteBtnText}>+ Invite Team Member</Text>
        </TouchableOpacity>
      </View>

      {/* ── Invite modal ── */}
      <Modal visible={inviteVisible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.inviteScreen}>
          <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.inviteHeader}>
            <SafeAreaView edges={["top"]}>
              <TouchableOpacity onPress={() => setInviteVisible(false)} style={styles.inviteBackBtn}>
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
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={async () => {
                    await Clipboard.setStringAsync(inviteCode!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  <Text style={styles.copyBtnText}>{copied ? "✓ Copied!" : "Copy Code"}</Text>
                </TouchableOpacity>
                <Text style={styles.inviteCodeNote}>
                  The invitee will use this code to join the project.
                </Text>
                <TouchableOpacity
                  style={[styles.invitePrimaryBtn, { alignSelf: "stretch" }]}
                  onPress={() => setInviteVisible(false)}
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

                {inviteError && <Text style={styles.inviteError}>{inviteError}</Text>}

                <TouchableOpacity
                  style={[styles.invitePrimaryBtn, { marginTop: 8 }]}
                  onPress={handleInvite}
                  disabled={inviteLoading}
                >
                  {inviteLoading ? (
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

    </View>
  );
}

/* ─── Invoice uploader view (Subcontractor / Builder / Consultant / PM) ─── */
function InvoiceUploaderView({ invoices }: { invoices: ApiInvoice[] }) {
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const outstanding = invoices.filter((i) => i.status !== "Paid" && i.status !== "Received");
  const paid = invoices.filter((i) => i.status === "Paid" || i.status === "Received");

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
            ${(outstanding.reduce((a, i) => a + (i.amount ?? 0), 0) / 1000).toFixed(0)}K
          </Text>
          <Text style={styles.statBoxSub}>
            {outstanding.length} invoice{outstanding.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statBoxLabel}>Paid</Text>
          <Text style={[styles.statBoxNum, { color: Colors.green }]}>
            ${(paid.reduce((a, i) => a + (i.amount ?? 0), 0) / 1000).toFixed(0)}K
          </Text>
          <Text style={styles.statBoxSub}>
            {paid.length} invoice{paid.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>MY INVOICES</Text>
      {invoices.length === 0 && <Text style={styles.emptyText}>No invoices yet.</Text>}
      {invoices.map((inv) => {
        const calStatus = apiStatusToCalStatus(inv);
        const isPaid = inv.status === "Paid" || inv.status === "Received";
        return (
          <View
            key={inv.id}
            style={[styles.invoiceCard, { borderLeftColor: statusColor(calStatus) }]}
          >
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceName}>{inv.description}</Text>
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
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {inv.amount != null && (
                  <Text style={styles.invoiceAmt}>${(inv.amount / 1000).toFixed(0)}K</Text>
                )}
                {isPaid &&
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
                {!isPaid && inv.daysOverdue > 0 && (
                  <Text style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
                    {inv.daysOverdue} days overdue
                  </Text>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

/* ─── Builder (own invoices + incoming invoice review) ─── */
function BuilderMySpace({
  invoices,
  builderActions,
  setBuilderActions,
}: {
  invoices: ApiInvoice[];
  builderActions: Record<string, "paid" | "info">;
  setBuilderActions: React.Dispatch<React.SetStateAction<Record<string, "paid" | "info">>>;
}) {
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const outstanding = invoices.filter((i) => i.status !== "Paid" && i.status !== "Received");
  const paid = invoices.filter((i) => i.status === "Paid" || i.status === "Received");

  const paidInvs = invoices.filter((i) => builderActions[i.id] === "paid");
  const outInvs = invoices.filter((i) => builderActions[i.id] !== "paid");
  const valPaid = paidInvs.reduce((a, i) => a + (i.amount ?? 0), 0);
  const valOut = outInvs.reduce((a, i) => a + (i.amount ?? 0), 0);

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
    >
      {/* ── My Invoices section ── */}
      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statBoxLabel}>Outstanding</Text>
          <Text style={[styles.statBoxNum, { color: Colors.amber }]}>
            ${(outstanding.reduce((a, i) => a + (i.amount ?? 0), 0) / 1000).toFixed(0)}K
          </Text>
          <Text style={styles.statBoxSub}>
            {outstanding.length} invoice{outstanding.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statBoxLabel}>Paid</Text>
          <Text style={[styles.statBoxNum, { color: Colors.green }]}>
            ${(paid.reduce((a, i) => a + (i.amount ?? 0), 0) / 1000).toFixed(0)}K
          </Text>
          <Text style={styles.statBoxSub}>
            {paid.length} invoice{paid.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>MY INVOICES</Text>
      {invoices.length === 0 && <Text style={styles.emptyText}>No invoices yet.</Text>}
      {invoices.map((inv) => {
        const calStatus = apiStatusToCalStatus(inv);
        const isPaid = inv.status === "Paid" || inv.status === "Received";
        return (
          <View key={`my-${inv.id}`} style={[styles.invoiceCard, { borderLeftColor: statusColor(calStatus) }]}>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceName}>{inv.description}</Text>
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
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                {inv.amount != null && (
                  <Text style={styles.invoiceAmt}>${(inv.amount / 1000).toFixed(0)}K</Text>
                )}
                {isPaid &&
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
                {!isPaid && inv.daysOverdue > 0 && (
                  <Text style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
                    {inv.daysOverdue} days overdue
                  </Text>
                )}
              </View>
            </View>
          </View>
        );
      })}

      {/* ── Incoming Invoices section ── */}
      <View style={styles.sectionDivider} />

      <View style={styles.statRow}>
        <View style={styles.statBox}>
          <Text style={styles.statBoxLabel}>To Pay</Text>
          <Text style={[styles.statBoxNum, { color: Colors.amber }]}>
            ${(valOut / 1000).toFixed(0)}K
          </Text>
          <Text style={styles.statBoxSub}>
            {outInvs.length} invoice{outInvs.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statBoxLabel}>Paid Out</Text>
          <Text style={[styles.statBoxNum, { color: Colors.green }]}>
            ${(valPaid / 1000).toFixed(0)}K
          </Text>
          <Text style={styles.statBoxSub}>
            {paidInvs.length} invoice{paidInvs.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>INCOMING INVOICES</Text>
      {invoices.length === 0 && <Text style={styles.emptyText}>No invoices yet.</Text>}
      {invoices.map((inv) => {
        const acted = builderActions[inv.id];
        const calStatus = apiStatusToCalStatus(inv);
        const displayColor =
          acted === "paid" ? Colors.green : acted === "info" ? Colors.purple : statusColor(calStatus);
        return (
          <View key={`in-${inv.id}`} style={[styles.invoiceCard, { borderLeftColor: displayColor }]}>
            <View style={styles.invoiceRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.invoiceName}>{inv.submittingParty}</Text>
                <Text style={styles.invoiceDate}>
                  {inv.description} · Due {new Date(inv.dateDue).toLocaleDateString("en-AU")}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                {inv.amount != null && (
                  <Text style={styles.invoiceAmt}>${(inv.amount / 1000).toFixed(0)}K</Text>
                )}
                <Text style={[styles.statusBadgeText, { color: displayColor }]}>
                  {acted === "paid" ? "✓ Paid" : acted === "info" ? "ℹ Info Req." : statusLabel(calStatus)}
                </Text>
              </View>
            </View>
            {inv.daysOverdue > 0 && !acted && (
              <Text style={[styles.invoiceDays, { color: statusColor(calStatus), marginBottom: 8 }]}>
                {inv.daysOverdue} days overdue
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
function OwnerMySpace({ invoices }: { invoices: ApiInvoice[] }) {
  const paidInvs = invoices.filter((i) => i.status === "Paid" || i.status === "Received");
  const outInvs = invoices.filter((i) => i.status !== "Paid" && i.status !== "Received");
  const valTotal = invoices.reduce((a, i) => a + (i.amount ?? 0), 0);
  const valPaid = paidInvs.reduce((a, i) => a + (i.amount ?? 0), 0);
  const valOut = outInvs.reduce((a, i) => a + (i.amount ?? 0), 0);

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
            invoices.length,
            `$${(valTotal / 1000).toFixed(0)}K`,
            Colors.textPrimary,
          ],
          ["Paid", paidInvs.length, `$${(valPaid / 1000).toFixed(0)}K`, Colors.green],
          ["Outstanding", outInvs.length, `$${(valOut / 1000).toFixed(0)}K`, Colors.amber],
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
      {invoices.length === 0 && <Text style={styles.emptyText}>No invoices yet.</Text>}
      {invoices.map((inv) => {
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
              {inv.amount != null && (
                <Text style={styles.invoiceAmt}>${(inv.amount / 1000).toFixed(0)}K</Text>
              )}
              {inv.daysOverdue > 0 && (
                <Text style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
                  {inv.daysOverdue} days overdue
                </Text>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
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
  subTabBar: { flexDirection: "row", backgroundColor: Colors.navy, paddingBottom: 24 },
  subTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 2,
    borderTopColor: "transparent",
  },
  subTabActive: { borderTopColor: Colors.gold },
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

  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginVertical: 20,
  },

  // Placeholder
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  placeholderText: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", marginTop: 16 },
  placeholderSub: { fontSize: 14, color: Colors.textSecondary },

  // Floating action button
  fab: {
    position: "absolute",
    bottom: 145,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { fontSize: 28, color: Colors.white, lineHeight: 32, fontWeight: "300" },

  // Raise Invoice — matches create-project aesthetic
  raiseBody: { paddingTop: 70, paddingHorizontal: 24, paddingBottom: 48 },
  raiseBack: { alignSelf: "flex-start", marginBottom: 24 },
  raiseBackArrow: { fontSize: 28, color: Colors.gold },
  raiseTitle: { fontSize: 28, fontWeight: "800", color: Colors.white, marginBottom: 6 },
  raiseSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.5)", marginBottom: 36 },
  raiseFieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.goldLight,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  raiseInput: {
    height: 52,
    borderWidth: 1.5,
    borderColor: "rgba(201,168,76,0.25)",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: Colors.white,
  },
  raiseDateWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderWidth: 1.5,
    borderColor: "rgba(201,168,76,0.25)",
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 20,
  },
  raiseCalIcon: { fontSize: 18 },
  raiseMultiline: { height: 100, paddingTop: 14 },
  raisePrimaryBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  raisePrimaryBtnText: { fontSize: 16, fontWeight: "700", color: Colors.navy },

  // Invite footer (visible for all roles)
  inviteFooter: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.offWhite,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  inviteBtn: {
    borderWidth: 1.5,
    borderColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
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
  copyBtn: {
    borderWidth: 1.5,
    borderColor: Colors.gold + "80",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 32,
    marginBottom: 16,
  },
  copyBtnText: { fontSize: 14, fontWeight: "600", color: Colors.gold },
  inviteCodeNote: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    marginBottom: 32,
  },
});
