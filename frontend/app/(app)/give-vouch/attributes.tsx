import { useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

const ATTRIBUTES = [
  "Pays on time",
  "Quality work",
  "Professional",
  "Reliable",
  "Communication",
  "Work with again",
];

export default function AttributesScreen() {
  const { abn, businessName, requestId, recipientName, recipientEmail, recipientMobile } = useLocalSearchParams<{
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
        setSubmitting(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        if (data.vouchCount !== undefined) setVouchCount(data.vouchCount);
      }
    } catch {
      // Network unavailable — proceed optimistically
    } finally {
      setSubmitting(false);
    }
    setSubmitted(true);
  }

  if (submitted) {
    const totalVouches = vouchCount > 0 ? vouchCount : 1;

    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.successScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successIconCircle}>
            <Ionicons name="shield-checkmark-outline" size={36} color={Colors.vouchGreen} />
          </View>

          <AppText style={styles.successTitle}>Your vouch is live.</AppText>
          <AppText style={styles.successSub}>
            {displayName}
            {"'"}s reputation just got stronger.
          </AppText>

          <View style={styles.bizCard}>
            <View style={styles.bizCardTop}>
              <View style={styles.bizIconSmall}>
                <Ionicons name="shield-checkmark-outline" size={18} color={Colors.vouchGreen} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={styles.bizName}>{displayName}</AppText>
              </View>
            </View>
            <AppText style={styles.vouchesCount}>
              {totalVouches} {totalVouches === 1 ? "vouch" : "vouches"}{" "}
              <AppText style={styles.vouchesSelf}>· +1 from you</AppText>
            </AppText>
          </View>

          <TouchableOpacity
            style={styles.primarySuccessBtn}
            onPress={() => router.replace("/(app)/vouches")}
            activeOpacity={0.85}
          >
            <AppText style={styles.primarySuccessBtnText}>Vouch another business</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondarySuccessBtn}
            onPress={() => router.replace("/(app)/home")}
            activeOpacity={0.7}
          >
            <AppText style={styles.secondarySuccessBtnText}>Back to home</AppText>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>Vouch for {displayName}</AppText>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <AppText style={styles.attrHeading}>What would you say about them?</AppText>
          <AppText style={styles.attrSub}>Pick at least 2.</AppText>

          <View style={styles.chipWrap}>
            {ATTRIBUTES.map((attr) => {
              const active = selected.includes(attr);
              return (
                <TouchableOpacity
                  key={attr}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleAttribute(attr)}
                  activeOpacity={0.7}
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
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder="e.g. Worked together on Westmead Hospital Stage 2. Highly recommend."
            placeholderTextColor={Colors.grey300}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            fontFamily={Fonts.regular}
          />
          <AppText style={styles.noteHint}>Notes are private and not shown publicly.</AppText>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.vouchBtn, !canVouch && styles.vouchBtnDisabled]}
          onPress={onVouch}
          disabled={!canVouch || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <AppText style={styles.vouchBtnText}>Submit vouch</AppText>
          )}
        </TouchableOpacity>
        {submitError ? (
          <AppText style={[styles.vouchHint, { color: Colors.red }]}>{submitError}</AppText>
        ) : !canVouch ? (
          <AppText style={styles.vouchHint}>Select at least 2 attributes to continue</AppText>
        ) : null}
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
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
    flex: 1,
    textAlign: "center",
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 16,
  },

  // Attributes
  attrHeading: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginTop: 4,
  },
  attrSub: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginTop: -8,
  },
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
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
    gap: 8,
  },
  vouchBtn: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  vouchBtnDisabled: {
    opacity: 0.4,
  },
  vouchBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  vouchHint: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textAlign: "center",
  },

  // Success screen
  successScroll: {
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 40,
    gap: 16,
  },
  successIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.vouchGreenLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 26,
    fontFamily: Fonts.bold,
    color: Colors.black,
    textAlign: "center",
  },
  successSub: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.grey700,
    textAlign: "center",
    lineHeight: 22,
  },
  bizCard: {
    width: "100%",
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 16,
    padding: 16,
    gap: 10,
    marginTop: 8,
  },
  bizCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bizIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.vouchGreenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  bizName: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  vouchesCount: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
  },
  vouchesSelf: {
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
  primarySuccessBtn: {
    width: "100%",
    backgroundColor: Colors.vouchGreen,
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primarySuccessBtnText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  secondarySuccessBtn: {
    width: "100%",
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  secondarySuccessBtnText: {
    fontSize: 16,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
});
