import { useCallback, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

function computeStrength(
  user: { name?: string; abn?: string; businessTrade?: string } | null,
  vouchProfile: Record<string, string> | null,
  respondedCount: number
): number {
  let pct = 0;
  const hasTrade = !!(user?.businessTrade || vouchProfile?.trade);
  if (user?.name && user?.abn && hasTrade) pct += 20;
  if (vouchProfile?.currentProjectName) pct += 15;
  if (respondedCount >= 1) pct += 20;
  if (respondedCount >= 2) pct += 20;
  if (vouchProfile?.pastProjectName) pct += 15;
  if (vouchProfile?.idNumber) pct += 10;
  return pct;
}

export default function VouchMyProjectScreen() {
  const { user, fetchWithAuth } = useAuth();
  const [respondedCount, setRespondedCount] = useState(0);
  const [vouchProfile, setVouchProfile] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      Promise.all([
        fetchWithAuth(`${API_BASE_URL}/vouch/requests/sent`).then((r) => (r.ok ? r.json() : null)),
        fetchWithAuth(`${API_BASE_URL}/vouch/profile/me`).then((r) => (r.ok ? r.json() : null)),
      ])
        .then(([sentData, profileData]) => {
          if (!cancelled) {
            const requests: { status: string }[] = sentData?.requests ?? [];
            setRespondedCount(requests.filter((r) => r.status === "responded").length);
            if (profileData) setVouchProfile(profileData);
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [fetchWithAuth])
  );

  const strength = computeStrength(user, vouchProfile, respondedCount);
  const isUnlocked = strength === 100;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle} numberOfLines={1}>
          CREATE MY PROJECT
        </AppText>
        <TouchableOpacity hitSlop={8}>
          <Ionicons name="help-circle-outline" size={24} color={Colors.grey500} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero illustration */}
        <View style={styles.heroContainer}>
          <View style={[styles.heroBigCircle, isUnlocked && styles.heroBigCircleUnlocked]}>
            <Ionicons
              name={isUnlocked ? "shield-checkmark-outline" : "radio-button-on-outline"}
              size={38}
              color={isUnlocked ? Colors.vouchGreen : Colors.amber}
            />
          </View>
          {!isUnlocked && (
            <View style={styles.heroLockBadge}>
              <Ionicons name="lock-closed-outline" size={14} color={Colors.black} />
            </View>
          )}
        </View>

        {/* Heading */}
        <AppText style={styles.heading}>
          {isUnlocked ? "Your project is ready." : "Your project health is locked."}
        </AppText>
        <AppText style={styles.subheading}>
          {isUnlocked
            ? "Connect a project to start tracking payment health and building trust."
            : `Connect a project to start tracking${"\n"}payment health and build trust.`}
        </AppText>

        {/* Vouch gate notice */}
        {!loading && (
          <View style={styles.gateCard}>
            <Ionicons
              name={isUnlocked ? "shield-checkmark-outline" : "lock-closed-outline"}
              size={18}
              color={isUnlocked ? Colors.vouchGreen : Colors.amber}
            />
            <View style={styles.gateText}>
              <AppText style={styles.gateTitle}>
                {isUnlocked ? "Profile complete" : "Complete your profile to unlock"}
              </AppText>
              <AppText style={styles.gateDesc}>
                {isUnlocked
                  ? "Your profile is 100% — you can now set up your project."
                  : `Your profile is ${strength}% complete. Finish all 6 steps to unlock project creation.`}
              </AppText>
            </View>
          </View>
        )}

        {/* What your score will show */}
        <View style={[styles.featureCard, isUnlocked && styles.featureCardUnlocked]}>
          <AppText style={[styles.featureCardLabel, isUnlocked && styles.featureCardLabelUnlocked]}>
            WHAT YOUR SCORE WILL SHOW
          </AppText>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons
                name="pulse-outline"
                size={20}
                color={isUnlocked ? Colors.vouchGreen : Colors.amber}
              />
            </View>
            <View style={styles.featureText}>
              <AppText style={styles.featureTitle}>Payment health on active projects</AppText>
              <AppText style={styles.featureDesc}>
                See how your project is flowing in real time.
              </AppText>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons
                name="calendar-outline"
                size={20}
                color={isUnlocked ? Colors.vouchGreen : Colors.amber}
              />
            </View>
            <View style={styles.featureText}>
              <AppText style={styles.featureTitle}>
                Calendar view of Project Financial Health
              </AppText>
              <AppText style={styles.featureDesc}>
                Every claim, every due date, all in one place.
              </AppText>
            </View>
          </View>
        </View>

        {/* Privacy card */}
        <View style={styles.privacyCard}>
          <Ionicons name="lock-closed-outline" size={18} color={Colors.vouchGreen} />
          <View style={styles.privacyText}>
            <AppText style={styles.privacyTitle}>Amounts stay off your public profile</AppText>
            <AppText style={styles.privacyDesc}>
              Invoice values are visible to your project team only. Vouch tracks payment timing —
              not dollar amounts.
            </AppText>
          </View>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={[styles.ctaButton, (!isUnlocked || loading) && styles.ctaButtonLocked]}
          activeOpacity={isUnlocked ? 0.85 : 1}
          onPress={() => {
            if (isUnlocked) router.push("/(app)/projects");
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <AppText style={styles.ctaText}>
              {isUnlocked ? "Set up my project →" : "Set up my project"}
            </AppText>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
    letterSpacing: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: "center",
  },
  heroContainer: {
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    width: 84,
    height: 84,
  },
  heroBigCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.beige,
    alignItems: "center",
    justifyContent: "center",
  },
  heroBigCircleUnlocked: {
    backgroundColor: Colors.vouchGreenLight,
  },
  heroLockBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontSize: 26,
    fontFamily: Fonts.extraBold,
    color: Colors.black,
    textAlign: "center",
    marginBottom: 10,
  },
  subheading: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.grey700,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  featureCard: {
    width: "100%",
    backgroundColor: Colors.beige,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    gap: 16,
  },
  featureCardLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.amber,
    letterSpacing: 0.8,
  },
  featureCardUnlocked: {
    backgroundColor: Colors.vouchGreenLight,
  },
  featureCardLabelUnlocked: {
    color: Colors.vouchGreen,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey700,
    lineHeight: 19,
  },
  privacyCard: {
    width: "100%",
    backgroundColor: Colors.vouchGreenLight,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  privacyText: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: 4,
  },
  privacyDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey700,
    lineHeight: 19,
  },
  ctaContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.grey300,
  },
  ctaButton: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
  },
  ctaButtonLocked: {
    backgroundColor: Colors.grey300,
  },
  ctaText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  gateCard: {
    width: "100%",
    backgroundColor: Colors.beige,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 16,
  },
  gateText: {
    flex: 1,
  },
  gateTitle: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: 4,
  },
  gateDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey700,
    lineHeight: 19,
  },
});
