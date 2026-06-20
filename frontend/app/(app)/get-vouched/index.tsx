import { useCallback, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useWizard } from "./WizardContext";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

type SentRequest = {
  _id: string;
  toMobile: string;
  toEmail?: string;
  relationship: string;
  projectName: string;
  status: "pending" | "responded";
  createdAt: string;
};

const STEPS = [
  { n: 1, title: "Your details", desc: "Name, ABN & trade", pct: 20 },
  { n: 2, title: "Current project", desc: "Your active work site", pct: 15 },
  { n: 3, title: "First vouch", desc: "Someone you've worked with", pct: 20 },
  { n: 4, title: "Second vouch", desc: "Another colleague", pct: 20 },
  { n: 5, title: "Past project", desc: "Previous work experience", pct: 15 },
  { n: 6, title: "ID verification", desc: "Driver's licence, passport or trade licence", pct: 10 },
];

const STEP_ROUTES = [
  "/(app)/get-vouched/step1",
  "/(app)/get-vouched/step2",
  "/(app)/get-vouched/step3",
  "/(app)/get-vouched/step4",
  "/(app)/get-vouched/step5",
  "/(app)/get-vouched/step6",
] as const;

type StepState = "done" | "active" | "locked";

function RequestCard({ r }: { r: SentRequest }) {
  const done = r.status === "responded";
  return (
    <View style={styles.requestCard}>
      <View style={[styles.dot, done ? styles.dotDone : styles.dotPending]} />
      <View style={{ flex: 1 }}>
        <AppText style={styles.requestContact}>{r.toEmail || r.toMobile}</AppText>
        <AppText style={styles.requestMeta}>
          {[r.relationship, r.projectName].filter(Boolean).join(" · ")}
        </AppText>
      </View>
      <View style={[styles.badge, done ? styles.badgeDone : styles.badgePending]}>
        <AppText style={[styles.badgeText, done ? styles.badgeTextDone : styles.badgeTextPending]}>
          {done ? "Vouched" : "Pending"}
        </AppText>
      </View>
    </View>
  );
}

