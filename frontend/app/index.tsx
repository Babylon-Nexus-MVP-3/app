import { useEffect } from "react";
import {
  Animated,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { Radius, Size, Spacing } from "@/constants/spacing";
import { AppText } from "@/components/AppText";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/roles";
import { useEntrance, usePressScale, useReduceMotion, STAGGER } from "@/lib/motion";

const PROOF: string[] = [
  "ABN checked live against the ABR",
  "Vouched by the builders and subbies you've worked with",
  "See every invoice on the job move to paid",
];

/**
 * A diffuse disc of light. The softness is a radial gradient, not a blur — see
 * the call sites for why nothing on this screen may use a BlurView.
 */
function Bloom({ id, size, style }: { id: string; size: number; style: ViewStyle }) {
  return (
    <View pointerEvents="none" style={[styles.bloom, style, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={Colors.vouchGreenAccent} stopOpacity={0.22} />
            <Stop offset="0.6" stopColor={Colors.vouchGreenAccent} stopOpacity={0.07} />
            <Stop offset="1" stopColor={Colors.vouchGreenAccent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

export default function Index() {
  const { user, isLoading } = useAuth();
  const { height } = useWindowDimensions();
  const compact = height < 750;
  const reduceMotion = useReduceMotion();
  const brandEntrance = useEntrance(0, reduceMotion);
  const headlineEntrance = useEntrance(STAGGER, reduceMotion);
  const proofEntrance = useEntrance(STAGGER * 3, reduceMotion);
  const ctaEntrance = useEntrance(STAGGER * 4, reduceMotion);
  const trustEntrance = useEntrance(STAGGER * 5, reduceMotion);
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
      colors={[Colors.vouchGreenMid, Colors.vouchGreen, Colors.vouchGreenDeep]}
      locations={[0, 0.45, 1]}
      style={styles.gradient}
    >
      {/* Soft blooms behind the hero — depth without a background image to ship.
          The falloff is painted into the gradient itself rather than softened by
          a BlurView on top: Android's blur samples the whole window, so a
          full-screen one picked up the headline and haloed the white text. */}
      <Bloom id="bloomTop" size={420} style={styles.bloomTop} />
      <Bloom id="bloomBottom" size={340} style={styles.bloomBottom} />

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* Fixed layout — everything fits one screen, the spacer absorbs the slack. */}
        <View style={styles.content}>
          <Animated.View style={[styles.brandRow, brandEntrance]}>
            <Image source={require("../assets/VouchPay_With_Name.png")} style={styles.mark} />
            <AppText style={styles.wordmark}>VouchPay</AppText>
          </Animated.View>

          {/* Headline owns the screen — this is a brand moment, not a dashboard. */}
          <Animated.View style={[{ marginTop: compact ? Spacing.xl : 52 }, headlineEntrance]}>
            <AppText
              style={[styles.headline, compact && styles.headlineCompact]}
              maxFontSizeMultiplier={1}
            >
              {"Stop losing money on "}
              <AppText
                style={[styles.headline, styles.headlineAccent, compact && styles.headlineCompact]}
                maxFontSizeMultiplier={1}
              >
                bad jobs.
              </AppText>
            </AppText>
            <AppText style={styles.subhead}>
              The credibility record for Australian construction — earned on the job, not written on
              a website.
            </AppText>
          </Animated.View>

          <Animated.View style={[styles.proofCard, proofEntrance]}>
            {PROOF.map((item, i) => (
              <View key={item}>
                {i > 0 ? <View style={styles.divider} /> : null}
                <View style={styles.proofRow}>
                  <View style={styles.proofNum}>
                    <AppText style={styles.proofNumText}>{i + 1}</AppText>
                  </View>
                  <AppText style={styles.proofTitle}>{item}</AppText>
                </View>
              </View>
            ))}
          </Animated.View>

          <View style={styles.spacer} />

          <Animated.View style={[styles.footer, ctaEntrance]}>
            <Animated.View style={{ transform: [{ scale: primaryPress.scale }] }}>
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={() => router.push("/(auth)/sign-up")}
                onPressIn={primaryPress.onPressIn}
                onPressOut={primaryPress.onPressOut}
                activeOpacity={0.9}
                accessibilityRole="button"
                accessibilityLabel="Create your profile"
              >
                <AppText style={styles.primaryBtnText}>Create your profile</AppText>
              </TouchableOpacity>
            </Animated.View>

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push("/(auth)/sign-in")}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Sign in to an existing account"
            >
              <AppText style={styles.secondaryBtnText}>Sign in</AppText>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={[styles.trustRow, trustEntrance]}>
            <View style={styles.nswLogoBox}>
              <Image source={require("../assets/nsw-government-logo.png")} style={styles.nswLogo} />
            </View>
            <View style={styles.trustCopy}>
              <AppText style={styles.trustTitle}>Backed by NSW Government</AppText>
              <AppText style={styles.trustDesc}>MVP Innovation Grant</AppText>
            </View>
          </Animated.View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  bloom: { position: "absolute" },
  bloomTop: { top: -150, right: -130 },
  bloomBottom: { bottom: -140, left: -120 },
  safe: { flex: 1 },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.gap,
  },
  mark: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    resizeMode: "cover",
  },
  wordmark: {
    fontSize: 26,
    fontFamily: Fonts.extraBold,
    color: Colors.white,
    letterSpacing: 0.2,
  },
  headline: {
    fontSize: 40,
    lineHeight: 46,
    fontFamily: Fonts.extraBold,
    color: Colors.white,
    letterSpacing: -1,
  },
  headlineCompact: {
    fontSize: 33,
    lineHeight: 39,
  },
  headlineAccent: {
    color: Colors.vouchGreenAccent,
  },
  subhead: {
    marginTop: Spacing.md,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: Fonts.regular,
    color: Colors.white,
    opacity: 0.72,
  },
  proofCard: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.glassFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.glassBorder,
    borderRadius: 20,
    paddingHorizontal: Spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.glassBorder,
  },
  proofRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.gap + 2,
    paddingVertical: 17,
  },
  proofNum: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    backgroundColor: Colors.whiteGloss,
    alignItems: "center",
    justifyContent: "center",
  },
  proofNumText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.vouchGreenAccent,
  },
  proofTitle: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontFamily: Fonts.medium,
    color: Colors.white,
  },
  spacer: {
    flex: 1,
    minHeight: Spacing.lg,
  },
  footer: {
    gap: Spacing.gap + 2,
  },
  primaryBtn: {
    height: Size.button,
    backgroundColor: Colors.vouchGreenAccent,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  secondaryBtn: {
    height: Size.button,
    backgroundColor: Colors.glassFill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.gap,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.gap + 2,
    marginTop: Spacing.md,
  },
  nswLogoBox: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  nswLogo: {
    width: 26,
    height: 26,
    resizeMode: "contain",
  },
  trustCopy: { flexShrink: 1 },
  trustTitle: {
    fontSize: 13.5,
    fontFamily: Fonts.semiBold,
    color: Colors.textPrimary,
  },
  trustDesc: {
    fontSize: 13.5,
    fontFamily: Fonts.regular,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
