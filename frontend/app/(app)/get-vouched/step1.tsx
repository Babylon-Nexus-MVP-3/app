import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { ScreenHeader, sheetStyle } from "@/components/ScreenHeader";
import { SectionLabel } from "@/components/ui";
import { AppInput } from "@/components/AppInput";
import { AbrCard } from "@/components/AbrCard";
import { useAuth } from "@/context/AuthContext";
import { useWizard } from "./WizardContext";
import { useAbrLookup } from "@/lib/useAbrLookup";
import { formatAbn } from "@/lib/format";
import { saveVouchProfileStep } from "@/lib/useVouchProfile";
import { showAlert } from "@/lib/errors";

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

  const [trade, setTrade] = useState(step1.trade || user?.businessTrade || "");
  const [saving, setSaving] = useState(false);
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
    setSaving(true);
    const error = await saveVouchProfileStep(fetchWithAuth, {
      ...updatedStep1,
      references: [],
    });
    setSaving(false);
    // Only leave the screen once the server has actually accepted the save.
    if (error) {
      showAlert("Couldn't save", error);
      return;
    }
    router.back();
  }

  const canSave = trade.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        showBack
        onBack={handleBack}
        eyebrow="Step 1 of 2"
        title="Your details"
        subtitle="Who you are and what you do."
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={sheetStyle.sheet}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <SectionLabel>From your account</SectionLabel>
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

          <SectionLabel>What do you do?</SectionLabel>
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
          style={[styles.primaryBtn, (!canSave || saving) && styles.primaryBtnDisabled]}
          onPress={onSave}
          disabled={!canSave || saving}
          activeOpacity={0.85}
          accessibilityState={{ disabled: !canSave || saving, busy: saving }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <AppText style={styles.primaryBtnText}>Save &amp; continue</AppText>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.vouchGreen },
  scroll: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 22 },
  detailsCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 16,
    padding: 16,
    marginBottom: 26,
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
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: Colors.white,
  },
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