export default function GetVouchedIntro() {
  const { user, fetchWithAuth } = useAuth();
  const { step1, step2, references } = useWizard();
  const mobileVerified = user?.mobileVerified ?? false;

  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoadingStatus(true);
      fetchWithAuth(`${API_BASE_URL}/vouch/requests/sent`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled) setSentRequests(data?.requests ?? []);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoadingStatus(false);
        });
      return () => {
        cancelled = true;
      };
    }, [fetchWithAuth])
  );

  if (loadingStatus) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={Colors.black} />
          </TouchableOpacity>
          <AppText style={styles.headerTitle}>VOUCH PROFILE</AppText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.vouchGreen} />
        </View>
      </SafeAreaView>
    );
  }

  const respondedCount = sentRequests.filter((r) => r.status === "responded").length;
  const pendingRequests = sentRequests.filter((r) => r.status !== "responded");

  // ── Step completion ──────────────────────────────────────────────────────
  const step1Done =
    !!(user?.name && user?.abn && user?.businessTrade) ||
    !!(step1.name && step1.abn && step1.trade);
  const step2Done = !!(step2.currentProjectName && step2.suburb && step2.state);
  const ref0 = references[0];
  const step3Done = !!(ref0?.name && ref0?.company && ref0?.mobile && ref0?.relationship);
  const ref1 = references[1];
  const step4Done = !!(ref1?.name && ref1?.company && ref1?.mobile && ref1?.relationship);
  const step5Done = !!(step2.pastProjectName && step2.pastSuburb && step2.pastState);
  const step6Done = !!step1.idNumber;

  const stepDone = [step1Done, step2Done, step3Done, step4Done, step5Done, step6Done];

  const strength = STEPS.reduce((acc, s, i) => acc + (stepDone[i] ? s.pct : 0), 0);

  function stepState(n: number): StepState {
    if (stepDone[n - 1]) return "done";
    if (n === 4 && !step3Done) return "locked";
    if (!mobileVerified && n > 1) return "locked";
    if (!step1Done && n > 1) return "locked";
    return "active";
  }

  function canTap(n: number) {
    if (!mobileVerified) return n === 1;
    if (n === 4) return step3Done;
    if (n > 1) return step1Done;
    return true;
  }

  // ── State: Verified (≥ 2 vouches received) ──────────────────────────────
  if (respondedCount >= 2) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={Colors.black} />
          </TouchableOpacity>
          <AppText style={styles.headerTitle}>VOUCH PROFILE</AppText>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView
          contentContainerStyle={styles.submittedScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.iconCircle, styles.iconCircleGreen]}>
            <Ionicons name="shield-checkmark-outline" size={40} color={Colors.vouchGreen} />
          </View>
          <AppText style={styles.title}>{"You're vouched."}</AppText>
          <AppText style={styles.subtitle}>
            {`${respondedCount} people have vouched for you.`}
          </AppText>

          <View style={styles.strengthRow}>
            <AppText style={styles.strengthLabel}>Profile strength</AppText>
            <AppText
              style={[
                styles.strengthPct,
                { color: strength >= 80 ? Colors.vouchGreen : Colors.amber },
              ]}
            >
              {strength}%
            </AppText>
          </View>
          <View style={styles.strengthTrack}>
            <View
              style={[
                styles.strengthFill,
                {
                  width: `${strength}%` as any,
                  backgroundColor: strength >= 80 ? Colors.vouchGreen : Colors.amber,
                },
              ]}
            />
          </View>

          {pendingRequests.length > 0 && (
            <>
              <AppText style={[styles.sectionLabel, { marginTop: 24 }]}>STILL WAITING</AppText>
              {pendingRequests.map((r) => (
                <RequestCard key={r._id} r={r} />
              ))}
            </>
          )}

          <TouchableOpacity
            style={styles.addRefBtn}
            activeOpacity={0.8}
            onPress={() => router.push("/(app)/get-vouched/step3?fresh=true" as any)}
          >
            <Ionicons name="person-add-outline" size={16} color={Colors.vouchGreen} />
            <AppText style={styles.addRefBtnText}>Request another vouch</AppText>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── State: Requests sent, waiting ──────────────────────────────────────
  if (sentRequests.length > 0) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={Colors.black} />
          </TouchableOpacity>
          <AppText style={styles.headerTitle}>VOUCH PROFILE</AppText>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView
          contentContainerStyle={styles.submittedScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.iconCircle, styles.iconCircleAmber]}>
            <Ionicons name="time-outline" size={40} color={Colors.amber} />
          </View>
          <AppText style={styles.title}>Requests sent.</AppText>
          <AppText style={styles.subtitle}>
            {respondedCount === 0
              ? "Waiting on your vouches to respond."
              : `${respondedCount} of ${sentRequests.length} ${sentRequests.length === 1 ? "person has" : "people have"} responded.`}
          </AppText>

          <View style={styles.strengthRow}>
            <AppText style={styles.strengthLabel}>Profile strength</AppText>
            <AppText
              style={[styles.strengthPct, { color: strength >= 40 ? Colors.amber : Colors.red }]}
            >
              {strength}%
            </AppText>
          </View>
          <View style={styles.strengthTrack}>
            <View
              style={[
                styles.strengthFill,
                { width: `${strength}%` as any, backgroundColor: Colors.amber },
              ]}
            />
          </View>

          <AppText style={[styles.sectionLabel, { marginTop: 24 }]}>YOUR VOUCHES</AppText>
          {sentRequests.map((r) => (
            <RequestCard key={r._id} r={r} />
          ))}

          <TouchableOpacity
            style={styles.addRefBtn}
            activeOpacity={0.8}
            onPress={() => router.push("/(app)/get-vouched/step3?fresh=true" as any)}
          >
            <Ionicons name="person-add-outline" size={16} color={Colors.vouchGreen} />
            <AppText style={styles.addRefBtnText}>Request another vouch</AppText>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── State: Build profile wizard ──────────────────────────────────────────
  const btnLabel = !mobileVerified
    ? "Verify mobile to continue"
    : !step1Done
      ? "Start — add your details"
      : step3Done
        ? "Request another vouch"
        : "Request a vouch";

  function onPrimaryPress() {
    if (!mobileVerified) {
      router.push({ pathname: "/(app)/verify-mobile", params: { returnTo: "get-vouched" } });
      return;
    }
    if (!step1Done) {
      router.push(STEP_ROUTES[0]);
      return;
    }
    router.push(STEP_ROUTES[2]);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>VOUCH PROFILE</AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.wizardScroll} showsVerticalScrollIndicator={false}>
        {/* Strength */}
        <View style={styles.strengthCard}>
          <View style={styles.strengthRow}>
            <AppText style={styles.strengthLabel}>Profile strength</AppText>
            <AppText
              style={[
                styles.strengthPct,
                {
                  color:
                    strength >= 80 ? Colors.vouchGreen : strength >= 40 ? Colors.amber : Colors.red,
                },
              ]}
            >
              {strength}%
            </AppText>
          </View>
          <View style={styles.strengthTrack}>
            <View
              style={[
                styles.strengthFill,
                {
                  width: `${strength}%` as any,
                  backgroundColor:
                    strength >= 80 ? Colors.vouchGreen : strength >= 40 ? Colors.amber : Colors.red,
                },
              ]}
            />
          </View>
          <AppText style={styles.strengthHint}>
            {strength === 100
              ? "Full profile — you can create your own project."
              : strength >= 60
                ? "Almost there! Verify your ID for 100%."
                : "Built once, used everywhere."}
          </AppText>
        </View>

        {!mobileVerified && (
          <TouchableOpacity
            style={styles.stepRow}
            activeOpacity={0.7}
            onPress={() =>
              router.push({ pathname: "/(app)/verify-mobile", params: { returnTo: "get-vouched" } })
            }
          >
            <View style={[styles.stepCircle, styles.stepCircleActive]}>
              <Ionicons name="phone-portrait-outline" size={16} color={Colors.vouchGreen} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.stepTitle}>Verify mobile number</AppText>
              <AppText style={styles.prereqHint}>Required before you can request vouches</AppText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.grey500} />
          </TouchableOpacity>
        )}

        <View style={styles.stepList}>
          {STEPS.map(({ n, title, desc, pct }) => {
            const state = stepState(n);
            const tappable = canTap(n);
            return (
              <TouchableOpacity
                key={n}
                style={[styles.stepRow, !tappable && styles.stepRowLocked]}
                activeOpacity={tappable ? 0.7 : 1}
                onPress={() => tappable && router.push(STEP_ROUTES[n - 1])}
                disabled={!tappable}
              >
                <View
                  style={[
                    styles.stepCircle,
                    state === "done" && styles.stepCircleDone,
                    state === "active" && styles.stepCircleActive,
                    state === "locked" && styles.stepCircleLocked,
                  ]}
                >
                  {state === "done" ? (
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                  ) : (
                    <AppText
                      style={[
                        styles.stepNum,
                        state === "active" && styles.stepNumActive,
                        state === "locked" && styles.stepNumLocked,
                      ]}
                    >
                      {n}
                    </AppText>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={[styles.stepTitle, state === "locked" && styles.stepTitleLocked]}>
                    {title}
                  </AppText>
                  <AppText style={styles.stepDesc}>{desc}</AppText>
                  {state === "done" && <AppText style={styles.stepDoneTag}>Completed</AppText>}
                </View>
                <View style={styles.stepRight}>
                  <AppText style={styles.stepPct}>+{pct}%</AppText>
                  {tappable && (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={state === "locked" ? Colors.grey300 : Colors.grey500}
                    />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, !mobileVerified && styles.primaryBtnDisabled]}
          activeOpacity={0.85}
          onPress={onPrimaryPress}
        >
          <AppText style={styles.primaryBtnText}>{btnLabel}</AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
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
  wizardScroll: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  submittedScroll: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: "center",
  },

  // Strength card
  strengthCard: {
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  strengthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    width: "100%",
  },
  strengthLabel: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.black },
  strengthPct: { fontSize: 13, fontFamily: Fonts.bold },
  strengthTrack: {
    height: 6,
    backgroundColor: Colors.grey300,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
    width: "100%",
  },
  strengthFill: { height: 6, borderRadius: 3 },
  strengthHint: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.grey500 },

  // Steps
  stepList: { gap: 10 },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 2,
  },
  stepRowLocked: { opacity: 0.45 },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepCircleDone: { backgroundColor: Colors.vouchGreen },
  stepCircleActive: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.vouchGreen,
  },
  stepCircleLocked: { backgroundColor: Colors.grey300 },
  stepNum: { fontSize: 13, fontFamily: Fonts.bold },
  stepNumActive: { color: Colors.vouchGreen },
  stepNumLocked: { color: Colors.grey700 },
  stepTitle: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.black },
  stepTitleLocked: { color: Colors.grey700 },
  stepDesc: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.grey500, marginTop: 1 },
  stepDoneTag: { fontSize: 11, fontFamily: Fonts.medium, color: Colors.vouchGreen, marginTop: 2 },
  stepRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  stepPct: { fontSize: 12, fontFamily: Fonts.semiBold, color: Colors.grey500 },
  prereqHint: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.amber, marginTop: 2 },

  // Submitted state
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    marginBottom: 24,
    backgroundColor: Colors.vouchGreenLight,
  },
  iconCircleGreen: { backgroundColor: Colors.vouchGreenLight },
  iconCircleAmber: { backgroundColor: Colors.amberBg },
  title: {
    fontSize: 26,
    fontFamily: Fonts.bold,
    color: Colors.black,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  sectionLabel: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
    marginBottom: 10,
    width: "100%",
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
  footer: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12 },
  primaryBtn: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: Colors.white, fontSize: 16, fontFamily: Fonts.bold },
});
