import { useCallback, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useWizard, Reference } from "./WizardContext";
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

function refComplete(r: Reference) {
  return !!(r.name && r.company && r.mobile && r.relationship && r.project);
}

const STEP_ROUTES = [
  "/(app)/get-vouched/step1",
  "/(app)/get-vouched/step2",
  "/(app)/get-vouched/step3",
] as const;

const STEPS = [
  { n: 1, title: "Your details", time: "~30 sec" },
  { n: 2, title: "Your project", time: "~1 min" },
  { n: 3, title: "Two references", time: "~30 sec" },
];

type StepState = "done" | "active" | "locked";

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

  // Already submitted — show request status view
  if (!loadingStatus && sentRequests.length > 0) {
    const respondedCount = sentRequests.filter((r) => r.status === "responded").length;
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={Colors.black} />
          </TouchableOpacity>
          <AppText style={styles.headerTitle}>GET VOUCHED</AppText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.iconCircle}>
            <Ionicons name="send-outline" size={36} color={Colors.vouchGreen} />
          </View>

          <AppText style={styles.title}>Requests sent.</AppText>
          <AppText style={styles.subtitle}>
            {respondedCount === 0
              ? "Waiting on your references to respond."
              : `${respondedCount} of ${sentRequests.length} ${sentRequests.length === 1 ? "reference has" : "references have"} responded.`}
          </AppText>

          <View style={styles.progressCard}>
            <AppText style={styles.progressLabel}>VOUCHES RECEIVED</AppText>
            <AppText style={styles.progressCount}>
              {respondedCount} / {sentRequests.length}
            </AppText>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    flex: respondedCount,
                  },
                ]}
              />
              <View style={{ flex: sentRequests.length - respondedCount }} />
            </View>
          </View>

          <AppText style={styles.requestsLabel}>YOUR REFERENCES</AppText>
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

          <TouchableOpacity
            style={styles.addRefBtn}
            activeOpacity={0.8}
            onPress={() => router.push("/(app)/get-vouched/step3")}
          >
            <Ionicons name="person-add-outline" size={16} color={Colors.vouchGreen} />
            <AppText style={styles.addRefBtnText}>Request another vouch</AppText>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Loading state
  if (loadingStatus) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={24} color={Colors.black} />
          </TouchableOpacity>
          <AppText style={styles.headerTitle}>GET VOUCHED</AppText>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.vouchGreen} />
        </View>
      </SafeAreaView>
    );
  }

  // Wizard steps view
  const step1Done = !!(step1.name && step1.abn && step1.trade && step1.idNumber && step1.idExpiry);
  const step2Done = !!(
    step2.currentProjectName &&
    step2.address &&
    step2.suburb &&
    step2.state &&
    step2.postcode &&
    step2.value
  );
  const step3Done =
    references.length >= 2 && refComplete(references[0]) && refComplete(references[1]);

  const completed = [step1Done, step2Done, step3Done];

  function stepState(n: number): StepState {
    if (completed[n - 1]) return "done";
    const firstIncomplete = completed.indexOf(false) + 1;
    return n === firstIncomplete ? "active" : "locked";
  }

  function canTap(n: number) {
    if (!mobileVerified) return false;
    return n === 1 || completed.slice(0, n - 1).every(Boolean);
  }

  const nextIncompleteIndex = completed.indexOf(false);
  const hasStarted = step1Done || step2Done || step3Done;
  const allDone = step1Done && step2Done && step3Done;

  const btnLabel = !mobileVerified
    ? "Verify mobile to continue"
    : !hasStarted
      ? "Start application"
      : allDone
        ? "Review & send"
        : `Continue to step ${nextIncompleteIndex + 1}`;

  function onPrimaryPress() {
    if (!mobileVerified) {
      router.push("/(app)/verify-mobile");
      return;
    }
    router.push(STEP_ROUTES[nextIncompleteIndex === -1 ? 2 : nextIncompleteIndex]);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>GET VOUCHED</AppText>
        <View style={{ width: 24 }} />
      </View>

      <>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark-outline" size={40} color={Colors.vouchGreen} />
          </View>

          <AppText style={styles.title}>Build your Vouch profile.</AppText>
          <AppText style={styles.subtitle}>
            Like a supplier credit application — built once, reused everywhere.
          </AppText>

          <View style={styles.stepList}>
            {/* Mobile verification prerequisite — hidden once verified */}
            {!mobileVerified && (
              <>
                <TouchableOpacity
                  style={styles.stepRow}
                  activeOpacity={0.7}
                  onPress={() => router.push("/(app)/verify-mobile")}
                >
                  <View style={[styles.stepCircle, styles.stepCircleActive]}>
                    <Ionicons name="phone-portrait-outline" size={16} color={Colors.vouchGreen} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.stepTitle}>Verify mobile number</AppText>
                    <AppText style={styles.prereqHint}>Required before you can apply</AppText>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.grey500} />
                </TouchableOpacity>

                <View style={styles.divider} />
              </>
            )}

            {STEPS.map(({ n, title, time }) => {
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
                    <AppText
                      style={[styles.stepTitle, state === "locked" && styles.stepTitleLocked]}
                    >
                      {title}
                    </AppText>
                    {state === "done" && <AppText style={styles.stepDoneTag}>Completed</AppText>}
                  </View>

                  <AppText style={styles.stepTime}>{time}</AppText>

                  {tappable && (
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={state === "locked" ? Colors.grey300 : Colors.grey500}
                    />
                  )}
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
            disabled={!mobileVerified && !hasStarted}
          >
            <AppText style={styles.primaryBtnText}>{btnLabel}</AppText>
          </TouchableOpacity>
        </View>
      </>
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
  scroll: {
    paddingHorizontal: 28,
    paddingBottom: 32,
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.vouchGreenLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontFamily: Fonts.bold,
    color: Colors.black,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 36,
  },

  // Wizard steps
  stepList: { width: "100%", gap: 12 },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 14,
  },
  stepRowLocked: { opacity: 0.5 },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleDone: { backgroundColor: Colors.vouchGreen },
  stepCircleActive: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.vouchGreen,
  },
  stepCircleLocked: { backgroundColor: Colors.grey300 },
  stepNum: { fontSize: 14, fontFamily: Fonts.bold },
  stepNumActive: { color: Colors.vouchGreen },
  stepNumLocked: { color: Colors.grey700 },
  stepTitle: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.black },
  stepTitleLocked: { color: Colors.grey700 },
  stepDoneTag: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.vouchGreen, marginTop: 2 },
  stepTime: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.grey500 },
  prereqHint: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.amber, marginTop: 2 },
  divider: { height: 1, backgroundColor: Colors.grey300, marginVertical: 4 },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },
  primaryBtn: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: Colors.white, fontSize: 16, fontFamily: Fonts.bold },

  // Submitted / requests view
  progressCard: {
    width: "100%",
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    padding: 18,
    gap: 8,
    marginBottom: 28,
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
  },
  progressCount: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  progressTrack: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.grey300,
    overflow: "hidden",
  },
  progressFill: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 3,
  },
  requestsLabel: {
    alignSelf: "flex-start",
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
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 28,
    height: 52,
    width: "100%",
  },
  addRefBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
});
