import { useCallback, useState } from "react";
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
import { router, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { ScreenHeader, sheetStyle } from "@/components/ScreenHeader";
import { SuccessReveal, SuccessTick } from "@/components/SuccessReveal";
import { SectionLabel } from "@/components/ui";
import { AppInput } from "@/components/AppInput";
import { NativeSelect } from "@/components/NativeSelect";
import { useWizard, Reference } from "./WizardContext";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL, NETWORK_ERROR_MESSAGE } from "@/constants/api";
import { showAlert, vouchRequestErrorMessage } from "@/lib/errors";
import { HEADER_HIT_SLOP } from "@/constants/touch";
import { isValidEmail } from "@/lib/validation";
import { fullName } from "@/lib/format";

const RELATIONSHIPS = [
  "Worked together",
  "From another project",
  "Subcontractor",
  "Client",
  "Colleague",
  "Other",
];

const emptyRef = (): Reference => ({
  firstName: "",
  lastName: "",
  company: "",
  email: "",
  relationship: "",
  project: "",
});

type SentRequestSummary = {
  toEmail?: string;
  status?: "pending" | "responded";
};

/*
  What the Requests view actually lists. Answered requests are shown under
  Received instead, so counting them here made the badge disagree with the list
  it points at.
*/
function isOutstanding(r: SentRequestSummary): boolean {
  return r.status !== "responded";
}

function isRefComplete(ref: Reference) {
  const needsProject = ref.relationship === "From another project";
  return (
    // Last name is optional here too — see sign-up.
    ref.firstName.trim() &&
    ref.company.trim() &&
    // Email is the only channel the request goes out on, so it has to be a
    // valid one before the button unlocks.
    isValidEmail(ref.email.trim()) &&
    ref.relationship.trim() &&
    (!needsProject || ref.project.trim())
  );
}

