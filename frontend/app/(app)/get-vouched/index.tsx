import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useWizard, Reference } from "./WizardContext";

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
  const { step1, step2, references } = useWizard();

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
    // Step 1 always reachable; step N reachable if all prior steps are done
    return n === 1 || completed.slice(0, n - 1).every(Boolean);
  }

  // Find the next step the user should work on
  const nextIncompleteIndex = completed.indexOf(false);
  const hasStarted = step1Done || step2Done || step3Done;
  const allDone = step1Done && step2Done && step3Done;

  const btnLabel = !hasStarted
    ? "Start application"
    : allDone
      ? "All steps complete"
      : `Continue to step ${nextIncompleteIndex + 1}`;

  function onPrimaryPress() {
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

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.iconCircle}>
          <Ionicons name="shield-checkmark-outline" size={40} color={Colors.vouchGreen} />
        </View>

        <Text style={styles.title}>Build your Vouch profile.</Text>
        <Text style={styles.subtitle}>
          Like a supplier credit application — built once, reused everywhere.
        </Text>

        <View style={styles.stepList}>
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
                  <Text style={[styles.stepTitle, state === "locked" && styles.stepTitleLocked]}>
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
          style={[styles.primaryBtn, allDone && styles.primaryBtnDone]}
          activeOpacity={0.85}
          onPress={onPrimaryPress}
          disabled={allDone}
        >
          <Text style={styles.primaryBtnText}>{btnLabel}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
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
    color: Colors.grey500,
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
    color: Colors.grey700,
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
  stepCircleActive: { backgroundColor: Colors.vouchGreen },
  stepCircleLocked: { backgroundColor: Colors.grey300 },
  stepNum: { fontSize: 14, fontWeight: "700" },
  stepNumActive: { color: Colors.white },
  stepNumLocked: { color: Colors.grey700 },
  stepTitle: { fontSize: 15, fontWeight: "600", color: Colors.black },
  stepTitleLocked: { color: Colors.grey700 },
  stepDoneTag: { fontSize: 12, color: Colors.vouchGreen, marginTop: 2, fontWeight: "500" },
  stepTime: { fontSize: 13, color: Colors.grey500 },
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
});
