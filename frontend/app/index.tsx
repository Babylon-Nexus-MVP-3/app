import { useEffect } from "react";
import { Animated, Image, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/roles";
import { useEntrance, usePressScale, useReduceMotion, STAGGER } from "@/lib/motion";

const PROOF = [
  "Build a profile that proves your work",
  "Check who you're working with first",
  "Track every invoice on your projects",
];

export default function Index() {
  const { user, isLoading } = useAuth();
  const reduceMotion = useReduceMotion();
  const wordmarkEntrance = useEntrance(0, reduceMotion);
  const headlineEntrance = useEntrance(STAGGER, reduceMotion);
  const proofEntrance = useEntrance(STAGGER * 3, reduceMotion);
  const trustEntrance = useEntrance(STAGGER * 4, reduceMotion);
  const ctaEntrance = useEntrance(STAGGER * 5, reduceMotion);
  const primaryPress = usePressScale(reduceMotion, 0.97);

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace(user.role === UserRole.Admin ? "/(admin)/projects" : "/(app)/(tabs)/home");
    }
  }, [isLoading, user]);

  if (isLoading || user) return null;

  return (
    <LinearGradient
      colors={[Colors.vouchGreenMid, Colors.vouchGreen, Colors.vouchGreen]}
      locations={[0, 0.55, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <Animated.View style={wordmarkEntrance}>
          <AppText style={styles.wordmark}>VouchPay</AppText>
        </Animated.View>

        {/* Headline owns the screen — this is a brand moment, not a dashboard. */}
        <Animated.View style={[styles.headlineBlock, headlineEntrance]}>
          <AppText style={styles.headline} maxFontSizeMultiplier={1}>
            {"Stop losing money on bad jobs. "}
            <AppText style={styles.headlineAccent} maxFontSizeMultiplier={1}>
              Work with people you trust.
            </AppText>
          </AppText>
        </Animated.View>

        <Animated.View style={[styles.proof, proofEntrance]}>
          {PROOF.map((line) => (
            <View key={line} style={styles.proofRow}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.vouchGreenLight} />
              <AppText style={styles.proofText}>{line}</AppText>
            </View>
          ))}
        </Animated.View>

        <View style={{ flex: 1 }} />

        <Animated.View style={[styles.trustRow, trustEntrance]}>
          <View style={styles.nswLogoBox}>
            <Image source={require("../assets/nsw-government-logo.png")} style={styles.nswLogo} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={styles.trustTitle}>Backed by NSW Government</AppText>
            <AppText style={styles.trustDesc}>MVP Innovation Grant</AppText>
          </View>
        </Animated.View>

        <Animated.View style={[styles.footer, ctaEntrance]}>
          <Animated.View style={{ transform: [{ scale: primaryPress.scale }] }}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push("/(auth)/sign-up")}
              onPressIn={primaryPress.onPressIn}
              onPressOut={primaryPress.onPressOut}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="Create an account"
            >
              <AppText style={styles.primaryBtnText}>Create an account</AppText>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.push("/(auth)/sign-in")}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Sign in to an existing account"
          >
            <AppText style={styles.secondaryBtnText}>I already have an account</AppText>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  wordmark: {
    fontSize: 20,
    fontFamily: Fonts.extraBold,
    color: Colors.white,
    letterSpacing: 0.5,
    opacity: 0.9,
  },
  headlineBlock: {
    marginTop: 44,
  },
  headline: {
    fontSize: 38,
    lineHeight: 47,
    fontFamily: Fonts.extraBold,
    color: Colors.white,
  },
  headlineAccent: {
    fontSize: 38,
    lineHeight: 47,
    fontFamily: Fonts.extraBold,
    color: Colors.vouchGreenLight,
  },
  proof: {
    marginTop: 30,
    gap: 13,
  },
  proofRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  proofText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.white,
    opacity: 0.92,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },
  nswLogoBox: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  nswLogo: {
    width: 36,
    height: 36,
    resizeMode: "contain",
  },
  trustTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  trustDesc: {
    fontSize: 12.5,
    fontFamily: Fonts.regular,
    color: Colors.white,
    opacity: 0.75,
    marginTop: 1,
  },
  footer: {
    gap: 6,
  },
  primaryBtn: {
    height: 54,
    backgroundColor: Colors.white,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.vouchGreen,
  },
  secondaryBtn: {
    height: 52,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
    opacity: 0.9,
  },
});
