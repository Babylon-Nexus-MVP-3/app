import { useState, useEffect, useRef } from "react";
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

type AbrResult = {
  entityName: string;
  tradingName?: string;
  businessType: string;
  state: string;
  activeYears: number;
  isActive: boolean;
};

function formatAbn(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
}

export default function AddAbn() {
  const { user, fetchWithAuth, updateUser } = useAuth();

  const [abn, setAbn] = useState(user?.abn ? formatAbn(user.abn) : "");
  const [abnDigits, setAbnDigits] = useState(user?.abn ?? "");
  const [abrResult, setAbrResult] = useState<AbrResult | null>(null);
  const [abrLoading, setAbrLoading] = useState(false);
  const [abrError, setAbrError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const abrTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (abnDigits.length !== 11) {
      setAbrResult(null);
      setAbrError("");
      return;
    }
    if (abrTimeout.current) clearTimeout(abrTimeout.current);
    abrTimeout.current = setTimeout(() => lookupAbn(abnDigits), 400);
    return () => {
      if (abrTimeout.current) clearTimeout(abrTimeout.current);
    };
  }, [abnDigits]);

  async function lookupAbn(digits: string) {
    setAbrLoading(true);
    setAbrError("");
    setAbrResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/abr/lookup?abn=${digits}`);
      if (!res.ok) throw new Error("ABN not found");
      const data: AbrResult = await res.json();
      if (!data.isActive) throw new Error("This ABN is not active");
      setAbrResult(data);
    } catch {
      setAbrError("ABN not found. Check the number and try again.");
    } finally {
      setAbrLoading(false);
    }
  }

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
        await updateUser({
          abn: abnDigits,
          businessName: abrResult?.tradingName || abrResult?.entityName,
        });
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

          <AppText style={styles.title}>{user?.abn ? "Edit ABN" : "Add ABN"}</AppText>
          <AppText style={styles.subtitle}>
            Enter your Australian Business Number to link your business.
          </AppText>

          <AppText style={styles.label}>ABN</AppText>
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

          {abrLoading && (
            <View style={styles.abrLoading}>
              <ActivityIndicator size="small" color={Colors.vouchGreen} />
              <AppText style={styles.abrLoadingText}>Looking up ABN…</AppText>
            </View>
          )}
          {abrResult && !abrLoading && (
            <View style={styles.abrConfirmed}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.vouchGreen} />
              <AppText style={styles.abrConfirmedText}>
                {abrResult.tradingName || abrResult.entityName}
                {"  ·  "}
                {abrResult.businessType}
                {"  ·  "}
                {abrResult.state}
                {"  ·  active "}
                {abrResult.activeYears} yrs
              </AppText>
            </View>
          )}
          {abrError && !abrLoading && <AppText style={styles.fieldError}>{abrError}</AppText>}

          {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

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
  abrLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  abrLoadingText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  abrConfirmed: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.vouchGreenLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  abrConfirmedText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.vouchGreen,
    lineHeight: 18,
  },
  fieldError: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.red,
    marginBottom: 16,
  },
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
