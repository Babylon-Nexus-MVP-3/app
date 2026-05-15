import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

export default function HomeScreen() {
  const { user, fetchWithAuth } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const [pendingCount, setPendingCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const r = await fetchWithAuth(`${API_BASE_URL}/vouch/pending-requests`);
      const data = await r.json();
      setPendingCount(data.requests?.length ?? 0);
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
          <Text style={styles.logo}>VOUCHPAY</Text>
          <TouchableOpacity hitSlop={8}>
            <Ionicons name="notifications-outline" size={24} color={Colors.vouchGreen} />
          </TouchableOpacity>
        </View>

        {/* Greeting */}
        <View style={styles.greetingSection}>
          <Text style={styles.greeting}>{`G'day, ${firstName}.`}</Text>
          <Text style={styles.subtitle}>What do you want to do today?</Text>
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
              <Ionicons name="shield-checkmark-outline" size={24} color={Colors.vouchGreen} />
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>Get Vouched</Text>
              <Text style={styles.cardDesc}>
                Build your Vouch profile. Apply for supplier credit accounts faster.
              </Text>
            </View>
          </TouchableOpacity>

          {/* Give a Vouch */}
          <TouchableOpacity
            style={[styles.card, styles.cardDefault]}
            activeOpacity={0.7}
            onPress={() => router.push("/(app)/vouches")}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="person-outline" size={24} color={Colors.black} />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Give a Vouch</Text>
                {pendingCount > 0 && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>{pendingCount} NEW</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardDesc}>
                {"Vouch a business you've worked with. Or respond to a request."}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Vouch my Project — locked, navigates to existing projects screen */}
          <TouchableOpacity
            style={[styles.card, styles.cardLocked]}
            activeOpacity={0.7}
            onPress={() => router.push("/(app)/vouch-my-project")}
          >
            <View style={styles.cardIcon}>
              <Ionicons name="sync-circle-outline" size={24} color={Colors.grey500} />
            </View>
            <View style={styles.cardContent}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>Vouch my Project</Text>
                <View style={styles.lockedBadge}>
                  <Text style={styles.lockedBadgeText}>LOCKED</Text>
                </View>
              </View>
              <Text style={styles.cardDesc}>{"See your project's payment health."}</Text>
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
    fontSize: 20,
    fontWeight: "800",
    color: Colors.vouchGreen,
    letterSpacing: 1,
  },
  greetingSection: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 30,
    fontWeight: "700",
    color: Colors.black,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.grey500,
  },
  cards: {
    gap: 14,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 14,
    padding: 18,
    gap: 14,
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
    fontSize: 16,
    fontWeight: "700",
    color: Colors.black,
    flex: 1,
  },
  cardDesc: {
    fontSize: 13,
    color: Colors.grey700,
    lineHeight: 19,
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
    fontWeight: "700",
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
    fontWeight: "700",
    color: Colors.amber,
  },
});
