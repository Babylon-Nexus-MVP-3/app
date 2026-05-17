import { useState, useEffect } from "react";
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

type AbrResult = {
  entityName: string;
  tradingName?: string;
  state: string;
  businessType: string;
  activeYears: number;
  isActive: boolean;
};

type VouchStatus = {
  isOnVouch: boolean;
  vouchCount: number;
  alreadyVouched?: boolean;
  attributeSummary?: string;
};

function formatDisplayAbn(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length !== 11) return digits;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
}

export default function VerifyScreen() {
  const { abn, requestId } = useLocalSearchParams<{ abn: string; requestId?: string }>();
  const { fetchWithAuth } = useAuth();

  const [abrData, setAbrData] = useState<AbrResult | null>(null);
  const [vouchStatus, setVouchStatus] = useState<VouchStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!abn) return;
    setAbrData(null);
    setVouchStatus(null);
    lookupAbn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abn]);

  async function lookupAbn() {
    setLoading(true);
    // ABR data is hardcoded until ABR_GUID is configured
    setAbrData({
      entityName: "Business Pty Ltd",
      state: "NSW",
      businessType: "Construction",
      activeYears: 5,
      isActive: true,
    });
    try {
      const statusRes = await fetchWithAuth(`${API_BASE_URL}/vouch/business/${abn}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setVouchStatus(statusData);
      } else {
        setVouchStatus({ isOnVouch: false, vouchCount: 0 });
      }
    } catch {
      setVouchStatus({ isOnVouch: false, vouchCount: 0 });
    } finally {
      setLoading(false);
    }
  }

  const displayName = abrData?.tradingName || abrData?.entityName || "this business";
  const alreadyVouched = !!vouchStatus?.alreadyVouched;

  function onPressVouch() {
    const params: Record<string, string> = {
      abn: abn ?? "",
      businessName: abrData?.entityName ?? displayName,
    };
    if (requestId) params.requestId = requestId;
    router.push({
      pathname: "/(app)/give-vouch/attributes",
      params,
    });
  }

  const isOnVouch = vouchStatus?.isOnVouch ?? false;
  const btnLabel = requestId || isOnVouch ? `Vouch for ${displayName}` : "Vouch and invite them";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>Verify business</AppText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ABN confirmed row */}
        <AppText style={styles.fieldLabel}>ABN</AppText>
        <View style={styles.abnConfirmed}>
          <AppText style={styles.abnConfirmedText}>{formatDisplayAbn(abn ?? "")}</AppText>
          {!loading && <Ionicons name="checkmark" size={20} color={Colors.vouchGreen} />}
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.vouchGreen} style={{ marginTop: 24 }} />
        ) : abrData ? (
          <>
            {/* ABR result */}
            <View style={styles.abrCard}>
              <AppText style={styles.abrFrom}>FROM ABR</AppText>
              <AppText style={styles.abrName}>{abrData.entityName}</AppText>
              <AppText style={styles.abrMeta}>
                {abrData.businessType} · {abrData.state} · Active {abrData.activeYears} yrs
              </AppText>
            </View>

            {/* Already vouched */}
            {alreadyVouched ? (
              <View style={styles.alreadyVouchedCard}>
                <Ionicons name="checkmark-circle" size={28} color={Colors.vouchGreen} />
                <View style={{ flex: 1 }}>
                  <AppText style={styles.alreadyVouchedTitle}>
                    {"You've already vouched them"}
                  </AppText>
                  <AppText style={styles.alreadyVouchedSub}>
                    You can only vouch for a business once.
                  </AppText>
                </View>
              </View>
            ) : requestId ? (
              /* Pending request — show neutral vouch count */
              <View style={styles.neutralCard}>
                <AppText style={styles.neutralCountNum}>{vouchStatus?.vouchCount ?? 0}</AppText>
                <AppText style={styles.neutralCountLabel}>
                  {(vouchStatus?.vouchCount ?? 0) === 1 ? "vouch received" : "vouches received"}
                </AppText>
              </View>
            ) : isOnVouch ? (
              /* Active on Vouch */
              <View style={styles.activeCard}>
                <View style={styles.statusRow}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={Colors.vouchGreen} />
                  <AppText style={styles.activeLabel}>ACTIVE ON VOUCH</AppText>
                </View>
                <AppText style={styles.vouchCount}>
                  <AppText style={styles.vouchCountNum}>{vouchStatus!.vouchCount}</AppText>
                  {"  "}
                  <AppText style={styles.vouchCountLabel}>vouches received</AppText>
                </AppText>
                {vouchStatus?.attributeSummary ? (
                  <AppText style={styles.activeDesc}>{vouchStatus.attributeSummary}</AppText>
                ) : null}
                <View style={styles.divider} />
                <View style={styles.noteRow}>
                  <Ionicons name="information-circle-outline" size={14} color={Colors.vouchGreen} />
                  <AppText style={styles.activeNote}>
                    Your vouch joins their existing reputation.
                  </AppText>
                </View>
              </View>
            ) : (
              /* Not yet on Vouch */
              <View style={styles.pendingCard}>
                <View style={styles.statusRow}>
                  <Ionicons name="shield-outline" size={16} color={Colors.amber} />
                  <AppText style={styles.pendingLabel}>NOT YET ON VOUCH</AppText>
                </View>
                <AppText style={styles.pendingTitle}>Be the first to vouch them.</AppText>
                <AppText style={styles.pendingDesc}>
                  {"Your vouch creates their profile on Vouch. We'll invite them to claim it."}
                </AppText>
                <View style={styles.divider} />
                <View style={styles.noteRow}>
                  <Ionicons name="time-outline" size={14} color={Colors.amber} />
                  <AppText style={styles.pendingNote}>
                    Your vouch stays pending until they accept the invite.
                  </AppText>
                </View>
              </View>
            )}
          </>
        ) : null}
      </ScrollView>

      {!loading && abrData && !alreadyVouched && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.vouchBtn} onPress={onPressVouch} activeOpacity={0.85}>
            <AppText style={styles.vouchBtnText}>{btnLabel}</AppText>
          </TouchableOpacity>
        </View>
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
    fontSize: 17,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 16,
  },

  // ABN confirmed
  fieldLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  abnConfirmed: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
  },
  abnConfirmedText: {
    fontSize: 16,
    fontFamily: Fonts.medium,
    color: Colors.black,
  },

  // ABR card
  abrCard: {
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  abrFrom: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 1,
    marginBottom: 2,
  },
  abrName: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  abrMeta: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },

  // Neutral vouch count card (for pending requests)
  neutralCard: {
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  neutralCountNum: {
    fontSize: 36,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  neutralCountLabel: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.grey500,
  },

  // Active on vouch card
  activeCard: {
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 14,
    padding: 16,
    backgroundColor: Colors.vouchGreenLight,
    gap: 8,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  activeLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.vouchGreen,
    letterSpacing: 0.8,
  },
  vouchCount: {
    marginTop: 2,
  },
  vouchCountNum: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.vouchGreen,
  },
  vouchCountLabel: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
  activeDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.vouchGreen,
    lineHeight: 19,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.grey300,
    opacity: 0.5,
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  activeNote: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.vouchGreen,
    flex: 1,
  },

  // Not yet on vouch card
  pendingCard: {
    borderWidth: 1.5,
    borderColor: Colors.amber,
    borderRadius: 14,
    padding: 16,
    backgroundColor: Colors.amberBg,
    gap: 8,
  },
  pendingLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.amber,
    letterSpacing: 0.8,
  },
  pendingTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  pendingDesc: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey700,
    lineHeight: 19,
  },
  pendingNote: {
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.amber,
    flex: 1,
  },

  // Already vouched
  alreadyVouchedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 14,
    padding: 16,
    backgroundColor: Colors.vouchGreenLight,
  },
  alreadyVouchedTitle: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
    marginBottom: 2,
  },
  alreadyVouchedSub: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.vouchGreen,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
  },
  vouchBtn: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  vouchBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
});
