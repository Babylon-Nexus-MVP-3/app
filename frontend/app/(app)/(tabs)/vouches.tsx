import { useCallback, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { ScreenHeader, sheetStyle } from "@/components/ScreenHeader";
import { EmptyState, Pill, Segmented } from "@/components/ui";
import { SentRequests } from "@/components/SentRequests";
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
  fromAbn: string;
  alreadyVouchedBack: boolean;
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
  const [tab, setTab] = useState<"given" | "received" | "requests">("received");
  const [given, setGiven] = useState<GivenVouch[]>([]);
  const [received, setReceived] = useState<ReceivedVouch[]>([]);
  const [profileVerified, setProfileVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const hasLoaded = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (tabParam === "received" || tabParam === "given" || tabParam === "requests") {
        setTab(tabParam);
      }
      let cancelled = false;
      if (!hasLoaded.current) setLoading(true);
      Promise.all([
        fetchWithAuth(`${API_BASE_URL}/vouch/given`).then((r) => (r.ok ? r.json() : null)),
        fetchWithAuth(`${API_BASE_URL}/vouch/received`).then((r) => (r.ok ? r.json() : null)),
        fetchWithAuth(`${API_BASE_URL}/vouch/profile/me`).then((r) => (r.ok ? r.json() : null)),
      ])
        .then(([givenData, receivedData, profileData]) => {
          if (cancelled) return;
          setGiven(givenData?.vouches ?? []);
          setReceived(receivedData?.vouches ?? []);
          // Vouching back is still giving a vouch, so it needs the same
          // complete profile that giving one anywhere else does.
          setProfileVerified(profileData?.profileStrength === 100);
          hasLoaded.current = true;
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [fetchWithAuth, tabParam])
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        title="Vouches"
        subtitle={
          tab === "given"
            ? "Businesses you've vouched for"
            : tab === "received"
              ? "People who've vouched for you"
              : "Requests you've sent out"
        }
      >
        <View style={styles.segmentSlot}>
          <Segmented
            value={tab}
            onChange={setTab}
            options={[
              { value: "received", label: "Received" },
              { value: "given", label: "Given" },
              { value: "requests", label: "Requests" },
            ]}
          />
        </View>
      </ScreenHeader>

      <View style={sheetStyle.sheet}>
        {tab === "requests" ? (
          <SentRequests />
        ) : loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.vouchGreen} />
          </View>
        ) : tab === "given" ? (
          given.length === 0 ? (
            <EmptyState
              icon="shield-outline"
              title="No vouches given yet"
              subtitle={
                profileVerified
                  ? "Vouching for a business builds trust across the industry."
                  : "Complete your profile — your details and trade licence — to start vouching for others."
              }
              actionLabel={profileVerified ? "Give a vouch" : "Build your profile"}
              onAction={() =>
                router.push(profileVerified ? "/(app)/give-vouch" : "/(app)/get-vouched")
              }
            />
          ) : (
            <FlatList
              data={given}
              keyExtractor={(v) => v._id}
              contentContainerStyle={styles.scroll}
              showsVerticalScrollIndicator={false}
              contentInsetAdjustmentBehavior="automatic"
              ListHeaderComponent={
                <AppText style={styles.countLabel}>
                  {given.length} {given.length === 1 ? "business" : "businesses"} vouched
                </AppText>
              }
              renderItem={({ item: v }) => (
                <View style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.iconBadge}>
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={18}
                        color={Colors.vouchGreen}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.businessName}>
                        {v.toBusinessName || "Business"}
                      </AppText>
                      <AppText style={styles.cardMeta}>{timeAgo(v.createdAt)}</AppText>
                    </View>
                  </View>
                  <AttributeChips attributes={v.attributes} />
                  {v.note ? <AppText style={styles.note}>{v.note}</AppText> : null}
                </View>
              )}
            />
          )
        ) : received.length === 0 ? (
          <EmptyState
            icon="shield-outline"
            title="No vouches received yet"
            subtitle="Complete your vouch profile and send requests to build your reputation."
            actionLabel="Build your profile"
            onAction={() => router.push("/(app)/get-vouched")}
          />
        ) : (
          <FlatList
            data={received}
            keyExtractor={(v) => v._id}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
            extraData={profileVerified}
            ListHeaderComponent={
              <AppText style={styles.countLabel}>
                {received.length} {received.length === 1 ? "vouch" : "vouches"} received
              </AppText>
            }
            renderItem={({ item: v }) => {
              const displayName = v.fromBusinessName || v.fromName || "this business";
              function onVouchBack() {
                if (!v.fromAbn || v.alreadyVouchedBack) return;
                if (!profileVerified) {
                  Alert.alert(
                    "Complete your profile first",
                    "Add your details and trade licence before you vouch for someone else.",
                    [
                      { text: "Not now", style: "cancel" },
                      {
                        text: "Build profile",
                        onPress: () => router.push("/(app)/get-vouched"),
                      },
                    ]
                  );
                  return;
                }
                router.push({
                  pathname: "/(app)/give-vouch/attributes",
                  params: { abn: v.fromAbn, businessName: displayName },
                });
              }
              return (
                <View style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.iconBadge}>
                      <Ionicons name="person-circle-outline" size={18} color={Colors.vouchGreen} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText style={styles.businessName}>
                        {v.fromName || "Someone"}
                        {v.fromBusinessName ? (
                          <AppText
                            style={styles.fromBusiness}
                          >{`  ·  ${v.fromBusinessName}`}</AppText>
                        ) : null}
                      </AppText>
                      <AppText style={styles.cardMeta}>{timeAgo(v.createdAt)}</AppText>
                    </View>
                    {v.fromAbn ? (
                      v.alreadyVouchedBack ? (
                        <Pill label="Vouched" tone="green" icon="checkmark" />
                      ) : (
                        <TouchableOpacity
                          style={styles.vouchBackBtn}
                          onPress={onVouchBack}
                          activeOpacity={0.75}
                          accessibilityRole="button"
                          accessibilityLabel={`Vouch back for ${displayName}`}
                        >
                          <AppText style={styles.vouchBackBtnText}>Vouch back</AppText>
                        </TouchableOpacity>
                      )
                    ) : null}
                  </View>
                  <AttributeChips attributes={v.attributes} />
                  {v.note ? <AppText style={styles.note}>{v.note}</AppText> : null}
                </View>
              );
            }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.vouchGreen },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
    gap: 12,
  },
  segmentSlot: { marginTop: 18 },

  // List
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 44,
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
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.grey300,
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
    backgroundColor: Colors.vouchGreenLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },

  // Note
  note: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey700,
    lineHeight: 19,
    fontStyle: "italic",
  },

  // Vouch back
  vouchBackBtn: {
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  vouchBackBtnText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
});
