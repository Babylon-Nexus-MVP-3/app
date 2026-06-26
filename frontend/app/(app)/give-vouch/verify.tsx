import { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";
import { formatAbn, type AbrResult } from "@/lib/useAbrLookup";

type VouchStatus = {
  isOnVouch: boolean;
  vouchCount: number;
  alreadyVouched?: boolean;
  attributeSummary?: string;
};

export default function VerifyScreen() {
  const {
    abn,
    requestId,
    recipientName: recipientNameParam,
    recipientEmail: recipientEmailParam,
    recipientMobile: recipientMobileParam,
  } = useLocalSearchParams<{
    abn: string;
    requestId?: string;
    recipientName?: string;
    recipientEmail?: string;
    recipientMobile?: string;
  }>();
  const { fetchWithAuth, user } = useAuth();

  const [abrData, setAbrData] = useState<AbrResult | null>(null);
  const [abrError, setAbrError] = useState("");
  const [abrInactive, setAbrInactive] = useState(false);
  const [vouchStatus, setVouchStatus] = useState<VouchStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const recipientName = recipientNameParam ?? "";
  const [recipientEmail, setRecipientEmail] = useState(recipientEmailParam ?? "");
  const [recipientMobile, setRecipientMobile] = useState(recipientMobileParam ?? "");
  const [contactError, setContactError] = useState("");

  useEffect(() => {
    if (!abn) return;
    setAbrData(null);
    setAbrError("");
    setAbrInactive(false);
    setVouchStatus(null);
    lookupAbn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abn]);

  async function lookupAbn() {
    setLoading(true);
    if (abn === user?.abn) {
      setAbrError("You can't vouch for your own business.");
      setAbrInactive(true);
      setVouchStatus({ isOnVouch: false, vouchCount: 0 });
      setLoading(false);
      return;
    }
    try {
      const [statusRes, abrRes] = await Promise.all([
        fetchWithAuth(`${API_BASE_URL}/vouch/business/${abn}`),
        fetch(`${API_BASE_URL}/abr/lookup?abn=${abn}`),
      ]);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setVouchStatus(statusData);
      } else {
        setVouchStatus({ isOnVouch: false, vouchCount: 0 });
      }
      if (abrRes.ok) {
        const data = await abrRes.json();
        if (data.isActive) setAbrData(data);
      } else if (abrRes.status === 410) {
        setAbrError(
          "This ABN has been cancelled. You can only vouch for businesses with an active ABN."
        );
        setAbrInactive(true);
      } else if (abrRes.status === 404) {
        setAbrError(
          "This ABN is not currently active. You can only vouch for businesses with an active ABN."
        );
        setAbrInactive(true);
      } else {
        setAbrError("Business details temporarily unavailable.");
      }
    } catch {
      setVouchStatus({ isOnVouch: false, vouchCount: 0 });
      setAbrError("Business details temporarily unavailable.");
    } finally {
      setLoading(false);
    }
  }

  const displayName = abrData?.tradingName || abrData?.entityName || "this business";
  const alreadyVouched = !!vouchStatus?.alreadyVouched;

  function formatMobileDisplay(digits: string): string {
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  function onPressVouch() {
    if (!isOnVouch && !requestId) {
      if (!recipientEmail.trim() || !recipientEmail.includes("@")) {
        setContactError("Please enter a valid email address.");
        return;
      }
    }
    setContactError("");
    const mobileDigits = recipientMobile.replace(/\D/g, "");
    const params: Record<string, string> = {
      abn: abn ?? "",
      businessName: abrData?.entityName ?? displayName,
    };
    if (requestId) params.requestId = requestId;
    if (recipientName.trim()) params.recipientName = recipientName.trim();
    if (recipientEmail.trim()) params.recipientEmail = recipientEmail.trim().toLowerCase();
    if (mobileDigits.length >= 10) params.recipientMobile = mobileDigits;
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
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>Verify business</AppText>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* ABN confirmed row */}
          <AppText style={styles.fieldLabel}>ABN</AppText>
          <View style={styles.abnConfirmed}>
            <AppText style={styles.abnConfirmedText}>{formatAbn(abn ?? "")}</AppText>
            {!loading && <Ionicons name="checkmark" size={20} color={Colors.vouchGreen} />}
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.vouchGreen} style={{ marginTop: 24 }} />
          ) : vouchStatus ? (
            <>
              {/* ABR result — hidden until ABR_GUID is configured */}
              {abrData && (
                <View style={styles.abrCard}>
                  <AppText style={styles.abrFrom}>FROM ABR</AppText>
                  <AppText style={styles.abrName}>
                    {abrData.tradingName || abrData.entityName}
                  </AppText>
                  {abrData.tradingName && abrData.tradingName !== abrData.entityName && (
                    <AppText style={styles.abrLegalName}>Legal: {abrData.entityName}</AppText>
                  )}
                  <AppText style={styles.abrMeta}>
                    {abrData.businessType} · {abrData.state} · Active {abrData.activeYears} yrs
                  </AppText>
                </View>
              )}
              {!abrData && abrError ? (
                <View
                  style={[
                    styles.abrErrorNote,
                    { backgroundColor: abrInactive ? Colors.redBg : Colors.amberBg },
                  ]}
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={15}
                    color={abrInactive ? Colors.red : Colors.amber}
                  />
                  <AppText
                    style={[
                      styles.abrErrorText,
                      abrInactive ? styles.abrErrorRed : styles.abrErrorAmber,
                    ]}
                  >
                    {abrError}
                  </AppText>
                </View>
              ) : null}

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
                    <AppText style={styles.activeLabel}>ACTIVE ON VOUCHPAY</AppText>
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
                    <Ionicons
                      name="information-circle-outline"
                      size={14}
                      color={Colors.vouchGreen}
                    />
                    <AppText style={styles.activeNote}>
                      Your vouch joins their existing reputation.
                    </AppText>
                  </View>
                </View>
              ) : !abrInactive ? (
                /* Not yet on Vouch — unified card with contact fields */
                <View style={styles.pendingCard}>
                  <View style={styles.statusRow}>
                    <Ionicons name="shield-outline" size={16} color={Colors.amber} />
                    <AppText style={styles.pendingLabel}>NOT YET ON VOUCHPAY</AppText>
                  </View>
                  <AppText style={styles.pendingTitle}>Be the first to vouch them.</AppText>
                  <AppText style={styles.pendingDesc}>
                    {"Add their email and we'll send them an invite to claim it."}
                  </AppText>

                  <AppText style={styles.contactLabel}>EMAIL</AppText>
                  <TextInput
                    style={styles.contactInput}
                    value={recipientEmail}
                    onChangeText={(v) => {
                      setRecipientEmail(v);
                      setContactError("");
                    }}
                    placeholder="their@email.com"
                    placeholderTextColor={Colors.grey300}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />

                  <AppText style={styles.contactLabel}>
                    MOBILE <AppText style={styles.contactOptional}>(optional)</AppText>
                  </AppText>
                  <TextInput
                    style={styles.contactInput}
                    value={formatMobileDisplay(recipientMobile.replace(/\D/g, ""))}
                    onChangeText={(v) => setRecipientMobile(v.replace(/\D/g, "").slice(0, 10))}
                    placeholder="0412 345 678"
                    placeholderTextColor={Colors.grey300}
                    keyboardType="number-pad"
                    maxLength={12}
                  />

                  {contactError ? (
                    <AppText style={styles.contactError}>{contactError}</AppText>
                  ) : null}

                  <View style={styles.divider} />
                  <View style={styles.noteRow}>
                    <Ionicons name="time-outline" size={14} color={Colors.amber} />
                    <AppText style={styles.pendingNote}>
                      Your vouch stays pending until they accept the invite.
                    </AppText>
                  </View>
                </View>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {!loading && vouchStatus && !alreadyVouched && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.vouchBtn, abrInactive && { opacity: 0.4 }]}
            onPress={onPressVouch}
            activeOpacity={0.85}
            disabled={abrInactive}
            accessibilityRole="button"
            accessibilityLabel={btnLabel}
            accessibilityState={{ disabled: abrInactive }}
          >
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
  abrLegalName: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginTop: 1,
  },
  abrErrorNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  abrErrorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.medium,
  },
  abrErrorRed: {
    color: Colors.red,
  },
  abrErrorAmber: {
    color: Colors.amber,
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
    gap: 10,
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
  contactLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.black,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  contactOptional: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    letterSpacing: 0,
  },
  contactInput: {
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  contactError: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.red,
    marginTop: -2,
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
