import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
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
import { useAuth } from "@/context/AuthContext";
import { useWizard } from "./WizardContext";

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];

function StatePickerModal({
  visible,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selected: string;
  onSelect: (s: string) => void;
  onClose: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 300, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fadeAnim, slideAnim]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Animated.View style={[StyleSheet.absoluteFillObject, sp.overlay, { opacity: fadeAnim }]}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        </Animated.View>
        <View style={{ flex: 1, justifyContent: "flex-end" }} pointerEvents="box-none">
          <Animated.View style={[sp.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={sp.handle} />
            <AppText style={sp.title}>Select state</AppText>
            {AU_STATES.map((s) => (
              <TouchableOpacity
                key={s}
                style={sp.option}
                onPress={() => {
                  onSelect(s);
                  onClose();
                }}
              >
                <AppText style={[sp.optionText, selected === s && sp.optionTextSelected]}>
                  {s}
                </AppText>
                {selected === s && (
                  <Ionicons name="checkmark" size={18} color={Colors.vouchGreen} />
                )}
              </TouchableOpacity>
            ))}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const sp = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    paddingTop: 12,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.grey300,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey300,
  },
  optionText: { fontSize: 16, fontFamily: Fonts.regular, color: Colors.black },
  optionTextSelected: { fontFamily: Fonts.semiBold, color: Colors.vouchGreen },
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

export default function Step6() {
  const { fetchWithAuth } = useAuth();
  const { step1, setStep1 } = useWizard();

  const [form, setForm] = useState(step1);
  const [statePickerOpen, setStatePickerOpen] = useState(false);

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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>STEP 6 OF 6</AppText>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.progressWrap}>
        <View style={{ flex: 1, backgroundColor: Colors.vouchGreen }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <AppText style={styles.heading}>ID verification</AppText>
          <AppText style={styles.subheading}>
            Verify your identity to reach 100% profile strength and unlock all features.
          </AppText>

          <View style={styles.idTypeRow}>
            <TouchableOpacity
              style={[styles.chip, form.idType === "trade-licence" && styles.chipSelected]}
              onPress={() => update("idType", "trade-licence")}
            >
              <Ionicons
                name="construct-outline"
                size={15}
                color={form.idType === "trade-licence" ? Colors.white : Colors.grey700}
              />
              <AppText
                style={[
                  styles.chipText,
                  form.idType === "trade-licence" && styles.chipTextSelected,
                ]}
              >
                Trade licence
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
          </View>

          <View style={styles.section}>
            <Field
              label="DOCUMENT NUMBER"
              value={form.idNumber}
              onChangeText={(v) => update("idNumber", v)}
              placeholder={
                form.idType === "licence"
                  ? "e.g. 12345678"
                  : form.idType === "trade-licence"
                    ? "e.g. BLD123456"
                    : "e.g. PA1234567"
              }
            />

            {form.idType === "licence" || form.idType === "trade-licence" ? (
              <View style={styles.fieldWrap}>
                <AppText style={styles.fieldLabel}>STATE</AppText>
                <TouchableOpacity
                  style={[styles.input, styles.inputSelect]}
                  onPress={() => setStatePickerOpen(true)}
                  activeOpacity={0.7}
                >
                  <AppText
                    style={form.idState ? styles.inputSelectValue : styles.inputSelectPlaceholder}
                  >
                    {form.idState || "Select state"}
                  </AppText>
                  <Ionicons name="chevron-down" size={16} color={Colors.grey500} />
                </TouchableOpacity>
              </View>
            ) : (
              <Field
                label="COUNTRY"
                value={form.idCountry}
                onChangeText={(v) => update("idCountry", v)}
                placeholder="e.g. Australia"
              />
            )}

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

          <StatePickerModal
            visible={statePickerOpen}
            selected={form.idState}
            onSelect={(s) => update("idState", s)}
            onClose={() => setStatePickerOpen(false)}
          />

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
  scroll: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 24 },
  heading: { fontSize: 26, fontFamily: Fonts.bold, color: Colors.black, marginBottom: 8 },
  subheading: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginBottom: 24,
    lineHeight: 20,
  },
  section: { gap: 16, marginBottom: 28 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.black, letterSpacing: 0.8 },
  input: {},
  inputError: { borderColor: Colors.red },
  inputSelect: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  inputSelectValue: { fontSize: 15, fontFamily: Fonts.regular, color: Colors.black },
  inputSelectPlaceholder: { fontSize: 15, fontFamily: Fonts.regular, color: Colors.grey300 },
  expiryError: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.red, marginTop: 4 },
  idTypeRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
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
  chipSelected: { backgroundColor: Colors.vouchGreen, borderColor: Colors.vouchGreen },
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
