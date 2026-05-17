import { useCallback, useState } from "react";
import { View, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

type SentRequest = {
  _id: string;
  toMobile: string;
  toEmail?: string;
  relationship: string;
  projectName: string;
  status: "pending" | "responded";
  createdAt: string;
};

export default function VouchRequestsScreen() {
  const { fetchWithAuth } = useAuth();
  const [requests, setRequests] = useState<SentRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchWithAuth(`${API_BASE_URL}/vouch/requests/sent`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setRequests(data?.requests ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [fetchWithAuth])
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>VOUCH REQUESTS</AppText>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.vouchGreen} />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="time-outline" size={40} color={Colors.grey300} />
          <AppText style={styles.emptyText}>No requests sent yet.</AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <AppText style={styles.sectionLabel}>REFERENCE STATUS</AppText>
          {requests.map((r) => {
            const done = r.status === "responded";
            return (
              <View key={r._id} style={styles.card}>
                <View style={[styles.dot, done ? styles.dotDone : styles.dotPending]} />
                <View style={{ flex: 1 }}>
                  <AppText style={styles.contact}>{r.toEmail || r.toMobile}</AppText>
                  <AppText style={styles.meta}>
                    {[r.relationship, r.projectName].filter(Boolean).join(" · ")}
                  </AppText>
                </View>
                <View style={[styles.badge, done ? styles.badgeDone : styles.badgePending]}>
                  <AppText
                    style={[
                      styles.badgeText,
                      done ? styles.badgeTextDone : styles.badgeTextPending,
                    ]}
                  >
                    {done ? "Responded" : "Pending"}
                  </AppText>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
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
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 15, fontFamily: Fonts.regular, color: Colors.grey500 },
  scroll: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32, gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotDone: { backgroundColor: Colors.vouchGreen },
  dotPending: { backgroundColor: Colors.amber },
  contact: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.black },
  meta: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.grey500, marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeDone: { backgroundColor: Colors.vouchGreenLight },
  badgePending: { backgroundColor: Colors.amberBg },
  badgeText: { fontSize: 11, fontFamily: Fonts.bold },
  badgeTextDone: { color: Colors.vouchGreen },
  badgeTextPending: { color: Colors.amber },
});
