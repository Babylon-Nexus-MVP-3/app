import { Animated, View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useEntrance, usePressScale } from "@/lib/motion";

export type RowTone = "default" | "primary" | "locked";

/**
 * Full-width tappable row: icon tile, title, subtitle, and a right-hand
 * affordance (chevron, padlock, or a tag). The building block for every
 * action list in the app.
 */
export function ListRow({
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
  /** Amber flags something waiting on the user; green marks good news. */
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

        <View style={styles.body}>
          <AppText style={[styles.title, locked && styles.titleLocked]}>{title}</AppText>
          {!!subtitle && <AppText style={styles.subtitle}>{subtitle}</AppText>}
        </View>

        {tag ? (
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
        ) : (
          <Ionicons
            name={locked ? "lock-closed" : "chevron-forward"}
            size={locked ? 15 : 18}
            color={Colors.grey500}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  wrapPrimary: { borderWidth: 1.5, borderColor: Colors.vouchGreen },
  wrapLocked: { backgroundColor: Colors.offWhite, borderColor: Colors.grey100 },
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
  title: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.black },
  titleLocked: { color: Colors.grey700 },
  subtitle: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.grey500 },
  tag: {
    backgroundColor: Colors.amberBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagGreen: { backgroundColor: Colors.vouchGreenLight },
  tagLocked: { backgroundColor: Colors.greyBg },
  tagText: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.amber },
  tagTextGreen: { color: Colors.vouchGreen },
  tagTextLocked: { color: Colors.grey700 },
});
