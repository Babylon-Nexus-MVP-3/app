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

export default function HomeScreen() {
  const { user, fetchWithAuth } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const [pendingCount, setPendingCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [vouchRes, notifRes] = await Promise.all([
        fetchWithAuth(`${API_BASE_URL}/vouch/pending-requests`),
        fetchWithAuth(`${API_BASE_URL}/vouch/notifications`),
      ]);
      const vouchData = await vouchRes.json();
      const notifData = await notifRes.json();
      setPendingCount(vouchData.requests?.length ?? 0);
      setUnreadCount(
        (notifData.notifications ?? []).filter((n: { read: boolean }) => !n.read).length
      );
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
          <AppText style={styles.greeting}>{`G'day, ${firstName}.`}</AppText>
          <AppText style={styles.subtitle}>What do you want to do today?</AppText>
        </View>

        {/* Cards */}
        <View style={styles.cards}>
          {/* Get Vouched */}
          <TouchableOpacity
            style={[styles.card, styles.cardGetVouched]}
            activeOpacity={0.7}
            onPress={() => router.push("/(app)/get-vouched")}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="shield-checkmark-outline" size={28} color={Colors.vouchGreen} />
            </View>
            <View style={styles.cardContent}>
              <AppText style={styles.cardTitle}>Get Vouched</AppText>
              <AppText style={styles.cardDesc}>
                Build your Vouch profile. Apply for supplier credit accounts faster.
              </AppText>
            </View>
          </TouchableOpacity>

          {/* Give a Vouch */}
          <TouchableOpacity
            style={[styles.card, styles.cardDefault]}
            activeOpacity={0.7}
            onPress={() => router.push("/(app)/give-vouch")}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="person-outline" size={28} color={Colors.black} />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardTitleRow}>
                <AppText style={styles.cardTitle}>Give a Vouch</AppText>
                {pendingCount > 0 && (
                  <View style={styles.newBadge}>
                    <AppText style={styles.newBadgeText}>{pendingCount} NEW</AppText>
                  </View>
                )}
              </View>
              <AppText style={styles.cardDesc}>
                {"Vouch a person or business you've worked with. Or respond to a request."}
              </AppText>
            </View>
          </TouchableOpacity>

          {/* Apply for supplier credit — locked */}
          <TouchableOpacity
            style={[styles.card, styles.cardLocked]}
            activeOpacity={0.7}
            onPress={() =>
              Alert.alert("Locked", "Complete your vouch profile to unlock.", [{ text: "OK" }])
            }
          >
            <View style={styles.cardIcon}>
              <Ionicons name="card-outline" size={28} color={Colors.grey500} />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardTitleRow}>
                <AppText style={styles.cardTitle}>Apply for supplier credit</AppText>
                <View style={styles.lockedBadge}>
                  <AppText style={styles.lockedBadgeText}>LOCKED</AppText>
                </View>
              </View>
              <AppText style={styles.cardDesc}>
                {"Instant multiple applications with Vouchpay"}
              </AppText>
            </View>
          </TouchableOpacity>

          {/* Vouch my Project — locked, navigates to existing projects screen */}
          <TouchableOpacity
            style={[styles.card, styles.cardLocked]}
            activeOpacity={0.7}
            onPress={() => router.push("/(app)/vouch-my-project")}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="sync-circle-outline" size={28} color={Colors.grey500} />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardTitleRow}>
                <AppText style={styles.cardTitle}>Vouch my Project</AppText>
                <View style={styles.lockedBadge}>
                  <AppText style={styles.lockedBadgeText}>LOCKED</AppText>
                </View>
              </View>
              <AppText style={styles.cardDesc}>{"See your project's payment health."}</AppText>
            </View>
          </TouchableOpacity>
        </View>
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
    marginBottom: 32,
  },
  greeting: {
    fontSize: 36,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  cards: {
    gap: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 16,
    padding: 24,
    gap: 16,
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
    borderWidth: 0,
  },
  cardIcon: {
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.black,
    flex: 1,
  },
  cardDesc: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.grey700,
    lineHeight: 23,
  },
  newBadge: {
    backgroundColor: "#FDECEA",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  newBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.red,
  },
  lockedBadge: {
    backgroundColor: Colors.amberBg,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
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
