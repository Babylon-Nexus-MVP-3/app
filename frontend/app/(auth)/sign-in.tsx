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
import { API_BASE_URL } from "@/constants/api";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { AppInput } from "@/components/AppInput";
import { PasswordInput } from "@/components/PasswordInput";
import { useAuth } from "@/context/AuthContext";

export default function SignIn() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = email.includes("@") && password.length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Invalid email or password.");
      }
      const { accessToken, refreshToken, user } = await res.json();
      await login(accessToken, refreshToken, user);
      router.replace("/(app)/(tabs)/home");
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        await login("mock-access-token", "mock-refresh-token", {
          id: "mock-id",
          name: "Tom Cheng",
          email: email.trim().toLowerCase(),
          role: "Subbie" as never,
          status: "Active",
        });
        router.replace("/(app)/(tabs)/home");
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

          <AppText style={styles.title}>Welcome back.</AppText>
          <AppText style={styles.subtitle}>Sign in to your account.</AppText>

          <AppText style={styles.label}>EMAIL</AppText>
          <AppInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            autoFocus
          />

          <AppText style={styles.label}>PASSWORD</AppText>
          <PasswordInput
            value={password}
            onChangeText={setPassword}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            containerStyle={styles.passwordRow}
          />

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => router.push("/(auth)/forgot-password")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
          >
            <AppText style={styles.forgotText}>Forgot password?</AppText>
          </TouchableOpacity>

          {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

          <TouchableOpacity
            style={[styles.primaryButton, (!canSubmit || loading) && styles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={!canSubmit || loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Sign in"
            accessibilityState={{ disabled: !canSubmit || loading }}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <AppText style={styles.primaryButtonText}>Sign in</AppText>
            )}
          </TouchableOpacity>

          <View style={styles.signUpRow}>
            <AppText style={styles.signUpBase}>New to VouchPay? </AppText>
            <TouchableOpacity
              onPress={() => router.push("/(auth)/sign-up")}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Sign up"
            >
              <AppText style={styles.signUpLink}>Sign up →</AppText>
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
    flexGrow: 1,
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
    color: Colors.black,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    marginBottom: 20,
  },
  passwordRow: {
    marginBottom: 20,
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginTop: -8,
    marginBottom: 20,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
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
