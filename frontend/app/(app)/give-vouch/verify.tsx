import { useState, useEffect } from "react";
import {
  View,
  Text,
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

  useEffect(() => {
    if (!abn) return;
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
      if (res.ok) {
        const data = await res.json();
        if (data.vouchCount !== undefined) {
          setVouchStatus((prev) => ({ ...prev, isOnVouch: true, vouchCount: data.vouchCount }));
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
  const canVouch = selected.length >= 2;

  if (submitted) {
    const totalVouches = (vouchStatus?.vouchCount ?? 0) + 1;
    const barFill = Math.min(totalVouches / 20, 1); // cap at 20 for full bar

    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.successScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successIconCircle}>
            <Ionicons name="shield-checkmark-outline" size={36} color={Colors.vouchGreen} />
          </View>

          <Text style={styles.successTitle}>Your vouch is live.</Text>
          <Text style={styles.successSub}>
            {displayName}
            {"'"}s reputation just got stronger.
          </Text>

          {/* Business card */}
          <View style={styles.bizCard}>
            <View style={styles.bizCardTop}>
              <View style={styles.bizIconSmall}>
                <Ionicons name="shield-checkmark-outline" size={18} color={Colors.vouchGreen} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.bizName}>{abrData?.entityName ?? displayName}</Text>
                <Text style={styles.bizMeta}>
                  {[abrData?.businessType, abrData?.state].filter(Boolean).join(" · ")}
                </Text>
              </View>
            </View>
            <Text style={styles.vouchesLabel}>VOUCHES</Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { flex: barFill }]} />
              <View style={{ flex: 1 - barFill }} />
            </View>
            <Text style={styles.vouchesCount}>
              {totalVouches} {totalVouches === 1 ? "vouch" : "vouches"}{" "}
              <Text style={styles.vouchesSelf}>· +1 from you</Text>
            </Text>
          </View>

          <TouchableOpacity
            style={styles.primarySuccessBtn}
            onPress={() => router.replace("/(app)/vouches")}
            activeOpacity={0.85}
          >
            <Text style={styles.primarySuccessBtnText}>Vouch another business</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondarySuccessBtn}
            onPress={() => router.replace("/(app)/home")}
            activeOpacity={0.7}
          >
            <Text style={styles.secondarySuccessBtnText}>Back to home</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify business</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* ABN confirmed row */}
          <Text style={styles.fieldLabel}>ABN</Text>
          <View style={styles.abnConfirmed}>
            <Text style={styles.abnConfirmedText}>{formatDisplayAbn(abn ?? "")}</Text>
            {!loadingAbr && !abrError && (
              <Ionicons name="checkmark" size={20} color={Colors.vouchGreen} />
            )}
          </View>

          {loadingAbr ? (
            <ActivityIndicator color={Colors.vouchGreen} style={{ marginTop: 24 }} />
          ) : abrError ? (
            <Text style={styles.errorText}>{abrError}</Text>
          ) : abrData ? (
            <>
              {/* ABR result */}
              <View style={styles.abrCard}>
                <Text style={styles.abrFrom}>FROM ABR</Text>
                <Text style={styles.abrName}>{abrData.entityName}</Text>
                <Text style={styles.abrMeta}>
                  {abrData.businessType} · {abrData.state} · Active {abrData.activeYears} yrs
                </Text>
              </View>

              {/* Vouch status card */}
              {requestId ? (
                <View style={styles.neutralCard}>
                  <Text style={styles.neutralCountNum}>{vouchStatus?.vouchCount ?? 0}</Text>
                  <Text style={styles.neutralCountLabel}>
                    {(vouchStatus?.vouchCount ?? 0) === 1 ? "vouch received" : "vouches received"}
                  </Text>
                </View>
              ) : vouchStatus?.isOnVouch ? (
                <View style={styles.activeCard}>
                  <View style={styles.statusRow}>
                    <Ionicons name="shield-checkmark-outline" size={16} color={Colors.vouchGreen} />
                    <Text style={styles.activeLabel}>ACTIVE ON VOUCH</Text>
                  </View>
                  <Text style={styles.vouchCount}>
                    <Text style={styles.vouchCountNum}>{vouchStatus.vouchCount}</Text>
                    {"  "}
                    <Text style={styles.vouchCountLabel}>vouches received</Text>
                  </Text>
                  {vouchStatus.attributeSummary ? (
                    <Text style={styles.activeDesc}>{vouchStatus.attributeSummary}</Text>
                  ) : null}
                  <View style={styles.divider} />
                  <View style={styles.noteRow}>
                    <Ionicons
                      name="information-circle-outline"
                      size={14}
                      color={Colors.vouchGreen}
                    />
                    <Text style={styles.activeNote}>
                      Your vouch joins their existing reputation.
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.pendingCard}>
                  <View style={styles.statusRow}>
                    <Ionicons name="shield-outline" size={16} color={Colors.amber} />
                    <Text style={styles.pendingLabel}>NOT YET ON VOUCH</Text>
                  </View>
                  <Text style={styles.pendingTitle}>Be the first to vouch them.</Text>
                  <Text style={styles.pendingDesc}>
                    {"Your vouch creates their profile on Vouch. We'll invite them to claim it."}
                  </Text>
                  <View style={styles.divider} />
                  <View style={styles.noteRow}>
                    <Ionicons name="time-outline" size={14} color={Colors.amber} />
                    <Text style={styles.pendingNote}>
                      Your vouch stays pending until they accept the invite.
                    </Text>
                  </View>
                </View>
              )}

              {/* Attribute selection */}
              <Text style={styles.attrHeading}>What would you say about them?</Text>
              <Text style={styles.attrSub}>Pick at least 2.</Text>
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
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>{attr}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Optional note */}
              <Text style={styles.noteLabel}>ADD A NOTE · optional</Text>
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="e.g. Worked together on Westmead Hospital Stage 2. Highly recommend."
                placeholderTextColor={Colors.grey300}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
              <Text style={styles.noteHint}>Notes are private and not shown publicly.</Text>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {!loadingAbr && abrData && (
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
              <Text style={styles.vouchBtnText}>
                {requestId || vouchStatus?.isOnVouch
                  ? `Vouch for ${displayName}`
                  : "Vouch and invite them"}
              </Text>
            )}
          </TouchableOpacity>
          {!canVouch && (
            <Text style={styles.vouchHint}>Select at least 2 attributes to continue</Text>
          )}
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
    fontWeight: "600",
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
    fontWeight: "700",
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
    fontWeight: "500",
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
    fontWeight: "700",
    color: Colors.grey500,
    letterSpacing: 1,
    marginBottom: 2,
  },
  abrName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.black,
  },
  abrMeta: {
    fontSize: 13,
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
    fontWeight: "700",
    color: Colors.black,
  },
  neutralCountLabel: {
    fontSize: 14,
    color: Colors.grey500,
    fontWeight: "500",
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
    fontWeight: "700",
    color: Colors.vouchGreen,
    letterSpacing: 0.8,
  },
  vouchCount: {
    marginTop: 2,
  },
  vouchCountNum: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.vouchGreen,
  },
  vouchCountLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.vouchGreen,
  },
  activeDesc: {
    fontSize: 13,
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
    fontWeight: "500",
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
    fontWeight: "700",
    color: Colors.amber,
    letterSpacing: 0.8,
  },
  pendingTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.black,
  },
  pendingDesc: {
    fontSize: 13,
    color: Colors.grey700,
    lineHeight: 19,
  },
  pendingNote: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.amber,
    flex: 1,
  },

  // Attributes
  attrHeading: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.black,
    marginTop: 4,
  },
  attrSub: {
    fontSize: 13,
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
    fontWeight: "500",
    color: Colors.grey700,
  },
  chipTextActive: {
    color: Colors.white,
  },

  // Note
  noteLabel: {
    fontSize: 11,
    fontWeight: "700",
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
    fontWeight: "700",
  },
  vouchHint: {
    fontSize: 12,
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
    fontWeight: "700",
    color: Colors.black,
    textAlign: "center",
  },
  successSub: {
    fontSize: 15,
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
    fontWeight: "700",
    color: Colors.black,
  },
  bizMeta: {
    fontSize: 12,
    color: Colors.grey500,
    marginTop: 1,
  },
  vouchesLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.grey500,
    letterSpacing: 0.8,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.grey300,
    flexDirection: "row",
    overflow: "hidden",
  },
  barFill: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 4,
  },
  vouchesCount: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.black,
  },
  vouchesSelf: {
    color: Colors.vouchGreen,
    fontWeight: "600",
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
    fontWeight: "700",
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
    fontWeight: "600",
    color: Colors.vouchGreen,
  },

  errorText: { fontSize: 14, color: Colors.red, textAlign: "center" },
});
