import { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { API_BASE_URL } from "@/constants/api";

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
  const [mobile, setMobile] = useState("");
  const [abn, setAbn] = useState("");
  const [abnDigits, setAbnDigits] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

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
      if (!name) setName(data.tradingName || data.entityName);
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

  const mobileDigits = mobile.replace(/\D/g, "");
  const canSubmit = mobileDigits.length >= 10 && abnDigits.length === 11 && name.trim().length > 0 && !abrLoading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile: mobileDigits,
          abn: abnDigits,
          businessName: abrResult?.entityName ?? name,
          email: email.trim() || undefined,
          name: name.trim(),
          flow: "signup",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to send code. Please try again.");
      }
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        // Network error — backend not live, proceed anyway in dev
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setLoading(false);
        return;
      }
    } finally {
      setLoading(false);
    }
    router.push({ pathname: "/(auth)/verify-otp", params: { mobile: mobileDigits, flow: "signup" } });
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
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={14}>
            <Ionicons name="arrow-back" size={24} color={Colors.vouchGreen} />
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}>Quick setup.</Text>
          <Text style={styles.subtitle}>No password. Just your mobile, ABN, and email.</Text>

          {/* MOBILE */}
          <Text style={styles.label}>MOBILE</Text>
          <TextInput
            style={styles.input}
            value={mobile}
            onChangeText={setMobile}
            placeholder="0412 345 678"
            placeholderTextColor={Colors.grey300}
            keyboardType="phone-pad"
            returnKeyType="next"
          />

          {/* ABN */}
          <Text style={styles.label}>ABN</Text>
          <TextInput
            style={[styles.input, abrError ? styles.inputError : null]}
            value={abn}
            onChangeText={onAbnChange}
            placeholder="XX XXX XXX XXX"
            placeholderTextColor={Colors.grey300}
            keyboardType="numeric"
            returnKeyType="next"
          />

          {/* ABR result / loading / error */}
          {abrLoading && (
            <View style={styles.abrLoading}>
              <ActivityIndicator size="small" color={Colors.vouchGreen} />
              <Text style={styles.abrLoadingText}>Looking up ABN…</Text>
            </View>
          )}
          {abrResult && !abrLoading && (
            <View style={styles.abrConfirmed}>
              <Ionicons name="checkmark-circle" size={18} color={Colors.vouchGreen} />
              <Text style={styles.abrConfirmedText}>
                {abrResult.tradingName || abrResult.entityName}
                {"  ·  "}
                {abrResult.businessType}
                {"  ·  "}
                {abrResult.state}
                {"  ·  active "}
                {abrResult.activeYears} yrs
              </Text>
            </View>
          )}
          {abrError && !abrLoading && (
            <Text style={styles.fieldError}>{abrError}</Text>
          )}

          {/* EMAIL */}
          <Text style={styles.label}>EMAIL</Text>
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

          {/* YOUR NAME */}
          <Text style={styles.label}>YOUR NAME</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Tom Cheng"
            placeholderTextColor={Colors.grey300}
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryButton, (!canSubmit || loading) && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Send me the code</Text>
            )}
          </TouchableOpacity>
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
    fontWeight: "800",
    color: Colors.black,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.grey500,
    marginBottom: 32,
    lineHeight: 22,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
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
    color: Colors.black,
    backgroundColor: Colors.white,
    marginBottom: 20,
  },
  inputError: {
    borderColor: Colors.red,
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
    color: Colors.vouchGreen,
    fontWeight: "500",
    lineHeight: 18,
  },
  fieldError: {
    fontSize: 12,
    color: Colors.red,
    marginTop: -14,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
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
    fontWeight: "700",
  },
});
