import { ReactNode, useState } from "react";
import { Animated, View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";

/** Small caps label that introduces a group of rows or cards. */
export function SectionLabel({ children }: { children: string }) {
  return <AppText style={styles.sectionLabel}>{children.toUpperCase()}</AppText>;
}

export type PillTone = "green" | "amber" | "red" | "neutral";

const PILL_BG: Record<PillTone, string> = {
  green: Colors.vouchGreenLight,
  amber: Colors.amberBg,
  red: Colors.redBg,
  neutral: Colors.greyBg,
};

const PILL_FG: Record<PillTone, string> = {
  green: Colors.vouchGreen,
  amber: Colors.amber,
  red: Colors.red,
  neutral: Colors.grey700,
};

/** Status pill — one shape for every status across the app. */
export function Pill({
  label,
  tone = "neutral",
  icon,
}: {
  label: string;
  tone?: PillTone;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: PILL_BG[tone] }]}>
      {!!icon && <Ionicons name={icon} size={12} color={PILL_FG[tone]} />}
      <AppText style={[styles.pillText, { color: PILL_FG[tone] }]}>{label}</AppText>
    </View>
  );
}

/** Centered empty state: icon, message, and an optional call to action. */
export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconCircle}>
        <Ionicons name={icon} size={30} color={Colors.vouchGreen} />
      </View>
      <AppText style={styles.emptyTitle}>{title}</AppText>
      {!!subtitle && <AppText style={styles.emptySubtitle}>{subtitle}</AppText>}
      {!!actionLabel && !!onAction && (
        <TouchableOpacity
          style={styles.emptyBtn}
          activeOpacity={0.8}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <AppText style={styles.emptyBtnText}>{actionLabel}</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Segmented control. `tone` picks the surface it sits on: "green" for inside a
 * ScreenHeader, "light" for a white body.
 *
 * Pass `progress` — a value in page units (0, 1, 2…) — when the control sits
 * above a pager, and the highlight tracks the swipe instead of snapping once
 * the gesture ends.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  tone = "green",
  progress,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  tone?: "green" | "light";
  progress?: Animated.AnimatedInterpolation<number>;
}) {
  const light = tone === "light";
  const [trackWidth, setTrackWidth] = useState(0);
  const segWidth = trackWidth > 0 ? trackWidth / options.length : 0;

  return (
    <View
      style={[styles.segmentWrap, light && styles.segmentWrapLight]}
      onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width - 8)}
    >
      {/* Sliding highlight — only rendered when a pager is driving it, so the
          plain tap-only version keeps its simple per-segment background. */}
      {!!progress && segWidth > 0 && (
        <Animated.View
          style={[
            styles.segmentIndicator,
            light && styles.segmentIndicatorLight,
            {
              width: segWidth,
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: options.map((_, i) => i),
                    outputRange: options.map((_, i) => i * segWidth),
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
        />
      )}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            style={[
              styles.segment,
              !progress && active && styles.segmentActive,
              !progress && active && light && styles.segmentActiveLight,
            ]}
            onPress={() => onChange(o.value)}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: active }}
          >
            <AppText
              style={[
                styles.segmentText,
                light && styles.segmentTextLight,
                active && styles.segmentTextActive,
              ]}
            >
              {o.label}
            </AppText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Plain white content card with the app's standard border and radius. */
export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  complianceRow: { flexDirection: "row", gap: 6, marginTop: 6, flexWrap: "wrap" },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 1,
    marginBottom: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pillText: { fontSize: 11, fontFamily: Fonts.bold },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
    gap: 10,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.vouchGreenLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    color: Colors.black,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  emptyBtnText: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.vouchGreen },
  segmentWrap: {
    flexDirection: "row",
    backgroundColor: Colors.whiteGloss,
    borderRadius: 12,
    padding: 4,
  },
  segmentWrapLight: { backgroundColor: Colors.grey100 },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    alignItems: "center",
  },
  segmentActive: { backgroundColor: Colors.white },
  segmentIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 9,
    backgroundColor: Colors.white,
  },
  segmentIndicatorLight: { backgroundColor: Colors.white },
  segmentActiveLight: { backgroundColor: Colors.white },
  segmentText: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.white },
  segmentTextLight: { color: Colors.grey700 },
  segmentTextActive: { color: Colors.vouchGreen },
  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 16,
    padding: 16,
  },
});

/*
  Licence / insurance badges for a project participant.

  The admin approval screen and the admin project detail screen rendered this
  same block, with their own identical copies of the four badge styles. Null
  means "not answered" and renders nothing — only an explicit yes/no shows.
*/
export function ComplianceBadges({
  hasLicence,
  hasInsurance,
  style,
}: {
  hasLicence?: boolean | null;
  hasInsurance?: boolean | null;
  style?: object;
}) {
  if (hasLicence == null && hasInsurance == null) return null;
  return (
    <View style={[styles.complianceRow, style]}>
      {hasLicence != null && (
        <Pill
          label={hasLicence ? "✓ Licenced" : "✗ No Licence"}
          tone={hasLicence ? "green" : "red"}
        />
      )}
      {hasInsurance != null && (
        <Pill
          label={hasInsurance ? "✓ Insured" : "✗ Not Insured"}
          tone={hasInsurance ? "green" : "red"}
        />
      )}
    </View>
  );
}
