import { useState } from "react";
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
import { NativeSelect } from "@/components/NativeSelect";
import { TRADE_TYPES } from "@/constants/trades";
import { useAuth } from "@/context/AuthContext";
import { useWizard } from "./WizardContext";
import { saveVouchProfileStep } from "@/lib/useVouchProfile";
import { showAlert } from "@/lib/errors";

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={styles.fieldWrap}>
      <AppText style={styles.fieldLabel}>{label}</AppText>
      <AppInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? ""}
        keyboardType={keyboardType ?? "default"}
        autoCorrect={false}
      />
    </View>
  );
}

export default function Step5() {
  const { fetchWithAuth, updateUser } = useAuth();
  const { step1, setStep1 } = useWizard();

  const [form, setForm] = useState(step1);
  const [saving, setSaving] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function formatExpiry(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
  }

  function isExpiryValid(expiry: string): boolean {
    const parts = expiry.split("/");
    if (parts.length !== 3 || parts[2].length !== 4) return false;
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (day < 1 || day > 31 || month < 1 || month > 12) return false;
    const now = new Date();
    return (
      new Date(year, month - 1, day) >= new Date(now.getFullYear(), now.getMonth(), now.getDate())
    );
  }

  const expiryInvalid = form.idExpiry.length >= 10 && !isExpiryValid(form.idExpiry);

  // Trade is required here because this screen is the only place the app asks
  // what someone does — it is what the Me card and every vouch profile display.
  // There is no second field to fall back on if it saves empty.
  const canContinue = form.idNumber.trim() && form.businessTrade.trim() && !expiryInvalid;

  async function onSave() {
    setStep1(form);
    setSaving(true);
    const error = await saveVouchProfileStep(fetchWithAuth, { ...form, references: [] });
    setSaving(false);
    // This step is what takes the profile to 100%, so a save that silently
    // failed used to leave people believing they were verified when they
    // weren't — and every gate downstream still said no.
    if (error) {
      showAlert("Couldn't save", error);
      return;
    }
    // The server has stored the trade on the user record; mirror it into the
    // cached auth user so screens reading user.businessTrade don't show the
    // previous value until the next cold start.
    await updateUser({ businessTrade: form.businessTrade });
    router.back();
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        showBack
        eyebrow="Step 2 of 2"
        title="Trade licence"
        subtitle="The last step — this verifies your profile."
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
          <SectionLabel>Licence details</SectionLabel>
          <View style={styles.section}>
            <Field
              label="LICENCE NUMBER"
              value={form.idNumber}
              onChangeText={(v) => update("idNumber", v)}
              placeholder="e.g. BLD123456"
            />

            <NativeSelect
              label="TRADE"
              value={form.businessTrade}
              options={[...TRADE_TYPES]}
              placeholder="Select your trade"
              onChange={(v) => update("businessTrade", v)}
            />

            <NativeSelect
              label="STATE"
              value={form.idState}
              options={AU_STATES}
              placeholder="Select state"
              onChange={(v) => update("idState", v)}
            />

            <View style={styles.fieldWrap}>
              <AppText style={styles.fieldLabel}>EXPIRY DATE</AppText>
              <AppInput
                style={[styles.input, expiryInvalid && styles.inputError]}
                value={form.idExpiry}
                onChangeText={(v) => update("idExpiry", formatExpiry(v))}
                placeholder="DD/MM/YYYY"
                keyboardType="numeric"
                maxLength={10}
                autoCorrect={false}
              />
              {expiryInvalid && (
                <AppText style={styles.expiryError}>
                  This document has expired — enter a valid expiry date.
                </AppText>
              )}
            </View>
          </View>

          <View style={styles.privacyNote}>
            <Ionicons name="lock-closed-outline" size={13} color={Colors.grey500} />
            <AppText style={styles.privacyText}>
              Your licence details are used for verification only and are never shared publicly.
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, (!canContinue || saving) && styles.primaryBtnDisabled]}
          onPress={onSave}
          disabled={!canContinue || saving}
          activeOpacity={0.85}
          accessibilityState={{ disabled: !canContinue || saving, busy: saving }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <AppText style={styles.primaryBtnText}>Save</AppText>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.vouchGreen },
  scroll: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 22 },
  section: {
    gap: 16,
    marginBottom: 26,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 16,
    padding: 16,
  },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.black, letterSpacing: 0.8 },
  input: {},
  inputError: { borderColor: Colors.red },
  expiryError: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.red, marginTop: 4 },
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: Colors.offWhite,
    borderRadius: 10,
    padding: 12,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    lineHeight: 17,
  },
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
