import { useCallback, useRef, useState } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

type GivenVouch = {
  _id: string;
  toAbn: string;
  toBusinessName: string;
  attributes: string[];
  note?: string;
  createdAt: string;
};

type ReceivedVouch = {
  _id: string;
  fromName: string;
  fromBusinessName: string;
  attributes: string[];
  note?: string;
  createdAt: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? "s" : ""} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years !== 1 ? "s" : ""} ago`;
}

function AttributeChips({ attributes }: { attributes: string[] }) {
  return (
    <View style={styles.chips}>
      {attributes.map((a) => (
        <View key={a} style={styles.chip}>
          <AppText style={styles.chipText}>{a}</AppText>
        </View>
      ))}
    </View>
  );
}

export default function VouchesScreen() {
  const { fetchWithAuth } = useAuth();
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<"given" | "received">("given");
  const [given, setGiven] = useState<GivenVouch[]>([]);
  const [received, setReceived] = useState<ReceivedVouch[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (tabParam === "received" || tabParam === "given") setTab(tabParam);
      let cancelled = false;
      if (!hasLoaded.current) setLoading(true);
      Promise.all([
        fetchWithAuth(`${API_BASE_URL}/vouch/given`).then((r) => (r.ok ? r.json() : null)),
        fetchWithAuth(`${API_BASE_URL}/vouch/received`).then((r) => (r.ok ? r.json() : null)),
      ])
        .then(([givenData, receivedData]) => {
          if (cancelled) return;
          setGiven(givenData?.vouches ?? []);
          setReceived(receivedData?.vouches ?? []);
          hasLoaded.current = true;
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [fetchWithAuth])
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <AppText style={styles.headerTitle}>VOUCHES</AppText>
      </View>

      {/* Segment control */}
      <View style={styles.segmentWrap}>
        <TouchableOpacity
          style={[styles.segment, tab === "given" && styles.segmentActive]}
          onPress={() => setTab("given")}
          activeOpacity={0.8}
        >
          <AppText style={[styles.segmentText, tab === "given" && styles.segmentTextActive]}>
            Given
          </AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, tab === "received" && styles.segmentActive]}
          onPress={() => setTab("received")}
          activeOpacity={0.8}
        >
          <AppText style={[styles.segmentText, tab === "received" && styles.segmentTextActive]}>
            Received
          </AppText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.vouchGreen} />
        </View>
      ) : tab === "given" ? (
        given.length === 0 ? (
          <View style={styles.centered}>
            <Ionicons name="shield-outline" size={44} color={Colors.grey300} />
            <AppText style={styles.emptyTitle}>No vouches given yet.</AppText>
            <AppText style={styles.emptySubtitle}>
              Vouching for a business builds trust across the industry.
            </AppText>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <AppText style={styles.countLabel}>
              {given.length} {given.length === 1 ? "business" : "businesses"} vouched
            </AppText>
            {given.map((v) => (
              <View key={v._id} style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.iconBadge}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={Colors.vouchGreen} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.businessName}>{v.toBusinessName || "Business"}</AppText>
                    <AppText style={styles.cardMeta}>{timeAgo(v.createdAt)}</AppText>
                  </View>
                </View>
                <AttributeChips attributes={v.attributes} />
                {v.note ? <AppText style={styles.note}>{v.note}</AppText> : null}
              </View>
            ))}
          </ScrollView>
        )
      ) : received.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="shield-outline" size={44} color={Colors.grey300} />
          <AppText style={styles.emptyTitle}>No vouches received yet.</AppText>
          <AppText style={styles.emptySubtitle}>
            Complete your Vouch profile and send requests to build your reputation.
          </AppText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <AppText style={styles.countLabel}>
            {received.length} {received.length === 1 ? "vouch" : "vouches"} received
          </AppText>
          {received.map((v) => (
            <View key={v._id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconBadge}>
                  <Ionicons name="person-circle-outline" size={18} color={Colors.vouchGreen} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText style={styles.businessName}>
                    {v.fromName || "Someone"}
                    {v.fromBusinessName ? (
                      <AppText style={styles.fromBusiness}>{`  ·  ${v.fromBusinessName}`}</AppText>
                    ) : null}
                  </AppText>
                  <AppText style={styles.cardMeta}>{timeAgo(v.createdAt)}</AppText>
                </View>
              </View>
              <AttributeChips attributes={v.attributes} />
              {v.note ? <AppText style={styles.note}>{v.note}</AppText> : null}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.black,
    letterSpacing: 0.5,
  },

  // Segment control
  segmentWrap: {
    flexDirection: "row",
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: Colors.offWhite,
    borderRadius: 12,
    padding: 4,
  },
  segment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: Colors.white,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.grey500,
  },
  segmentTextActive: {
    color: Colors.black,
  },

  // List
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  countLabel: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.grey500,
    marginBottom: 4,
  },

  // Vouch card
  card: {
    backgroundColor: Colors.offWhite,
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.vouchGreenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  businessName: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
  },
  fromBusiness: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  cardMeta: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginTop: 2,
  },

  // Attribute chips
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.grey300,
  },
  chipText: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.grey700,
  },

  // Note
  note: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey700,
    lineHeight: 19,
    fontStyle: "italic",
  },

  // Empty state
  emptyTitle: {
    fontSize: 17,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textAlign: "center",
    lineHeight: 20,
  },
});
