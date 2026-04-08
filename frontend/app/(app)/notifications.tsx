import { API_BASE_URL } from "@/constants/api";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";

type NotificationType =
  | "ProjectPendingApproval"
  | "ProjectApproved"
  | "ProjectRejected"
  | "ProjectDeleted"
  | "ProjectParticipantRemoved"
  | "InvoiceSubmitted"
  | "InvoiceApproved"
  | "InvoicePaid"
  | "InvoiceRejected"
  | "InvoiceReceived"
  | "InvoiceOverdue14"
  | "InvoiceOverdue21"
  | "InvoiceOverdue28";

interface AppNotification {
  id: string;
  projectId: string;
  projectName?: string;
  invoiceId?: string | null;
  type: NotificationType;
  message: string;
  read: boolean;
  createdAt: string;
}

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

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function iconForType(type: NotificationType): { name: IoniconName; color: string } {
  switch (type) {
    case "ProjectPendingApproval":
      return { name: "time-outline", color: Colors.amber };
    case "ProjectApproved":
      return { name: "checkmark-done-circle-outline", color: Colors.green };
    case "ProjectRejected":
      return { name: "close-circle-outline", color: Colors.red };
    case "ProjectDeleted":
      return { name: "trash-outline", color: Colors.red };
    case "ProjectParticipantRemoved":
      return { name: "person-remove-outline", color: Colors.red };
    case "InvoiceSubmitted":
      return { name: "document-text-outline", color: Colors.navy };
    case "InvoiceApproved":
      return { name: "checkmark-circle-outline", color: Colors.green };
    case "InvoicePaid":
      return { name: "cash-outline", color: Colors.green };
    case "InvoiceRejected":
      return { name: "close-circle-outline", color: Colors.red };
    case "InvoiceReceived":
      return { name: "download-outline", color: Colors.purple };
    case "InvoiceOverdue14":
    case "InvoiceOverdue21":
    case "InvoiceOverdue28":
      return { name: "warning-outline", color: Colors.amber };
  }
}

function NotificationCard({ item, onPress }: { item: AppNotification; onPress: () => void }) {
  const icon = iconForType(item.type);
  return (
    <TouchableOpacity
      style={[styles.card, !item.read && styles.cardUnread]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.iconWrap, { backgroundColor: icon.color + "18" }]}>
        <Ionicons name={icon.name} size={22} color={icon.color} />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardMessage}>{item.message}</Text>
        {!!item.projectName && <Text style={styles.cardProjectName}>{item.projectName}</Text>}
        <Text style={styles.cardTime}>{timeAgo(item.createdAt)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function Notifications() {
  const { fetchWithAuth } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const hasUnread = notifications.some((n) => !n.read);

  async function fetchNotifications() {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function markAllRead() {
    await fetchWithAuth(`${API_BASE_URL}/notifications/read-all`, {
      method: "PATCH",
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchWithAuth(`${API_BASE_URL}/notifications`)
        .then((res) => {
          if (res.ok) return res.json();
        })
        .then((data) => {
          if (data) setNotifications(data.notifications ?? []);
        })
        .finally(() => setLoading(false));
    }, [fetchWithAuth])
  );

  function onRefresh() {
    setRefreshing(true);
    fetchNotifications();
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.header}>
        <SafeAreaView edges={["top"]}>
          <View style={styles.headerRow}>
            <Text style={styles.screenTitle}>Notifications</Text>
            {hasUnread && (
              <TouchableOpacity onPress={markAllRead} activeOpacity={0.75}>
                <Text style={styles.markAllText}>Mark all read</Text>
              </TouchableOpacity>
            )}
          </View>
        </SafeAreaView>
      </LinearGradient>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={Colors.navy} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={
            notifications.length === 0 ? styles.emptyContent : styles.listContent
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.navy} />
          }
          renderItem={({ item }) => (
            <NotificationCard
              item={item}
              onPress={() => {
                const nonNavigable: NotificationType[] = [
                  "ProjectPendingApproval",
                  "ProjectRejected",
                  "ProjectDeleted",
                  "ProjectParticipantRemoved",
                ];
                if (nonNavigable.includes(item.type)) return;
                const url = item.invoiceId
                  ? `/(app)/project/${item.projectId}?openInvoice=${item.invoiceId}`
                  : `/(app)/project/${item.projectId}`;
                router.push(url as any);
              }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Ionicons name="notifications-off-outline" size={48} color={Colors.textSecondary} />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  header: {
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.white,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.goldLight,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  emptyContent: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.gold,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
    gap: 4,
  },
  cardMessage: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  cardProjectName: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.navy,
    marginTop: 2,
  },
  cardTime: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.gold,
  },
});
