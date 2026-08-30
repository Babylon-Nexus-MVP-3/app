import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { API_BASE_URL, NETWORK_ERROR_MESSAGE } from "@/constants/api";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { HEADER_HIT_SLOP } from "@/constants/touch";
import { authStyles } from "@/constants/authStyles";
import { AppText } from "@/components/AppText";
import { AppInput } from "@/components/AppInput";
import { useAuth } from "@/context/AuthContext";
import { useAbrLookup } from "@/lib/useAbrLookup";

/*
  Editing what you trade as.

  Business name is the user's own answer, prefilled from the ABR at sign-up but
  not dictated by it — plenty of businesses trade under a name that was never
  registered, and a sole trader's registered name is their own surname-first
  legal name. Before this screen existed the field was write-once at sign-up,
  so a typo was permanent.

  The ABN is deliberately not editable here. It is locked to the account (see
  the sign-up warning), vouches are keyed by it, and changing it is a support
  matter rather than a settings toggle.
*/
export default function ChangeBusinessName() {
  const { user, fetchWithAuth, updateUser } = useAuth();
  const [businessName, setBusinessName] = useState(user?.businessName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { abrResult } = useAbrLookup(user?.abn?.replace(/\D/g, "") ?? "");
  const registeredName = abrResult ? abrResult.tradingName || abrResult.entityName : "";

  useFocusEffect(
    useCallback(() => {
      setBusinessName(user?.businessName ?? "");
      setError(null);
    }, [user?.businessName])
  );

  const trimmed = businessName.trim();
  const canSave = trimmed.length > 0 && trimmed !== (user?.businessName ?? "").trim();

  async function handleSubmit() {
    if (!canSave) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/auth/profile`, {
        method: "PATCH",
        body: JSON.stringify({ businessName: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}) as { error?: string });
        setError(data.error ?? "We couldn't save your business name. Please try again.");
        return;
      }
      // The server has it; mirror into the cached auth user so the Me card and
      // the wizard don't show the previous name until the next cold start.
      await updateUser({ businessName: trimmed });
      router.back();
    } catch {
      setError(NETWORK_ERROR_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={authStyles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={authStyles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={authStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={authStyles.backButton}
            hitSlop={HEADER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={22} color={Colors.black} />
          </TouchableOpacity>

          <AppText style={authStyles.screenTitle}>Business Name</AppText>
          <AppText style={authStyles.screenSubtitle}>
            This is what people see on your VouchPay card. Use the name you trade under.
          </AppText>

          <AppText style={authStyles.fieldLabel}>BUSINESS NAME</AppText>
          <AppInput
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="What you trade as"
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            style={styles.fieldSpacing}
            accessibilityLabel="business name"
          />

          {registeredName ? (
            <View style={styles.registeredNote}>
              <Ionicons name="shield-checkmark-outline" size={14} color={Colors.grey500} />
              <AppText style={styles.registeredText}>
                Registered to your ABN as {registeredName}
              </AppText>
            </View>
          ) : null}

          {error && <AppText style={authStyles.errorText}>{error}</AppText>}

          <TouchableOpacity
            style={[
              authStyles.primaryButton,
              (!canSave || loading) && authStyles.primaryButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!canSave || loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Save Business Name"
            accessibilityState={{ disabled: !canSave || loading, busy: loading }}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <AppText style={authStyles.primaryButtonText}>Save</AppText>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fieldSpacing: {
    marginBottom: 12,
  },
  registeredNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginBottom: 20,
  },
  registeredText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    lineHeight: 18,
  },
});
