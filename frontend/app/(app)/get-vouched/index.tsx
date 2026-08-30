import { useCallback, useRef, useState } from "react";
import {
  Animated,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { ScreenHeader, sheetStyle } from "@/components/ScreenHeader";
import { Pill, SectionLabel } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import { useVouchProfile } from "@/lib/useVouchProfile";
import { useEntrance, useReduceMotion, STAGGER } from "@/lib/motion";

type SentRequest = {
  _id: string;
  status: "pending" | "responded";
};

// Only facts about the user themselves. Vouches received depend on other
// people responding, and project membership comes and goes — neither belongs
// in a profile that decides what the user is allowed to do.
const STEPS = [
  {
    n: 1,
    icon: "person-outline" as const,
    title: "Your details",
    desc: "Your name, ABN and business — straight from your account.",
    pct: 50,
  },
  {
    n: 2,
    icon: "ribbon-outline" as const,
    title: "Trade licence",
    desc: "Your trade, licence number and the state that issued it.",
    pct: 50,
  },
];

const STEP_ROUTES = ["/(app)/get-vouched/step1", "/(app)/get-vouched/step2"] as const;

// What finishing the profile actually buys — the reason to bother.
const UNLOCKS = [
  {
    icon: "people-outline" as const,
    title: "Give vouches",
    desc: "Vouch for people you've worked with.",
  },
  {
    icon: "business-outline" as const,
    title: "Create projects",
    desc: "Set one up and invite your team.",
  },
  {
    // Not shipped yet. Home already labels this "Coming soon", so promising it
    // as a reward for finishing the profile set up an expectation the app
    // immediately broke.
    icon: "card-outline" as const,
    title: "Supplier credit",
    desc: "Apply using your verified profile.",
    comingSoon: true,
  },
];

export default function GetVouchedIntro() {
  const { user, fetchWithAuth } = useAuth();
  const mobileVerified = user?.mobileVerified ?? false;

  // Each wizard step writes to the server before navigating back here, and the
  // hook refetches on focus — so the server's answer is the only one needed.
  const { profileStrength, stepsDone, stepsLeft, isComplete } = useVouchProfile();

  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const hasLoadedRef = useRef(false);

  const reduceMotion = useReduceMotion();
  const stepsEntrance = useEntrance(0, reduceMotion);
  const unlocksEntrance = useEntrance(STAGGER * 2, reduceMotion);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      // Returning from a step refetches to pick up what changed, but swapping
      // to a spinner for that makes the screen flash. Only the first load
      // shows one; later loads update in place.
      if (!hasLoadedRef.current) setLoadingStatus(true);
      fetchWithAuth(`${API_BASE_URL}/vouch/requests/sent`)
        .then((r) => (r.ok ? r.json() : null))
        .then((sentData) => {
          if (!cancelled) setSentRequests(sentData?.requests ?? []);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) {
            hasLoadedRef.current = true;
            setLoadingStatus(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [fetchWithAuth])
  );

  // ── Step completion ──────────────────────────────────────────────────────
  // All of it comes from the server, so this screen, the home meter and the
  // project gate can never disagree about what's done.
  const step1Done = stepsDone[0] ?? false;
  const step2Done = stepsDone[1] ?? false;
  const stepDone = stepsDone;
  const strength = profileStrength ?? 0;
  const complete = isComplete ?? false;

  const hasAnySentRequest = sentRequests.length >= 1;
  const respondedCount = sentRequests.filter((r) => r.status === "responded").length;

  function canTap(n: number) {
    return n === 1 || step1Done;
  }

  const btnLabel = !step1Done
    ? "Start — add your details"
    : !step2Done
      ? "Add your trade licence"
      : hasAnySentRequest
        ? "Request another vouch"
        : "Request a vouch";

  function onPrimaryPress() {
    if (!step1Done) return router.push(STEP_ROUTES[0]);
    if (!step2Done) return router.push(STEP_ROUTES[1]);
    return router.push("/(app)/get-vouched/request-vouch");
  }

  if (loadingStatus) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScreenHeader showBack title="Build your profile" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.vouchGreen} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        showBack
        title={complete ? "Your profile is verified" : "Build your profile"}
        subtitle={
          complete
            ? "You can give vouches and create projects."
            : stepsLeft === 1
              ? "One step left."
              : "Two short steps. Built once, used everywhere."
        }
      >
        <View style={styles.meter}>
          <View style={styles.meterTrack}>
            <View style={[styles.meterFill, { width: `${strength}%` as any }]} />
          </View>
          <AppText style={styles.meterPct}>{strength}%</AppText>
        </View>
        {/* The number is meaningless on first encounter without this. */}
        <AppText style={styles.meterExplainer}>
          Profile strength is how much of your own information you&apos;ve added. At 100% you can
          give vouches and create projects.
        </AppText>
      </ScreenHeader>

      <ScrollView
        style={sheetStyle.sheet}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {!mobileVerified && (
          <TouchableOpacity
            style={styles.prereq}
            activeOpacity={0.8}
            onPress={() =>
              router.push({ pathname: "/(app)/verify-mobile", params: { returnTo: "get-vouched" } })
            }
            accessibilityRole="button"
            accessibilityLabel="Verify your mobile number"
          >
            <Ionicons name="phone-portrait-outline" size={18} color={Colors.amber} />
            <View style={{ flex: 1 }}>
              <AppText style={styles.prereqTitle}>Verify your mobile number</AppText>
              <AppText style={styles.prereqDesc}>Required before you can request vouches</AppText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.grey500} />
          </TouchableOpacity>
        )}

        {/* Two steps, so each gets a full card rather than a thin row. */}
        <Animated.View style={stepsEntrance}>
          {STEPS.map(({ n, icon, title, desc, pct }) => {
            const done = stepDone[n - 1];
            const tappable = canTap(n);
            return (
              <TouchableOpacity
                key={n}
                style={[
                  styles.stepCard,
                  done && styles.stepCardDone,
                  !tappable && styles.stepCardLocked,
                ]}
                activeOpacity={tappable ? 0.85 : 1}
                onPress={() => tappable && router.push(STEP_ROUTES[n - 1])}
                disabled={!tappable}
                accessibilityRole="button"
                accessibilityLabel={`${title}: ${done ? "completed" : tappable ? "incomplete" : "locked"}`}
                accessibilityState={{ disabled: !tappable }}
              >
                <View style={styles.stepHead}>
                  <View style={[styles.stepIcon, done && styles.stepIconDone]}>
                    <Ionicons
                      name={done ? "checkmark" : icon}
                      size={22}
                      color={done ? Colors.white : tappable ? Colors.vouchGreen : Colors.grey500}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.stepEyebrow}>
                      STEP {n} · {done ? "COMPLETED" : `+${pct}%`}
                    </AppText>
                    <AppText style={[styles.stepTitle, !tappable && styles.stepTitleLocked]}>
                      {title}
                    </AppText>
                  </View>
                  <Ionicons
                    name={tappable ? "chevron-forward" : "lock-closed"}
                    size={tappable ? 18 : 15}
                    color={Colors.grey500}
                  />
                </View>
                <AppText style={styles.stepDesc}>{desc}</AppText>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        <Animated.View style={unlocksEntrance}>
          <SectionLabel>{complete ? "What you can do" : "What this unlocks"}</SectionLabel>
          <View style={styles.unlocks}>
            {UNLOCKS.map((u) => (
              <View key={u.title} style={styles.unlockRow}>
                <View style={[styles.unlockIcon, complete && styles.unlockIconOn]}>
                  <Ionicons
                    name={u.icon}
                    size={18}
                    color={complete ? Colors.vouchGreen : Colors.grey500}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.unlockTitleRow}>
                    <AppText style={[styles.unlockTitle, !complete && styles.unlockTitleOff]}>
                      {u.title}
                    </AppText>
                    {u.comingSoon && <Pill label="Coming soon" tone="neutral" />}
                  </View>
                  <AppText style={styles.unlockDesc}>{u.desc}</AppText>
                </View>
                {complete && !u.comingSoon && (
                  <Ionicons name="checkmark-circle" size={18} color={Colors.vouchGreen} />
                )}
              </View>
            ))}
          </View>
        </Animated.View>

        {hasAnySentRequest && (
          <TouchableOpacity
            style={styles.requestsRow}
            activeOpacity={0.8}
            onPress={() =>
              router.push({ pathname: "/(app)/(tabs)/vouches", params: { tab: "requests" } })
            }
            accessibilityRole="button"
            accessibilityLabel={`Your vouch requests, ${respondedCount} of ${sentRequests.length} responded`}
          >
            <Ionicons name="paper-plane-outline" size={18} color={Colors.vouchGreen} />
            <AppText style={styles.requestsText}>
              {respondedCount} of {sentRequests.length} request
              {sentRequests.length === 1 ? "" : "s"} answered
            </AppText>
            <Ionicons name="chevron-forward" size={16} color={Colors.vouchGreen} />
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.9}
          onPress={onPrimaryPress}
          accessibilityRole="button"
          accessibilityLabel={btnLabel}
        >
          <AppText style={styles.primaryBtnText}>{btnLabel}</AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.vouchGreen },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  scroll: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 28 },

  // Strength meter, on the header
  meter: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18 },
  meterTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.whiteInactive,
    overflow: "hidden",
  },
  meterFill: { height: 6, borderRadius: 3, backgroundColor: Colors.white },
  meterExplainer: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    color: Colors.white,
    opacity: 0.85,
    lineHeight: 18,
    marginTop: 10,
  },
  meterPct: { fontSize: 14, fontFamily: Fonts.extraBold, color: Colors.white },

  prereq: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.amberBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  prereqTitle: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.black },
  prereqDesc: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.grey700, marginTop: 2 },

  // Step cards
  stepCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },
  stepCardDone: { borderColor: Colors.vouchGreen, backgroundColor: Colors.vouchGreenLight },
  stepCardLocked: { backgroundColor: Colors.offWhite, borderColor: Colors.grey100 },
  stepHead: { flexDirection: "row", alignItems: "center", gap: 14 },
  stepIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: Colors.vouchGreenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  stepIconDone: { backgroundColor: Colors.vouchGreen },
  stepEyebrow: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  stepTitle: { fontSize: 17, fontFamily: Fonts.bold, color: Colors.black },
  stepTitleLocked: { color: Colors.grey700 },
  stepDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    lineHeight: 19,
    marginTop: 12,
  },

  // Unlocks
  unlocks: { gap: 16, marginTop: 2, marginBottom: 22 },
  unlockRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  unlockIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.grey100,
    alignItems: "center",
    justifyContent: "center",
  },
  unlockIconOn: { backgroundColor: Colors.vouchGreenLight },
  unlockTitle: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.black },
  unlockTitleOff: { color: Colors.grey700 },
  unlockTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  unlockDesc: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.grey500, marginTop: 1 },

  requestsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.vouchGreenLight,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  requestsText: { flex: 1, fontSize: 14, fontFamily: Fonts.bold, color: Colors.vouchGreen },

  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: Colors.white,
  },
  primaryBtn: {
    height: 54,
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: Colors.white, fontSize: 16, fontFamily: Fonts.bold },
});
