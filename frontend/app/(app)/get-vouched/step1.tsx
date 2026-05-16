import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
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
import { useAuth } from "@/context/AuthContext";
import { useWizard } from "./WizardContext";

type AbrResult = {
  entityName: string;
  tradingName?: string;
  businessType: string;
  state: string;
  activeYears: number;
  isActive: boolean;
};

function formatAbn(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
}

function ProgressBar({ step }: { step: number }) {
  return (
    <View style={pb.wrap}>
      <View style={[pb.fill, { flex: step }]} />
      <View style={[pb.empty, { flex: 3 - step }]} />
    </View>
  );
}

const pb = StyleSheet.create({
  wrap: { flexDirection: "row", height: 3, marginTop: 10 },
  fill: { backgroundColor: Colors.vouchGreen },
  empty: { backgroundColor: Colors.grey300 },
});

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
  keyboardType?: "default" | "numeric" | "phone-pad" | "email-address";
}) {
  return (
    <View style={styles.fieldWrap}>
      <AppText style={styles.fieldLabel}>{label}</AppText>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? ""}
        placeholderTextColor={Colors.grey300}
        keyboardType={keyboardType ?? "default"}
        autoCorrect={false}
      />
    </View>
  );
}

export default function Step1() {
  const { user } = useAuth();
  const { step1, setStep1 } = useWizard();

  const [form, setForm] = useState(step1);
  const [abnDisplay, setAbnDisplay] = useState(formatAbn(step1.abn));
  const [abrResult, setAbrResult] = useState<AbrResult | null>(null);
  const [abrLoading, setAbrLoading] = useState(false);
  const [abrError, setAbrError] = useState("");
  const abrTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasAccountAbn = !!user?.abn;

  useEffect(() => {
    if (!form.name && user?.name) {
      setForm((f) => ({ ...f, name: user.name }));
    }
  }, [user, form.name]);

  useEffect(() => {
    if (!form.abn && user?.abn) {
      const digits = user.abn.replace(/\D/g, "").slice(0, 11);
      setAbnDisplay(formatAbn(digits));
      setForm((f) => ({ ...f, abn: digits }));
    }
  }, [user, form.abn]);

  useEffect(() => {
    if (form.abn.length !== 11) {
      setAbrResult(null);
      setAbrError("");
      return;
    }
    if (abrTimeout.current) clearTimeout(abrTimeout.current);
    abrTimeout.current = setTimeout(() => lookupAbn(form.abn), 400);
    return () => {
      if (abrTimeout.current) clearTimeout(abrTimeout.current);
    };
  }, [form.abn]);

  async function lookupAbn(digits: string) {
    setAbrLoading(true);
    setAbrError("");
    setAbrResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/abr/lookup?abn=${digits}`);
      if (!res.ok) throw new Error("ABN not found");
      const data: AbrResult = await res.json();
      if (!data.isActive) throw new Error("This ABN is not active");
      setAbrResult(data);
    } catch {
      setAbrError("ABN not found. Check the number and try again.");
    } finally {
      setAbrLoading(false);
    }
  }

  function onAbnChange(text: string) {
    const digits = text.replace(/\D/g, "").slice(0, 11);
    setAbnDisplay(formatAbn(digits));
    update("abn", digits);
  }

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function formatExpiry(raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + "/" + digits.slice(2, 6);
  }

  function isExpiryValid(expiry: string): boolean {
    const parts = expiry.split("/");
    if (parts.length !== 2 || parts[1].length !== 4) return false;
    const month = parseInt(parts[0], 10);
    const year = parseInt(parts[1], 10);
    if (isNaN(month) || isNaN(year) || month < 1 || month > 12) return false;
    const now = new Date();
    return new Date(year, month - 1, 1) >= new Date(now.getFullYear(), now.getMonth(), 1);
  }

  const expiryInvalid = form.idExpiry.length >= 7 && !isExpiryValid(form.idExpiry);

  function onContinue() {
    setStep1(form);
    router.push("/(app)/get-vouched/step2");
  }

  const canContinue =
    form.name.trim() &&
    form.abn.length === 11 &&
    !abrLoading &&
    !abrError &&
    form.trade.trim() &&
    form.idNumber.trim() &&
    form.idExpiry.length === 7 &&
    !expiryInvalid;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>STEP 1 OF 3</AppText>
        <View style={{ width: 24 }} />
      </View>
      <ProgressBar step={1} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <AppText style={styles.heading}>Your details</AppText>

          <View style={styles.section}>
            <Field
              label="NAME"
              value={form.name}
              onChangeText={(v) => update("name", v)}
              placeholder="Full name"
            />
            <View style={styles.fieldWrap}>
              <AppText style={styles.fieldLabel}>ABN</AppText>
              {hasAccountAbn ? (
                <View style={[styles.input, styles.inputLocked]}>
                  <AppText style={styles.lockedValue}>{abnDisplay || "—"}</AppText>
                  <Ionicons name="lock-closed-outline" size={14} color={Colors.grey500} />
                </View>
              ) : (
                <>
                  <TextInput
                    style={[styles.input, abrError ? styles.inputError : null]}
                    value={abnDisplay}
                    onChangeText={onAbnChange}
                    placeholder="XX XXX XXX XXX"
                    placeholderTextColor={Colors.grey300}
                    keyboardType="numeric"
                    autoCorrect={false}
                  />
                  <AppText style={styles.abnMissingHint}>
                    No ABN on your account — add one via Me tab after submitting.
                  </AppText>
                </>
              )}
              {abrLoading && (
                <View style={styles.abrRow}>
                  <ActivityIndicator size="small" color={Colors.vouchGreen} />
                  <AppText style={styles.abrLoadingText}>Looking up ABN…</AppText>
                </View>
              )}
              {abrResult && !abrLoading && (
                <View style={styles.abrConfirmed}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.vouchGreen} />
                  <AppText style={styles.abrConfirmedText}>
                    {abrResult.tradingName || abrResult.entityName}
                    {"  ·  "}
                    {abrResult.businessType}
                    {"  ·  "}
                    {abrResult.state}
                  </AppText>
                </View>
              )}
              {abrError && !abrLoading && <AppText style={styles.abrError}>{abrError}</AppText>}
            </View>
            <Field
              label="TRADE / BUSINESS TYPE"
              value={form.trade}
              onChangeText={(v) => update("trade", v)}
              placeholder="e.g. Plumbing, Electrical"
            />
          </View>

          {/* ID Verification */}
          <AppText style={styles.sectionLabel}>ID VERIFICATION</AppText>

          <View style={styles.idTypeRow}>
            <TouchableOpacity
              style={[styles.chip, form.idType === "passport" && styles.chipSelected]}
              onPress={() => update("idType", "passport")}
            >
              <Ionicons
                name="document-outline"
                size={15}
                color={form.idType === "passport" ? Colors.white : Colors.grey700}
              />
              <AppText
                style={[styles.chipText, form.idType === "passport" && styles.chipTextSelected]}
              >
                Passport
              </AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, form.idType === "licence" && styles.chipSelected]}
              onPress={() => update("idType", "licence")}
            >
              <Ionicons
                name="card-outline"
                size={15}
                color={form.idType === "licence" ? Colors.white : Colors.grey700}
              />
              <AppText
                style={[styles.chipText, form.idType === "licence" && styles.chipTextSelected]}
              >
                {"Driver's licence"}
              </AppText>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Field
              label="DOCUMENT NUMBER"
              value={form.idNumber}
              onChangeText={(v) => update("idNumber", v)}
              placeholder={form.idType === "passport" ? "e.g. PA1234567" : "e.g. 12345678"}
            />
            <View style={styles.fieldWrap}>
              <AppText style={styles.fieldLabel}>EXPIRY DATE</AppText>
              <TextInput
                style={[styles.input, expiryInvalid ? styles.inputError : null]}
                value={form.idExpiry}
                onChangeText={(v) => update("idExpiry", formatExpiry(v))}
                placeholder="MM/YYYY"
                placeholderTextColor={Colors.grey300}
                keyboardType="numeric"
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
              Your ID is used for verification only and is never shared publicly.
            </AppText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, !canContinue && styles.primaryBtnDisabled]}
          onPress={onContinue}
          disabled={!canContinue}
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
  headerTitle: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
    letterSpacing: 1,
  },
  scroll: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 24 },
  heading: { fontSize: 26, fontFamily: Fonts.bold, color: Colors.black, marginBottom: 24 },
  section: { gap: 16, marginBottom: 28 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.black, letterSpacing: 0.8 },
  input: {
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
  inputError: { borderColor: Colors.red },
  inputLocked: {
    backgroundColor: Colors.grey100,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  lockedValue: { fontSize: 15, fontFamily: Fonts.regular, color: Colors.grey700 },
  abnMissingHint: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.amber, marginTop: 4 },
  abrRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  abrLoadingText: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.grey500 },
  abrConfirmed: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.vouchGreenLight,
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  abrConfirmedText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.vouchGreen,
    lineHeight: 18,
  },
  abrError: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.red, marginTop: 6 },
  expiryError: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.red, marginTop: 4 },
  sectionLabel: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.vouchGreen,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  idTypeRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    backgroundColor: Colors.white,
  },
  chipSelected: {
    backgroundColor: Colors.vouchGreen,
    borderColor: Colors.vouchGreen,
  },
  chipText: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.grey700 },
  chipTextSelected: { color: Colors.white },
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
