import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

type VouchNotif = {
  _id: string;
  type: "vouch_received" | "vouch_request";
  fromName: string;
  fromCompany: string;
  toBusinessName?: string;
  projectName?: string;
  read: boolean;
  createdAt: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function NotifCard({ item }: { item: VouchNotif }) {
  const isReceived = item.type === "vouch_received";
  const message = isReceived
    ? `${item.fromName} vouched for ${item.toBusinessName ?? "your business"}.`
    : `${item.fromName} from ${item.fromCompany} requested a vouch for ${item.projectName ?? "a project"}.`;

  return (
    <TouchableOpacity
      style={[styles.card, !item.read && styles.cardUnread]}
      activeOpacity={0.7}
      onPress={() => router.push("/(app)/vouches")}
    >
      <View style={styles.iconWrap}>
        <Ionicons
          name={isReceived ? "shield-checkmark-outline" : "person-add-outline"}
          size={22}
          color={Colors.vouchGreen}
        />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardMessage}>{message}</Text>
        <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function VouchNotifications() {
  const { fetchWithAuth } = useAuth();
  const [notifications, setNotifications] = useState<VouchNotif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const hasUnread = notifications.some((n) => !n.read);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/vouch/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } catch {}
  }, [fetchWithAuth]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function markAllRead() {
    await fetchWithAuth(`${API_BASE_URL}/vouch/notifications/read-all`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} style={styles.headerSide}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
        <View style={styles.headerSide}>
          {hasUnread ? (
            <TouchableOpacity onPress={markAllRead} hitSlop={8}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.vouchGreen} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyContent : styles.listContent
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.vouchGreen}
            />
          }
          renderItem={({ item }) => <NotifCard item={item} />}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="notifications-off-outline" size={48} color={Colors.grey300} />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
        />
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
  headerSide: {
    width: 90,
  },
  headerTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.grey500,
    letterSpacing: 1,
    textAlign: "center",
  },
  markAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.vouchGreen,
  },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  emptyText: { fontSize: 14, color: Colors.grey500 },
  listContent: { padding: 16, gap: 10 },
  emptyContent: { flex: 1 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.grey300,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.vouchGreen,
    borderColor: Colors.vouchGreen,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.vouchGreenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 4 },
  cardMessage: { fontSize: 14, fontWeight: "500", color: Colors.black, lineHeight: 20 },
  cardTime: { fontSize: 12, color: Colors.grey500 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.vouchGreen,
  },
});
