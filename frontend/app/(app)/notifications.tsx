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

type ProjectNotifType =
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

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type UnifiedNotif = {
  key: string;
  source: "project" | "vouch";
  message: string;
  read: boolean;
  createdAt: string;
  iconName: IoniconName;
  iconColor: string;
  // project-specific
  projectId?: string;
  invoiceId?: string | null;
  projectNotifType?: ProjectNotifType;
  // vouch-specific
  vouchId?: string;
};

function projectIcon(type: ProjectNotifType): { name: IoniconName; color: string } {
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

function NotificationCard({
  item,
  onPress,
}: {
  item: UnifiedNotif;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, !item.read && styles.cardUnread]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${item.read ? "" : "Unread: "}${item.message}`}
    >
      <View style={[styles.iconWrap, { backgroundColor: item.iconColor + "18" }]}>
        <Ionicons name={item.iconName} size={22} color={item.iconColor} />
      </View>
      <View style={styles.cardBody}>
        <AppText style={styles.cardMessage}>{item.message}</AppText>
        <AppText style={styles.cardTime}>{timeAgo(item.createdAt)}</AppText>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
}

export default function Notifications() {
  const { fetchWithAuth } = useAuth();
  const [notifications, setNotifications] = useState<UnifiedNotif[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const hasUnread = notifications.some((n) => !n.read);

  function buildUnified(projectData: any, vouchData: any): UnifiedNotif[] {
    const projectNotifs: UnifiedNotif[] = (projectData?.notifications ?? []).map((n: any) => {
      const icon = projectIcon(n.type as ProjectNotifType);
      return {
        key: `project-${n.id}`,
        source: "project" as const,
        message: n.message,
        read: n.read,
        createdAt: n.createdAt,
        iconName: icon.name,
        iconColor: icon.color,
        projectId: n.projectId,
        invoiceId: n.invoiceId,
        projectNotifType: n.type,
      };
    });

    const vouchNotifs: UnifiedNotif[] = (vouchData?.notifications ?? []).map((n: any) => {
      const isReceived = n.type === "vouch_received";
      const message = isReceived
        ? `${n.fromName} vouched for ${n.toBusinessName ?? "your business"}.`
        : `${n.fromName} from ${n.fromCompany} requested a vouch for ${n.projectName ?? "a project"}.`;
      return {
        key: `vouch-${n._id}`,
        source: "vouch" as const,
        message,
        read: n.read,
        createdAt: n.createdAt,
        iconName: isReceived ? ("shield-checkmark-outline" as IoniconName) : ("person-add-outline" as IoniconName),
        iconColor: Colors.vouchGreen,
        vouchId: n._id,
      };
    });

    return [...projectNotifs, ...vouchNotifs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  const load = useCallback(async () => {
    const [projectRes, vouchRes] = await Promise.all([
      fetchWithAuth(`${API_BASE_URL}/notifications`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetchWithAuth(`${API_BASE_URL}/vouch/notifications`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    setNotifications(buildUnified(projectRes, vouchRes));
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
    await Promise.all([
      fetchWithAuth(`${API_BASE_URL}/notifications/read-all`, { method: "PATCH" }).catch(() => {}),
      fetchWithAuth(`${API_BASE_URL}/vouch/notifications/read-all`, { method: "PATCH" }).catch(() => {}),
    ]);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function handlePress(item: UnifiedNotif) {
    if (item.source === "vouch") {
      // Mark individual vouch notif read
      if (!item.read && item.vouchId) {
        fetchWithAuth(`${API_BASE_URL}/vouch/notifications/${item.vouchId}/read`, { method: "PATCH" }).catch(() => {});
        setNotifications((prev) =>
          prev.map((n) => (n.key === item.key ? { ...n, read: true } : n))
        );
      }
      router.push("/(app)/(tabs)/vouches");
      return;
    }
    // Project notification
    const nonNavigable: ProjectNotifType[] = [
      "ProjectPendingApproval",
      "ProjectRejected",
      "ProjectDeleted",
      "ProjectParticipantRemoved",
    ];
    if (item.projectNotifType && nonNavigable.includes(item.projectNotifType)) return;
    const url = item.invoiceId
      ? `/(app)/project/${item.projectId}?openInvoice=${item.invoiceId}`
      : `/(app)/project/${item.projectId}`;
    router.push(url as any);
  }

  return (
    <View style={appStyles.screen}>
      <View style={appStyles.header}>
        <SafeAreaView edges={["top"]}>
          <View style={appStyles.headerInner}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.75}
              style={styles.headerSide}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="chevron-back" size={24} color={Colors.white} />
            </TouchableOpacity>
            <AppText style={styles.headerTitle}>Notifications</AppText>
            {hasUnread ? (
              <TouchableOpacity
                onPress={markAllRead}
                activeOpacity={0.75}
                style={styles.headerSide}
                accessibilityRole="button"
                accessibilityLabel="Mark all notifications as read"
              >
                <AppText style={styles.markAllText}>Mark all read</AppText>
              </TouchableOpacity>
            ) : (
              <View style={styles.headerSide} />
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
          keyExtractor={(item) => item.key}
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
            <NotificationCard item={item} onPress={() => handlePress(item)} />
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
  headerSide: { width: 80 },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
    textAlign: "center",
  },
  markAllText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: "rgba(255,255,255,0.85)",
    textAlign: "right",
  },
  listContent: { padding: 16, gap: 10 },
  emptyContent: { flex: 1 },
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
  cardBody: { flex: 1, gap: 3 },
  cardMessage: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.black,
    lineHeight: 18,
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
