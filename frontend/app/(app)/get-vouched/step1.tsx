import { useEffect, useState } from "react";
import {
  View,
  Text,
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
import { useAuth } from "@/context/AuthContext";
import { useWizard } from "./WizardContext";

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
      <Text style={styles.fieldLabel}>{label}</Text>
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

  useEffect(() => {
    if (!form.name && user?.name) {
      setForm((f) => ({ ...f, name: user.name }));
    }
  }, [user, form.name]);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function formatExpiry(raw: string) {
    // Strip everything except digits
    const digits = raw.replace(/\D/g, "");
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + "/" + digits.slice(2, 6);
  }

  function onContinue() {
    setStep1(form);
    router.back();
  }

  const canContinue =
    form.name.trim() &&
    form.abn.trim() &&
    form.trade.trim() &&
    form.idNumber.trim() &&
    form.idExpiry.trim();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>STEP 1 OF 3</Text>
        <View style={{ width: 24 }} />
      </View>
      <ProgressBar step={1} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.heading}>Your details</Text>

          <View style={styles.section}>
            <Field
              label="NAME"
              value={form.name}
              onChangeText={(v) => update("name", v)}
              placeholder="Full name"
            />
            <Field
              label="ABN"
              value={form.abn}
              onChangeText={(v) => update("abn", v)}
              placeholder="11-digit ABN"
              keyboardType="numeric"
            />
            <Field
              label="TRADE / BUSINESS TYPE"
              value={form.trade}
              onChangeText={(v) => update("trade", v)}
              placeholder="e.g. Plumbing, Electrical"
            />
          </View>

          {/* ID Verification */}
          <Text style={styles.sectionLabel}>ID VERIFICATION</Text>

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
              <Text
                style={[styles.chipText, form.idType === "passport" && styles.chipTextSelected]}
              >
                Passport
              </Text>
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
              <Text style={[styles.chipText, form.idType === "licence" && styles.chipTextSelected]}>
                {"Driver's licence"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Field
              label="DOCUMENT NUMBER"
              value={form.idNumber}
              onChangeText={(v) => update("idNumber", v)}
              placeholder={form.idType === "passport" ? "e.g. PA1234567" : "e.g. 12345678"}
            />
            <Field
              label="EXPIRY DATE"
              value={form.idExpiry}
              onChangeText={(v) => update("idExpiry", formatExpiry(v))}
              placeholder="MM/YYYY"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.privacyNote}>
            <Ionicons name="lock-closed-outline" size={13} color={Colors.grey500} />
            <Text style={styles.privacyText}>
              Your ID is used for verification only and is never shared publicly.
            </Text>
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
          <Text style={styles.primaryBtnText}>Save &amp; continue</Text>
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
  headerTitle: { fontSize: 13, fontWeight: "600", color: Colors.grey500, letterSpacing: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 24 },
  heading: { fontSize: 26, fontWeight: "700", color: Colors.black, marginBottom: 24 },
  section: { gap: 16, marginBottom: 28 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: Colors.grey500, letterSpacing: 0.8 },
  input: {
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 12,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
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
  chipText: { fontSize: 13, fontWeight: "600", color: Colors.grey700 },
  chipTextSelected: { color: Colors.white },
  privacyNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: Colors.offWhite,
    borderRadius: 10,
    padding: 12,
  },
  privacyText: { flex: 1, fontSize: 12, color: Colors.grey500, lineHeight: 17 },
  footer: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 12 },
  primaryBtn: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnDisabled: { opacity: 0.45 },
  primaryBtnText: { color: Colors.white, fontSize: 16, fontWeight: "700" },
});
