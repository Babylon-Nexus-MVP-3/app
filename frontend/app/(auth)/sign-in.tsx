import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
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

export default function SignIn() {
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const mobileDigits = mobile.replace(/\D/g, "");
  const canSubmit = mobileDigits.length >= 10;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/request-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: mobileDigits, flow: "signin" }),
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
    router.push({ pathname: "/(auth)/verify-otp", params: { mobile: mobileDigits, flow: "signin" } });
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.inner}>
          {/* Back */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={14}>
            <Ionicons name="arrow-back" size={24} color={Colors.vouchGreen} />
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}>Welcome back.</Text>
          <Text style={styles.subtitle}>Enter your mobile to sign in.</Text>

          {/* MOBILE */}
          <Text style={styles.label}>MOBILE</Text>
          <TextInput
            style={styles.input}
            value={mobile}
            onChangeText={setMobile}
            placeholder="0412 345 678"
            placeholderTextColor={Colors.grey300}
            keyboardType="phone-pad"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            autoFocus
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

          {/* Sign up link */}
          <View style={styles.signUpRow}>
            <Text style={styles.signUpBase}>New to VouchPay?  </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")} hitSlop={8}>
              <Text style={styles.signUpLink}>Sign up →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
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
    fontSize: 28,
    fontWeight: "800",
    color: Colors.black,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.grey500,
    marginBottom: 36,
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
  signUpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  signUpBase: {
    fontSize: 14,
    color: Colors.grey500,
  },
  signUpLink: {
    fontSize: 14,
    color: Colors.vouchGreen,
    fontWeight: "600",
  },
});
