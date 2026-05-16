import { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
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

export default function SignUp() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mobile, setMobile] = useState("");
  const [abn, setAbn] = useState("");
  const [abnDigits, setAbnDigits] = useState("");

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

  const trimmedName = name.trim();
  const nameParts = trimmedName.split(" ");
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") || "-";

  const canSubmit =
    firstName.length > 0 &&
    email.includes("@") &&
    password.length >= 12 &&
    abnDigits.length === 11 &&
    !abrError &&
    !abrLoading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const mobileDigits = mobile.replace(/\D/g, "");
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName,
          lastName,
          email: email.trim().toLowerCase(),
          password,
          ...(mobileDigits.length >= 10 ? { mobile: mobileDigits } : {}),
          ...(abnDigits.length === 11 ? { abn: abnDigits } : {}),
          ...(abrResult ? { businessName: abrResult.tradingName || abrResult.entityName } : {}),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Sign up failed. Please try again.");
      }
    } catch (err: unknown) {
      if (!(err instanceof TypeError)) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setLoading(false);
        return;
      }
      // Network error — dev fallback, proceed to verify-email
    } finally {
      setLoading(false);
    }
    router.push({
      pathname: "/(auth)/verify-email",
      params: { email: email.trim().toLowerCase() },
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={14}>
            <Ionicons name="arrow-back" size={24} color={Colors.black} />
          </TouchableOpacity>

          <AppText style={styles.title}>Create account.</AppText>
          <AppText style={styles.subtitle}>Enter your details to get started.</AppText>

          <AppText style={styles.label}>YOUR NAME</AppText>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Alex Smith"
            placeholderTextColor={Colors.grey300}
            autoCapitalize="words"
            returnKeyType="next"
            autoFocus
          />

          <AppText style={styles.label}>EMAIL</AppText>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={Colors.grey300}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <AppText style={styles.label}>PASSWORD</AppText>
          <View style={styles.passwordRow}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 12 characters"
              placeholderTextColor={Colors.grey300}
              secureTextEntry={!showPassword}
              returnKeyType="next"
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={8}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={Colors.grey500}
              />
            </TouchableOpacity>
          </View>

          <AppText style={styles.label}>
            MOBILE <AppText style={styles.optional}>(optional)</AppText>
          </AppText>
          <TextInput
            style={styles.input}
            value={mobile}
            onChangeText={setMobile}
            placeholder="0412 345 678"
            placeholderTextColor={Colors.grey300}
            keyboardType="phone-pad"
            returnKeyType="next"
          />

          <AppText style={styles.label}>ABN</AppText>
          <TextInput
            style={[styles.input, abrError ? styles.inputError : null]}
            value={abn}
            onChangeText={onAbnChange}
            placeholder="XX XXX XXX XXX"
            placeholderTextColor={Colors.grey300}
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          <View style={styles.abnWarning}>
            <Ionicons name="lock-closed-outline" size={12} color={Colors.amber} />
            <AppText style={styles.abnWarningText}>
              {"You can't change your ABN after creating your account — make sure it's correct."}
            </AppText>
          </View>

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
            style={[styles.primaryButton, (!canSubmit || loading) && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <AppText style={styles.primaryButtonText}>Create account</AppText>
            )}
          </TouchableOpacity>

          <View style={styles.signInRow}>
            <AppText style={styles.signInBase}>Already have an account? </AppText>
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-in")} hitSlop={8}>
              <AppText style={styles.signInLink}>Sign in →</AppText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scroll: {
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
    fontSize: 28,
    fontFamily: Fonts.extraBold,
    color: Colors.black,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginBottom: 32,
    lineHeight: 22,
  },
  label: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.black,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  optional: {
    fontFamily: Fonts.regular,
    textTransform: "none",
    letterSpacing: 0,
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
    marginBottom: 20,
  },
  inputError: {
    borderColor: Colors.red,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 12,
    backgroundColor: Colors.white,
    marginBottom: 20,
    height: 52,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black,
  },
  eyeBtn: {
    paddingHorizontal: 14,
  },
  abrLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: -12,
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
    marginTop: -12,
    marginBottom: 20,
  },
  abrConfirmedText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.medium,
    color: Colors.vouchGreen,
    lineHeight: 18,
  },
  abnWarning: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 6,
    marginTop: -14,
    marginBottom: 16,
  },
  abnWarningText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.amber,
    lineHeight: 17,
  },
  fieldError: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.red,
    marginTop: -14,
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
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  signInRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  signInBase: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  signInLink: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
});
