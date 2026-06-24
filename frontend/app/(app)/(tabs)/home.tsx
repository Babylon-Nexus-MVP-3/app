import {
  Alert,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

type WizardDraft = {
  step1: { name: string; abn: string; trade: string; idNumber: string };
  step2: {
    currentProjectName: string;
    suburb: string;
    state: string;
    pastProjectName: string;
    pastSuburb: string;
    pastState: string;
  };
  references: { name: string; company: string; mobile: string; relationship: string }[];
};

type SentRequest = {
  _id: string;
  toMobile: string;
  toEmail?: string;
  relationship: string;
  projectName: string;
  status: "pending" | "responded";
  createdAt: string;
};

function computeStrength(
  user: { name?: string; abn?: string; businessTrade?: string } | null,
  draft: WizardDraft | null,
  respondedCount: number
): number {
  const s1 = draft?.step1;
  const s2 = draft?.step2;
  const step1Done =
    !!(user?.name && user?.abn && (user?.businessTrade || s1?.trade)) ||
    !!(s1?.name && s1?.abn && s1?.trade);
  const step2Done = !!(s2?.currentProjectName && s2?.suburb && s2?.state);
  // Steps 3/4 only count once a vouch is actually confirmed (responded),
  // not just requested — a sent-but-unanswered reference shouldn't count
  // toward profile strength.
  const step5Done = !!(s2?.pastProjectName && s2?.pastSuburb && s2?.pastState);
  const step6Done = !!s1?.idNumber;
  let pct = 0;
  if (step1Done) pct += 20;
  if (step2Done) pct += 15;
  if (respondedCount >= 1) pct += 20;
  if (respondedCount >= 2) pct += 20;
  if (step5Done) pct += 15;
  if (step6Done) pct += 10;
  return pct;
}

function StrengthBar({ pct }: { pct: number }) {
  const color = pct >= 80 ? Colors.vouchGreen : pct >= 40 ? Colors.amber : Colors.red;
  return (
    <View style={sb.wrap}>
      <View style={sb.row}>
        <AppText style={sb.label}>Profile strength</AppText>
        <AppText style={[sb.pct, { color }]}>{pct}%</AppText>
      </View>
      <View style={sb.track}>
        <View style={[sb.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      {pct < 100 && (
        <AppText style={sb.hint}>
          {pct === 0
            ? "Complete your profile to unlock all features."
            : pct < 60
              ? "Keep going — add vouches to strengthen your profile."
              : "Almost there! Verify your ID for 100%."}
        </AppText>
      )}
    </View>
  );
}

const sb = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.black },
  pct: { fontSize: 13, fontFamily: Fonts.bold },
  track: {
    height: 6,
    backgroundColor: Colors.grey300,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  fill: { height: 6, borderRadius: 3 },
  hint: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.grey500 },
});

