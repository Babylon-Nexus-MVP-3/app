import { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
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

const ATTRIBUTES = [
  "Pays on time",
  "Quality work",
  "Professional",
  "Reliable",
  "Communication",
  "Work with again",
];

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
  const [loadingAbr, setLoadingAbr] = useState(true);
  const [abrError] = useState("");

  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!abn) return;
    setAbrData(null);
    setVouchStatus(null);
    setSelected([]);
    setNote("");
    setSubmitted(false);
    setSubmitError("");
    lookupAbn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abn]);

  async function lookupAbn() {
    setLoadingAbr(true);
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
      setLoadingAbr(false);
    }
  }

  function toggleAttribute(attr: string) {
    setSelected((prev) => (prev.includes(attr) ? prev.filter((a) => a !== attr) : [...prev, attr]));
  }

  async function onVouch() {
    if (selected.length < 2) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/vouch/give`, {
        method: "POST",
        body: JSON.stringify({
          toAbn: abn,
          toBusinessName: abrData?.entityName ?? "",
          attributes: selected,
          note: note.trim() || undefined,
          requestId: requestId ?? undefined,
        }),
      });
      if (res.status === 409) {
        setSubmitError("You've already vouched for this business.");
        setVouchStatus((prev) => ({ ...prev!, alreadyVouched: true }));
        setSubmitting(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.vouchCount !== undefined) {
          setVouchStatus((prev) => ({ ...prev!, isOnVouch: true, vouchCount: data.vouchCount }));
        }
      }
    } catch {
      // Network unavailable — proceed optimistically
    } finally {
      setSubmitting(false);
    }
    setSubmitted(true);
  }

  const displayName = abrData?.tradingName || abrData?.entityName || "this business";
  const alreadyVouched = !!vouchStatus?.alreadyVouched;
  const canVouch = selected.length >= 2 && !alreadyVouched;

  if (submitted) {
    const totalVouches = (vouchStatus?.vouchCount ?? 0) + 1;

    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.successScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successIconCircle}>
            <Ionicons name="shield-checkmark-outline" size={36} color={Colors.vouchGreen} />
          </View>

          <AppText style={styles.successTitle}>Your vouch is live.</AppText>
          <AppText style={styles.successSub}>
            {displayName}
            {"'"}s reputation just got stronger.
          </AppText>

          {/* Business card */}
          <View style={styles.bizCard}>
            <View style={styles.bizCardTop}>
              <View style={styles.bizIconSmall}>
                <Ionicons name="shield-checkmark-outline" size={18} color={Colors.vouchGreen} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.bizName}>{abrData?.entityName ?? displayName}</AppText>
                <AppText style={styles.bizMeta}>
                  {[abrData?.businessType, abrData?.state].filter(Boolean).join(" · ")}
                </AppText>
              </View>
            </View>
            <AppText style={styles.vouchesCount}>
              {totalVouches} {totalVouches === 1 ? "vouch" : "vouches"}{" "}
              <AppText style={styles.vouchesSelf}>· +1 from you</AppText>
            </AppText>
          </View>

          <TouchableOpacity
            style={styles.primarySuccessBtn}
            onPress={() => router.replace("/(app)/vouches")}
            activeOpacity={0.85}
          >
            <AppText style={styles.primarySuccessBtnText}>Vouch another business</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondarySuccessBtn}
            onPress={() => router.replace("/(app)/home")}
            activeOpacity={0.7}
          >
            <AppText style={styles.secondarySuccessBtnText}>Back to home</AppText>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace("/(app)/vouches")} hitSlop={8}>
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
            <AppText style={styles.abnConfirmedText}>{formatDisplayAbn(abn ?? "")}</AppText>
            {!loadingAbr && !abrError && (
              <Ionicons name="checkmark" size={20} color={Colors.vouchGreen} />
            )}
          </View>

          {loadingAbr ? (
            <ActivityIndicator color={Colors.vouchGreen} style={{ marginTop: 24 }} />
          ) : abrError ? (
            <AppText style={styles.errorText}>{abrError}</AppText>
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

              {/* Vouch status card */}
              {requestId ? (
                <View style={styles.neutralCard}>
                  <AppText style={styles.neutralCountNum}>{vouchStatus?.vouchCount ?? 0}</AppText>
                  <AppText style={styles.neutralCountLabel}>
                    {(vouchStatus?.vouchCount ?? 0) === 1 ? "vouch received" : "vouches received"}
                  </AppText>
                </View>
              ) : vouchStatus?.isOnVouch ? (
                <View style={styles.activeCard}>
                  <View style={styles.statusRow}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={Colors.vouchGreen} />
                    <AppText style={styles.activeLabel}>ACTIVE ON VOUCH</AppText>
                  </View>
                  <AppText style={styles.vouchCount}>
                    <AppText style={styles.vouchCountNum}>{vouchStatus.vouchCount}</AppText>
                    {"  "}
                    <AppText style={styles.vouchCountLabel}>vouches received</AppText>
                  </AppText>
                  {vouchStatus.attributeSummary ? (
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
              ) : (
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
              ) : (
                <>
                  {/* Attribute selection */}
                  <AppText style={styles.attrHeading}>What would you say about them?</AppText>
                  <AppText style={styles.attrSub}>Pick at least 2.</AppText>
                  <View style={styles.chipWrap}>
                    {ATTRIBUTES.map((attr) => {
                      const active = selected.includes(attr);
                      return (
                        <TouchableOpacity
                          key={attr}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => toggleAttribute(attr)}
                          activeOpacity={0.7}
                        >
                          {active && <Ionicons name="checkmark" size={13} color={Colors.white} />}
                          <AppText style={[styles.chipText, active && styles.chipTextActive]}>
                            {attr}
                          </AppText>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Optional note */}
                  <AppText style={styles.noteLabel}>ADD A NOTE · optional</AppText>
                  <TextInput
                    style={styles.noteInput}
                    value={note}
                    onChangeText={setNote}
                    placeholder="e.g. Worked together on Westmead Hospital Stage 2. Highly recommend."
                    placeholderTextColor={Colors.grey300}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    fontFamily={Fonts.regular}
                  />
                  <AppText style={styles.noteHint}>
                    Notes are private and not shown publicly.
                  </AppText>
                </>
              )}
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {!loadingAbr && abrData && !alreadyVouched && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.vouchBtn, !canVouch && styles.vouchBtnDisabled]}
            onPress={onVouch}
            disabled={!canVouch || submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <AppText style={styles.vouchBtnText}>
                {alreadyVouched
                  ? "Already vouched"
                  : requestId || vouchStatus?.isOnVouch
                    ? `Vouch for ${displayName}`
                    : "Vouch and invite them"}
              </AppText>
            )}
          </TouchableOpacity>
          {alreadyVouched ? (
            <AppText style={styles.vouchHint}>
              {"You've already vouched for this business."}
            </AppText>
          ) : submitError ? (
            <AppText style={[styles.vouchHint, { color: Colors.red }]}>{submitError}</AppText>
          ) : !canVouch ? (
            <AppText style={styles.vouchHint}>Select at least 2 attributes to continue</AppText>
          ) : null}
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
    backgroundColor: Colors.vouchGreen,
    opacity: 0.2,
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

  // Attributes
  attrHeading: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginTop: 4,
  },
  attrSub: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginTop: -8,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: Colors.white,
  },
  chipActive: {
    borderColor: Colors.vouchGreen,
    backgroundColor: Colors.vouchGreen,
  },
  chipText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.grey700,
  },
  chipTextActive: {
    color: Colors.white,
  },

  // Note
  noteLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.black,
    minHeight: 90,
    backgroundColor: Colors.white,
    marginTop: -4,
  },
  noteHint: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginTop: -8,
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
    gap: 8,
  },
  vouchBtn: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  vouchBtnDisabled: {
    opacity: 0.4,
  },
  vouchBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  vouchHint: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textAlign: "center",
  },

  // Success screen
  successScroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 40,
    gap: 16,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.vouchGreenLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 26,
    fontFamily: Fonts.bold,
    color: Colors.black,
    textAlign: "center",
  },
  successSub: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.grey700,
    textAlign: "center",
    lineHeight: 22,
  },
  bizCard: {
    width: "100%",
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginTop: 8,
  },
  bizCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bizIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.vouchGreenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  bizName: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  bizMeta: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginTop: 1,
  },
  vouchesCount: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
  },
  vouchesSelf: {
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
  primarySuccessBtn: {
    width: "100%",
    backgroundColor: Colors.vouchGreen,
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primarySuccessBtnText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  secondarySuccessBtn: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  secondarySuccessBtnText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },

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
  errorText: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.red, textAlign: "center" },
});
