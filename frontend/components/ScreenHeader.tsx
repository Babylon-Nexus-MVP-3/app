import { ReactNode } from "react";
import { View, StyleSheet, TouchableOpacity, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { HEADER_HIT_SLOP } from "@/constants/touch";

/**
 * The one header every screen uses: a green block carrying the title, an
 * optional back button, an optional right-hand action, and an optional
 * content slot underneath (meters, stat chips, segmented controls).
 *
 * Screens previously hand-rolled this and drifted — a dozen different title
 * sizes and paddings across the app. Use this instead of writing a new one.
 *
 * Keep it to what has to stay on screen. Supporting detail — meters, stat
 * chips — belongs in a `HeaderBand` at the top of the body instead, so it
 * scrolls away and leaves this bar as the concise version of the header.
 */
export function ScreenHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  showBack = false,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onBack?: () => void;
  showBack?: boolean;
  right?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <View style={styles.wrap}>
      {showBack && (
        <TouchableOpacity
          style={styles.backBtn}
          hitSlop={HEADER_HIT_SLOP}
          onPress={onBack ?? (() => router.back())}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={22} color={Colors.white} />
        </TouchableOpacity>
      )}

      <View style={styles.titleRow}>
        <View style={{ flex: 1 }}>
          {!!eyebrow && <AppText style={styles.eyebrow}>{eyebrow.toUpperCase()}</AppText>}
          <AppText style={styles.title}>{title}</AppText>
          {!!subtitle && <AppText style={styles.subtitle}>{subtitle}</AppText>}
        </View>
        {right}
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.vouchGreen,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 22,
  },
  backBtn: {
    width: 40,
    height: 40,
    marginLeft: -8,
    marginBottom: 2,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  eyebrow: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.white,
    letterSpacing: 1.2,
    opacity: 0.8,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.white,
    opacity: 0.85,
    marginTop: 4,
  },
});

/**
 * White body that sits under a ScreenHeader. Straight edge against the header —
 * no rounded overlap. Apply to the ScrollView/FlatList `style` prop.
 */
export const sheetStyle = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 28,
  },
});

/**
 * A green block at the very top of a scrolling body, flush against the header
 * above it. It scrolls up and out of sight with the content, which shrinks the
 * green area down to the header bar alone — the concise state — without any
 * of the layout feedback an animated header height causes (a header that
 * resizes changes the scroll view's frame, which changes the offset, which
 * resizes the header again).
 *
 * `flush` un-does a content container's own padding so the band still spans
 * the full width and meets the header with no white seam.
 */
export function HeaderBand({
  children,
  style,
  flush,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Content padding to cancel out: `{ horizontal, top }`, in px. */
  flush?: { horizontal?: number; top?: number };
}) {
  return (
    <View
      style={[
        bandStyles.band,
        flush?.horizontal ? { marginHorizontal: -flush.horizontal } : null,
        flush?.top ? { marginTop: -flush.top } : null,
        style,
      ]}
    >
      {/* Dragging past the top would otherwise expose the white body above the
          band. This extends the green upward, beyond the bounce. */}
      <View style={bandStyles.overscroll} pointerEvents="none" />
      {children}
    </View>
  );
}

const bandStyles = StyleSheet.create({
  band: {
    backgroundColor: Colors.vouchGreen,
    paddingHorizontal: 20,
    paddingBottom: 22,
  },
  overscroll: {
    position: "absolute",
    top: -600,
    left: 0,
    right: 0,
    height: 600,
    backgroundColor: Colors.vouchGreen,
  },
});
