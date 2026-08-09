import { useEffect, useState } from "react";
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
import { useWizard, Reference } from "./WizardContext";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL, NETWORK_ERROR_MESSAGE } from "@/constants/api";
import { showAlert, vouchRequestErrorMessage } from "@/lib/errors";
import { HEADER_HIT_SLOP } from "@/constants/touch";

const RELATIONSHIPS = [
  "Worked together",
  "From another project",
  "Subcontractor",
  "Client",
  "Colleague",
  "Other",
];

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

export default function RequestVouch() {
  const { step1, references, setReferences } = useWizard();
  const { fetchWithAuth, updateUser } = useAuth();

  const [ref, setRef] = useState<Reference>(emptyRef());
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentRequests, setSentRequests] = useState<{ toMobile: string; toEmail?: string }[]>([]);

  useEffect(() => {
    fetchWithAuth(`${API_BASE_URL}/vouch/requests/sent`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.requests) setSentRequests(data.requests);
      })
      .catch(() => {});
  }, [fetchWithAuth]);

  function update(key: keyof Reference, v: string) {
    setRef((r) => ({ ...r, [key]: v }));
  }

  const emailInvalid = emailTouched && ref.email.trim() && !EMAIL_RE.test(ref.email.trim());
  const canSubmit = isRefComplete(ref);

  async function onSubmit() {
    setSubmitting(true);
    const mobile = ref.mobile.trim();
    const email = ref.email.trim().toLowerCase();
    const alreadySent = sentRequests.some(
      (r) =>
        (mobile && r.toMobile === mobile) ||
        (email && r.toEmail && r.toEmail.toLowerCase() === email)
    );
    if (alreadySent) {
      showAlert("Already requested", "You've already sent a vouch request to this person.");
      setSubmitting(false);
      return;
    }
    const updatedRefs = [...references, ref];
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
          references: updatedRefs.filter((r) => r.name.trim()),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        showAlert("Cannot send request", vouchRequestErrorMessage(res.status, data.error));
        return;
      }
      setReferences(updatedRefs);
      await updateUser({ abn: step1.abn }).catch(() => {});
    } catch {
      showAlert("Cannot send request", NETWORK_ERROR_MESSAGE);
      return;
    } finally {
      setSubmitting(false);
    }
    router.back();
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScreenHeader
        showBack
        eyebrow="Get vouched"
        title="Request a vouch"
        subtitle="Ask someone you've worked with to back your work."
        right={
          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: "/(app)/(tabs)/vouches", params: { tab: "requests" } })
            }
            hitSlop={HEADER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={
              sentRequests.length > 0
                ? `View your ${sentRequests.length} sent requests`
                : "View your requests"
            }
          >
            <View style={styles.requestsBtn}>
              <AppText style={styles.requestsBtnText}>Requests</AppText>
              {sentRequests.length > 0 && (
                <View style={styles.requestsCount}>
                  <AppText style={styles.requestsCountText}>{sentRequests.length}</AppText>
                </View>
              )}
            </View>
          </TouchableOpacity>
        }
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
          <View style={styles.guide}>
            <Ionicons name="information-circle-outline" size={18} color={Colors.vouchGreen} />
            <AppText style={styles.guideText}>
              Pick someone who has seen your work first-hand — a builder, PM or client. They get a
              text and answer a few questions.
            </AppText>
          </View>

          <SectionLabel>Who are you asking?</SectionLabel>
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

            <View style={styles.divider} />
            <NativeSelect
              label="HOW DO YOU KNOW THEM?"
              value={ref.relationship}
              options={RELATIONSHIPS}
              placeholder="Select relationship"
              onChange={(v) => update("relationship", v)}
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
  requestsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.whiteGloss,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  requestsBtnText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.white },
  requestsCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    backgroundColor: Colors.whiteGloss,
    alignItems: "center",
    justifyContent: "center",
  },
  requestsCountText: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.white },
  container: { flex: 1, backgroundColor: Colors.vouchGreen },
  scroll: { paddingHorizontal: 16, paddingBottom: 32, paddingTop: 22 },
  guide: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.vouchGreenLight,
    borderRadius: 14,
    padding: 14,
    marginBottom: 24,
  },
  guideText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey700,
    lineHeight: 19,
  },
  divider: { height: 1, backgroundColor: Colors.grey100, marginVertical: 4 },
  heading: { fontSize: 28, fontFamily: Fonts.bold, color: Colors.black },
  subtitle: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.grey500, lineHeight: 20 },
  refCard: {
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    backgroundColor: Colors.white,
  },
  refInput: {},
  refInputError: { borderColor: Colors.red },
  fieldError: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.red, marginTop: 4 },
  dropdownLabel: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.black, letterSpacing: 0.8 },
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
