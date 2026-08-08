import { useState } from "react";
import {
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
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { ScreenHeader, sheetStyle } from "@/components/ScreenHeader";
import { SlideToConfirm } from "@/components/SlideToConfirm";
import { SuccessReveal, SuccessTick } from "@/components/SuccessReveal";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL, NETWORK_ERROR_MESSAGE } from "@/constants/api";

// Phrased the way someone on site would actually describe a person they've
// worked with. Order runs from the things that cost money when they go wrong
// (payment, turning up, safety) to the softer signals, with the overall
// verdict last. Adding to this list is safe — existing vouches keep whatever
// they were given.
const ATTRIBUTES = [
  "Pays on time",
  "Turns up on time",
  "Quality work",
  "Reliable",
  "Safety first",
  "Professional",
  "Good communication",
  "Fair pricing",
  "Honest",
  "Knows their trade",
  "Solves problems",
  "Tidy work site",
  "No surprises",
  "Easy to deal with",
  "Fast turnaround",
  "Work with again",
];

export default function AttributesScreen() {
  const { abn, businessName, requestId, recipientName, recipientEmail, recipientMobile } =
    useLocalSearchParams<{
      abn: string;
      businessName: string;
      requestId?: string;
      recipientName?: string;
      recipientEmail?: string;
      recipientMobile?: string;
    }>();
  const { fetchWithAuth } = useAuth();

  const [selected, setSelected] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [vouchCount, setVouchCount] = useState(0);

  const displayName = businessName || "this business";
  const canVouch = selected.length >= 2;

  function toggleAttribute(attr: string) {
    setSelected((prev) => (prev.includes(attr) ? prev.filter((a) => a !== attr) : [...prev, attr]));
  }

  async function onVouch() {
    if (!canVouch) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/vouch/give`, {
        method: "POST",
        body: JSON.stringify({
          toAbn: abn,
          toBusinessName: displayName,
          attributes: selected,
          note: note.trim() || undefined,
          requestId: requestId ?? undefined,
          recipientName: recipientName ?? undefined,
          recipientEmail: recipientEmail ?? undefined,
          recipientMobile: recipientMobile ?? undefined,
        }),
      });
      if (res.status === 409) {
        setSubmitError("You've already vouched for this business.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSubmitError(data.error ?? "We couldn't save your vouch. Please try again.");
        return;
      }
      const data = await res.json().catch(() => ({}) as { vouchCount?: number });
      if (data.vouchCount !== undefined) setVouchCount(data.vouchCount);
    } catch {
      setSubmitError(NETWORK_ERROR_MESSAGE);
      return;
    } finally {
      setSubmitting(false);
    }
    setSubmitted(true);
  }

  if (submitted) {
    const totalVouches = vouchCount > 0 ? vouchCount : 1;

    // The green grows out of the slider knob, so the confirmation reads as a
    // continuation of the gesture rather than a new screen.
    return (
      <SuccessReveal>
        <SafeAreaView style={styles.successSafe} edges={["top", "bottom"]}>
          <View style={styles.successBody}>
            <SuccessTick />

            <AppText style={styles.successTitle}>Vouched.</AppText>
            <AppText style={styles.successSub}>
              You&apos;ve vouched for {displayName}. Their reputation just got stronger.
            </AppText>

            <View style={styles.successStat}>
              <AppText style={styles.successStatValue}>{totalVouches}</AppText>
              <AppText style={styles.successStatLabel}>
                {totalVouches === 1 ? "VOUCH · INCLUDING YOURS" : "VOUCHES · INCLUDING YOURS"}
              </AppText>
            </View>
          </View>

          <View style={styles.successActions}>
            <TouchableOpacity
              style={styles.successPrimary}
              onPress={() => router.replace("/(app)/give-vouch")}
              activeOpacity={0.9}
              accessibilityRole="button"
              accessibilityLabel="Vouch for someone else"
            >
              <AppText style={styles.successPrimaryText}>Vouch for someone else</AppText>
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
        eyebrow="Give a vouch"
        title="What would you say about them?"
        subtitle="Pick at least 2."
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
          <View style={styles.chipWrap}>
            {ATTRIBUTES.map((attr) => {
              const active = selected.includes(attr);
              return (
                <TouchableOpacity
                  key={attr}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleAttribute(attr)}
                  activeOpacity={0.75}
                  accessibilityRole="checkbox"
                  accessibilityLabel={attr}
                  accessibilityState={{ checked: active }}
                >
                  {active && <Ionicons name="checkmark" size={13} color={Colors.white} />}
                  <AppText style={[styles.chipText, active && styles.chipTextActive]}>
                    {attr}
                  </AppText>
                </TouchableOpacity>
              );
            })}
          </View>

          <AppText style={styles.noteLabel}>ADD A NOTE · optional</AppText>
          <TextInput
            style={[styles.noteInput, { fontFamily: Fonts.regular }]}
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Worked together on Westmead Hospital Stage 2. Highly recommend."
            placeholderTextColor={Colors.grey300}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
          <AppText style={styles.noteHint}>Notes are private and not shown publicly.</AppText>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        {/* Slide rather than tap: this is the point of no return — a given
            vouch is your name on someone else's work and can't be withdrawn. */}
        <SlideToConfirm
          label={`Vouch for ${displayName}`}
          confirmingLabel="Sending your vouch…"
          onConfirm={onVouch}
          disabled={!canVouch}
          busy={submitting}
          accessibilityLabel={`Vouch for ${displayName}`}
        />
        {/* Always rendered: letting this line disappear once 2 are picked made
            the slider jump down as the footer collapsed. */}
        <AppText style={[styles.vouchHint, !!submitError && styles.vouchHintError]}>
          {submitError
            ? submitError
            : !canVouch
              ? "Select at least 2 to continue"
              : "Slide to send your vouch"}
        </AppText>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ── Success (white content on the green reveal) ──────────────────────
  successSafe: { flex: 1, paddingHorizontal: 24 },
  successBody: { flex: 1, justifyContent: "center", gap: 18 },
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
  },
  successStat: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginTop: 6,
  },
  successStatValue: { fontSize: 30, fontFamily: Fonts.extraBold, color: Colors.white },
  successStatLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.white,
    opacity: 0.75,
    letterSpacing: 0.8,
  },
  successActions: { gap: 6, paddingBottom: 8 },
  successPrimary: {
    height: 54,
    borderRadius: 28,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  successPrimaryText: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.vouchGreen },
  successSecondary: { height: 52, alignItems: "center", justifyContent: "center" },
  successSecondaryText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.white,
    opacity: 0.9,
  },
  container: { flex: 1, backgroundColor: Colors.vouchGreen },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 32,
    gap: 16,
  },

  // Attributes
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: Colors.white,
  },
  chipActive: {
    borderColor: Colors.vouchGreen,
    backgroundColor: Colors.vouchGreen,
  },
  chipText: {
    fontSize: 14,
    fontFamily: Fonts.medium,
    color: Colors.grey700,
  },
  chipTextActive: {
    color: Colors.white,
  },

  // Note
  noteLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: Colors.black,
    minHeight: 90,
    backgroundColor: Colors.white,
    marginTop: -4,
  },
  noteHint: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginTop: -8,
  },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 8,
    // The screen container is green so the header's safe area is green; the
    // pinned bar has to paint white or that shows through behind the CTA.
    backgroundColor: Colors.white,
  },
  vouchHint: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textAlign: "center",
    minHeight: 16,
  },
  vouchHintError: { color: Colors.red },

  // Success screen
});
