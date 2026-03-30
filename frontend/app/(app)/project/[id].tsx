import React, { useState, useEffect } from "react";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Clipboard from "expo-clipboard";
import { Calendar } from "react-native-calendars";
import {
  ActivityIndicator,
  Modal,
  Platform,
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
    green: "Paid On Time",
    amber: "Paid Late",
    red: "Overdue / Rejected",
    purple: "Info Pending",
    grey: "Approved",
    issued: "Pending Approval",
  };
  return map[s] ?? "";
}

/* ─── API types ─── */
type ApiInvoice = {
  id: string;
  submittingParty: string;
  submittingCategory: string;
  description: string;
  dateSubmitted: string;
  dateDue: string;
  amount?: number;
  status: "Pending" | "Approved" | "Paid" | "Received" | "Rejected";
  daysOverdue: number;
  approverRole: string;
  submittedByUserId: string;
  rejectionReason?: string;
};

type InvoiceActionType = "approve" | "paid" | "received" | "reject";

const ACTION_WORD: Record<InvoiceActionType, string> = {
  approve: "approve",
  paid: "paid",
  received: "received",
  reject: "reject",
};

const ACTION_LABEL: Record<InvoiceActionType, string> = {
  approve: "Approve Invoice",
  paid: "Mark as Paid",
  received: "Confirm Receipt",
  reject: "Reject Invoice",
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

const ROLE_DISPLAY: Record<string, string> = {
  PM: "Project Manager",
  Subbie: "Subcontractor",
};
const ROLE_API: Record<string, string> = {
  "Project Manager": "PM",
  Subcontractor: "Subbie",
};
function displayRole(role: string): string {
  return ROLE_DISPLAY[role] ?? role;
}

function invoiceStatusLabel(status: ApiInvoice["status"]): string {
  if (status === "Received") return "Payment Received";
  return status;
}

// Owner, PM, Financier, VIP see all amounts.
// Everyone else sees amounts only for invoices they submitted OR invoices where they are the approver.
// Observer sees no amounts at all.
function canViewAmount(role: string, inv: ApiInvoice, userId: string): boolean {
  if (role === "Observer") return false;
  if (role === "Owner" || role === "PM" || role === "Financier" || role === "VIP") return true;
  return inv.submittedByUserId === userId || inv.approverRole === role;
}

const INVOICE_UPLOADER_ROLES = ["Subbie", "Builder", "Consultant", "PM"];

/* ─── Main screen ─── */
export default function ProjectDetail() {
  const params = useLocalSearchParams<{ id: string; name: string }>();
  const id = params.id ?? "";
  const nameParam = params.name ?? "Project";

  const { fetchWithAuth, user } = useAuth();
  const userId = user?.id ?? "";
  const [activeTab, setActiveTab] = useState<"calendar" | "myspace">("calendar");

  const [projectName, setProjectName] = useState(nameParam);
  const [health, setHealth] = useState(0);
  const [overdue, setOverdue] = useState(0);
  const [change, setChange] = useState<number | null>(null);
  const [role, setRole] = useState("Member");
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const isInvoiceUploader = INVOICE_UPLOADER_ROLES.includes(role);

  // ── Raise Invoice state ──
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [invDesc, setInvDesc] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invDueDate, setInvDueDate] = useState<Date | null>(null);
  const [invDueDateText, setInvDueDateText] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [invSubmittingParty, setInvSubmittingParty] = useState("");
  const [invCategory, setInvCategory] = useState("");
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceSuccess, setInvoiceSuccess] = useState(false);

  // ── Invite state ──
  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("Subcontractor");
  const [inviteTrade, setInviteTrade] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // ── FAB menu state ──
  const [fabMenuVisible, setFabMenuVisible] = useState(false);

  function openInvite() {
    setInviteEmail("");
    setInviteRole("Subcontractor");
    setInviteTrade("");
    setInviteCode(null);
    setInviteError(null);
    setInviteVisible(true);
    setFabMenuVisible(false);
  }

  async function handleInvite() {
    setInviteLoading(true);
    setInviteError(null);
    try {
      const res = await fetchWithAuth(`http://localhost:3229/project/${id}/invite`, {
        method: "POST",
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: ROLE_API[inviteRole] ?? inviteRole,
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

  function openInvoice() {
    setInvDesc("");
    setInvAmount("");
    setInvDueDate(null);
    setInvDueDateText("");
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
          dateDue: invDueDate?.toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInvoiceError(data.error ?? "Failed to submit invoice");
      } else {
        setInvoiceSuccess(true);
        await loadProject();
      }
    } catch {
      setInvoiceError("Network error. Please try again.");
    } finally {
      setInvoiceLoading(false);
    }
  }
  const [dataLoading, setDataLoading] = useState(true);

  async function loadProject() {
    if (!id) return;
    try {
      const res = await fetchWithAuth(`http://localhost:3229/project/${id}`);
      const data = await res.json();
      if (data.success) {
        setProjectName(data.project?.name ?? nameParam);
        setHealth(data.healthScore ?? 0);
        setOverdue(data.overdueInvoiceCount ?? 0);
        setChange(data.monthOnMonthHealthChangePct ?? null);
        setRole(data.userRole ?? "Member");
        setInvoices(data.invoices ?? []);
      }
    } catch {}
  }

  async function invoiceAction(
    action: InvoiceActionType,
    invoiceId: string,
    rejectionReason?: string
  ): Promise<string | null> {
    try {
      const body = rejectionReason ? JSON.stringify({ rejectionReason }) : undefined;
      const res = await fetchWithAuth(
        `http://localhost:3229/project/${id}/invoice/${invoiceId}/${action}`,
        { method: "PATCH", body }
      );
      const data = await res.json();
      if (!res.ok) return data.error ?? "Action failed";
      await loadProject();
      return null;
    } catch {
      return "Network error. Please try again.";
    }
  }

  useEffect(() => {
    loadProject().finally(() => setDataLoading(false));
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
        <CalendarTab
          invoices={invoices}
          role={role}
          userId={userId}
          invoiceAction={invoiceAction}
        />
      ) : (
        <MySpaceTab role={role} invoices={invoices} userId={userId} invoiceAction={invoiceAction} />
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

      {/* Floating + FAB */}
      {activeTab === "myspace" && (
        <View style={styles.fabWrap}>
          {fabMenuVisible && (
            <View style={styles.fabMenu}>
              <TouchableOpacity
                style={styles.fabMenuItem}
                onPress={() => {
                  setFabMenuVisible(false);
                  openInvoice();
                }}
              >
                <Text style={styles.fabMenuText}>Raise Invoice</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fabMenuItem} onPress={openInvite}>
                <Text style={styles.fabMenuText}>Invite Team Member</Text>
              </TouchableOpacity>
            </View>
          )}
          <TouchableOpacity
            style={[styles.fab, fabMenuVisible && styles.fabActive]}
            onPress={() => {
              if (isInvoiceUploader) {
                setFabMenuVisible((v) => !v);
                return;
              }
              openInvite();
            }}
          >
            <Text style={styles.fabText}>{fabMenuVisible ? "✕" : "+"}</Text>
          </TouchableOpacity>
        </View>
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
                <Text style={styles.inviteSuccessHint}>
                  Your invoice has been submitted successfully.
                </Text>
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

                <Text style={styles.raiseFieldLabel}>Invoice Due Date</Text>
                {Platform.OS === "web" ? (
                  <TextInput
                    style={styles.raiseInput}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={invDueDateText}
                    onChangeText={(text) => {
                      setInvDueDateText(text);
                      if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
                        const d = new Date(text);
                        setInvDueDate(!isNaN(d.getTime()) ? d : null);
                      } else {
                        setInvDueDate(null);
                      }
                    }}
                  />
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.raiseDateWrap}
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text
                        style={[
                          styles.raiseInput,
                          {
                            flex: 1,
                            marginBottom: 0,
                            borderWidth: 0,
                            backgroundColor: "transparent",
                            paddingHorizontal: 0,
                            color: invDueDate ? "#fff" : "rgba(255,255,255,0.3)",
                            lineHeight: 20,
                          },
                        ]}
                      >
                        {invDueDate ? invDueDate.toLocaleDateString("en-AU") : "dd/mm/yyyy"}
                      </Text>
                      <Text style={styles.raiseCalIcon}>📅</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={invDueDate ?? new Date()}
                        mode="date"
                        display="default"
                        onChange={(event: DateTimePickerEvent, date?: Date) => {
                          setShowDatePicker(false);
                          if (event.type === "set" && date) setInvDueDate(date);
                        }}
                      />
                    )}
                  </>
                )}

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

      {/* ── Invite modal ── */}
      <Modal visible={inviteVisible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.inviteScreen}>
          <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.inviteHeader}>
            <SafeAreaView edges={["top"]}>
              <TouchableOpacity
                onPress={() => setInviteVisible(false)}
                style={styles.inviteBackBtn}
              >
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

