import {
  Alert,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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

function StrengthBar({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? Colors.vouchGreen : pct >= 40 ? Colors.amber : Colors.red;
  return (
    <View style={sb.wrap}>
      <View style={sb.row}>
        <AppText style={sb.label}>Profile strength</AppText>
        <AppText style={[sb.pct, { color }]}>{pct}%</AppText>
      </View>
      <View style={sb.track}>
        <View style={[sb.fill, { width: `${pct}%` as any, backgroundColor: color }]} />
      </View>
      {pct < 100 && (
        <AppText style={sb.hint}>
          {pct === 0
            ? "Complete your profile to unlock all features."
            : pct < 60
              ? "Keep going — add vouches to strengthen your profile."
              : "Almost there! Verify your ID for 100%."}
        </AppText>
      )}
    </View>
  );
}

const sb = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.black },
  pct: { fontSize: 13, fontFamily: Fonts.bold },
  track: {
    height: 6,
    backgroundColor: Colors.grey300,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },
  fill: { height: 6, borderRadius: 3 },
  hint: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.grey500 },
});

export default function HomeScreen() {
  const { user, fetchWithAuth } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [respondedCount, setRespondedCount] = useState(0);
  const [vouchProfile, setVouchProfile] = useState<Record<string, string> | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [vouchRes, notifRes, sentRes, profileRes] = await Promise.all([
        fetchWithAuth(`${API_BASE_URL}/vouch/pending-requests`),
        fetchWithAuth(`${API_BASE_URL}/vouch/notifications`),
        fetchWithAuth(`${API_BASE_URL}/vouch/requests/sent`),
        fetchWithAuth(`${API_BASE_URL}/vouch/profile/me`),
      ]);
      const vouchData = await vouchRes.json();
      const notifData = await notifRes.json();
      const sentData = sentRes.ok ? await sentRes.json() : null;
      const profileData = profileRes.ok ? await profileRes.json() : null;

      setPendingCount(vouchData.requests?.length ?? 0);
      setUnreadCount(
        (notifData.notifications ?? []).filter((n: { read: boolean }) => !n.read).length
      );
      const responded = (sentData?.requests ?? []).filter(
        (r: { status: string }) => r.status === "responded"
      ).length;
      setRespondedCount(responded);
      if (profileData) setVouchProfile(profileData);
    } catch {}
  }, [fetchWithAuth]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  const strength = computeStrength(user, vouchProfile, respondedCount);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.vouchGreen}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <AppText style={styles.logo}>VOUCHPAY</AppText>
          <TouchableOpacity hitSlop={8} onPress={() => router.push("/(app)/vouch-notifications")}>
            <View>
              <Ionicons name="notifications-outline" size={24} color={Colors.vouchGreen} />
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

        {/* Greeting */}
        <View style={styles.greetingSection}>
          <View style={styles.greetingRow}>
            <AppText style={styles.greeting}>{`G'day, ${firstName}.`}</AppText>
            {strength === 100 && (
              <Ionicons name="shield-checkmark" size={30} color={Colors.vouchGreen} />
            )}
          </View>
          <AppText style={styles.subtitle}>
            {strength === 100 ? "Profile fully verified." : "What do you want to do today?"}
          </AppText>
        </View>

        {/* Profile Strength — hidden once fully complete */}
        {strength < 100 && <StrengthBar pct={strength} />}

        {/* 2x2 Card Grid */}
        <View style={styles.grid}>
          {/* Get Vouched */}
          <TouchableOpacity
            style={[styles.card, styles.cardGetVouched]}
            activeOpacity={0.7}
            onPress={() => router.push("/(app)/get-vouched")}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="shield-checkmark-outline" size={26} color={Colors.vouchGreen} />
            </View>
            <AppText style={styles.cardTitle}>Get Vouched</AppText>
            <AppText style={styles.cardDesc}>Build your profile</AppText>
          </TouchableOpacity>

          {/* Join a Project */}
          <TouchableOpacity
            style={[styles.card, styles.cardDefault]}
            activeOpacity={0.7}
            onPress={() => router.push("/(app)/join-project")}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="enter-outline" size={26} color={Colors.black} />
            </View>
            <AppText style={styles.cardTitle}>Join a Project</AppText>
            <AppText style={styles.cardDesc}>Enter invite code</AppText>
          </TouchableOpacity>

          {/* Create my Project */}
          <TouchableOpacity
            style={[styles.card, strength === 100 ? styles.cardDefault : styles.cardLocked]}
            activeOpacity={0.7}
            onPress={() => router.push("/(app)/(tabs)/vouch-my-project")}
          >
            <View style={styles.cardIcon}>
              <Ionicons
                name="sync-circle-outline"
                size={26}
                color={strength === 100 ? Colors.black : Colors.grey500}
              />
            </View>
            <AppText style={[styles.cardTitle, strength < 100 && styles.cardTitleLocked]}>
              Create my Project
            </AppText>
            <AppText style={styles.cardDesc}>
              {strength === 100 ? "Set up your project" : "Complete profile first"}
            </AppText>
          </TouchableOpacity>

          {/* Give a Vouch — locked until 2 vouches received */}
          <TouchableOpacity
            style={[styles.card, respondedCount >= 2 ? styles.cardDefault : styles.cardLocked]}
            activeOpacity={0.7}
            onPress={() => {
              if (respondedCount >= 2) {
                router.push("/(app)/give-vouch");
              } else {
                Alert.alert(
                  "2 Vouches Required",
                  "You need at least 2 people to vouch for you before you can vouch for others. Head to Get Vouched to request your vouches.",
                  [{ text: "Got it" }]
                );
              }
            }}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="person-outline" size={26} color={respondedCount >= 2 ? Colors.black : Colors.grey500} />
              {pendingCount > 0 && respondedCount >= 2 && (
                <View style={styles.dotBadge}>
                  <AppText style={styles.dotBadgeText}>{pendingCount}</AppText>
                </View>
              )}
            </View>
            <AppText style={[styles.cardTitle, respondedCount < 2 && styles.cardTitleLocked]}>
              Give a Vouch
            </AppText>
            <AppText style={styles.cardDesc}>
              {respondedCount >= 2 ? "Vouch for others" : "Needs 2 vouches"}
            </AppText>
          </TouchableOpacity>
        </View>

        {/* Apply for supplier credit — full width, locked */}
        <TouchableOpacity
          style={[styles.wideCard, styles.cardLocked]}
          activeOpacity={0.7}
          onPress={() =>
            Alert.alert(
              "Supplier Credit",
              "Supplier Credit will unlock as your trust signals grow. Keep building your profile on VouchPay.",
              [{ text: "Got it" }]
            )
          }
        >
          <View style={styles.wideCardLeft}>
            <Ionicons name="card-outline" size={26} color={Colors.grey500} />
          </View>
          <View style={styles.wideCardContent}>
            <View style={styles.wideTitleRow}>
              <AppText style={[styles.cardTitle, styles.cardTitleLocked]}>
                Apply for supplier credit
              </AppText>
            </View>
            <AppText style={styles.cardDesc}>Submit applications using your VouchPay profile</AppText>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scroll: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 28,
  },
  logo: {
    fontSize: 26,
    fontFamily: Fonts.extraBold,
    color: Colors.vouchGreen,
    letterSpacing: 1,
  },
  greetingSection: {
    marginBottom: 20,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 36,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 14,
  },
  card: {
    width: "47%",
    borderRadius: 16,
    padding: 18,
    gap: 8,
    minHeight: 130,
  },
  cardGetVouched: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
  },
  cardDefault: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.grey300,
  },
  cardLocked: {
    backgroundColor: Colors.beige,
  },
  cardIcon: {
    marginBottom: 4,
  },
  dotBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: Colors.red,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  dotBadgeText: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  cardTitle: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  cardTitleLocked: {
    color: Colors.grey700,
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  wideCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 18,
    gap: 14,
  },
  wideCardLeft: {
    marginTop: 2,
  },
  wideCardContent: {
    flex: 1,
  },
  wideTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
    flexWrap: "wrap",
  },
  lockedBadge: {
    backgroundColor: Colors.amberBg,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lockedBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.amber,
  },
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
