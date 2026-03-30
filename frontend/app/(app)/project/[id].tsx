import React, { useState, useEffect } from "react";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import * as Clipboard from "expo-clipboard";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
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
import {
  ApiInvoice,
  InvoiceActionType,
  INVITE_ROLES,
  InviteRole,
  INVOICE_UPLOADER_ROLES,
  ROLE_API,
} from "@/components/project/types";
import { styles } from "@/components/project/styles";
import { displayRole } from "@/components/project/helpers";
import { CalendarTab } from "@/components/project/CalendarTab";
import { MySpaceTab } from "@/components/project/MySpaceTab";

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

          {role !== "Member" && (
            <View style={styles.headerRolePillWrap}>
              <View style={styles.headerRolePill}>
                <Text style={styles.headerRolePillText}>{displayRole(role)}</Text>
              </View>
            </View>
          )}

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
        <MySpaceTab
          role={role}
          invoices={invoices}
          userId={userId}
          invoiceAction={invoiceAction}
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
                <TouchableOpacity
                  onPress={() => setInvoiceVisible(false)}
                  style={styles.raiseBack}
                >
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
