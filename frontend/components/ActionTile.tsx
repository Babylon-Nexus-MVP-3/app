import { Animated, View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useEntrance, usePressScale } from "@/lib/motion";
import type { RowTone } from "@/components/ListRow";

/**
 * Half-width companion to `ListRow`: same states and tones, stacked vertically
 * so two can sit side by side. Use for paired actions of equal weight; use
 * `ListRow` when an action stands alone or needs a longer description.
 */
export function ActionTile({
  icon,
  title,
  subtitle,
  onPress,
  tone = "default",
  count,
  tag,
  tagTone = "amber",
  accessibilityLabel,
  delay = 0,
  reduceMotion = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
  tone?: RowTone;
  count?: number;
  tag?: string;
  tagTone?: "amber" | "green";
  accessibilityLabel: string;
  delay?: number;
  reduceMotion?: boolean;
}) {
  const locked = tone === "locked";
  const primary = tone === "primary";
  const iconColor = locked ? Colors.grey500 : primary ? Colors.vouchGreen : Colors.black;

  const entrance = useEntrance(delay, reduceMotion);
  const press = usePressScale(reduceMotion);

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: entrance.opacity,
        transform: [...entrance.transform, { scale: press.scale }],
      }}
    >
      <TouchableOpacity
        style={[styles.wrap, primary && styles.wrapPrimary, locked && styles.wrapLocked]}
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        <View style={styles.top}>
          <View
            style={[
              styles.iconTile,
              primary && styles.iconTilePrimary,
              locked && styles.iconTileLocked,
            ]}
          >
            <Ionicons name={icon} size={22} color={iconColor} />
            {!!count && count > 0 && (
              <View style={styles.countBadge}>
                <AppText style={styles.countBadgeText}>{count > 9 ? "9+" : count}</AppText>
              </View>
            )}
          </View>
          {locked && <Ionicons name="lock-closed" size={14} color={Colors.grey500} />}
        </View>

        <View style={styles.body}>
          <AppText style={[styles.title, locked && styles.titleLocked]} numberOfLines={2}>
            {title}
          </AppText>
          {!!subtitle && (
            <AppText style={styles.subtitle} numberOfLines={2}>
              {subtitle}
            </AppText>
          )}
        </View>

        {!!tag && (
          <View
            style={[styles.tag, tagTone === "green" && styles.tagGreen, locked && styles.tagLocked]}
          >
            <AppText
              style={[
                styles.tagText,
                tagTone === "green" && styles.tagTextGreen,
                locked && styles.tagTextLocked,
              ]}
            >
              {tag}
            </AppText>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

/** Row wrapper that lays two tiles out side by side. */
export const tileRow = StyleSheet.create({
  row: { flexDirection: "row", gap: 10 },
});

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    minHeight: 148,
  },
  wrapPrimary: { borderWidth: 1.5, borderColor: Colors.vouchGreen },
  wrapLocked: { backgroundColor: Colors.offWhite, borderColor: Colors.grey100 },
  top: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  iconTile: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.grey100,
  },
  iconTilePrimary: { backgroundColor: Colors.vouchGreenLight },
  iconTileLocked: { backgroundColor: Colors.greyBg },
  countBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: Colors.red,
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  countBadgeText: { fontSize: 9, fontFamily: Fonts.bold, color: Colors.white },
  body: { flex: 1, gap: 3 },
  title: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.black },
  titleLocked: { color: Colors.grey700 },
  subtitle: { fontSize: 12.5, fontFamily: Fonts.regular, color: Colors.grey500, lineHeight: 17 },
  tag: {
    alignSelf: "flex-start",
    backgroundColor: Colors.amberBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagGreen: { backgroundColor: Colors.vouchGreenLight },
  tagLocked: { backgroundColor: Colors.greyBg },
  tagText: { fontSize: 10.5, fontFamily: Fonts.bold, color: Colors.amber },
  tagTextGreen: { color: Colors.vouchGreen },
  tagTextLocked: { color: Colors.grey700 },
});
