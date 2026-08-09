import {
  Alert,
  Animated,
  Easing,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import { ListRow } from "@/components/ListRow";
import { ActionTile } from "@/components/ActionTile";
import { SectionLabel } from "@/components/ui";
import { useVouchProfile } from "@/lib/useVouchProfile";
import { useEntrance, useReduceMotion } from "@/lib/motion";

type SentRequest = {
  _id: string;
  status: "pending" | "responded";
  createdAt: string;
  respondedAt?: string;
};

/**
 * Profile strength meter — the bar fills and the percentage counts up to the
 * real value whenever it changes, so progress is felt rather than just read.
 */
function StrengthMeter({ pct, reduceMotion }: { pct: number; reduceMotion: boolean }) {
  // Width can't be native-driven, but this is one small view so the JS-driven
  // interpolation is cheap. The label counts up off the same value.
  const anim = useRef(new Animated.Value(0)).current;
  const [displayPct, setDisplayPct] = useState(0);

  useEffect(() => {
    const id = anim.addListener(({ value }) => setDisplayPct(Math.round(value)));
    return () => anim.removeListener(id);
  }, [anim]);

  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(pct);
      setDisplayPct(pct);
      return;
    }
    const animation = Animated.timing(anim, {
      toValue: pct,
      duration: 900,
      delay: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [anim, pct, reduceMotion]);

  const width = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <>
      <View style={styles.strengthRow}>
        <AppText style={styles.strengthLabel}>Profile strength</AppText>
        <AppText style={styles.strengthPct}>{displayPct}%</AppText>
      </View>
      <View style={styles.strengthTrack}>
        <Animated.View style={[styles.strengthFill, { width }]} />
      </View>
    </>
  );
}