export default function HomeScreen() {
  const { user, fetchWithAuth } = useAuth();
  const insets = useSafeAreaInsets();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [respondedCount, setRespondedCount] = useState(0);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [wizardDraft, setWizardDraft] = useState<WizardDraft | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [vouchRes, notifRes, sentRes, raw] = await Promise.all([
        fetchWithAuth(`${API_BASE_URL}/vouch/pending-requests`),
        fetchWithAuth(`${API_BASE_URL}/vouch/notifications`),
        fetchWithAuth(`${API_BASE_URL}/vouch/requests/sent`),
        AsyncStorage.getItem(`wizard_draft_${user?.id ?? "anon"}`),
      ]);
      const vouchData = await vouchRes.json();
      const notifData = await notifRes.json();
      const sentData = sentRes.ok ? await sentRes.json() : null;

      setPendingCount(vouchData.requests?.length ?? 0);
      setUnreadCount(
        (notifData.notifications ?? []).filter((n: { read: boolean }) => !n.read).length
      );
      const requests: SentRequest[] = sentData?.requests ?? [];
      setSentRequests(requests);
      setRespondedCount(requests.filter((r) => r.status === "responded").length);
      if (raw) setWizardDraft(JSON.parse(raw));
    } catch {}
  }, [fetchWithAuth, user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  const strength = computeStrength(user, wizardDraft, respondedCount);
  const pendingSentCount = sentRequests.filter((r) => r.status === "pending").length;
  const step1Done =
    !!(user?.name && user?.abn && (user?.businessTrade || wizardDraft?.step1?.trade)) ||
    !!(wizardDraft?.step1?.name && wizardDraft?.step1?.abn && wizardDraft?.step1?.trade);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.vouchGreen}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <AppText style={styles.logo}>VOUCHPAY</AppText>
          <TouchableOpacity hitSlop={8} onPress={() => router.push("/(app)/vouch-notifications")}>
            <View>
              <Ionicons name="notifications-outline" size={24} color={Colors.vouchGreen} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <AppText style={styles.bellBadgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </AppText>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <View style={styles.greetingSection}>
          <View style={styles.greetingRow}>
            <AppText style={styles.greeting}>{`G'day, ${firstName}.`}</AppText>
            {strength === 100 && (
              <Ionicons name="shield-checkmark" size={30} color={Colors.vouchGreen} />
            )}
          </View>
          <AppText style={styles.subtitle}>
            {strength === 100 ? "Profile fully verified." : "What do you want to do today?"}
          </AppText>
        </View>

        {/* Profile Strength — hidden once fully complete */}
        {strength < 100 && <StrengthBar pct={strength} />}

        {/* 2x2 Card Grid */}
        <View style={styles.grid}>
          {/* Request a Vouch — view pending requests / send new ones */}
          <TouchableOpacity
            style={[styles.card, styles.cardDefault]}
            activeOpacity={0.7}
            onPress={() => setRequestModalVisible(true)}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="person-add-outline" size={26} color={Colors.black} />
              {pendingSentCount > 0 && (
                <View style={styles.dotBadge}>
                  <AppText style={styles.dotBadgeText}>{pendingSentCount}</AppText>
                </View>
              )}
            </View>
            <AppText style={styles.cardTitle}>Request a Vouch</AppText>
            <AppText style={styles.cardDesc}>
              {sentRequests.length === 0 ? "Ask someone to vouch" : "View status"}
            </AppText>
          </TouchableOpacity>

          {/* Give a Vouch — locked until 1 vouch received */}
          <TouchableOpacity
            style={[styles.card, respondedCount >= 1 ? styles.cardDefault : styles.cardLocked]}
            activeOpacity={0.7}
            onPress={() => {
              if (respondedCount >= 1) {
                router.push("/(app)/give-vouch");
              } else {
                Alert.alert(
                  "1 Vouch Required",
                  "You need at least 1 person to vouch for you before you can vouch for others. Head to Build your profile to request your first vouch.",
                  [{ text: "Got it" }]
                );
              }
            }}
          >
            <View style={styles.cardIcon}>
              <Ionicons
                name="person-outline"
                size={26}
                color={respondedCount >= 1 ? Colors.black : Colors.grey500}
              />
              {pendingCount > 0 && respondedCount >= 1 && (
                <View style={styles.dotBadge}>
                  <AppText style={styles.dotBadgeText}>{pendingCount}</AppText>
                </View>
              )}
            </View>
            <AppText style={[styles.cardTitle, respondedCount < 1 && styles.cardTitleLocked]}>
              Give a Vouch
            </AppText>
            <AppText style={styles.cardDesc}>
              {respondedCount >= 1 ? "Vouch for others" : "Needs 1 vouch"}
            </AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {/* Build your profile */}
          <TouchableOpacity
            style={[styles.card, styles.cardGetVouched]}
            activeOpacity={0.7}
            onPress={() => router.push("/(app)/get-vouched")}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="shield-checkmark-outline" size={26} color={Colors.vouchGreen} />
            </View>
            <AppText style={styles.cardTitle}>Build your profile</AppText>
            <AppText style={styles.cardDesc}>Get vouched</AppText>
          </TouchableOpacity>

          {/* Join a Project */}
          <TouchableOpacity
            style={[styles.card, styles.cardDefault]}
            activeOpacity={0.7}
            onPress={() => router.push("/(app)/join-project")}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="enter-outline" size={26} color={Colors.black} />
            </View>
            <AppText style={styles.cardTitle}>Join a Project</AppText>
            <AppText style={styles.cardDesc}>Enter invite code</AppText>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {/* Create my Project */}
          <TouchableOpacity
            style={[styles.card, strength === 100 ? styles.cardDefault : styles.cardLocked]}
            activeOpacity={0.7}
            onPress={() => router.push("/(app)/(tabs)/vouch-my-project")}
          >
            <View style={styles.cardIcon}>
              <Ionicons
                name="sync-circle-outline"
                size={26}
                color={strength === 100 ? Colors.black : Colors.grey500}
              />
            </View>
            <AppText style={[styles.cardTitle, strength < 100 && styles.cardTitleLocked]}>
              Create my Project
            </AppText>
            <AppText style={styles.cardDesc}>
              {strength === 100 ? "Set up your project" : "Complete profile first"}
            </AppText>
          </TouchableOpacity>

          {/* Apply for supplier credit — locked */}
          <TouchableOpacity
            style={[styles.card, styles.cardLocked]}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert(
                "Supplier Credit",
                "Supplier Credit will unlock as your trust signals grow. Keep building your profile on VouchPay.",
                [{ text: "Got it" }]
              )
            }
          >
            <View style={styles.cardIcon}>
              <Ionicons name="card-outline" size={26} color={Colors.grey500} />
            </View>
            <AppText style={[styles.cardTitle, styles.cardTitleLocked]}>
              Apply for supplier credit
            </AppText>
            <AppText style={styles.cardDesc}>Submit using your profile</AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={requestModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setRequestModalVisible(false)}
      >
        <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity hitSlop={8} onPress={() => setRequestModalVisible(false)}>
              <Ionicons name="arrow-back" size={24} color={Colors.black} />
            </TouchableOpacity>
            <AppText style={styles.headerTitle}>VOUCH REQUESTS</AppText>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <View
              style={[
                styles.modalIconCircle,
                respondedCount >= 1 ? styles.modalIconCircleGreen : styles.modalIconCircleAmber,
              ]}
            >
              <Ionicons
                name={respondedCount >= 1 ? "shield-checkmark-outline" : "person-add-outline"}
                size={36}
                color={respondedCount >= 1 ? Colors.vouchGreen : Colors.amber}
              />
            </View>
            <AppText style={styles.modalTitle}>
              {sentRequests.length === 0
                ? "No requests yet"
                : `${respondedCount} of ${sentRequests.length} vouched`}
            </AppText>
            <AppText style={styles.modalSubtitle}>
              {sentRequests.length === 0
                ? "Ask people you've worked with to vouch for you."
                : respondedCount === sentRequests.length
                  ? "Everyone has responded."
                  : "Waiting on the rest to respond."}
            </AppText>

            {sentRequests.length > 0 && (
              <View style={styles.modalListSection}>
                <AppText style={styles.sectionLabel}>YOUR REQUESTS</AppText>
                {sentRequests.map((r) => {
                  const done = r.status === "responded";
                  return (
                    <View key={r._id} style={styles.requestCard}>
                      <View style={[styles.dot, done ? styles.dotDone : styles.dotPending]} />
                      <View style={{ flex: 1 }}>
                        <AppText style={styles.requestContact}>{r.toEmail || r.toMobile}</AppText>
                        <AppText style={styles.requestMeta}>
                          {[r.relationship, r.projectName].filter(Boolean).join(" · ")}
                        </AppText>
                      </View>
                      <View style={[styles.badge, done ? styles.badgeDone : styles.badgePending]}>
                        <AppText
                          style={[
                            styles.badgeText,
                            done ? styles.badgeTextDone : styles.badgeTextPending,
                          ]}
                        >
                          {done ? "Vouched" : "Pending"}
                        </AppText>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              style={styles.addRefBtn}
              activeOpacity={0.8}
              onPress={() => {
                if (!step1Done) {
                  Alert.alert(
                    "Complete your profile first",
                    "Please complete Step 1 of Build your Profile before requesting a vouch."
                  );
                  return;
                }
                setRequestModalVisible(false);
                router.push("/(app)/get-vouched/step3?fresh=true" as any);
              }}
            >
              <Ionicons name="person-add-outline" size={16} color={Colors.vouchGreen} />
              <AppText style={styles.addRefBtnText}>
                {sentRequests.length === 0 ? "Request a vouch" : "Request another vouch"}
              </AppText>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scroll: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  logo: {
    fontSize: 26,
    fontFamily: Fonts.extraBold,
    color: Colors.vouchGreen,
    letterSpacing: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
    letterSpacing: 1,
  },
  greetingSection: {
    marginBottom: 20,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 36,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 14,
  },
  card: {
    width: "47%",
    borderRadius: 16,
    padding: 18,
    gap: 8,
    minHeight: 130,
  },
  cardGetVouched: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
  },
  cardDefault: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.grey300,
  },
  cardLocked: {
    backgroundColor: Colors.beige,
  },
  cardIcon: {
    marginBottom: 4,
  },
  dotBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.red,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  dotBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  cardTitleLocked: {
    color: Colors.grey700,
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: Colors.red,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    alignItems: "center",
  },
  modalIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  modalIconCircleGreen: { backgroundColor: Colors.vouchGreenLight },
  modalIconCircleAmber: { backgroundColor: Colors.amberBg },
  modalTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.black,
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textAlign: "center",
    lineHeight: 20,
  },
  modalListSection: {
    width: "100%",
    marginTop: 28,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  requestCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    width: "100%",
    marginBottom: 8,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotDone: { backgroundColor: Colors.vouchGreen },
  dotPending: { backgroundColor: Colors.amber },
  requestContact: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.black },
  requestMeta: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.grey500, marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeDone: { backgroundColor: Colors.vouchGreenLight },
  badgePending: { backgroundColor: Colors.amberBg },
  badgeText: { fontSize: 11, fontFamily: Fonts.bold },
  badgeTextDone: { color: Colors.vouchGreen },
  badgeTextPending: { color: Colors.amber },
  addRefBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 28,
    height: 52,
    width: "100%",
  },
  addRefBtnText: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.vouchGreen },
});
