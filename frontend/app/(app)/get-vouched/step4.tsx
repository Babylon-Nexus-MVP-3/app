import { useEffect, useRef, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Animated,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { AppInput } from "@/components/AppInput";
import { useWizard, Reference } from "./WizardContext";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

const RELATIONSHIPS = [
  "Worked together",
  "From another project",
  "Subcontractor",
  "Client",
  "Colleague",
  "Other",
];

function PickerModal({
  visible,
  options,
  onSelect,
  onClose,
}: {
  visible: boolean;
  options: string[];
  onSelect: (v: string) => void;
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
        <Animated.View
          style={[StyleSheet.absoluteFillObject, modal.overlay, { opacity: fadeAnim }]}
        >
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        </Animated.View>
        <View style={{ flex: 1, justifyContent: "flex-end" }} pointerEvents="box-none">
          <Animated.View style={[modal.sheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={modal.handle} />
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={modal.option}
                  onPress={() => {
                    onSelect(item);
                    onClose();
                  }}
                >
                  <AppText style={modal.optionText}>{item}</AppText>
                </TouchableOpacity>
              )}
            />
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.overlay },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    paddingTop: 12,
    maxHeight: "50%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.grey300,
    alignSelf: "center",
    marginBottom: 16,
  },
  option: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey100,
  },
  optionText: { fontSize: 16, fontFamily: Fonts.regular, color: Colors.black },
});

function Dropdown({
  label,
  value,
  options,
  onSelect,
}: {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <TouchableOpacity style={styles.dropdown} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <AppText style={[styles.dropdownText, !value && styles.dropdownPlaceholder]}>
          {value || label}
        </AppText>
        <Ionicons name="chevron-down" size={16} color={Colors.grey500} />
      </TouchableOpacity>
      <PickerModal
        visible={open}
        options={options}
        onSelect={onSelect}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

const emptyRef = (): Reference => ({
  name: "",
  company: "",
  mobile: "",
  email: "",
  relationship: "",
  project: "",
});

function isRefComplete(ref: Reference) {
  const needsProject = ref.relationship === "From another project";
  return (
    ref.name.trim() &&
    ref.company.trim() &&
    ref.mobile.trim() &&
    ref.relationship.trim() &&
    (!needsProject || ref.project.trim())
  );
}

function formatMobile(v: string) {
  return v.replace(/\D/g, "").slice(0, 10);
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Step4() {
  const { step1, step2, references, setReferences } = useWizard();
  const { fetchWithAuth } = useAuth();

  const [ref, setRef] = useState<Reference>(references[1] ?? emptyRef());
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function update(key: keyof Reference, v: string) {
    setRef((r) => ({ ...r, [key]: v }));
  }

  const emailInvalid = emailTouched && ref.email.trim() && !EMAIL_RE.test(ref.email.trim());
  const canSubmit = isRefComplete(ref);

  async function onSubmit() {
    setSubmitting(true);
    const updatedRefs = [references[0] ?? emptyRef(), ref, ...references.slice(2)];
    setReferences(updatedRefs);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/vouch/profile`, {
        method: "POST",
        body: JSON.stringify({
          name: step1.name,
          abn: step1.abn,
          trade: step1.trade,
          idType: step1.idType,
          idNumber: step1.idNumber,
          idExpiry: step1.idExpiry,
          currentProjectName: step2.currentProjectName,
          address: step2.address,
          suburb: step2.suburb,
          state: step2.state,
          postcode: step2.postcode,
          value: step2.value,
          pastProjectName: step2.pastProjectName,
          pastSuburb: step2.pastSuburb,
          pastPostcode: step2.pastPostcode,
          pastMonthYear: step2.pastMonthYear,
          pastState: step2.pastState,
          pastValue: step2.pastValue,
          references: updatedRefs.filter((r) => r.name.trim()),
        }),
      });
      if (res.status === 400) {
        const data = await res.json().catch(() => ({}));
        Alert.alert(
          "Cannot send request",
          data.error ?? "This person has already vouched for you."
        );
        setSubmitting(false);
        return;
      }
    } catch {
      // Network error — continue
    } finally {
      setSubmitting(false);
    }
    router.replace("/(app)/get-vouched/success" as any);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>STEP 4 OF 6</AppText>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.progressWrap}>
        <View style={[styles.progressFill, { flex: 4 }]} />
        <View style={[styles.progressEmpty, { flex: 2 }]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <AppText style={styles.subtitle}>
            Add a second person who can vouch for your work. This unlocks your full profile.
          </AppText>

          <View style={styles.refCard}>
            <AppInput
              style={styles.refInput}
              value={ref.name}
              onChangeText={(v) => update("name", v)}
              placeholder="Full name"
              autoCorrect={false}
            />
            <AppInput
              style={styles.refInput}
              value={ref.company}
              onChangeText={(v) => update("company", v)}
              placeholder="Company"
              autoCorrect={false}
            />
            <AppInput
              style={styles.refInput}
              value={ref.mobile}
              onChangeText={(v) => update("mobile", formatMobile(v))}
              placeholder="Mobile number"
              keyboardType="number-pad"
              maxLength={10}
              autoCorrect={false}
            />
            <View>
              <AppInput
                style={[styles.refInput, emailInvalid ? styles.refInputError : null]}
                value={ref.email}
                onChangeText={(v) => update("email", v)}
                onBlur={() => setEmailTouched(true)}
                placeholder="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {emailInvalid ? (
                <AppText style={styles.fieldError}>Enter a valid email address</AppText>
              ) : null}
            </View>

            <AppText style={styles.dropdownLabel}>HOW DO YOU KNOW THEM?</AppText>
            <Dropdown
              label="Select relationship"
              value={ref.relationship}
              options={RELATIONSHIPS}
              onSelect={(v) => update("relationship", v)}
            />

            {ref.relationship === "From another project" && (
              <>
                <AppText style={styles.dropdownLabel}>WHICH PROJECT?</AppText>
                <AppInput
                  style={styles.refInput}
                  value={ref.project}
                  onChangeText={(v) => update("project", v)}
                  placeholder="Project name"
                  autoCorrect={false}
                />
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, (!canSubmit || submitting) && styles.primaryBtnDisabled]}
          onPress={onSubmit}
          disabled={!canSubmit || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <AppText style={styles.primaryBtnText}>Send vouch request</AppText>
          )}
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
  scroll: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 24, gap: 16 },
  heading: { fontSize: 26, fontFamily: Fonts.bold, color: Colors.black },
  subtitle: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.grey500, lineHeight: 20 },
  refCard: {
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    backgroundColor: Colors.white,
  },
  refInput: {},
  refInputError: { borderColor: Colors.red },
  fieldError: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.red, marginTop: 4 },
  dropdownLabel: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.black, letterSpacing: 0.8 },
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 14,
    backgroundColor: Colors.white,
  },
  dropdownText: { fontSize: 15, fontFamily: Fonts.regular, color: Colors.black },
  dropdownPlaceholder: { color: Colors.grey300 },
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
