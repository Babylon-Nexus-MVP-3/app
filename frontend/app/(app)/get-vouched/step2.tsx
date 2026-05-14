import { useState } from "react";
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
  flex,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "phone-pad";
  flex?: number;
}) {
  return (
    <View style={[styles.fieldWrap, flex !== undefined && { flex }]}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
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

export default function Step2() {
  const { step2, setStep2 } = useWizard();
  const [form, setForm] = useState(step2);

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function onContinue() {
    setStep2(form);
    router.back();
  }

  const canContinue =
    form.currentProjectName.trim() &&
    form.address.trim() &&
    form.suburb.trim() &&
    form.state.trim() &&
    form.postcode.trim() &&
    form.value.trim();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>STEP 2 OF 3</Text>
        <View style={{ width: 24 }} />
      </View>
      <ProgressBar step={2} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.heading}>Your projects</Text>

          {/* Current project */}
          <Text style={styles.sectionLabel}>CURRENT PROJECT</Text>
          <View style={styles.section}>
            <Field
              label="PROJECT NAME"
              value={form.currentProjectName}
              onChangeText={(v) => update("currentProjectName", v)}
              placeholder="e.g. Bradfield Tower B fit-out"
            />
            <Field
              label="ADDRESS"
              value={form.address}
              onChangeText={(v) => update("address", v)}
              placeholder="Street address"
            />
            <View style={styles.row}>
              <Field
                value={form.suburb}
                onChangeText={(v) => update("suburb", v)}
                placeholder="Suburb"
                flex={2}
              />
              <Field
                value={form.state}
                onChangeText={(v) => update("state", v)}
                placeholder="State"
                flex={1}
              />
              <Field
                value={form.postcode}
                onChangeText={(v) => update("postcode", v)}
                placeholder="Postcode"
                keyboardType="numeric"
                flex={1}
              />
            </View>
            <View style={styles.fieldWrap}>
              <View style={styles.valueLabelRow}>
                <Text style={styles.fieldLabel}>VALUE</Text>
                <View style={styles.privateTag}>
                  <Ionicons name="lock-closed-outline" size={10} color={Colors.grey500} />
                  <Text style={styles.privateText}>private</Text>
                </View>
              </View>
              <TextInput
                style={styles.input}
                value={form.value}
                onChangeText={(v) => update("value", v)}
                placeholder="A$ 0"
                placeholderTextColor={Colors.grey300}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Past project */}
          <View style={styles.pastLabelRow}>
            <Text style={styles.sectionLabel}>PAST PROJECT</Text>
            <Text style={styles.optionalTag}>· optional</Text>
          </View>
          <View style={styles.section}>
            <Field
              value={form.pastProjectName}
              onChangeText={(v) => update("pastProjectName", v)}
              placeholder="Project name"
            />
            <View style={styles.row}>
              <Field
                value={form.pastSuburb}
                onChangeText={(v) => update("pastSuburb", v)}
                placeholder="Suburb"
                flex={2}
              />
              <Field
                value={form.pastPostcode}
                onChangeText={(v) => update("pastPostcode", v)}
                placeholder="Postcode"
                keyboardType="numeric"
                flex={1}
              />
            </View>
            <View style={styles.row}>
              <Field
                value={form.pastYear}
                onChangeText={(v) => update("pastYear", v)}
                placeholder="Year"
                keyboardType="numeric"
                flex={1}
              />
              <View style={[styles.fieldWrap, { flex: 2 }]}>
                <View style={styles.valueLabelRow}>
                  <TextInput
                    style={styles.input}
                    value={form.pastValue}
                    onChangeText={(v) => update("pastValue", v)}
                    placeholder="A$ approx"
                    placeholderTextColor={Colors.grey300}
                    keyboardType="numeric"
                  />
                  <Ionicons
                    name="lock-closed-outline"
                    size={12}
                    color={Colors.grey500}
                    style={styles.lockOverlay}
                  />
                </View>
              </View>
            </View>
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.vouchGreen,
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  pastLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 8,
    marginBottom: 14,
  },
  optionalTag: { fontSize: 12, color: Colors.grey500 },
  section: { gap: 14, marginBottom: 28 },
  row: { flexDirection: "row", gap: 10 },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: "700", color: Colors.grey500, letterSpacing: 0.8 },
  valueLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  privateTag: { flexDirection: "row", alignItems: "center", gap: 3 },
  privateText: { fontSize: 11, color: Colors.grey500 },
  lockOverlay: { position: "absolute", right: 14, top: "50%" },
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
