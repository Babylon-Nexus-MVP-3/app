import { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/colors";
import { API_BASE_URL } from "@/constants/api";
import { useWizard, Reference } from "./WizardContext";
import { useAuth } from "@/context/AuthContext";

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

type SentRequest = {
  _id: string;
  toMobile: string;
  toEmail?: string;
  relationship: string;
  projectName: string;
  status: "pending" | "responded";
  fromName: string;
  fromCompany: string;
  createdAt: string;
  respondedAt?: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs !== 1 ? "s" : ""} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days !== 1 ? "s" : ""} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months !== 1 ? "s" : ""} ago`;
}

export default function GetVouchedIntro() {
  const { fetchWithAuth, user } = useAuth();
  const { step1, step2, references } = useWizard();
  const mobileVerified = user?.mobileVerified ?? false;

  const [profileSubmitted, setProfileSubmitted] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const r = await fetchWithAuth(`${API_BASE_URL}/vouch/profile/me`);
      if (r.ok) {
        const profile = await r.json();
        const fullySubmitted =
          profile.name &&
          profile.currentProjectName &&
          Array.isArray(profile.references) &&
          profile.references.length >= 2;
        if (!fullySubmitted) return;
        setProfileSubmitted(true);
        setLoadingRequests(true);
        try {
          const req = await fetchWithAuth(`${API_BASE_URL}/vouch/requests/sent`);
          if (req.ok) {
            const data = await req.json();
            setSentRequests(data.requests ?? []);
          }
        } finally {
          setLoadingRequests(false);
        }
      }
    } catch {
    } finally {
      setCheckingProfile(false);
    }
  }, [fetchWithAuth]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

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
        ? "All steps complete"
        : `Continue to step ${nextIncompleteIndex + 1}`;

  function onPrimaryPress() {
    if (!mobileVerified) {
      router.push("/(app)/verify-mobile");
      return;
    }
    if (allDone) return;
    router.push(STEP_ROUTES[nextIncompleteIndex]);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>GET VOUCHED</Text>
        <View style={{ width: 24 }} />
      </View>

      {checkingProfile ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator size="large" color={Colors.vouchGreen} />
        </View>
      ) : profileSubmitted ? (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark-outline" size={40} color={Colors.vouchGreen} />
          </View>
          <Text style={styles.title}>Vouch requests sent.</Text>
          <Text style={styles.subtitle}>
            {"Your references have been notified. We'll update you once they respond."}
          </Text>

          <View style={styles.requestList}>
            <Text style={styles.requestListLabel}>VOUCH REQUESTS · {sentRequests.length}</Text>
            {loadingRequests ? (
              <ActivityIndicator color={Colors.vouchGreen} style={{ marginTop: 12 }} />
            ) : sentRequests.length === 0 ? (
              <Text style={styles.requestMeta}>No requests found.</Text>
            ) : (
              sentRequests.map((r) => {
                const done = r.status === "responded";
                return (
                  <View key={r._id} style={[styles.requestRow, done && styles.requestRowDone]}>
                    <View style={styles.requestRowTop}>
                      <View style={styles.requestContact}>
                        <Ionicons
                          name={done ? "shield-checkmark" : "time-outline"}
                          size={18}
                          color={done ? Colors.vouchGreen : Colors.amber}
                        />
                        <Text style={styles.requestMobile} numberOfLines={1}>
                          {r.toEmail || r.toMobile}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          done ? styles.statusBadgeDone : styles.statusBadgePending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            done ? styles.statusBadgeTextDone : styles.statusBadgeTextPending,
                          ]}
                        >
                          {done ? "Vouched" : "Pending"}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.requestRelMeta}>
                      {[r.relationship, r.projectName].filter(Boolean).join(" · ")}
                    </Text>

                    <View style={styles.requestTimeRow}>
                      <Text style={styles.requestTimeSent}>
                        Sent {timeAgo(r.createdAt)}
                      </Text>
                      {done && r.respondedAt ? (
                        <Text style={styles.requestTimeResponded}>
                          · Vouched {timeAgo(r.respondedAt)}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                );
              })
            )}
          </View>

          <TouchableOpacity
            style={styles.requestVouchBtn}
            activeOpacity={0.85}
            onPress={() => router.push("/(app)/get-vouched/step3")}
          >
            <Ionicons name="person-add-outline" size={18} color={Colors.vouchGreen} />
            <Text style={styles.requestVouchBtnText}>Request a vouch from someone</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark-outline" size={40} color={Colors.vouchGreen} />
            </View>

            <Text style={styles.title}>Build your Vouch profile.</Text>
            <Text style={styles.subtitle}>
              Like a supplier credit application — built once, reused everywhere.
            </Text>

            <View style={styles.stepList}>
              {/* Mobile verification prerequisite */}
              <TouchableOpacity
                style={[styles.stepRow, mobileVerified && styles.stepRowDone]}
                activeOpacity={mobileVerified ? 1 : 0.7}
                onPress={() => !mobileVerified && router.push("/(app)/verify-mobile")}
                disabled={mobileVerified}
              >
                <View
                  style={[
                    styles.stepCircle,
                    mobileVerified ? styles.stepCircleDone : styles.stepCircleActive,
                  ]}
                >
                  {mobileVerified ? (
                    <Ionicons name="checkmark" size={16} color={Colors.white} />
                  ) : (
                    <Ionicons name="phone-portrait-outline" size={16} color={Colors.vouchGreen} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stepTitle}>Verify mobile number</Text>
                  {mobileVerified ? (
                    <Text style={styles.stepDoneTag}>Completed</Text>
                  ) : (
                    <Text style={styles.prereqHint}>Required before you can apply</Text>
                  )}
                </View>
                {!mobileVerified && (
                  <Ionicons name="chevron-forward" size={16} color={Colors.grey500} />
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider} />

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
                        <Text
                          style={[
                            styles.stepNum,
                            state === "active" && styles.stepNumActive,
                            state === "locked" && styles.stepNumLocked,
                          ]}
                        >
                          {n}
                        </Text>
                      )}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.stepTitle, state === "locked" && styles.stepTitleLocked]}
                      >
                        {title}
                      </Text>
                      {state === "done" && <Text style={styles.stepDoneTag}>Completed</Text>}
                    </View>

                    <Text style={styles.stepTime}>{time}</Text>

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
              style={[styles.primaryBtn, mobileVerified && allDone && styles.primaryBtnDone]}
              activeOpacity={0.85}
              onPress={onPrimaryPress}
              disabled={mobileVerified && allDone}
            >
              <Text style={styles.primaryBtnText}>{btnLabel}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  requestList: {
    width: "100%",
    marginTop: 8,
    gap: 12,
  },
  requestListLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.grey500,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  requestRow: {
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 6,
  },
  requestRowDone: {
    backgroundColor: Colors.vouchGreenLight,
  },
  requestRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  requestContact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    flex: 1,
  },
  requestMobile: { fontSize: 14, fontWeight: "600", color: Colors.black, flex: 1 },
  requestRelMeta: { fontSize: 12, color: Colors.grey500 },
  requestTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  requestTimeSent: { fontSize: 12, color: Colors.grey500 },
  requestTimeResponded: { fontSize: 12, color: Colors.vouchGreen, fontWeight: "600" },
  requestMeta: { fontSize: 12, color: Colors.grey500, marginTop: 2 },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeDone: { backgroundColor: Colors.vouchGreen },
  statusBadgePending: { backgroundColor: Colors.amberBg },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  statusBadgeTextDone: { color: Colors.white },
  statusBadgeTextPending: { color: Colors.amber },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "600",
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
    fontWeight: "700",
    color: Colors.black,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.black,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
  },
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
  stepNum: { fontSize: 14, fontWeight: "700" },
  stepNumActive: { color: Colors.vouchGreen },
  stepNumLocked: { color: Colors.grey700 },
  stepTitle: { fontSize: 15, fontWeight: "600", color: Colors.black },
  stepTitleLocked: { color: Colors.grey700 },
  stepDoneTag: { fontSize: 12, color: Colors.vouchGreen, marginTop: 2, fontWeight: "500" },
  stepTime: { fontSize: 13, color: Colors.grey500 },
  stepRowDone: { backgroundColor: Colors.vouchGreenLight },
  prereqHint: { fontSize: 12, color: Colors.amber, marginTop: 2, fontWeight: "500" },
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
  primaryBtnDone: { backgroundColor: Colors.grey300 },
  primaryBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  requestVouchBtn: {
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
  requestVouchBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.vouchGreen,
  },
});
