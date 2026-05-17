import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useWizard, Reference } from "./WizardContext";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

function ProgressBar() {
  return (
    <View style={pb.wrap}>
      <View style={pb.fill} />
    </View>
  );
}
const pb = StyleSheet.create({
  wrap: { height: 3, marginTop: 10, backgroundColor: Colors.grey300 },
  fill: { flex: 1, backgroundColor: Colors.vouchGreen },
});

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
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.3)" },
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

// Collapsed card — shown for refs that are not currently active
function RefCollapsedCard({
  ref: r,
  label,
  onTap,
  onDelete,
}: {
  ref: Reference;
  label: string;
  onTap: () => void;
  onDelete?: () => void;
}) {
  const hasData = r.name.trim();
  return (
    <TouchableOpacity style={styles.collapsedCard} onPress={onTap} activeOpacity={0.7}>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText style={styles.collapsedLabel}>{label}</AppText>
        {hasData ? (
          <>
            <AppText style={styles.collapsedName}>
              {r.name} · {r.company}
            </AppText>
            {r.relationship || r.project ? (
              <AppText style={styles.collapsedMeta}>
                {[r.relationship, r.project].filter(Boolean).join(" · ")}
              </AppText>
            ) : null}
          </>
        ) : (
          <AppText style={styles.collapsedEmpty}>Tap to fill in details</AppText>
        )}
      </View>
      <View style={styles.collapsedActions}>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={Colors.red} />
          </TouchableOpacity>
        )}
        <Ionicons name="create-outline" size={18} color={Colors.grey500} />
      </View>
    </TouchableOpacity>
  );
}

