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
    router.push({
      pathname: "/(auth)/verify-otp",
      params: { mobile: mobileDigits, flow: "signin" },
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.inner}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} hitSlop={14}>
            <Ionicons name="arrow-back" size={24} color={Colors.vouchGreen} />
          </TouchableOpacity>

          <AppText style={styles.title}>Welcome back.</AppText>
          <AppText style={styles.subtitle}>Enter your mobile to sign in.</AppText>

          <AppText style={styles.label}>MOBILE</AppText>
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
              <AppText style={styles.primaryButtonText}>Send me the code</AppText>
            )}
          </TouchableOpacity>

          <View style={styles.signUpRow}>
            <AppText style={styles.signUpBase}>New to VouchPay? </AppText>
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")} hitSlop={8}>
              <AppText style={styles.signUpLink}>Sign up →</AppText>
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
    fontFamily: Fonts.extraBold,
    color: Colors.black,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginBottom: 36,
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
    marginBottom: 20,
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
  signUpRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  signUpBase: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  signUpLink: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
});