export default function HomeScreen() {
  const { user, fetchWithAuth } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sentRequests, setSentRequests] = useState<SentRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Profile strength comes from the shared hook, which owns the fetch and the
  // cross-mount cache for every screen that shows it.
  const { profileStrength, stepsDone, isComplete, refresh: refreshProfile } = useVouchProfile();

  const fetchData = useCallback(async () => {
    try {
      const [vouchRes, vouchNotifRes, projectNotifRes, sentRes] = await Promise.all([
        fetchWithAuth(`${API_BASE_URL}/vouch/pending-requests`),
        fetchWithAuth(`${API_BASE_URL}/vouch/notifications`),
        fetchWithAuth(`${API_BASE_URL}/notifications`),
        fetchWithAuth(`${API_BASE_URL}/vouch/requests/sent`),
      ]);
      const vouchData = await vouchRes.json();
      const vouchNotifData = vouchNotifRes.ok ? await vouchNotifRes.json() : null;
      const projectNotifData = projectNotifRes.ok ? await projectNotifRes.json() : null;
      const sentData = sentRes.ok ? await sentRes.json() : null;

      setPendingCount(vouchData.requests?.length ?? 0);
      const vouchUnread = (vouchNotifData?.notifications ?? []).filter(
        (n: { read: boolean }) => !n.read
      ).length;
      const projectUnread = (projectNotifData?.notifications ?? []).filter(
        (n: { read: boolean }) => !n.read
      ).length;
      setUnreadCount(vouchUnread + projectUnread);
      const requests: SentRequest[] = sentData?.requests ?? [];
      setSentRequests(requests);
    } catch {}
  }, [fetchWithAuth]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([fetchData(), refreshProfile()]);
    setRefreshing(false);
  }

  const strength = profileStrength ?? 0;
  // Until the profile has actually loaded we don't know whether anything is
  // locked, so don't assert that it is — a padlock that disappears a moment
  // later reads as the app changing its mind.
  const strengthKnown = profileStrength !== null;
  const pendingSentCount = sentRequests.filter((r) => r.status === "pending").length;
  // Both gates are the same rule — a complete profile — and both come from the
  // server rather than being re-derived from the percentage here.
  const canCreateProject = isComplete !== false;
  // Giving a vouch puts your name behind someone else's work, so your own
  // profile has to be complete first. Receiving one is open to everyone.
  const profileVerified = isComplete !== false;

  const reduceMotion = useReduceMotion();
  const heroEntrance = useEntrance(0, reduceMotion);
  const reputationLabelEntrance = useEntrance(60, reduceMotion);
  const projectsLabelEntrance = useEntrance(270, reduceMotion);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* ── Hero: brand, greeting and profile strength on one green block ── */}
      <Animated.View style={[styles.hero, heroEntrance]}>
        <View style={styles.heroTopRow}>
          <AppText style={styles.logo}>VouchPay</AppText>
          <TouchableOpacity
            hitSlop={8}
            onPress={() => router.push("/(app)/notifications")}
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
            }
          >
            <View>
              <Ionicons name="notifications-outline" size={24} color={Colors.white} />
              {unreadCount > 0 && (
                <View style={styles.bellBadge}>
                  <AppText style={styles.bellBadgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </AppText>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>

        <AppText style={styles.greeting}>{`G'day, ${firstName}.`}</AppText>

        {strength === 100 ? (
          <View style={styles.verifiedPill}>
            <Ionicons name="shield-checkmark" size={15} color={Colors.white} />
            <AppText style={styles.verifiedPillText}>Profile fully verified</AppText>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.strengthBlock}
            activeOpacity={0.8}
            onPress={() => router.push("/(app)/get-vouched")}
            accessibilityRole="button"
            accessibilityLabel={`Profile strength ${strength} percent. Open build your profile.`}
          >
            <StrengthMeter pct={strength} reduceMotion={reduceMotion} />
            {/* Strength is your details plus your trade licence — vouches and
                projects deliberately don't count, so don't suggest they do. */}
            <AppText style={styles.strengthHint}>
              {!stepsDone[0]
                ? "Add your details and trade licence to reach 100% and unlock giving vouches and creating projects."
                : "Almost there — add your trade licence to reach 100%."}
            </AppText>
          </TouchableOpacity>
        )}
      </Animated.View>

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <ScrollView
        style={styles.sheet}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
        // The native tab bar is translucent and sits over the content, so the
        // scroll view has to inset for it or the last row stays under it.
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.vouchGreen}
          />
        }
      >
        <Animated.View style={reputationLabelEntrance}>
          <SectionLabel>Your reputation</SectionLabel>
        </Animated.View>
        <View style={styles.section}>
          <ListRow
            icon="shield-checkmark-outline"
            tone="primary"
            title="Build your profile"
            subtitle={
              !strengthKnown
                ? "Your details and trade licence"
                : strength === 100
                  ? "Fully verified"
                  : `${strength}% complete`
            }
            onPress={() => router.push("/(app)/get-vouched")}
            accessibilityLabel="Build your profile"
            delay={90}
            reduceMotion={reduceMotion}
          />

          {/* The two halves of a vouch, given equal weight side by side. */}
          <View style={styles.tileRow}>
            <ActionTile
              icon="person-add-outline"
              title="Request a vouch"
              subtitle="Ask someone you've worked with"
              count={pendingSentCount}
              onPress={() => router.push("/(app)/get-vouched/request-vouch")}
              accessibilityLabel={
                pendingSentCount > 0
                  ? `Request a vouch, ${pendingSentCount} pending`
                  : "Request a vouch"
              }
              delay={230}
              reduceMotion={reduceMotion}
            />
            <ActionTile
              icon="people-outline"
              tone={profileVerified ? "default" : "locked"}
              title="Give a vouch"
              subtitle={profileVerified ? "Vouch for someone" : "Complete your profile first"}
              count={profileVerified ? pendingCount : 0}
              onPress={() => {
                if (profileVerified) {
                  router.push("/(app)/give-vouch");
                } else {
                  router.push("/(app)/get-vouched");
                }
              }}
              accessibilityLabel={
                profileVerified
                  ? `Give a vouch${pendingCount > 0 ? `, ${pendingCount} pending` : ""}`
                  : "Give a vouch, complete your profile first"
              }
              delay={270}
              reduceMotion={reduceMotion}
            />
          </View>
        </View>

        <Animated.View style={projectsLabelEntrance}>
          <SectionLabel>Projects</SectionLabel>
        </Animated.View>
        <View style={styles.section}>
          <View style={styles.tileRow}>
            <ActionTile
              icon="enter-outline"
              title="Join a project"
              subtitle="Enter your invite code"
              onPress={() => router.push("/(app)/join-project")}
              accessibilityLabel="Join a project"
              delay={330}
              reduceMotion={reduceMotion}
            />
            <ActionTile
              icon="business-outline"
              tone={canCreateProject ? "default" : "locked"}
              title="Create a project"
              subtitle={canCreateProject ? "Invite your team" : "Complete your profile first"}
              onPress={() => router.push("/(app)/(tabs)/vouch-my-project")}
              accessibilityLabel={
                canCreateProject ? "Create a project" : "Create a project, complete profile first"
              }
              delay={370}
              reduceMotion={reduceMotion}
            />
          </View>

          <ListRow
            icon="card-outline"
            tone="locked"
            title="Supplier credit"
            subtitle="Apply using your profile"
            tag="Coming soon"
            onPress={() =>
              Alert.alert(
                "Supplier Credit",
                "Supplier Credit will unlock as your trust signals grow. Keep building your profile on VouchPay.",
                [{ text: "Got it" }]
              )
            }
            accessibilityLabel="Supplier credit, coming soon"
            delay={440}
            reduceMotion={reduceMotion}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // The safe area carries the hero colour so the status bar area is green too.
  safe: {
    flex: 1,
    backgroundColor: Colors.vouchGreen,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  hero: {
    backgroundColor: Colors.vouchGreen,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 22,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  logo: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    color: Colors.white,
    letterSpacing: 0.5,
  },
  greeting: {
    fontSize: 30,
    fontFamily: Fonts.bold,
    color: Colors.white,
    marginBottom: 16,
  },
  verifiedPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 7,
    backgroundColor: Colors.whiteGloss,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  verifiedPillText: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.white },
  strengthBlock: {
    backgroundColor: Colors.whiteGloss,
    borderRadius: 16,
    padding: 14,
  },
  strengthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  strengthLabel: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.white },
  strengthPct: { fontSize: 15, fontFamily: Fonts.extraBold, color: Colors.white },
  strengthTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.whiteInactive,
    overflow: "hidden",
    marginBottom: 8,
  },
  strengthFill: { height: 6, borderRadius: 3, backgroundColor: Colors.white },
  strengthHint: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.white, opacity: 0.85 },
  sheet: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  sheetContent: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 44,
  },
  section: { gap: 10, marginBottom: 24 },
  // Defined here rather than imported: an imported style object can be
  // undefined for a frame, and an undefined style falls back to column —
  // which made the tiles stack vertically before snapping side by side.
  tileRow: { flexDirection: "row", gap: 10 },
  bellBadge: {
    position: "absolute",
    top: -4,
    right: -6,
    backgroundColor: Colors.red,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
});
