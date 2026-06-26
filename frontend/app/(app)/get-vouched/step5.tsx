import { useEffect, useRef, useState } from "react";
import {
  Animated,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { AppInput } from "@/components/AppInput";
import { useWizard } from "./WizardContext";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

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
  flex,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  flex?: number;
}) {
  return (
    <View style={[styles.fieldWrap, flex !== undefined && { flex }]}>
      {label ? <AppText style={styles.fieldLabel}>{label}</AppText> : null}
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
  const { step1, step2, setStep2 } = useWizard();
  const { fetchWithAuth } = useAuth();
  const [form, setForm] = useState(step2);
  const [statePickerOpen, setStatePickerOpen] = useState(false);
  const [yearTouched, setYearTouched] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    setForm((f) => {
      const hasData = Object.values(f).some((v) => v !== "");
      return hasData ? f : step2;
    });
  }, [step2]);

  function filterDecimal(v: string) {
    const filtered = v.replace(/[^0-9.]/g, "");
    const parts = filtered.split(".");
    return parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : filtered;
  }

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onContinue() {
    setStep2(form);
    fetchWithAuth(`${API_BASE_URL}/vouch/profile`, {
      method: "POST",
      body: JSON.stringify({ ...step1, ...form, references: [] }),
    }).catch(() => {});
    router.back();
  }

  const yearLen = form.pastMonthYear.length;
  const yearNum = parseInt(form.pastMonthYear, 10);
  const yearErr =
    yearLen === 0
      ? ""
      : yearLen < 4
        ? yearTouched
          ? "Enter a 4-digit year"
          : ""
        : yearNum < 1900 || yearNum > currentYear
          ? `Year must be between 1900 and ${currentYear}`
          : "";
  const yearValid = yearLen === 0 || (yearLen === 4 && !yearErr);

  const canContinue =
    form.pastProjectName.trim() && form.pastSuburb.trim() && form.pastState.trim() && yearValid;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>STEP 5 OF 6</AppText>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.progressWrap}>
        <View style={[styles.progressFill, { flex: 5 }]} />
        <View style={[styles.progressEmpty, { flex: 1 }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <AppText style={styles.heading}>Past project</AppText>
          <AppText style={styles.subheading}>
            Share a completed project to show your track record.
          </AppText>

          <View style={styles.section}>
            <Field
              label="PROJECT NAME"
              value={form.pastProjectName}
              onChangeText={(v) => update("pastProjectName", v)}
              placeholder="e.g. Riverside Apartments fitout"
            />
            <View style={styles.row}>
              <Field
                value={form.pastSuburb}
                onChangeText={(v) => update("pastSuburb", v)}
                placeholder="Suburb"
                flex={2}
              />
              <TouchableOpacity
                style={[styles.fieldWrap, { flex: 1 }]}
                onPress={() => setStatePickerOpen(true)}
                activeOpacity={0.7}
              >
                <View style={styles.stateBtn}>
                  <AppText
                    style={[styles.stateBtnText, !form.pastState && styles.stateBtnPlaceholder]}
                  >
                    {form.pastState || "State"}
                  </AppText>
                  <Ionicons name="chevron-down" size={14} color={Colors.grey500} />
                </View>
              </TouchableOpacity>
              <View style={[styles.fieldWrap, { flex: 1 }]}>
                <AppInput
                  style={styles.input}
                  value={form.pastPostcode}
                  onChangeText={(v) => update("pastPostcode", v.replace(/\D/g, "").slice(0, 4))}
                  placeholder="Postcode"
                                    keyboardType="numeric"
                  maxLength={4}
                  autoCorrect={false}
                />
              </View>
            </View>
            <View style={styles.row}>
              <View style={[styles.fieldWrap, { flex: 1 }]}>
                <AppText style={styles.fieldLabel}>YEAR COMPLETED</AppText>
                <AppInput
                  style={[styles.input, yearErr ? styles.inputError : null]}
                  value={form.pastMonthYear}
                  onChangeText={(v) => update("pastMonthYear", v.replace(/\D/g, "").slice(0, 4))}
                  onBlur={() => setYearTouched(true)}
                  placeholder="YYYY"
                                    keyboardType="numeric"
                  maxLength={4}
                  autoCorrect={false}
                />
                {yearErr ? <AppText style={styles.fieldError}>{yearErr}</AppText> : null}
              </View>
              <View style={[styles.fieldWrap, { flex: 2 }]}>
                <View style={styles.valueLabelRow}>
                  <AppText style={styles.fieldLabel}>VALUE</AppText>
                  <View style={styles.privateTag}>
                    <Ionicons name="lock-closed-outline" size={10} color={Colors.grey500} />
                    <AppText style={styles.privateText}>private</AppText>
                  </View>
                </View>
                <AppInput
                  style={styles.input}
                  value={form.pastValue}
                  onChangeText={(v) => update("pastValue", filterDecimal(v))}
                  placeholder="A$ approx"
                                    keyboardType="decimal-pad"
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <StatePickerModal
        visible={statePickerOpen}
        selected={form.pastState}
        onSelect={(s) => update("pastState", s)}
        onClose={() => setStatePickerOpen(false)}
      />

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
  section: { gap: 14 },
  row: { flexDirection: "row", gap: 10 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.black, letterSpacing: 0.8 },
  input: {},
  stateBtn: {
    height: 50,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.white,
  },
  stateBtnText: { fontSize: 15, fontFamily: Fonts.regular, color: Colors.black },
  stateBtnPlaceholder: { color: Colors.grey300 },
  inputError: { borderColor: Colors.red },
  fieldError: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.red },
  valueLabelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  privateTag: { flexDirection: "row", alignItems: "center", gap: 3 },
  privateText: { fontSize: 10, fontFamily: Fonts.regular, color: Colors.grey500 },
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