export default function RequestVouch() {
  const { step1, references, setReferences } = useWizard();
  const { fetchWithAuth, updateUser } = useAuth();

  const [ref, setRef] = useState<Reference>(emptyRef());
  const [emailTouched, setEmailTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sentRequests, setSentRequests] = useState<SentRequestSummary[]>([]);
  // The reference we just sent to. Held separately from `ref` so resetting the
  // form for another request doesn't blank out the confirmation behind it.
  const [sentTo, setSentTo] = useState<Reference | null>(null);

  const loadSentRequests = useCallback(() => {
    fetchWithAuth(`${API_BASE_URL}/vouch/requests/sent`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.requests) setSentRequests(data.requests);
      })
      .catch(() => {});
  }, [fetchWithAuth]);

  // Refetch on focus, not just on mount — withdrawing or answering a request in
  // the Requests tab has to be reflected when the user comes back here.
  useFocusEffect(
    useCallback(() => {
      loadSentRequests();
    }, [loadSentRequests])
  );

  function update(key: keyof Reference, v: string) {
    setRef((r) => ({ ...r, [key]: v }));
  }

  // The badge points at the Requests view, so it counts what that view lists.
  const outstandingCount = sentRequests.filter(isOutstanding).length;

  const emailInvalid = emailTouched && !isValidEmail(ref.email.trim());
  const canSubmit = isRefComplete(ref);

  async function onSubmit() {
    setSubmitting(true);
    const email = ref.email.trim().toLowerCase();
    const alreadySent = sentRequests.some((r) => r.toEmail && r.toEmail.toLowerCase() === email);
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
          firstName: step1.firstName,
          lastName: step1.lastName,
          abn: step1.abn,
          trade: step1.trade,
          idType: step1.idType,
          idNumber: step1.idNumber,
          idExpiry: step1.idExpiry,
          references: updatedRefs.filter((r) => r.firstName.trim()),
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
    // Record it locally too, so the duplicate guard and the header count are
    // right if they send another without the screen remounting.
    setSentRequests((prev) => [...prev, { toEmail: email, status: "pending" }]);
    setSentTo(ref);
  }

  /** Clear the form and drop back to it for another request. */
  function requestAnother() {
    setRef(emptyRef());
    setEmailTouched(false);
    setSentTo(null);
  }

  if (sentTo) {
    const sentEmail = sentTo.email.trim();
    const sentToName = fullName(sentTo.firstName, sentTo.lastName);
    const who = sentTo.company.trim() ? `${sentToName} at ${sentTo.company.trim()}` : sentToName;

    return (
      <SuccessReveal origin="button">
        <SafeAreaView style={styles.successSafe} edges={["top", "bottom"]}>
          <ScrollView
            contentContainerStyle={styles.successScroll}
            showsVerticalScrollIndicator={false}
          >
            <SuccessTick />

            <AppText style={styles.successTitle}>Request sent.</AppText>
            <AppText style={styles.successSub}>
              We&apos;ve asked {who} to vouch for your work.
            </AppText>

            <View style={styles.successSteps}>
              <View style={styles.successStep}>
                <Ionicons name="mail-outline" size={18} color={Colors.vouchGreenAccent} />
                <AppText style={styles.successStepText}>
                  Emailed to <AppText style={styles.successStepStrong}>{sentEmail}</AppText>
                </AppText>
              </View>

              <View style={styles.successStep}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={18}
                  color={Colors.vouchGreenAccent}
                />
                <AppText style={styles.successStepText}>
                  They sign up and answer a few questions about working with you.
                </AppText>
              </View>

              <View style={styles.successStep}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={18}
                  color={Colors.vouchGreenAccent}
                />
                <AppText style={styles.successStepText}>
                  Their vouch lands on your profile as soon as they answer.
                </AppText>
              </View>
            </View>

            <View style={styles.successNudge}>
              <Ionicons name="time-outline" size={16} color={Colors.white} />
              <AppText style={styles.successNudgeText}>
                Heard nothing after a day? You can nudge them from Requests.
              </AppText>
            </View>
          </ScrollView>

          <View style={styles.successActions}>
            <TouchableOpacity
              style={styles.successPrimary}
              onPress={() =>
                router.push({ pathname: "/(app)/(tabs)/vouches", params: { tab: "requests" } })
              }
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="View sent requests"
            >
              <AppText style={styles.successPrimaryText}>View sent requests</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.successSecondary}
              onPress={requestAnother}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Ask someone else"
            >
              <AppText style={styles.successSecondaryText}>Ask someone else</AppText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.successSecondary}
              onPress={() => router.replace("/(app)/(tabs)/home")}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Back to home"
            >
              <AppText style={styles.successSecondaryText}>Back to home</AppText>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </SuccessReveal>
    );
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
              outstandingCount > 0
                ? `View your ${outstandingCount} request${outstandingCount === 1 ? "" : "s"} waiting`
                : "View your requests"
            }
          >
            <View style={styles.requestsBtn}>
              <AppText style={styles.requestsBtnText}>Requests</AppText>
              {outstandingCount > 0 && (
                <View style={styles.requestsCount}>
                  <AppText style={styles.requestsCountText}>{outstandingCount}</AppText>
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
              Pick someone who has seen your work first-hand — a builder, PM or client. Add their
              email and we&apos;ll send the request straight to them.
            </AppText>
          </View>

          <SectionLabel>Who are you asking?</SectionLabel>
          <View style={styles.refCard}>
            <AppInput
              style={styles.refInput}
              value={ref.firstName}
              onChangeText={(v) => update("firstName", v)}
              placeholder="First name"
              autoCapitalize="words"
              autoCorrect={false}
            />
            <AppInput
              style={styles.refInput}
              value={ref.lastName}
              onChangeText={(v) => update("lastName", v)}
              placeholder="Last name"
              autoCapitalize="words"
              autoCorrect={false}
            />
            <AppInput
              style={styles.refInput}
              value={ref.company}
              onChangeText={(v) => update("company", v)}
              placeholder="Company"
              autoCorrect={false}
            />
            <View>
              <AppInput
                style={[styles.refInput, emailInvalid ? styles.refInputError : null]}
                value={ref.email}
                onChangeText={(v) => update("email", v)}
                onBlur={() => setEmailTouched(true)}
                placeholder="Email address"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {emailInvalid ? (
                <AppText style={styles.fieldError}>
                  {ref.email.trim()
                    ? "Enter a valid email address"
                    : "We need their email to send the request"}
                </AppText>
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

  // Success screen — mirrors the give-vouch confirmation so both ends of the
  // vouch loop resolve the same way.
  successSafe: { flex: 1, paddingHorizontal: 24 },
  successScroll: { flexGrow: 1, justifyContent: "center", gap: 18, paddingVertical: 24 },
  successTitle: {
    fontSize: 34,
    fontFamily: Fonts.extraBold,
    color: Colors.white,
    marginTop: 8,
  },
  successSub: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.white,
    opacity: 0.9,
    lineHeight: 23,
    marginTop: -8,
  },
  successSteps: { gap: 14, marginTop: 6 },
  successStep: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  successStepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.white,
    opacity: 0.92,
    lineHeight: 20,
  },
  successStepStrong: { fontFamily: Fonts.bold, opacity: 1 },
  successNudge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: Colors.whiteGloss,
    borderRadius: 12,
    padding: 12,
    marginTop: 2,
  },
  successNudgeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.white,
    opacity: 0.9,
    lineHeight: 17,
  },
  successActions: { gap: 2, paddingBottom: 8 },
  successPrimary: {
    height: 54,
    borderRadius: 28,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  successPrimaryText: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.vouchGreen },
  successSecondary: { height: 46, alignItems: "center", justifyContent: "center" },
  successSecondaryText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
    opacity: 0.9,
  },
});
