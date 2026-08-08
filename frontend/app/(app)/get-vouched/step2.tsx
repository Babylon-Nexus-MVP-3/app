import { useState } from "react";
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
import { ScreenHeader, sheetStyle } from "@/components/ScreenHeader";
import { SectionLabel } from "@/components/ui";
import { AppInput } from "@/components/AppInput";
import { NativeSelect } from "@/components/NativeSelect";
import { useAuth } from "@/context/AuthContext";
import { useWizard } from "./WizardContext";

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

// Licence classes people actually hold on Australian sites. "Other" keeps the
// list short without shutting anyone out.
const TRADE_TYPES = [
  "Builder",
  "Carpentry",
  "Electrical",
  "Plumbing",
  "Concreting",
  "Bricklaying",
  "Roofing",
  "Painting",
  "Plastering",
  "Tiling",
  "Waterproofing",
  "Air conditioning & refrigeration",
  "Landscaping",
  "Glazing",
  "Demolition",
  "Other",
];

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
  const { fetchWithAuth } = useAuth();
  const { step1, setStep1 } = useWizard();

  const [form, setForm] = useState(step1);

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

  const canContinue = form.idNumber.trim() && !expiryInvalid;

  async function onSave() {
    setStep1(form);
    fetchWithAuth(`${API_BASE_URL}/vouch/profile`, {
      method: "POST",
      body: JSON.stringify({ ...form, references: [] }),
    }).catch(() => {});
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
              label="TRADE TYPE"
              value={form.tradeType}
              options={TRADE_TYPES}
              placeholder="Select trade type"
              onChange={(v) => update("tradeType", v)}
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
          style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
          onPress={onSave}
          disabled={!canContinue}
          activeOpacity={0.85}
        >
          <AppText style={styles.primaryBtnText}>Save</AppText>
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