/* ─── Invoice Detail Modal ─── */
function InvoiceDetailModal({
  visible,
  inv,
  viewerRole,
  userId,
  invoiceAction,
  onClose,
}: {
  visible: boolean;
  inv: ApiInvoice | null;
  viewerRole: string;
  userId: string;
  invoiceAction: (
    action: InvoiceActionType,
    invoiceId: string,
    rejectionReason?: string
  ) => Promise<string | null>;
  onClose: () => void;
}) {
  const [confirmAction, setConfirmAction] = useState<InvoiceActionType | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function openConfirm(action: InvoiceActionType) {
    setConfirmAction(action);
    setConfirmError(null);
  }
  function closeConfirm() {
    setConfirmAction(null);
  }
  async function handleConfirm(reason?: string) {
    if (!confirmAction || !inv) return;
    setConfirmLoading(true);
    setConfirmError(null);
    const err = await invoiceAction(confirmAction, inv.id, reason);
    setConfirmLoading(false);
    if (err) {
      setConfirmError(err);
    } else {
      closeConfirm();
      onClose();
    }
  }

  if (!inv) return null;

  const showAmount = canViewAmount(viewerRole, inv, userId);
  const calStatus = apiStatusToCalStatus(inv);
  const canApprove = viewerRole === inv.approverRole && inv.status === "Pending";
  const canPay = viewerRole === inv.approverRole && inv.status === "Approved";
  const canReceive = userId === inv.submittedByUserId && inv.status === "Paid";
  const hasActions = canApprove || canPay || canReceive;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.detailScreen}>
        <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.detailHeader}>
          <SafeAreaView edges={["top"]}>
            <TouchableOpacity onPress={onClose} style={styles.detailBackBtn}>
              <Text style={styles.detailBackArrow}>‹</Text>
              <Text style={styles.detailBackLabel}>My Space</Text>
            </TouchableOpacity>
            <Text style={styles.detailTitle}>Invoice Details</Text>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusBg(calStatus),
                  alignSelf: "center",
                  marginTop: 8,
                  paddingHorizontal: 16,
                  paddingVertical: 6,
                },
              ]}
            >
              <Text
                style={[styles.statusBadgeText, { color: statusColor(calStatus), fontSize: 14 }]}
              >
                {invoiceStatusLabel(inv.status)}
              </Text>
            </View>
          </SafeAreaView>
        </LinearGradient>

        <ScrollView
          style={styles.detailBody}
          contentContainerStyle={styles.detailBodyContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.detailDesc}>{inv.description}</Text>

          <View style={styles.detailSection}>
            <Text style={styles.detailSectionLabel}>DETAILS</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Submitted by</Text>
              <Text style={styles.detailVal}>{inv.submittingParty}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Category</Text>
              <Text style={styles.detailVal}>{inv.submittingCategory}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Date submitted</Text>
              <Text style={styles.detailVal}>
                {new Date(inv.dateSubmitted).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Due date</Text>
              <Text style={styles.detailVal}>
                {new Date(inv.dateDue).toLocaleDateString("en-AU", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
            {showAmount && inv.amount != null && (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Amount</Text>
                <Text style={[styles.detailVal, { fontWeight: "700", color: Colors.navy }]}>
                  ${inv.amount.toLocaleString()}
                </Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailKey}>Approver</Text>
              <Text style={styles.detailVal}>{displayRole(inv.approverRole)}</Text>
            </View>
            {inv.daysOverdue > 0 && inv.status !== "Paid" && inv.status !== "Received" && (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Overdue by</Text>
                <Text style={[styles.detailVal, { color: Colors.red, fontWeight: "600" }]}>
                  {inv.daysOverdue} days
                </Text>
              </View>
            )}
            {inv.status === "Rejected" && inv.rejectionReason && (
              <View style={styles.detailRow}>
                <Text style={styles.detailKey}>Rejection reason</Text>
                <Text style={[styles.detailVal, { color: Colors.red }]}>{inv.rejectionReason}</Text>
              </View>
            )}
          </View>

          {hasActions && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionLabel}>ACTIONS</Text>
              {canApprove && (
                <>
                  <TouchableOpacity
                    style={[styles.detailActionBtn, { backgroundColor: Colors.green }]}
                    onPress={() => openConfirm("approve")}
                  >
                    <Text style={styles.detailActionBtnText}>Approve Invoice</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.detailActionBtn, { backgroundColor: Colors.red, marginTop: 10 }]}
                    onPress={() => openConfirm("reject")}
                  >
                    <Text style={styles.detailActionBtnText}>Reject Invoice</Text>
                  </TouchableOpacity>
                </>
              )}
              {canPay && (
                <TouchableOpacity
                  style={[styles.detailActionBtn, { backgroundColor: Colors.green }]}
                  onPress={() => openConfirm("paid")}
                >
                  <Text style={styles.detailActionBtnText}>Mark as Paid</Text>
                </TouchableOpacity>
              )}
              {canReceive && (
                <TouchableOpacity
                  style={[styles.detailActionBtn, { backgroundColor: Colors.navy }]}
                  onPress={() => openConfirm("received")}
                >
                  <Text style={styles.detailActionBtnText}>Confirm Receipt</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      <ConfirmModal
        visible={confirmAction !== null}
        action={confirmAction}
        invoice={inv}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        loading={confirmLoading}
        error={confirmError}
        showAmount={showAmount}
      />
    </Modal>
  );
}

/* ─── Calendar tab ─── */
function CalendarTab({
  invoices,
  role,
  userId,
  invoiceAction,
}: {
  invoices: ApiInvoice[];
  role: string;
  userId: string;
  invoiceAction: (
    action: InvoiceActionType,
    invoiceId: string,
    rejectionReason?: string
  ) => Promise<string | null>;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<ApiInvoice | null>(null);

  // Build worst-status dot per date (YYYY-MM-DD key)
  const dayStatusMap = new Map<string, InvoiceStatus>();
  for (const inv of invoices) {
    const dateStr = inv.dateDue.split("T")[0];
    const calStatus = apiStatusToCalStatus(inv);
    const existing = dayStatusMap.get(dateStr);
    if (!existing || SEVERITY[calStatus] > SEVERITY[existing]) {
      dayStatusMap.set(dateStr, calStatus);
    }
  }

  // Build markedDates for react-native-calendars (multi-dot)
  const markedDates: Record<string, any> = {};
  for (const [dateStr, calStatus] of dayStatusMap) {
    markedDates[dateStr] = {
      dots: [{ key: dateStr, color: statusColor(calStatus) }],
      ...(selectedDate === dateStr && { selected: true, selectedColor: Colors.navy }),
    };
  }
  if (selectedDate && !markedDates[selectedDate]) {
    markedDates[selectedDate] = { selected: true, selectedColor: Colors.navy };
  }

  // Invoices due on the selected date
  const selectedInvoices = selectedDate
    ? invoices.filter((i) => i.dateDue.split("T")[0] === selectedDate)
    : [];

  const selectedDateLabel = selectedDate
    ? new Date(selectedDate + "T00:00:00").toLocaleDateString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
    >
      <Calendar
        markingType="multi-dot"
        markedDates={markedDates}
        onDayPress={(day) =>
          setSelectedDate(day.dateString === selectedDate ? null : day.dateString)
        }
        theme={{
          backgroundColor: Colors.offWhite,
          calendarBackground: Colors.offWhite,
          textSectionTitleColor: Colors.textSecondary,
          selectedDayBackgroundColor: Colors.navy,
          selectedDayTextColor: Colors.white,
          todayTextColor: Colors.white,
          todayBackgroundColor: Colors.gold,
          dayTextColor: Colors.textPrimary,
          textDisabledColor: "rgba(0,0,0,0.2)",
          dotColor: Colors.navy,
          selectedDotColor: Colors.white,
          arrowColor: Colors.navy,
          monthTextColor: Colors.textPrimary,
          textMonthFontWeight: "bold",
          textMonthFontSize: 16,
          textDayFontSize: 13,
        }}
        style={styles.calendarWidget}
      />

      {/* Legend */}
      <View style={styles.legend}>
        {(["green", "issued", "grey", "amber", "red"] as InvoiceStatus[]).map((s) => (
          <View key={s} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: statusColor(s) }]} />
            <Text style={styles.legendLabel}>{statusLabel(s)}</Text>
          </View>
        ))}
      </View>

      {/* Selected date invoice list */}
      {selectedDate && (
        <>
          <Text style={styles.sectionLabel}>{selectedDateLabel}</Text>
          {selectedInvoices.length === 0 ? (
            <Text style={styles.emptyText}>No invoices due on this date.</Text>
          ) : (
            selectedInvoices.map((inv) => {
              const calStatus = apiStatusToCalStatus(inv);
              return (
                <TouchableOpacity
                  key={inv.id}
                  onPress={() => setDetailInvoice(inv)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.invoiceCard, { borderLeftColor: statusColor(calStatus) }]}>
                    <View style={styles.invoiceRow}>
                      <Text style={styles.invoiceName}>{inv.submittingParty}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
                          {invoiceStatusLabel(inv.status)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.invoiceDate} numberOfLines={1}>
                      {inv.description}
                    </Text>
                    {canViewAmount(role, inv, userId) && inv.amount != null && (
                      <Text style={styles.invoiceAmt}>${inv.amount.toLocaleString()}</Text>
                    )}
                    {inv.daysOverdue > 0 && (
                      <Text style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
                        {inv.daysOverdue} days overdue
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </>
      )}

      <InvoiceDetailModal
        visible={detailInvoice !== null}
        inv={detailInvoice}
        viewerRole={role}
        userId={userId}
        invoiceAction={invoiceAction}
        onClose={() => setDetailInvoice(null)}
      />
    </ScrollView>
  );
}

/* ─── Confirmation modal (type-to-confirm for approve / paid / received / reject) ─── */
function ConfirmModal({
  visible,
  action,
  invoice,
  onClose,
  onConfirm,
  loading,
  error,
  showAmount = true,
}: {
  visible: boolean;
  action: InvoiceActionType | null;
  invoice: ApiInvoice | null;
  onClose: () => void;
  onConfirm: (rejectionReason?: string) => void;
  loading: boolean;
  error: string | null;
  showAmount?: boolean;
}) {
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (visible) {
      setTyped("");
      setReason("");
    }
  }, [visible]);

  if (!action || !invoice) return null;

  const word = ACTION_WORD[action];
  const isReject = action === "reject";
  // Reject: no type-to-confirm — reason field is sufficient
  const isValid = isReject ? true : typed.trim().toLowerCase() === word;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>{ACTION_LABEL[action]}</Text>
          <Text style={styles.confirmInvDesc} numberOfLines={2}>
            {invoice.description}
          </Text>
          {showAmount && invoice.amount != null && (
            <Text style={styles.confirmInvAmt}>${invoice.amount.toLocaleString()}</Text>
          )}

          {isReject ? (
            <>
              <Text style={styles.confirmFieldLabel}>Reason (optional)</Text>
              <TextInput
                style={styles.confirmReasonInput}
                placeholder="e.g. Invoice details are incorrect"
                placeholderTextColor={Colors.textSecondary}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
              />
            </>
          ) : (
            <>
              <Text style={styles.confirmHint}>
                Type <Text style={{ fontWeight: "800" }}>{word}</Text> to confirm
              </Text>
              <TextInput
                style={styles.confirmTypeInput}
                value={typed}
                onChangeText={setTyped}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={word}
                placeholderTextColor={Colors.textSecondary}
              />
            </>
          )}

          {error && <Text style={styles.confirmError}>{error}</Text>}

          <View style={styles.confirmBtnRow}>
            <TouchableOpacity style={styles.confirmCancelBtn} onPress={onClose} disabled={loading}>
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmActionBtn,
                isReject && { backgroundColor: Colors.red },
                !isValid && { opacity: 0.35 },
              ]}
              onPress={() => onConfirm(isReject ? reason || undefined : undefined)}
              disabled={!isValid || loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.confirmActionText}>{ACTION_LABEL[action]}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/* ─── Invite roles (used in MySpaceTab modal) ─── */
const INVITE_ROLES = [
  "Subcontractor",
  "Builder",
  "Project Manager",
  "Owner",
  "Consultant",
  "Financier",
  "VIP",
  "Observer",
] as const;
type InviteRole = (typeof INVITE_ROLES)[number];

/* ─── My Space tab (role router) ─── */
function MySpaceTab({
  role,
  invoices,
  userId,
  invoiceAction,
}: {
  role: string;
  invoices: ApiInvoice[];
  userId: string;
  invoiceAction: (
    action: InvoiceActionType,
    invoiceId: string,
    rejectionReason?: string
  ) => Promise<string | null>;
}) {
  const [detailInvoice, setDetailInvoice] = useState<ApiInvoice | null>(null);

  let content: React.ReactNode;
  if (role === "Builder")
    content = (
      <BuilderMySpace
        invoices={invoices}
        userId={userId}
        invoiceAction={invoiceAction}
        onTapInvoice={setDetailInvoice}
      />
    );
  else if (role === "PM")
    content = (
      <PMMySpace
        invoices={invoices}
        userId={userId}
        invoiceAction={invoiceAction}
        onTapInvoice={setDetailInvoice}
      />
    );
  else if (role === "Subbie" || role === "Consultant")
    content = (
      <InvoiceUploaderView
        invoices={invoices}
        userId={userId}
        invoiceAction={invoiceAction}
        onTapInvoice={setDetailInvoice}
      />
    );
  else if (role === "Owner")
    content = (
      <OwnerMySpace
        invoices={invoices}
        userId={userId}
        invoiceAction={invoiceAction}
        onTapInvoice={setDetailInvoice}
      />
    );
  else if (role === "Financier" || role === "VIP")
    content = <FinancierMySpace invoices={invoices} onTapInvoice={setDetailInvoice} />;
  else if (role === "Observer")
    content = <ObserverMySpace invoices={invoices} onTapInvoice={setDetailInvoice} />;
  else
    content = (
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>My Space</Text>
        <Text style={styles.placeholderSub}>View for {displayRole(role)} — coming soon</Text>
      </View>
    );

  return (
    <View style={{ flex: 1 }}>
      {content}
      <InvoiceDetailModal
        visible={detailInvoice !== null}
        inv={detailInvoice}
        viewerRole={role}
        userId={userId}
        invoiceAction={invoiceAction}
        onClose={() => setDetailInvoice(null)}
      />
    </View>
  );
}

/* ─── Invoice uploader view (Subcontractor / Builder / Consultant / PM) ─── */
/* ─── Shared: invoice card for submitter (My Invoices) ─── */
function MyInvoiceCard({
  inv,
  onReceived,
  onTap,
}: {
  inv: ApiInvoice;
  onReceived: () => void;
  onTap: () => void;
}) {
  const calStatus = apiStatusToCalStatus(inv);
  const canConfirm = inv.status === "Paid";
  const isDone = inv.status === "Received";
  return (
    <TouchableOpacity
      style={[styles.invoiceCard, { borderLeftColor: statusColor(calStatus) }]}
      onPress={onTap}
      activeOpacity={0.85}
    >
      <View style={styles.invoiceRow}>
        <Text style={[styles.invoiceName, { flex: 1 }]} numberOfLines={1}>
          {inv.description}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
          <Text style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
            {invoiceStatusLabel(inv.status)}
          </Text>
        </View>
      </View>
      <View style={styles.invoiceRow}>
        <Text style={styles.invoiceDate}>
          Due: {new Date(inv.dateDue).toLocaleDateString("en-AU")}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {inv.amount != null && (
            <Text style={styles.invoiceAmt}>${inv.amount.toLocaleString()}</Text>
          )}
          {!isDone && inv.daysOverdue > 0 && !canConfirm && (
            <Text style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
              {inv.daysOverdue}d overdue
            </Text>
          )}
        </View>
      </View>
      {canConfirm && (
        <TouchableOpacity style={styles.confirmBtn} onPress={onReceived}>
          <Text style={styles.confirmBtnText}>Confirm Receipt</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

/* ─── Shared: invoice card for approver (Incoming Approvals) ─── */
function ApprovalCard({
  inv,
  onApprove,
  onPaid,
  onReject,
  onTap,
  showAmount = true,
}: {
  inv: ApiInvoice;
  onApprove: () => void;
  onPaid: () => void;
  onReject: () => void;
  onTap: () => void;
  showAmount?: boolean;
}) {
  const calStatus = apiStatusToCalStatus(inv);
  const canApprove = inv.status === "Pending";
  const canPay = inv.status === "Approved";
  const isDone = inv.status === "Paid" || inv.status === "Received";
  const isRejected = inv.status === "Rejected";
  return (
    <TouchableOpacity
      style={[styles.invoiceCard, { borderLeftColor: statusColor(calStatus) }]}
      onPress={onTap}
      activeOpacity={0.85}
    >
      <View style={styles.invoiceRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.invoiceName}>{inv.submittingParty}</Text>
          <Text style={styles.invoiceDate} numberOfLines={1}>
            {inv.description}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          {showAmount && inv.amount != null && (
            <Text style={styles.invoiceAmt}>${inv.amount.toLocaleString()}</Text>
          )}
          <View
            style={[styles.statusBadge, { backgroundColor: statusBg(calStatus), marginTop: 4 }]}
          >
            <Text style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
              {invoiceStatusLabel(inv.status)}
            </Text>
          </View>
        </View>
      </View>
      <Text style={styles.invoiceDate}>
        Due: {new Date(inv.dateDue).toLocaleDateString("en-AU")}
      </Text>
      {inv.daysOverdue > 0 && !isDone && (
        <Text style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
          {inv.daysOverdue} days overdue
        </Text>
      )}
      {(canApprove || canPay) && (
        <View style={styles.actionRow}>
          {canApprove && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.green }]}
                onPress={onApprove}
              >
                <Text style={styles.actionBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: Colors.red }]}
                onPress={onReject}
              >
                <Text style={styles.actionBtnText}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
          {canPay && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: Colors.green }]}
              onPress={onPaid}
            >
              <Text style={styles.actionBtnText}>Mark as Paid</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
      {isRejected && (
        <Text style={[styles.invoiceDays, { color: Colors.red, marginTop: 6 }]}>✗ Rejected</Text>
      )}
    </TouchableOpacity>
  );
}

/* ─── Invoice uploader view (Subcontractor / Consultant) ─── */
function InvoiceUploaderView({
  invoices,
  userId,
  invoiceAction,
  onTapInvoice,
}: {
  invoices: ApiInvoice[];
  userId: string;
  invoiceAction: (
    action: InvoiceActionType,
    invoiceId: string,
    rejectionReason?: string
  ) => Promise<string | null>;
  onTapInvoice: (inv: ApiInvoice) => void;
}) {
  const [confirmAction, setConfirmAction] = useState<InvoiceActionType | null>(null);
  const [confirmInvoice, setConfirmInvoice] = useState<ApiInvoice | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function openConfirm(action: InvoiceActionType, inv: ApiInvoice) {
    setConfirmAction(action);
    setConfirmInvoice(inv);
    setConfirmError(null);
  }
  function closeConfirm() {
    setConfirmAction(null);
    setConfirmInvoice(null);
  }
  async function handleConfirm(reason?: string) {
    if (!confirmAction || !confirmInvoice) return;
    setConfirmLoading(true);
    setConfirmError(null);
    const err = await invoiceAction(confirmAction, confirmInvoice.id, reason);
    setConfirmLoading(false);
    if (err) setConfirmError(err);
    else closeConfirm();
  }

  const myInvoices = invoices.filter((i) => i.submittedByUserId === userId);
  const outstanding = myInvoices.filter(
    (i) => i.status !== "Paid" && i.status !== "Received" && i.status !== "Rejected"
  );
  const paid = myInvoices.filter((i) => i.status === "Paid" || i.status === "Received");

  return (
    <>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statBoxLabel}>Outstanding</Text>
            <Text style={[styles.statBoxNum, { color: Colors.amber }]}>
              ${outstanding.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}
            </Text>
            <Text style={styles.statBoxSub}>
              {outstanding.length} invoice{outstanding.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statBoxLabel}>Paid</Text>
            <Text style={[styles.statBoxNum, { color: Colors.green }]}>
              ${paid.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}
            </Text>
            <Text style={styles.statBoxSub}>
              {paid.length} invoice{paid.length !== 1 ? "s" : ""}
            </Text>
          </View>
        </View>
        <Text style={styles.sectionLabel}>MY INVOICES</Text>
        {myInvoices.length === 0 && <Text style={styles.emptyText}>No invoices yet.</Text>}
        {myInvoices.map((inv) => (
          <MyInvoiceCard
            key={inv.id}
            inv={inv}
            onReceived={() => openConfirm("received", inv)}
            onTap={() => onTapInvoice(inv)}
          />
        ))}
      </ScrollView>
      <ConfirmModal
        visible={confirmAction !== null}
        action={confirmAction}
        invoice={confirmInvoice}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        loading={confirmLoading}
        error={confirmError}
      />
    </>
  );
}

/* ─── Shared dual-role view (Builder / PM): My Invoices + To Approve + All Invoices ─── */
function DualRoleMySpace({
  invoices,
  userId,
  approverRole,
  invoiceAction,
  onTapInvoice,
}: {
  invoices: ApiInvoice[];
  userId: string;
  approverRole: "Builder" | "PM";
  invoiceAction: (
    action: InvoiceActionType,
    invoiceId: string,
    rejectionReason?: string
  ) => Promise<string | null>;
  onTapInvoice: (inv: ApiInvoice) => void;
}) {
  const [subTab, setSubTab] = useState<"myInvoices" | "toApprove" | "allInvoices">("myInvoices");
  const [confirmAction, setConfirmAction] = useState<InvoiceActionType | null>(null);
  const [confirmInvoice, setConfirmInvoice] = useState<ApiInvoice | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function openConfirm(action: InvoiceActionType, inv: ApiInvoice) {
    setConfirmAction(action);
    setConfirmInvoice(inv);
    setConfirmError(null);
  }
  function closeConfirm() {
    setConfirmAction(null);
    setConfirmInvoice(null);
  }
  async function handleConfirm(reason?: string) {
    if (!confirmAction || !confirmInvoice) return;
    setConfirmLoading(true);
    setConfirmError(null);
    const err = await invoiceAction(confirmAction, confirmInvoice.id, reason);
    setConfirmLoading(false);
    if (err) setConfirmError(err);
    else closeConfirm();
  }

  const myInvoices = invoices.filter((i) => i.submittedByUserId === userId);
  const approvalInvoices = invoices.filter((i) => i.approverRole === approverRole);
  const myOutstanding = myInvoices.filter(
    (i) => i.status !== "Paid" && i.status !== "Received" && i.status !== "Rejected"
  );
  const myPaid = myInvoices.filter((i) => i.status === "Paid" || i.status === "Received");
  const toAction = approvalInvoices.filter(
    (i) => i.status === "Pending" || i.status === "Approved"
  );
  const actionDone = approvalInvoices.filter(
    (i) => i.status === "Paid" || i.status === "Received" || i.status === "Rejected"
  );
  // All roles see all project invoices; amounts are gated per canViewAmount.
  const allInvoices = invoices;
  const allPaid = allInvoices.filter((i) => i.status === "Paid" || i.status === "Received");
  const allOut = allInvoices.filter(
    (i) => i.status !== "Paid" && i.status !== "Received" && i.status !== "Rejected"
  );

  // PM sees all amounts; Builder sees amounts on own + approved invoices
  const canSeeAllAmounts = approverRole === "PM";
  // For "To Action" tab: Builder IS the approver for all those invoices → show dollar total
  const canSeeToActionAmounts = true;

  const SUB_TABS = [
    { key: "myInvoices" as const, label: "My Invoices" },
    { key: "toApprove" as const, label: "To Action" },
    { key: "allInvoices" as const, label: "All Invoices" },
  ];

  return (
    <>
      {/* Inner sub-tab bar */}
      <View style={styles.innerTabBar}>
        {SUB_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.innerTab, subTab === t.key && styles.innerTabActive]}
            onPress={() => setSubTab(t.key)}
          >
            <Text style={[styles.innerTabText, subTab === t.key && styles.innerTabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {subTab === "myInvoices" && (
          <>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Outstanding</Text>
                <Text style={[styles.statBoxNum, { color: Colors.amber }]}>
                  ${myOutstanding.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}
                </Text>
                <Text style={styles.statBoxSub}>
                  {myOutstanding.length} invoice{myOutstanding.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Paid</Text>
                <Text style={[styles.statBoxNum, { color: Colors.green }]}>
                  ${myPaid.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}
                </Text>
                <Text style={styles.statBoxSub}>
                  {myPaid.length} invoice{myPaid.length !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
            {myInvoices.length === 0 && (
              <Text style={styles.emptyText}>No invoices submitted yet.</Text>
            )}
            {myInvoices.map((inv) => (
              <MyInvoiceCard
                key={`my-${inv.id}`}
                inv={inv}
                onReceived={() => openConfirm("received", inv)}
                onTap={() => onTapInvoice(inv)}
              />
            ))}
          </>
        )}

        {subTab === "toApprove" && (
          <>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>To Action</Text>
                <Text style={[styles.statBoxNum, { color: Colors.amber }]}>
                  {canSeeToActionAmounts
                    ? `$${toAction.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}`
                    : `${toAction.length} invoice${toAction.length !== 1 ? "s" : ""}`}
                </Text>
                {canSeeToActionAmounts && (
                  <Text style={styles.statBoxSub}>
                    {toAction.length} invoice{toAction.length !== 1 ? "s" : ""}
                  </Text>
                )}
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Completed</Text>
                <Text style={[styles.statBoxNum, { color: Colors.green }]}>
                  {canSeeToActionAmounts
                    ? `$${actionDone.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}`
                    : `${actionDone.length} invoice${actionDone.length !== 1 ? "s" : ""}`}
                </Text>
                {canSeeToActionAmounts && (
                  <Text style={styles.statBoxSub}>
                    {actionDone.length} invoice{actionDone.length !== 1 ? "s" : ""}
                  </Text>
                )}
              </View>
            </View>
            {toAction.length === 0 && <Text style={styles.emptyText}>No invoices to approve.</Text>}
            {toAction.map((inv) => (
              <ApprovalCard
                key={`ap-${inv.id}`}
                inv={inv}
                onApprove={() => openConfirm("approve", inv)}
                onPaid={() => openConfirm("paid", inv)}
                onReject={() => openConfirm("reject", inv)}
                onTap={() => onTapInvoice(inv)}
                showAmount={canSeeAllAmounts || inv.submittedByUserId === userId}
              />
            ))}
          </>
        )}

        {subTab === "allInvoices" && (
          <>
            <View style={styles.statRow}>
              {(
                [
                  [
                    "Total",
                    allInvoices.length,
                    allInvoices.reduce((a, i) => a + (i.amount ?? 0), 0),
                    Colors.textPrimary,
                  ],
                  [
                    "Paid",
                    allPaid.length,
                    allPaid.reduce((a, i) => a + (i.amount ?? 0), 0),
                    Colors.green,
                  ],
                  [
                    "Outstanding",
                    allOut.length,
                    allOut.reduce((a, i) => a + (i.amount ?? 0), 0),
                    Colors.amber,
                  ],
                ] as const
              ).map(([label, count, val, color]) => (
                <View key={label} style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>{label}</Text>
                  <Text style={[styles.statBoxNum, { color, fontSize: 16 }]}>
                    {canSeeAllAmounts
                      ? `$${val.toLocaleString()}`
                      : `${count} invoice${count !== 1 ? "s" : ""}`}
                  </Text>
                  {canSeeAllAmounts && <Text style={styles.statBoxSub}>{count} invoices</Text>}
                </View>
              ))}
            </View>
            {allInvoices.length === 0 && <Text style={styles.emptyText}>No invoices yet.</Text>}
            {allInvoices.map((inv) => {
              const calStatus = apiStatusToCalStatus(inv);
              const showAmt = canSeeAllAmounts || inv.submittedByUserId === userId;
              return (
                <TouchableOpacity
                  key={inv.id}
                  style={[styles.invoiceCard, { borderLeftColor: statusColor(calStatus) }]}
                  onPress={() => onTapInvoice(inv)}
                  activeOpacity={0.85}
                >
                  <View style={styles.invoiceRow}>
                    <Text style={styles.invoiceName}>{inv.submittingParty}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
                        {invoiceStatusLabel(inv.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.invoiceRow}>
                    {showAmt && inv.amount != null && (
                      <Text style={styles.invoiceAmt}>${inv.amount.toLocaleString()}</Text>
                    )}
                    {inv.daysOverdue > 0 && (
                      <Text style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
                        {inv.daysOverdue} days overdue
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
      <ConfirmModal
        visible={confirmAction !== null}
        action={confirmAction}
        invoice={confirmInvoice}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        loading={confirmLoading}
        error={confirmError}
        showAmount={
          confirmInvoice ? canSeeAllAmounts || confirmInvoice.submittedByUserId === userId : true
        }
      />
    </>
  );
}

/* ─── Builder ─── */
function BuilderMySpace({
  invoices,
  userId,
  invoiceAction,
  onTapInvoice,
}: {
  invoices: ApiInvoice[];
  userId: string;
  invoiceAction: (
    action: InvoiceActionType,
    invoiceId: string,
    rejectionReason?: string
  ) => Promise<string | null>;
  onTapInvoice: (inv: ApiInvoice) => void;
}) {
  return (
    <DualRoleMySpace
      invoices={invoices}
      userId={userId}
      approverRole="Builder"
      invoiceAction={invoiceAction}
      onTapInvoice={onTapInvoice}
    />
  );
}

/* ─── Project Manager ─── */
function PMMySpace({
  invoices,
  userId,
  invoiceAction,
  onTapInvoice,
}: {
  invoices: ApiInvoice[];
  userId: string;
  invoiceAction: (
    action: InvoiceActionType,
    invoiceId: string,
    rejectionReason?: string
  ) => Promise<string | null>;
  onTapInvoice: (inv: ApiInvoice) => void;
}) {
  return (
    <DualRoleMySpace
      invoices={invoices}
      userId={userId}
      approverRole="PM"
      invoiceAction={invoiceAction}
      onTapInvoice={onTapInvoice}
    />
  );
}

/* ─── Owner ─── */
function OwnerMySpace({
  invoices,
  userId: _userId,
  invoiceAction,
  onTapInvoice,
}: {
  invoices: ApiInvoice[];
  userId: string;
  invoiceAction: (
    action: InvoiceActionType,
    invoiceId: string,
    rejectionReason?: string
  ) => Promise<string | null>;
  onTapInvoice: (inv: ApiInvoice) => void;
}) {
  const [subTab, setSubTab] = useState<"toApprove" | "allInvoices">("allInvoices");
  const [confirmAction, setConfirmAction] = useState<InvoiceActionType | null>(null);
  const [confirmInvoice, setConfirmInvoice] = useState<ApiInvoice | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function openConfirm(action: InvoiceActionType, inv: ApiInvoice) {
    setConfirmAction(action);
    setConfirmInvoice(inv);
    setConfirmError(null);
  }
  function closeConfirm() {
    setConfirmAction(null);
    setConfirmInvoice(null);
  }
  async function handleConfirm(reason?: string) {
    if (!confirmAction || !confirmInvoice) return;
    setConfirmLoading(true);
    setConfirmError(null);
    const err = await invoiceAction(confirmAction, confirmInvoice.id, reason);
    setConfirmLoading(false);
    if (err) setConfirmError(err);
    else closeConfirm();
  }

  const approvalInvoices = invoices.filter((i) => i.approverRole === "Owner");
  const toAction = approvalInvoices.filter(
    (i) => i.status === "Pending" || i.status === "Approved"
  );
  const paidInvs = invoices.filter((i) => i.status === "Paid" || i.status === "Received");
  const outInvs = invoices.filter(
    (i) => i.status !== "Paid" && i.status !== "Received" && i.status !== "Rejected"
  );

  const OWNER_TABS = [
    { key: "allInvoices" as const, label: "All Invoices" },
    { key: "toApprove" as const, label: "To Action" },
  ];

  return (
    <>
      <View style={styles.innerTabBar}>
        {OWNER_TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.innerTab, subTab === t.key && styles.innerTabActive]}
            onPress={() => setSubTab(t.key)}
          >
            <Text style={[styles.innerTabText, subTab === t.key && styles.innerTabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        {subTab === "toApprove" && (
          <>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>To Action</Text>
                <Text style={[styles.statBoxNum, { color: Colors.amber }]}>
                  ${toAction.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}
                </Text>
                <Text style={styles.statBoxSub}>
                  {toAction.length} invoice{toAction.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>Approved/Paid</Text>
                <Text style={[styles.statBoxNum, { color: Colors.green }]}>
                  $
                  {approvalInvoices
                    .filter((i) => i.status === "Paid" || i.status === "Received")
                    .reduce((a, i) => a + (i.amount ?? 0), 0)
                    .toLocaleString()}
                </Text>
                <Text style={styles.statBoxSub}>
                  {
                    approvalInvoices.filter((i) => i.status === "Paid" || i.status === "Received")
                      .length
                  }{" "}
                  invoices
                </Text>
              </View>
            </View>
            {toAction.length === 0 && (
              <Text style={styles.emptyText}>No invoices awaiting action.</Text>
            )}
            {toAction.map((inv) => (
              <ApprovalCard
                key={`ap-${inv.id}`}
                inv={inv}
                onApprove={() => openConfirm("approve", inv)}
                onPaid={() => openConfirm("paid", inv)}
                onReject={() => openConfirm("reject", inv)}
                onTap={() => onTapInvoice(inv)}
              />
            ))}
          </>
        )}

        {subTab === "allInvoices" && (
          <>
            <View style={styles.statRow}>
              {(
                [
                  [
                    "Total Raised",
                    invoices.length,
                    `$${invoices.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}`,
                    Colors.textPrimary,
                  ],
                  [
                    "Paid",
                    paidInvs.length,
                    `$${paidInvs.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}`,
                    Colors.green,
                  ],
                  [
                    "Outstanding",
                    outInvs.length,
                    `$${outInvs.reduce((a, i) => a + (i.amount ?? 0), 0).toLocaleString()}`,
                    Colors.amber,
                  ],
                ] as const
              ).map(([label, count, val, color]) => (
                <View key={label} style={styles.statBox}>
                  <Text style={styles.statBoxLabel}>{label}</Text>
                  <Text style={[styles.statBoxNum, { color, fontSize: 16 }]}>{val}</Text>
                  <Text style={styles.statBoxSub}>{count} invoices</Text>
                </View>
              ))}
            </View>
            {invoices.length === 0 && <Text style={styles.emptyText}>No invoices yet.</Text>}
            {invoices.map((inv) => {
              const calStatus = apiStatusToCalStatus(inv);
              return (
                <TouchableOpacity
                  key={inv.id}
                  style={[styles.invoiceCard, { borderLeftColor: statusColor(calStatus) }]}
                  onPress={() => onTapInvoice(inv)}
                  activeOpacity={0.85}
                >
                  <View style={styles.invoiceRow}>
                    <Text style={styles.invoiceName}>{inv.submittingParty}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
                      <Text style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
                        {invoiceStatusLabel(inv.status)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.invoiceRow}>
                    {inv.amount != null && (
                      <Text style={styles.invoiceAmt}>${inv.amount.toLocaleString()}</Text>
                    )}
                    {inv.daysOverdue > 0 && (
                      <Text style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
                        {inv.daysOverdue} days overdue
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>
      <ConfirmModal
        visible={confirmAction !== null}
        action={confirmAction}
        invoice={confirmInvoice}
        onClose={closeConfirm}
        onConfirm={handleConfirm}
        loading={confirmLoading}
        error={confirmError}
      />
    </>
  );
}

/* ─── Financier / VIP — read-only, full amounts ─── */
function FinancierMySpace({
  invoices,
  onTapInvoice,
}: {
  invoices: ApiInvoice[];
  onTapInvoice: (inv: ApiInvoice) => void;
}) {
  const paidInvs = invoices.filter((i) => i.status === "Paid" || i.status === "Received");
  const outInvs = invoices.filter(
    (i) => i.status !== "Paid" && i.status !== "Received" && i.status !== "Rejected"
  );
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
        {(
          [
            ["Total Raised", invoices.length, `$${valTotal.toLocaleString()}`, Colors.textPrimary],
            ["Paid", paidInvs.length, `$${valPaid.toLocaleString()}`, Colors.green],
            ["Outstanding", outInvs.length, `$${valOut.toLocaleString()}`, Colors.amber],
          ] as const
        ).map(([label, count, val, color]) => (
          <View key={label} style={styles.statBox}>
            <Text style={styles.statBoxLabel}>{label}</Text>
            <Text style={[styles.statBoxNum, { color, fontSize: 18 }]}>{val}</Text>
            <Text style={styles.statBoxSub}>{count} invoices</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>ALL INVOICES</Text>
      {invoices.length === 0 && <Text style={styles.emptyText}>No invoices yet.</Text>}
      {invoices.map((inv) => {
        const calStatus = apiStatusToCalStatus(inv);
        return (
          <TouchableOpacity
            key={inv.id}
            style={[styles.invoiceCard, { borderLeftColor: statusColor(calStatus) }]}
            onPress={() => onTapInvoice(inv)}
            activeOpacity={0.85}
          >
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceName}>{inv.submittingParty}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
                <Text style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
                  {invoiceStatusLabel(inv.status)}
                </Text>
              </View>
            </View>
            <View style={styles.invoiceRow}>
              {inv.amount != null && (
                <Text style={styles.invoiceAmt}>${inv.amount.toLocaleString()}</Text>
              )}
              {inv.daysOverdue > 0 && (
                <Text style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
                  {inv.daysOverdue} days overdue
                </Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

/* ─── Observer — read-only, no amounts ─── */
function ObserverMySpace({
  invoices,
  onTapInvoice,
}: {
  invoices: ApiInvoice[];
  onTapInvoice: (inv: ApiInvoice) => void;
}) {
  const pendingCount = invoices.filter((i) => i.status === "Pending").length;
  const overdueCount = invoices.filter(
    (i) =>
      i.daysOverdue > 0 && i.status !== "Paid" && i.status !== "Received" && i.status !== "Rejected"
  ).length;
  const paidCount = invoices.filter((i) => i.status === "Paid" || i.status === "Received").length;

  return (
    <ScrollView
      style={styles.body}
      contentContainerStyle={styles.bodyContent}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.statRow}>
        {(
          [
            ["Total", invoices.length, Colors.textPrimary],
            ["Overdue", overdueCount, Colors.red],
            ["Pending", pendingCount, Colors.purple],
            ["Paid", paidCount, Colors.green],
          ] as const
        ).map(([label, count, color]) => (
          <View key={label} style={styles.statBox}>
            <Text style={styles.statBoxLabel}>{label}</Text>
            <Text style={[styles.statBoxNum, { color, fontSize: 22 }]}>{count}</Text>
            <Text style={styles.statBoxSub}>invoices</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionLabel}>ALL INVOICES</Text>
      {invoices.length === 0 && <Text style={styles.emptyText}>No invoices yet.</Text>}
      {invoices.map((inv) => {
        const calStatus = apiStatusToCalStatus(inv);
        return (
          <TouchableOpacity
            key={inv.id}
            style={[styles.invoiceCard, { borderLeftColor: statusColor(calStatus) }]}
            onPress={() => onTapInvoice(inv)}
            activeOpacity={0.85}
          >
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceName}>{inv.submittingParty}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusBg(calStatus) }]}>
                <Text style={[styles.statusBadgeText, { color: statusColor(calStatus) }]}>
                  {invoiceStatusLabel(inv.status)}
                </Text>
              </View>
            </View>
            <View style={styles.invoiceRow}>
              <Text style={styles.invoiceDate}>
                Due: {new Date(inv.dateDue).toLocaleDateString("en-AU")}
              </Text>
              {inv.daysOverdue > 0 && (
                <Text style={[styles.invoiceDays, { color: statusColor(calStatus) }]}>
                  {inv.daysOverdue} days overdue
                </Text>
              )}
            </View>
          </TouchableOpacity>
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
  calendarWidget: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
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
    paddingHorizontal: 18,
    paddingVertical: 6,
    alignSelf: "flex-end",
    marginTop: 8,
  },
  confirmBtnText: { fontSize: 12, fontWeight: "700", color: Colors.white },

  // Builder
  actionRow: { flexDirection: "row", gap: 8, marginTop: 8, justifyContent: "flex-end" },
  actionBtn: {
    height: 34,
    borderRadius: 8,
    paddingHorizontal: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { fontSize: 12, fontWeight: "700", color: Colors.white },

  sectionDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.08)",
    marginVertical: 20,
  },

  // Confirm modal
  confirmOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  confirmBox: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    width: "100%",
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  confirmInvDesc: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  confirmInvAmt: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  confirmFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  confirmReasonInput: {
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 16,
    minHeight: 64,
  },
  confirmHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  confirmTypeInput: {
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.12)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  confirmError: {
    fontSize: 13,
    color: Colors.red,
    marginBottom: 12,
  },
  confirmBtnRow: {
    flexDirection: "row",
    gap: 10,
  },
  confirmCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  confirmActionBtn: {
    flex: 2,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmActionText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },

  // Placeholder
  placeholder: { flex: 1, alignItems: "center", justifyContent: "center" },
  placeholderText: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: "center", marginTop: 16 },
  placeholderSub: { fontSize: 14, color: Colors.textSecondary },

  // Inner sub-tab bar (inside role views)
  innerTabBar: {
    flexDirection: "row",
    backgroundColor: Colors.offWhite,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.07)",
  },
  innerTab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  innerTabActive: { borderBottomColor: Colors.navy },
  innerTabText: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  innerTabTextActive: { color: Colors.navy },

  // FAB wrap + menu
  fabWrap: { position: "absolute", bottom: 80, right: 20, alignItems: "flex-end" },
  fabMenu: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    overflow: "hidden",
  },
  fabMenuItem: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  fabMenuText: { fontSize: 15, fontWeight: "600", color: Colors.navy },
  fabActive: { backgroundColor: Colors.navy },

  // Floating action button
  fab: {
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

  // Invoice Detail Modal
  detailScreen: { flex: 1, backgroundColor: Colors.offWhite },
  detailHeader: { paddingBottom: 20 },
  detailBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 8,
  },
  detailBackArrow: { fontSize: 20, color: "rgba(255,255,255,0.5)" },
  detailBackLabel: { fontSize: 13, color: "rgba(255,255,255,0.5)", fontWeight: "500" },
  detailTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.white,
    textAlign: "center",
    marginTop: 4,
  },
  detailBody: { flex: 1 },
  detailBodyContent: { padding: 20, paddingBottom: 48 },
  detailDesc: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.navy,
    marginBottom: 20,
    lineHeight: 26,
  },
  detailSection: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  detailSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.offWhite,
  },
  detailKey: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  detailVal: { fontSize: 13, color: Colors.textPrimary, flex: 2, textAlign: "right" },
  detailActionBtn: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 2,
  },
  detailActionBtnText: { fontSize: 15, fontWeight: "700", color: Colors.white },
});
