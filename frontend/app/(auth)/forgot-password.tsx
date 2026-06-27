import { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { API_BASE_URL } from "@/constants/api";
import { AppText } from "@/components/AppText";
import { AppInput } from "@/components/AppInput";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      router.push({
        pathname: "/(auth)/verify-reset-code",
        params: { email: email.toLowerCase().trim() },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
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
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.black} />
          </TouchableOpacity>

          <AppText style={styles.title}>Forgot password?</AppText>
          <AppText style={styles.subtitle}>
            {"Enter your email and we'll send you a reset code."}
          </AppText>

          <AppText style={styles.label}>EMAIL</AppText>
          <AppInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            autoFocus
          />

          {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

          <TouchableOpacity
            style={[styles.button, (!email.trim() || loading) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!email.trim() || loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Send reset code"
            accessibilityState={{ disabled: !email.trim() || loading }}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <AppText style={styles.buttonText}>Send reset code</AppText>
            )}
          </TouchableOpacity>

          <View style={styles.backRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Back to sign in"
            >
              <AppText style={styles.backLink}>Back to sign in</AppText>
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
  inner: {
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
  input: {
    marginBottom: 20,
  },
  errorText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.red,
    textAlign: "center",
    marginBottom: 16,
  },
  button: {
    height: 54,
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  backRow: {
    alignItems: "center",
    marginTop: 24,
  },
  backLink: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
});
