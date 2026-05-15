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
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
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
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={modal.overlay} activeOpacity={1} onPress={onClose} />
      <View style={modal.sheet}>
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
              <Text style={modal.optionText}>{item}</Text>
            </TouchableOpacity>
          )}
        />
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
  optionText: { fontSize: 16, color: Colors.black },
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
        <Text style={[styles.dropdownText, !value && styles.dropdownPlaceholder]}>
          {value || label}
        </Text>
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
  return (
    ref.name.trim() &&
    ref.company.trim() &&
    ref.mobile.trim() &&
    ref.relationship.trim() &&
    ref.project.trim()
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
        <Text style={styles.collapsedLabel}>{label}</Text>
        {hasData ? (
          <>
            <Text style={styles.collapsedName}>
              {r.name} · {r.company}
            </Text>
            {r.relationship || r.project ? (
              <Text style={styles.collapsedMeta}>
                {[r.relationship, r.project].filter(Boolean).join(" · ")}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.collapsedEmpty}>Tap to fill in details</Text>
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

// Expanded form — shown for the active ref
function RefForm({
  label,
  value,
  onChange,
  projectOptions,
  onDone,
  onDelete,
}: {
  label: string;
  value: Reference;
  onChange: (r: Reference) => void;
  projectOptions: string[];
  onDone: () => void;
  onDelete?: () => void;
}) {
  function update(key: keyof Reference, v: string) {
    onChange({ ...value, [key]: v });
  }

  const done = isRefComplete(value);

  return (
    <View style={styles.refCard}>
      <View style={styles.refCardHeader}>
        <Text style={styles.refLabel}>{label}</Text>
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
      <View style={styles.mobileEmailRow}>
        <TextInput
          style={[styles.refInput, { flex: 1 }]}
          value={value.mobile}
          onChangeText={(v) => update("mobile", v)}
          placeholder="Mobile"
          placeholderTextColor={Colors.grey300}
          keyboardType="phone-pad"
        />
        <TextInput
          style={[styles.refInput, { flex: 1 }]}
          value={value.email}
          onChangeText={(v) => update("email", v)}
          placeholder="Email (optional)"
          placeholderTextColor={Colors.grey300}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <Text style={styles.dropdownLabel}>HOW DO YOU KNOW THEM?</Text>
      <Dropdown
        label="Select relationship"
        value={value.relationship}
        options={RELATIONSHIPS}
        onSelect={(v) => update("relationship", v)}
      />

      <Text style={styles.dropdownLabel}>WHICH PROJECT?</Text>
      <Dropdown
        label="Select project"
        value={value.project}
        options={projectOptions}
        onSelect={(v) => update("project", v)}
      />

      {done && (
        <TouchableOpacity style={styles.doneBtn} onPress={onDone}>
          <Ionicons name="checkmark" size={14} color={Colors.vouchGreen} />
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function Step3() {
  const { step1, step2, references, setReferences } = useWizard();
  const { fetchWithAuth } = useAuth();

  const [refs, setRefs] = useState<Reference[]>(
    references.length >= 2 ? references : [emptyRef(), emptyRef()]
  );
  // Which card is currently expanded (-1 = none)
  const [activeIndex, setActiveIndex] = useState(0);
  const [showThird, setShowThird] = useState(refs.length > 2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const projectOptions = [step2.currentProjectName, step2.pastProjectName].filter(Boolean);

  function updateRef(index: number, ref: Reference) {
    const next = [...refs];
    next[index] = ref;
    setRefs(next);
  }

  function handleDone(index: number) {
    // Move to the next unfilled ref, or collapse if all done
    const nextEmpty = refs.findIndex((r, i) => i !== index && !isRefComplete(r));
    if (nextEmpty !== -1) {
      setActiveIndex(nextEmpty);
    } else {
      setActiveIndex(-1);
    }
  }

  function addThird() {
    if (refs.length < 3) {
      setRefs((r) => [...r, emptyRef()]);
      setActiveIndex(2);
    }
    setShowThird(true);
  }

  function deleteThird() {
    setRefs((r) => r.slice(0, 2));
    setShowThird(false);
    setActiveIndex((prev) => (prev === 2 ? 0 : prev));
  }

  const canSubmit = isRefComplete(refs[0]) && isRefComplete(refs[1]);

  async function onSubmit() {
    setSubmitting(true);
    setError("");
    setReferences(refs);
    try {
      await fetchWithAuth(`${API_BASE_URL}/vouch/profile`, {
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
          pastYear: step2.pastYear,
          pastValue: step2.pastValue,
          references: refs.filter((r) => r.name.trim()),
        }),
      });
    } catch {
      // Backend not yet live — proceed to success screen
    } finally {
      setSubmitting(false);
    }
    router.push("/(app)/get-vouched/success");
  }

  const refLabels = ["REFERENCE 1", "REFERENCE 2", "REFERENCE 3"];

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>STEP 3 OF 3</Text>
        <View style={{ width: 24 }} />
      </View>
      <ProgressBar />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.heading}>Your two references</Text>
          <Text style={styles.subtitle}>
            {"They'll get a quick request. Most respond in 24 hrs."}
          </Text>

          {refs.map((ref, i) => {
            if (!showThird && i === 2) return null;
            const isOptional = i === 2;
            if (i === activeIndex) {
              return (
                <RefForm
                  key={i}
                  label={refLabels[i]}
                  value={ref}
                  onChange={(r) => updateRef(i, r)}
                  projectOptions={projectOptions}
                  onDone={() => handleDone(i)}
                  onDelete={isOptional ? deleteThird : undefined}
                />
              );
            }
            return (
              <RefCollapsedCard
                key={i}
                ref={ref}
                label={refLabels[i]}
                onTap={() => setActiveIndex(i)}
                onDelete={isOptional ? deleteThird : undefined}
              />
            );
          })}

          {!showThird && (
            <TouchableOpacity style={styles.addThirdBtn} onPress={addThird}>
              <Ionicons name="add" size={16} color={Colors.grey500} />
              <Text style={styles.addThirdText}>Add a 3rd (optional)</Text>
            </TouchableOpacity>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
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
            <Text style={styles.primaryBtnText}>Send vouch requests</Text>
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
  headerTitle: { fontSize: 13, fontWeight: "600", color: Colors.grey500, letterSpacing: 1 },
  scroll: { paddingHorizontal: 24, paddingBottom: 32, paddingTop: 24, gap: 16 },
  heading: { fontSize: 26, fontWeight: "700", color: Colors.black },
  subtitle: { fontSize: 14, color: Colors.grey500, lineHeight: 20, marginTop: 6 },

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
  refLabel: { fontSize: 12, fontWeight: "700", color: Colors.vouchGreen, letterSpacing: 0.8 },
  refInput: {
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  mobileEmailRow: { flexDirection: "row", gap: 10 },
  dropdownLabel: { fontSize: 11, fontWeight: "700", color: Colors.grey500, letterSpacing: 0.8 },
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
  dropdownText: { fontSize: 15, color: Colors.black },
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
  doneBtnText: { fontSize: 13, fontWeight: "600", color: Colors.vouchGreen },

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
    fontWeight: "700",
    color: Colors.vouchGreen,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  collapsedName: { fontSize: 15, fontWeight: "600", color: Colors.black },
  collapsedMeta: { fontSize: 13, color: Colors.grey500 },
  collapsedEmpty: { fontSize: 14, color: Colors.grey300 },
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
  addThirdText: { fontSize: 14, color: Colors.grey500 },

  error: { fontSize: 13, color: Colors.red, textAlign: "center" },

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
