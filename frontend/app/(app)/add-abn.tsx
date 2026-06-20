import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { API_BASE_URL } from "@/constants/api";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useAuth } from "@/context/AuthContext";
import { AbrCard } from "@/components/AbrCard";
import { formatAbn, useAbrLookup } from "@/lib/useAbrLookup";

export default function AddAbn() {
  const { user, fetchWithAuth, updateUser } = useAuth();

  const isLocked = !!user?.abn;
  const [abn, setAbn] = useState(user?.abn ? formatAbn(user.abn) : "");
  const [abnDigits, setAbnDigits] = useState(user?.abn?.replace(/\D/g, "") ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { abrResult, abrLoading, abrError } = useAbrLookup(isLocked ? "" : abnDigits);

  function onAbnChange(text: string) {
    const digits = text.replace(/\D/g, "").slice(0, 11);
    setAbnDigits(digits);
    setAbn(formatAbn(digits));
  }

  const canSave = abnDigits.length === 11 && !abrLoading && !abrError;

  async function handleSave() {
    if (!canSave) return;
    setLoading(true);
    setError("");
    try {
      const businessName = abrResult?.tradingName || abrResult?.entityName;
      const res = await fetchWithAuth(`${API_BASE_URL}/auth/profile`, {
        method: "PATCH",
        body: JSON.stringify({ abn: abnDigits, businessName }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save. Please try again.");
      }
      await updateUser({ abn: abnDigits, businessName });
      router.push("/(app)/me" as any);
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        const businessName = abrResult?.tradingName || abrResult?.entityName;
        await updateUser({ abn: abnDigits, businessName });
        router.push("/(app)/me" as any);
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.inner}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/(app)/me" as any)}
            hitSlop={14}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.vouchGreen} />
          </TouchableOpacity>

          <AppText style={styles.title}>{isLocked ? "Your ABN" : "Add ABN"}</AppText>
          <AppText style={styles.subtitle}>
            {isLocked
              ? "Your ABN is locked to protect your vouch history."
              : "Enter your Australian Business Number to link your business."}
          </AppText>

          <AppText style={styles.label}>ABN</AppText>
          {isLocked ? (
            <View style={styles.inputLocked}>
              <AppText style={styles.lockedValue}>{abn}</AppText>
              <Ionicons name="lock-closed-outline" size={14} color={Colors.grey500} />
            </View>
          ) : (
            <TextInput
              style={[styles.input, abrError ? styles.inputError : null]}
              value={abn}
              onChangeText={onAbnChange}
              placeholder="XX XXX XXX XXX"
              placeholderTextColor={Colors.grey300}
              keyboardType="numeric"
              returnKeyType="done"
              onSubmitEditing={handleSave}
              autoFocus
            />
          )}

          <AbrCard abrResult={abrResult} abrLoading={abrLoading} abrError={abrError} />

          {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

          {isLocked ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.back()}
              activeOpacity={0.85}
            >
              <AppText style={styles.primaryButtonText}>Done</AppText>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, (!canSave || loading) && styles.primaryButtonDisabled]}
              onPress={handleSave}
              disabled={!canSave || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <AppText style={styles.primaryButtonText}>Save</AppText>
              )}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 24,
    padding: 4,
  },
  title: {
    fontSize: 26,
    fontFamily: Fonts.extraBold,
    color: Colors.black,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginBottom: 32,
    lineHeight: 20,
  },
  label: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black,
    backgroundColor: Colors.white,
    marginBottom: 16,
  },
  inputError: { borderColor: Colors.red },
  inputLocked: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    backgroundColor: Colors.grey100,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  lockedValue: { fontSize: 16, fontFamily: Fonts.regular, color: Colors.grey700 },
  errorText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.red,
    textAlign: "center",
    marginBottom: 16,
  },
  primaryButton: {
    height: 54,
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
});
