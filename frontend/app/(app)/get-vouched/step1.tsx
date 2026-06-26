import { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { API_BASE_URL } from "@/constants/api";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { AppInput } from "@/components/AppInput";
import { AbrCard } from "@/components/AbrCard";
import { useAuth } from "@/context/AuthContext";
import { useWizard } from "./WizardContext";
import { formatAbn, useAbrLookup } from "@/lib/useAbrLookup";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <AppText style={styles.infoLabel}>{label}</AppText>
      <AppText style={styles.infoValue}>{value || "—"}</AppText>
    </View>
  );
}

export default function Step1() {
  const { user, fetchWithAuth, updateUser } = useAuth();
  const { step1, setStep1 } = useWizard();

  const hasAccountDetails = !!(user?.name && user?.abn && user?.businessTrade);

  const [trade, setTrade] = useState(step1.trade || user?.businessTrade || "");
  const syncedRef = useRef(false);

  // WizardContext fetch is async — sync once it resolves, preferring the saved vouch profile value
  useEffect(() => {
    if (!syncedRef.current && step1.trade) {
      setTrade(step1.trade);
      syncedRef.current = true;
    }
  }, [step1.trade]);

  const { abrResult, abrLoading, abrError } = useAbrLookup(
    user?.abn?.replace(/\D/g, "") ?? step1.abn
  );

  function persistTrade(currentTrade: string) {
    const updatedStep1 = {
      ...step1,
      name: user?.name ?? step1.name,
      abn: (user?.abn ?? step1.abn).replace(/\D/g, ""),
      trade: currentTrade,
    };
    setStep1(updatedStep1);
    if (currentTrade !== user?.businessTrade) {
      updateUser({ businessTrade: currentTrade });
    }
    return updatedStep1;
  }

  function handleBack() {
    if (trade.trim()) persistTrade(trade);
    router.back();
  }

  async function onSave() {
    const updatedStep1 = persistTrade(trade);
    fetchWithAuth(`${API_BASE_URL}/vouch/profile`, {
      method: "POST",
      body: JSON.stringify({ ...updatedStep1, references: [] }),
    }).catch(() => {});
    router.back();
  }

  const canSave = trade.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>STEP 1 OF 6</AppText>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressWrap}>
        <View style={[styles.progressFill, { flex: 1 }]} />
        <View style={[styles.progressEmpty, { flex: 5 }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <AppText style={styles.heading}>Your details</AppText>
          <AppText style={styles.subheading}>
            {hasAccountDetails
              ? "These details come from your account. Confirm or update your trade type."
              : "Confirm your details from your account."}
          </AppText>

          <View style={styles.detailsCard}>
            <InfoRow label="NAME" value={user?.name ?? step1.name} />
            <View style={styles.divider} />
            <InfoRow label="ABN" value={formatAbn((user?.abn ?? step1.abn).replace(/\D/g, ""))} />
            {(abrResult || abrLoading || abrError) && (
              <AbrCard abrResult={abrResult} abrLoading={abrLoading} abrError={abrError} />
            )}
            <View style={styles.divider} />
            <InfoRow label="BUSINESS NAME" value={user?.businessName ?? ""} />
            <View style={styles.lockNote}>
              <Ionicons name="lock-closed-outline" size={12} color={Colors.grey500} />
              <AppText style={styles.lockText}>
                Name and ABN are locked to your account details.
              </AppText>
            </View>
          </View>

          <AppText style={styles.fieldLabel}>TRADE / BUSINESS TYPE</AppText>
          <AppInput
            style={styles.input}
            value={trade}
            onChangeText={setTrade}
            placeholder="e.g. Plumbing, Electrical, Carpentry"
            autoCapitalize="words"
            autoCorrect={false}
          />
          <AppText style={styles.fieldHint}>
            This helps people understand what you do when they view your vouch profile.
          </AppText>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, !canSave && styles.primaryBtnDisabled]}
          onPress={onSave}
          disabled={!canSave}
          activeOpacity={0.85}
        >
          <AppText style={styles.primaryBtnText}>Save &amp; continue</AppText>
        </TouchableOpacity>
      </View>
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
    paddingTop: 14,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.black, letterSpacing: 1 },
  progressWrap: { flexDirection: "row", height: 3, marginTop: 10 },
  progressFill: { backgroundColor: Colors.vouchGreen },
  progressEmpty: { backgroundColor: Colors.grey300 },
  scroll: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 24 },
  heading: { fontSize: 26, fontFamily: Fonts.bold, color: Colors.black, marginBottom: 8 },
  subheading: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginBottom: 24,
    lineHeight: 20,
  },
  detailsCard: {
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
    gap: 4,
  },
  infoRow: { paddingVertical: 10 },
  infoLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  infoValue: { fontSize: 16, fontFamily: Fonts.regular, color: Colors.black },
  divider: { height: 1, backgroundColor: Colors.grey300, marginVertical: 4 },
  lockNote: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  lockText: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.grey500 },
  fieldLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.black,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    marginBottom: 8,
  },
  fieldHint: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.grey500, lineHeight: 18 },
  footer: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12 },
  primaryBtn: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: Colors.white, fontSize: 16, fontFamily: Fonts.bold },
});
