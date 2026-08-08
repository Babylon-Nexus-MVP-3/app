import { useCallback, useRef, useState } from "react";
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
import { router, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { ScreenHeader, sheetStyle } from "@/components/ScreenHeader";
import { SectionLabel } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
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

// Remembered across mounts, so returning to this screen doesn't show the
// locked copy for a frame before the real strength arrives.
let lastKnownStrength: number | null = null;

export default function VouchMyProjectScreen() {
  const { fetchWithAuth } = useAuth();
  const [strength, setStrength] = useState<number | null>(lastKnownStrength);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const reduceMotion = useReduceMotion();
  const statusEntrance = useEntrance(0, reduceMotion);
  const featuresEntrance = useEntrance(STAGGER, reduceMotion);
  const noteEntrance = useEntrance(STAGGER * 2, reduceMotion);
  const ctaPress = usePressScale(reduceMotion, 0.97);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      // Only the first load shows a spinner — refocusing after a back
      // navigation refetches quietly instead of flashing the screen.
      if (!hasLoadedRef.current) setLoading(true);
      fetchWithAuth(`${API_BASE_URL}/vouch/profile/me`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!cancelled && data?.profileStrength !== undefined) {
            lastKnownStrength = data.profileStrength;
            setStrength(data.profileStrength);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) {
            hasLoadedRef.current = true;
            setLoading(false);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [fetchWithAuth])
  );

  // Treat "not yet known" as unlocked: claiming it's locked and then undoing
  // that a moment later reads as the app changing its mind.
  const isUnlocked = strength === null || strength === 100;
  // Each of the 5 profile steps is worth 20%, so this turns an abstract
  // percentage into the concrete number of things still to do.
  const stepsLeft = Math.max(Math.round((100 - (strength ?? 100)) / 20), 0);

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
                : `${stepsLeft} steps left on your profile.`
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