function formatMobile(v: string) {
  return v.replace(/\D/g, "").slice(0, 10);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Expanded form — shown for the active ref
function RefForm({
  label,
  value,
  onChange,
  onDone,
  onDelete,
}: {
  label: string;
  value: Reference;
  onChange: (r: Reference) => void;
  onDone: () => void;
  onDelete?: () => void;
}) {
  const [emailTouched, setEmailTouched] = useState(false);

  function update(key: keyof Reference, v: string) {
    onChange({ ...value, [key]: v });
  }

  const emailInvalid = emailTouched && value.email.trim() && !EMAIL_RE.test(value.email.trim());
  const done = isRefComplete(value) && !emailInvalid;

  return (
    <View style={styles.refCard}>
      <View style={styles.refCardHeader}>
        <AppText style={styles.refLabel}>{label}</AppText>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={Colors.red} />
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={styles.refInput}
        value={value.name}
        onChangeText={(v) => update("name", v)}
        placeholder="Full name"
        placeholderTextColor={Colors.grey300}
        autoCorrect={false}
      />
      <TextInput
        style={styles.refInput}
        value={value.company}
        onChangeText={(v) => update("company", v)}
        placeholder="Company"
        placeholderTextColor={Colors.grey300}
        autoCorrect={false}
      />
      <TextInput
        style={styles.refInput}
        value={value.mobile}
        onChangeText={(v) => update("mobile", formatMobile(v))}
        placeholder="Mobile number"
        placeholderTextColor={Colors.grey300}
        keyboardType="number-pad"
        maxLength={10}
        autoCorrect={false}
      />
      <View>
        <TextInput
          style={[styles.refInput, emailInvalid && styles.refInputError]}
          value={value.email}
          onChangeText={(v) => update("email", v)}
          onBlur={() => setEmailTouched(true)}
          placeholder="Email (optional)"
          placeholderTextColor={Colors.grey300}
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
        value={value.relationship}
        options={RELATIONSHIPS}
        onSelect={(v) => {
          onChange({
            ...value,
            relationship: v,
            project: v === "From another project" ? value.project : "",
          });
        }}
      />

      {value.relationship === "From another project" && (
        <>
          <AppText style={styles.dropdownLabel}>WHICH PROJECT?</AppText>
          <TextInput
            style={styles.refInput}
            value={value.project}
            onChangeText={(v) => update("project", v)}
            placeholder="Project name"
            placeholderTextColor={Colors.grey300}
            autoCorrect={false}
          />
        </>
      )}

      {done && (
        <TouchableOpacity style={styles.doneBtn} onPress={onDone}>
          <Ionicons name="checkmark" size={14} color={Colors.vouchGreen} />
          <AppText style={styles.doneBtnText}>Done</AppText>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function Step3() {
  const { fresh } = useLocalSearchParams<{ fresh?: string }>();
  const isFresh = fresh === "true";
  const { step1, step2, references, setReferences } = useWizard();
  const { fetchWithAuth, updateUser } = useAuth();

  const [refs, setRefs] = useState<Reference[]>(
    isFresh ? [emptyRef()] : references.length >= 2 ? references : [emptyRef(), emptyRef()]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function updateRef(index: number, ref: Reference) {
    const next = [...refs];
    next[index] = ref;
    setRefs(next);
  }

  function handleDone(index: number) {
    const nextEmpty = refs.findIndex((r, i) => i !== index && !isRefComplete(r));
    setActiveIndex(nextEmpty !== -1 ? nextEmpty : -1);
  }

  function addRef() {
    if (refs.length < 3) {
      setRefs((r) => [...r, emptyRef()]);
      setActiveIndex(refs.length);
    }
  }

  function deleteRef(index: number) {
    setRefs((r) => r.filter((_, i) => i !== index));
    setActiveIndex((prev) =>
      prev === index ? Math.max(0, index - 1) : prev > index ? prev - 1 : prev
    );
  }

  const canSubmit = isFresh
    ? isRefComplete(refs[0])
    : isRefComplete(refs[0]) && isRefComplete(refs[1]);

  async function onSubmit() {
    setSubmitting(true);
    setError("");
    setReferences(refs);
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
          references: refs.filter((r) => r.name.trim()),
        }),
      });
      if (res.status === 400) {
        const data = await res.json().catch(() => ({}));
        Alert.alert(
          "Cannot send request",
          data.error ?? "One of your references has already vouched for you."
        );
        setSubmitting(false);
        return;
      }
      if (res.ok) {
        await updateUser({ abn: step1.abn, businessName: step1.trade });
      }
    } catch {
      // Network unavailable — proceed to success
    } finally {
      setSubmitting(false);
    }
    if (isFresh) {
      router.back();
    } else {
      router.dismissAll();
      router.push("/(app)/get-vouched/success");
    }
  }

  const refLabels = ["REFERENCE 1", "REFERENCE 2", "REFERENCE 3"];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>{isFresh ? "REQUEST A VOUCH" : "STEP 3 OF 3"}</AppText>
        <View style={{ width: 24 }} />
      </View>
      {!isFresh && <ProgressBar />}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <AppText style={styles.heading}>
            {isFresh ? "Who can vouch for you?" : "Your two references"}
          </AppText>
          <AppText style={styles.subtitle}>
            {"They'll get a quick request. Most respond in 24 hrs."}
          </AppText>

          {refs.map((ref, i) => {
            const canDel = isFresh ? i > 0 : i === 2;
            if (i === activeIndex) {
              return (
                <RefForm
                  key={i}
                  label={refLabels[i]}
                  value={ref}
                  onChange={(r) => updateRef(i, r)}
                  onDone={() => handleDone(i)}
                  onDelete={canDel ? () => deleteRef(i) : undefined}
                />
              );
            }
            return (
              <RefCollapsedCard
                key={i}
                ref={ref}
                label={refLabels[i]}
                onTap={() => setActiveIndex(i)}
                onDelete={canDel ? () => deleteRef(i) : undefined}
              />
            );
          })}

          {refs.length < 3 && (
            <TouchableOpacity style={styles.addThirdBtn} onPress={addRef}>
              <Ionicons name="add" size={16} color={Colors.grey500} />
              <AppText style={styles.addThirdText}>
                {isFresh ? "Add another" : "Add a 3rd (optional)"}
              </AppText>
            </TouchableOpacity>
          )}

          {error ? <AppText style={styles.error}>{error}</AppText> : null}
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
            <AppText style={styles.primaryBtnText}>Send vouch requests</AppText>
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
  headerTitle: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
    letterSpacing: 1,
  },
  scroll: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 24, gap: 16 },
  heading: { fontSize: 26, fontFamily: Fonts.bold, color: Colors.black },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black,
    lineHeight: 20,
    marginTop: 6,
  },

  refCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Active (expanded) reference card — green border
  refCard: {
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    backgroundColor: Colors.white,
  },
  refLabel: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.vouchGreen, letterSpacing: 0.8 },
  refInput: {
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  refInputError: { borderColor: Colors.red },
  fieldError: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.red, marginTop: 4 },
  dropdownLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.black,
    letterSpacing: 0.8,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.white,
  },
  dropdownText: { fontSize: 15, fontFamily: Fonts.regular, color: Colors.black },
  dropdownPlaceholder: { color: Colors.grey300 },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.vouchGreen,
  },
  doneBtnText: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.vouchGreen },

  // Collapsed (inactive) reference card — solid grey border
  collapsedCard: {
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.white,
  },
  collapsedLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.vouchGreen,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  collapsedName: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.black },
  collapsedMeta: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.grey500 },
  collapsedEmpty: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.grey300 },
  collapsedActions: { flexDirection: "row", alignItems: "center", gap: 14 },

  // Add third
  addThirdBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderStyle: "dashed",
    borderRadius: 14,
    paddingVertical: 16,
  },
  addThirdText: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.grey500 },

  error: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.red, textAlign: "center" },

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
