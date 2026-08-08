import { useCallback, useState } from "react";
import {
  Alert,
  View,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { Pill } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import { showAlert } from "@/lib/errors";

type SentRequest = {
  _id: string;
  toMobile: string;
  toEmail?: string;
  relationship: string;
  projectName: string;
  status: "pending" | "responded";
  createdAt: string;
  respondedAt?: string;
  lastSentAt?: string;
};

function timeAgo(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

/** Matches the backend cooldown on POST /vouch/requests/:id/nudge. */
const NUDGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function canNudge(r: SentRequest): boolean {
  const last = r.lastSentAt ?? r.createdAt;
  return Date.now() - new Date(last).getTime() >= NUDGE_COOLDOWN_MS;
}

/**
 * The vouch requests the user has sent, with nudge and withdraw. Lives inside
 * the Vouches tab alongside Given and Received — all three are views of the
 * same thing, so they belong under one roof.
 */
export function SentRequests() {
  const { fetchWithAuth } = useAuth();
  const [requests, setRequests] = useState<SentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/vouch/requests/sent`);
      const data = res.ok ? await res.json() : null;
      setRequests(data?.requests ?? []);
    } catch {}
  }, [fetchWithAuth]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      load().finally(() => {
        if (!cancelled) setLoading(false);
      });
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function onNudge(r: SentRequest) {
    setBusyId(r._id);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/vouch/requests/${r._id}/nudge`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        showAlert("Cannot nudge", data.error ?? "Please try again later.");
        return;
      }
      showAlert("Nudge sent", `We've reminded ${r.toEmail || r.toMobile} about your request.`);
      await load();
    } catch {
      showAlert("Cannot nudge", "Check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  }

  function onRevoke(r: SentRequest) {
    const who = r.toEmail || r.toMobile;
    Alert.alert(
      "Withdraw request?",
      `${who} will no longer be asked to vouch for you. You can always ask again later.`,
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: async () => {
            setBusyId(r._id);
            try {
              const res = await fetchWithAuth(`${API_BASE_URL}/vouch/requests/${r._id}`, {
                method: "DELETE",
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                showAlert("Cannot withdraw", data.error ?? "Please try again later.");
                return;
              }
              await load();
            } catch {
              showAlert("Cannot withdraw", "Check your connection and try again.");
            } finally {
              setBusyId(null);
            }
          },
        },
      ]
    );
  }

  // Answered requests live in the Received tab; this view is only what's
  // still outstanding and can be acted on.
  const pending = requests.filter((r) => r.status !== "responded");

  function renderRequest(r: SentRequest) {
    const nudgeReady = canNudge(r);
    const busy = busyId === r._id;
    return (
      <View key={r._id} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={styles.avatar}>
            <Ionicons name="hourglass-outline" size={18} color={Colors.amber} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={styles.contact} numberOfLines={1}>
              {r.toEmail || r.toMobile}
            </AppText>
            <AppText style={styles.meta}>
              {[r.relationship, r.projectName].filter(Boolean).join(" · ")}
            </AppText>
          </View>
          <Pill label="Waiting" tone="amber" />
        </View>

        <View style={styles.cardFoot}>
          <AppText style={styles.timing}>Sent {timeAgo(r.lastSentAt ?? r.createdAt)}</AppText>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={() => onRevoke(r)}
              disabled={busy}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Withdraw your request to ${r.toEmail || r.toMobile}`}
              accessibilityState={{ disabled: busy }}
            >
              <AppText style={styles.revokeText}>Withdraw</AppText>
            </TouchableOpacity>

            {nudgeReady ? (
              <TouchableOpacity
                style={styles.nudgeBtn}
                onPress={() => onNudge(r)}
                disabled={busy}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Nudge ${r.toEmail || r.toMobile} about your request`}
                accessibilityState={{ disabled: busy }}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={Colors.vouchGreen} />
                ) : (
                  <>
                    <Ionicons name="notifications-outline" size={14} color={Colors.vouchGreen} />
                    <AppText style={styles.nudgeText}>Nudge</AppText>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              // A nudge lands on someone else's phone, so it's one a day.
              <AppText style={styles.cooldown}>Nudge again tomorrow</AppText>
            )}
          </View>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.vouchGreen} />
      </View>
    );
  }

  if (pending.length === 0) {
    return (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons name="paper-plane-outline" size={28} color={Colors.vouchGreen} />
        </View>
        <AppText style={styles.emptyTitle}>Nothing outstanding</AppText>
        <AppText style={styles.emptyDesc}>
          Requests waiting on a response will show up here.
        </AppText>
        <TouchableOpacity
          style={styles.emptyBtn}
          activeOpacity={0.85}
          onPress={() => router.push("/(app)/get-vouched/request-vouch")}
          accessibilityRole="button"
          accessibilityLabel="Request a vouch"
        >
          <AppText style={styles.emptyBtnText}>Request a vouch</AppText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={Colors.vouchGreen}
        />
      }
    >
      <View style={styles.group}>{pending.map(renderRequest)}</View>

      <TouchableOpacity
        style={styles.askAgainBtn}
        activeOpacity={0.85}
        onPress={() => router.push("/(app)/get-vouched/request-vouch")}
        accessibilityRole="button"
        accessibilityLabel="Request another vouch"
      >
        <Ionicons name="person-add-outline" size={16} color={Colors.vouchGreen} />
        <AppText style={styles.askAgainText}>Request another vouch</AppText>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 16, paddingTop: 22, paddingBottom: 32 },
  group: { gap: 10, marginBottom: 24 },

  card: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.amberBg,
    alignItems: "center",
    justifyContent: "center",
  },
  contact: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.black },
  meta: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.grey500, marginTop: 2 },
  cardFoot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  timing: { fontSize: 12, fontFamily: Fonts.medium, color: Colors.grey500 },
  actions: { flexDirection: "row", alignItems: "center", gap: 16 },
  revokeText: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.grey500 },
  nudgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    minWidth: 92,
    justifyContent: "center",
  },
  nudgeText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.vouchGreen },
  cooldown: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.grey500 },

  empty: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.vouchGreenLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: { fontSize: 17, fontFamily: Fonts.bold, color: Colors.black },
  emptyDesc: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 28,
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  emptyBtnText: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.vouchGreen },

  askAgainBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 28,
    marginTop: 4,
  },
  askAgainText: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.vouchGreen },
});
