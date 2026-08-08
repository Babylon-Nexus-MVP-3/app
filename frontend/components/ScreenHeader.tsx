import { ReactNode } from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
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
