import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { HEADER_HIT_SLOP } from "@/constants/touch";

/**
 * Header for white form and flow screens — the wizard steps, give-vouch, and
 * the single-purpose account screens. Distinct from `ScreenHeader` (the green
 * block used on navigation surfaces): these screens are focused tasks, so they
 * stay light and quiet, with the back arrow and an optional step counter.
 */
export function FlowHeader({
  label,
  onBack,
  step,
  totalSteps,
  right,
}: {
  /** Centered caps label, e.g. "CHANGE EMAIL". Falls back to the step counter. */
  label?: string;
  onBack?: () => void;
  /** 1-based current step. Renders the counter and progress bar when set. */
  step?: number;
  totalSteps?: number;
  right?: React.ReactNode;
}) {
  const showProgress = typeof step === "number" && typeof totalSteps === "number";
  const title = showProgress ? `STEP ${step} OF ${totalSteps}` : (label ?? "");

  return (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onBack ?? (() => router.back())}
          hitSlop={HEADER_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>{title}</AppText>
        <View style={styles.rightSlot}>{right}</View>
      </View>

      {showProgress && (
        <View style={styles.progressWrap}>
          <View style={[styles.progressFill, { flex: step }]} />
          <View style={[styles.progressEmpty, { flex: Math.max(totalSteps - step, 0) }]} />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
    letterSpacing: 1,
  },
  rightSlot: { minWidth: 24, alignItems: "flex-end" },
  progressWrap: { flexDirection: "row", height: 3, marginTop: 10 },
  progressFill: { backgroundColor: Colors.vouchGreen },
  progressEmpty: { backgroundColor: Colors.grey300 },
});

/** Shared body styles for flow screens, so padding and type stop drifting. */
export const flowStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.white },
  scroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },
  heading: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginBottom: 24,
    lineHeight: 20,
  },
});
