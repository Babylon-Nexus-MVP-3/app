import { API_BASE_URL } from "@/constants/api";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { appStyles } from "@/constants/appStyles";
import { AppText } from "@/components/AppText";
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
      return { name: "checkmark-done-circle-outline", color: Colors.vouchGreen };
    case "ProjectRejected":
      return { name: "close-circle-outline", color: Colors.red };
    case "ProjectDeleted":
      return { name: "trash-outline", color: Colors.red };
    case "ProjectParticipantRemoved":
      return { name: "person-remove-outline", color: Colors.red };
    case "InvoiceSubmitted":
      return { name: "document-text-outline", color: Colors.vouchGreen };
    case "InvoiceApproved":
      return { name: "checkmark-circle-outline", color: Colors.vouchGreen };
    case "InvoicePaid":
      return { name: "cash-outline", color: Colors.vouchGreen };
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
        <AppText style={styles.cardMessage}>{item.message}</AppText>
        {!!item.projectName && <AppText style={styles.cardProject}>{item.projectName}</AppText>}
        <AppText style={styles.cardTime}>{timeAgo(item.createdAt)}</AppText>
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

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchWithAuth(`${API_BASE_URL}/notifications`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setNotifications(data.notifications ?? []);
        })
        .finally(() => setLoading(false));
    }, [fetchWithAuth])
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/notifications`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function markAllRead() {
    await fetchWithAuth(`${API_BASE_URL}/notifications/read-all`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <View style={appStyles.screen}>
      <View style={appStyles.header}>
        <SafeAreaView edges={["top"]}>
          <View style={appStyles.headerInner}>
            <TouchableOpacity
              onPress={() => router.push("/(app)/projects" as any)}
              activeOpacity={0.75}
              style={styles.backBtn}
            >
              <Ionicons name="chevron-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            <AppText style={[appStyles.headerTitle, styles.headerTitleCentered]}>
              Notifications
            </AppText>
            {hasUnread ? (
              <TouchableOpacity onPress={markAllRead} activeOpacity={0.75}>
                <AppText style={styles.markAllText}>Mark all read</AppText>
              </TouchableOpacity>
            ) : (
              <View style={styles.backBtn} />
            )}
          </View>
        </SafeAreaView>
      </View>

      {loading ? (
        <View style={appStyles.centered}>
          <ActivityIndicator color={Colors.vouchGreen} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
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
            <View style={appStyles.centered}>
              <Ionicons name="notifications-off-outline" size={48} color={Colors.grey300} />
              <AppText style={appStyles.emptyText}>No notifications yet</AppText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    width: 32,
  },
  headerTitleCentered: {
    flex: 1,
    textAlign: "center",
  },
  markAllText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: "rgba(255,255,255,0.85)",
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  emptyContent: {
    flex: 1,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.vouchGreen,
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
    gap: 3,
  },
  cardMessage: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.black,
    lineHeight: 18,
  },
  cardProject: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
    marginTop: 1,
  },
  cardTime: {
    fontSize: 11,
    fontFamily: Fonts.medium,
    color: Colors.grey500,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.vouchGreen,
  },
});
