import { API_BASE_URL } from "@/constants/api";
import React, { useState, useCallback, useEffect, useRef } from "react";
import * as Clipboard from "expo-clipboard";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { HEADER_HIT_SLOP } from "@/constants/touch";
import CircularProgress from "@/components/CircularProgress";
import { useAuth } from "@/context/AuthContext";
import { AppText } from "@/components/AppText";
import {
  ApiInvoice,
  InvoiceActionType,
  INVITE_ROLES,
  InviteRole,
  INVOICE_UPLOADER_ROLES,
  ROLE_API,
  Participant,
} from "@/components/project/types";
import { styles } from "@/components/project/styles";
import { displayRole } from "@/components/project/helpers";
import { CalendarTab } from "@/components/project/CalendarTab";
import { MySpaceTab } from "@/components/project/MySpaceTab";
import { MembersModal } from "@/components/project/MembersModal";

export default function ProjectDetail() {
  const params = useLocalSearchParams<{ id: string; name: string; openInvoice?: string }>();
  const id = params.id ?? "";
  const nameParam = params.name ?? "Project";
  const openInvoiceId = params.openInvoice;

  const { fetchWithAuth, user } = useAuth();
  const userId = user?.id ?? "";
  const [activeTab, setActiveTab] = useState<"calendar" | "myspace">("calendar");

  const [projectName, setProjectName] = useState(nameParam);
  const [projectLocation, setProjectLocation] = useState("");
  const [projectCouncil, setProjectCouncil] = useState("");
  const [projectDaNumber, setProjectDaNumber] = useState<string | undefined>(undefined);
  const [health, setHealth] = useState(0);
  const [overdue, setOverdue] = useState(0);
  const [change, setChange] = useState<number | null>(null);
  const [role, setRole] = useState("Member");
  const [invoices, setInvoices] = useState<ApiInvoice[]>([]);
  const [pendingInvoice, setPendingInvoice] = useState<ApiInvoice | null>(null);
  const isInvoiceUploader = INVOICE_UPLOADER_ROLES.includes(role);

  // ── Raise Invoice state ──
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [invDesc, setInvDesc] = useState("");
  const [invAmount, setInvAmount] = useState("");
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

  // ── Participants ──
  const [participants, setParticipants] = useState<Participant[]>([]);

  // ── Kebab + Members state ──
  const [kebabVisible, setKebabVisible] = useState(false);
  const [membersVisible, setMembersVisible] = useState(false);
  const [menuTop, setMenuTop] = useState(80);
  const kebabRef = useRef<View>(null);

  // ── FAB menu state ──
  const [fabMenuVisible, setFabMenuVisible] = useState(false);

  // ── Scroll ref (for resetting position on tab switch) ──
  const scrollRef = useRef<ScrollView>(null);

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail.trim())) {
      setInviteError("Please enter a valid email address.");
      return;
    }
    setInviteLoading(true);
    setInviteError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/project/${id}/invite`, {
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
        setInviteCode(data.inviteCode);
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
      const res = await fetchWithAuth(`${API_BASE_URL}/project/${id}/invoice`, {
        method: "POST",
        body: JSON.stringify({
          submittingParty: invSubmittingParty.trim(),
          submittingCategory: invCategory.trim(),
          description: invDesc.trim(),
          amount: parseFloat(invAmount),
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
  const [refreshing, setRefreshing] = useState(false);

  async function loadProject(clearFirst = false) {
    if (!id) return;
    if (clearFirst) {
      setDataLoading(true);
      setProjectName(nameParam);
      setHealth(0);
      setOverdue(0);
      setChange(null);
      setRole("Member");
      setInvoices([]);
      setParticipants([]);
    }
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/project/${id}`);
      const data = await res.json();
      if (res.ok) {
        setProjectName(data.project?.name ?? nameParam);
        setProjectLocation(data.project?.location ?? "");
        setProjectCouncil(data.project?.council ?? "");
        setProjectDaNumber(data.project?.daNumber);
        setHealth(data.healthScore ?? 0);
        setOverdue(data.overdueInvoiceCount ?? 0);
        setChange(data.monthOnMonthHealthChangePct ?? null);
        setRole(data.userRole ?? "Member");
        setInvoices(data.invoices ?? []);
        setParticipants(data.participants ?? []);
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
        `${API_BASE_URL}/project/${id}/invoice/${invoiceId}/${action}`,
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

  useFocusEffect(
    useCallback(() => {
      setPendingInvoice(null);
      loadProject(true).finally(() => setDataLoading(false));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  useEffect(() => {
    if (openInvoiceId && invoices.length > 0 && !dataLoading) {
      const inv = invoices.find((i) => i.id === openInvoiceId) ?? null;
      if (inv) {
        setPendingInvoice(inv);
        setActiveTab("myspace");
      }
    }
  }, [invoices, openInvoiceId, dataLoading]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadProject();
    setRefreshing(false);
  }

  return (
    <View style={styles.screen}>
      {/* Fixed top nav bar */}
      <View style={{ backgroundColor: Colors.vouchGreen }}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              onPress={() => router.replace("/(app)/projects" as any)}
              style={styles.backBtn}
              hitSlop={HEADER_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Back to all projects"
            >
              <Ionicons name="arrow-back" size={20} color={Colors.white} />
              <AppText style={styles.backLabel}>All Projects</AppText>
            </TouchableOpacity>
            <TouchableOpacity
              ref={kebabRef}
              style={styles.kebabBtn}
              hitSlop={HEADER_HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Project menu"
              onPress={() => {
                kebabRef.current?.measure((_x, _y, _w, h, _px, py) => {
                  setMenuTop(py + h + 4);
                });
                setKebabVisible(true);
              }}
            >
              <Ionicons name="ellipsis-vertical" size={22} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
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
            <AppText style={styles.headerProjectName}>{projectName}</AppText>

            {role !== "Member" && (
              <View style={styles.headerRolePillWrap}>
                <View style={styles.headerRolePill}>
                  <AppText style={styles.headerRolePillText}>{displayRole(role)}</AppText>
                </View>
              </View>
            )}

            <View style={styles.healthWrap}>
              {dataLoading ? (
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
                <AppText style={styles.overdueAlertText}>
                  {overdue} {overdue === 1 ? "invoice" : "invoices"} overdue
                </AppText>
              </View>
            )}
          </View>

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
              initialInvoice={pendingInvoice}
              onInitialInvoiceOpened={() => setPendingInvoice(null)}
            />
          )}
        </ScrollView>
      </View>

      {/* Fixed bottom tab bar */}
      <View style={styles.subTabBar}>
        {(["calendar", "myspace"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.subTab, activeTab === t && styles.subTabActive]}
            onPress={() => {
              setActiveTab(t);
              scrollRef.current?.scrollTo({ y: 0, animated: false });
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons
                name={t === "calendar" ? "calendar-outline" : "person-outline"}
                size={16}
                color={activeTab === t ? Colors.white : "rgba(255,255,255,0.4)"}
              />
              <AppText style={[styles.subTabText, activeTab === t && styles.subTabTextActive]}>
                {t === "calendar" ? "Calendar" : "My Space"}
              </AppText>
            </View>
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
                <AppText style={styles.fabMenuText}>Raise Invoice</AppText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.fabMenuItem} onPress={openInvite}>
                <AppText style={styles.fabMenuText}>Invite Team Member</AppText>
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
            <Ionicons name={fabMenuVisible ? "close" : "add"} size={28} color={Colors.white} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Kebab menu ── */}
      <Modal visible={kebabVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.kebabOverlay}
          activeOpacity={1}
          onPress={() => setKebabVisible(false)}
        >
          <View style={[styles.kebabMenu, { top: menuTop }]}>
            <TouchableOpacity
              style={styles.kebabMenuItem}
              onPress={() => {
                setKebabVisible(false);
                router.push(
                  `/(app)/project/audit-log/${id}?name=${encodeURIComponent(projectName)}` as any
                );
              }}
            >
              <AppText style={styles.kebabMenuItemText}>Audit Log</AppText>
            </TouchableOpacity>
            <View style={styles.kebabMenuDivider} />
            <TouchableOpacity
              style={styles.kebabMenuItem}
              onPress={() => {
                setKebabVisible(false);
                setMembersVisible(true);
              }}
            >
              <AppText style={styles.kebabMenuItemText}>Project Information</AppText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── Members modal ── */}
      <MembersModal
        visible={membersVisible}
        participants={participants}
        projectInfo={{
          name: projectName,
          location: projectLocation,
          council: projectCouncil,
          daNumber: projectDaNumber,
        }}
        onClose={() => setMembersVisible(false)}
      />

      {/* ── Raise Invoice modal ── */}
      <Modal visible={invoiceVisible} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView
          style={{ flex: 1, backgroundColor: Colors.grey100 }}
          edges={["top", "bottom"]}
        >
          {invoiceSuccess ? (
            <View style={{ flex: 1, justifyContent: "space-between", paddingHorizontal: 24 }}>
              <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16 }}>
                <View style={styles.inviteSuccessIcon}>
                  <Ionicons name="checkmark" size={32} color={Colors.white} />
                </View>
                <AppText style={[styles.inviteSuccessTitle, { fontSize: 26 }]}>
                  Invoice Submitted!
                </AppText>
                <AppText style={styles.inviteSuccessHint}>
                  Your invoice has been submitted successfully.
                </AppText>
              </View>
              <TouchableOpacity
                style={[styles.invitePrimaryBtn, { marginBottom: 16 }]}
                onPress={() => setInvoiceVisible(false)}
              >
                <AppText style={styles.invitePrimaryBtnText}>Done</AppText>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.raiseFixedHeader}>
                <TouchableOpacity
                  onPress={() => setInvoiceVisible(false)}
                  style={styles.raiseBack}
                  hitSlop={HEADER_HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="arrow-back" size={24} color={Colors.black} />
                </TouchableOpacity>
                <AppText style={styles.raiseTitle}>Raise Invoice</AppText>
                <AppText style={styles.raiseSubtitle}>{projectName}</AppText>
              </View>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
                style={styles.raiseKeyboardView}
              >
              <ScrollView
                style={styles.raiseScroll}
                contentContainerStyle={styles.raiseBody}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
              >

                <AppText style={styles.raiseFieldLabel}>Amount ($)</AppText>
                <TextInput
                  style={styles.raiseInput}
                  placeholder="e.g. 45000"
                  placeholderTextColor={Colors.grey300}
                  value={invAmount}
                  onChangeText={setInvAmount}
                  keyboardType="numeric"
                />

                <AppText style={styles.raiseFieldLabel}>Description</AppText>
                <TextInput
                  style={[styles.raiseInput, styles.raiseMultiline]}
                  placeholder="e.g. Electrical rough-in — Level 3"
                  placeholderTextColor={Colors.grey300}
                  value={invDesc}
                  onChangeText={setInvDesc}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <AppText style={styles.raiseFieldLabel}>Submitting Party</AppText>
                <TextInput
                  style={styles.raiseInput}
                  placeholder="e.g. ABC Electrical"
                  placeholderTextColor={Colors.grey300}
                  value={invSubmittingParty}
                  onChangeText={setInvSubmittingParty}
                />

                <AppText style={styles.raiseFieldLabel}>Category</AppText>
                <TextInput
                  style={styles.raiseInput}
                  placeholder="e.g. Electrical, Plumbing"
                  placeholderTextColor={Colors.grey300}
                  value={invCategory}
                  onChangeText={setInvCategory}
                />

                {invoiceError && <AppText style={styles.inviteError}>{invoiceError}</AppText>}

                <TouchableOpacity
                  style={styles.raisePrimaryBtn}
                  onPress={handleAddInvoice}
                  disabled={invoiceLoading}
                >
                  {invoiceLoading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <AppText style={styles.raisePrimaryBtnText}>Submit Invoice</AppText>
                  )}
                </TouchableOpacity>
              </ScrollView>
              </KeyboardAvoidingView>
            </>
          )}
        </SafeAreaView>
      </Modal>

      {/* ── Invite modal ── */}
      <Modal visible={inviteVisible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.inviteScreen}>
          <SafeAreaView edges={["top"]} style={{ backgroundColor: Colors.vouchGreen }}>
            <View style={styles.inviteHeader}>
              <TouchableOpacity
                onPress={() => setInviteVisible(false)}
                style={styles.inviteBackBtn}
                hitSlop={HEADER_HIT_SLOP}
                accessibilityRole="button"
                accessibilityLabel="Close invite"
              >
                <Ionicons name="arrow-back" size={20} color={Colors.white} />
                <AppText style={styles.inviteBackLabel}>My Space</AppText>
              </TouchableOpacity>
              <AppText style={styles.inviteTitle}>
                {inviteCode ? "Invite Sent" : "Invite Team Member"}
              </AppText>
            </View>
          </SafeAreaView>
          <ScrollView
            style={styles.inviteBody}
            contentContainerStyle={styles.inviteBodyContent}
            showsVerticalScrollIndicator={false}
          >
            {inviteCode ? (
              <View style={styles.inviteSuccess}>
                <View style={styles.inviteSuccessIcon}>
                  <Ionicons name="checkmark" size={32} color={Colors.white} />
                </View>
                <AppText style={styles.inviteSuccessTitle}>Invite Sent!</AppText>
                <AppText style={styles.inviteSuccessHint}>
                  Share this code with {inviteEmail}:
                </AppText>
                <View style={styles.inviteCodeBox}>
                  <AppText style={styles.inviteCodeText}>{inviteCode}</AppText>
                </View>
                <TouchableOpacity
                  style={styles.copyBtn}
                  onPress={async () => {
                    await Clipboard.setStringAsync(inviteCode!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                >
                  <AppText style={styles.copyBtnText}>{copied ? "✓ Copied!" : "Copy Code"}</AppText>
                </TouchableOpacity>
                <AppText style={styles.inviteCodeNote}>
                  The invitee will use this code to join the project.
                </AppText>
                <TouchableOpacity
                  style={[styles.invitePrimaryBtn, { alignSelf: "stretch", marginTop: 32 }]}
                  onPress={() => setInviteVisible(false)}
                >
                  <AppText style={styles.invitePrimaryBtnText}>Done</AppText>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <AppText style={styles.inviteFieldLabel}>Email</AppText>
                <TextInput
                  style={styles.inviteInput}
                  placeholder="name@company.com"
                  placeholderTextColor={Colors.grey300}
                  value={inviteEmail}
                  onChangeText={setInviteEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <AppText style={styles.inviteFieldLabel}>Role</AppText>
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
                      <AppText
                        style={[
                          styles.inviteRoleChipText,
                          inviteRole === r && styles.inviteRoleChipTextActive,
                        ]}
                      >
                        {r}
                      </AppText>
                    </TouchableOpacity>
                  ))}
                </View>
                <AppText style={styles.inviteFieldLabel}>Trade</AppText>
                <TextInput
                  style={styles.inviteInput}
                  placeholder="e.g. Electrical, Plumbing"
                  placeholderTextColor={Colors.grey300}
                  value={inviteTrade}
                  onChangeText={setInviteTrade}
                />
                {inviteError && <AppText style={styles.inviteError}>{inviteError}</AppText>}
                <TouchableOpacity
                  style={[styles.invitePrimaryBtn, { marginTop: 8 }]}
                  onPress={handleInvite}
                  disabled={inviteLoading}
                >
                  {inviteLoading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <AppText style={styles.invitePrimaryBtnText}>Send Invite</AppText>
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
