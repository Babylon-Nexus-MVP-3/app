import {
  Animated,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { ScreenHeader, sheetStyle } from "@/components/ScreenHeader";
import { SectionLabel } from "@/components/ui";
import { useVouchProfile } from "@/lib/useVouchProfile";
import { useEntrance, usePressScale, useReduceMotion, STAGGER } from "@/lib/motion";

const FEATURES = [
  {
    icon: "people-outline" as const,
    title: "Invite your team",
    desc: "Add subbies, PMs and consultants with role-based invite codes.",
  },
  {
    icon: "pulse-outline" as const,
    title: "Track payment health",
    desc: "See invoice status, approvals and payment timing in real time.",
  },
  {
    icon: "shield-checkmark-outline" as const,
    title: "Back it with your profile",
    desc: "Your verified profile vouches for the project, so the team knows who they are working for.",
  },
];

export default function VouchMyProjectScreen() {
  // The hook owns the fetch, the cross-mount cache and the derived step counts,
  // so this screen can never disagree with the rest of the app about them.
  const { profileStrength: strength, stepsLeft, isComplete, loading } = useVouchProfile();

  const reduceMotion = useReduceMotion();
  const statusEntrance = useEntrance(0, reduceMotion);
  const featuresEntrance = useEntrance(STAGGER, reduceMotion);
  const noteEntrance = useEntrance(STAGGER * 2, reduceMotion);
  const ctaPress = usePressScale(reduceMotion, 0.97);

  // Treat "not yet known" as unlocked: claiming it's locked and then undoing
  // that a moment later reads as the app changing its mind.
  const isUnlocked = isComplete !== false;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        showBack
        eyebrow="Project owner"
        title={isUnlocked ? "You're ready to create" : "Almost ready to create"}
        subtitle={
          loading
            ? " "
            : isUnlocked
              ? "Your profile is verified."
              : stepsLeft === 1
                ? "1 step left on your profile."
                : `${stepsLeft ?? 0} steps left on your profile.`
        }
      >
        {/* Progress lives in the header rather than a card below it — the two
            were saying the same thing and eating half the screen. */}
        {!loading && !isUnlocked && (
          <Animated.View style={[styles.meter, statusEntrance]}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${strength ?? 0}%` as any }]} />
            </View>
            <AppText style={styles.meterPct}>{strength ?? 0}%</AppText>
          </Animated.View>
        )}
      </ScreenHeader>

      <ScrollView
        style={sheetStyle.sheet}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={featuresEntrance}>
          <SectionLabel>What a project owner can do</SectionLabel>
          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.title} style={styles.featureItem}>
                <View style={styles.featureIcon}>
                  <Ionicons name={f.icon} size={20} color={Colors.vouchGreen} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.featureTitle}>{f.title}</AppText>
                  <AppText style={styles.featureDesc}>{f.desc}</AppText>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View style={[styles.note, noteEntrance]}>
          <Ionicons name="lock-closed-outline" size={16} color={Colors.grey700} />
          <AppText style={styles.noteText}>
            Invoice amounts stay private to the project team. VouchPay tracks payment timing, not
            dollar amounts.
          </AppText>
        </Animated.View>
      </ScrollView>

      {/* The button always does something: create the project, or go finish
          the profile that's blocking it. */}
      <View style={styles.ctaContainer}>
        <Animated.View style={{ transform: [{ scale: ctaPress.scale }] }}>
          <TouchableOpacity
            style={styles.ctaButton}
            activeOpacity={0.9}
            onPressIn={ctaPress.onPressIn}
            onPressOut={ctaPress.onPressOut}
            disabled={loading}
            onPress={() => {
              router.push(isUnlocked ? "/(app)/create-project" : "/(app)/get-vouched");
            }}
            accessibilityRole="button"
            accessibilityLabel={
              isUnlocked
                ? "Create project"
                : `Finish your profile, ${stepsLeft} steps left before you can create a project`
            }
            accessibilityState={{ disabled: loading }}
          >
            {loading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <AppText style={styles.ctaText}>
                {isUnlocked ? "Create project" : "Finish your profile"}
              </AppText>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.vouchGreen,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 28,
  },
  meter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.whiteInactive,
    overflow: "hidden",
  },
  fill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.white,
  },
  meterPct: {
    fontSize: 14,
    fontFamily: Fonts.extraBold,
    color: Colors.white,
  },
  features: {
    gap: 18,
    marginBottom: 26,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: Colors.vouchGreenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  featureTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    lineHeight: 19,
  },
  note: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.offWhite,
    borderRadius: 12,
    padding: 14,
  },
  noteText: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    color: Colors.grey700,
    lineHeight: 18,
  },
  ctaContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: Colors.white,
  },
  ctaButton: {
    height: 54,
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
});
