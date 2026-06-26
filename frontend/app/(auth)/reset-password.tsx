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
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { API_BASE_URL } from "@/constants/api";
import { AppText } from "@/components/AppText";
import { PasswordInput } from "@/components/PasswordInput";

export default function ResetPassword() {
  const { resetCode } = useLocalSearchParams<{ resetCode: string }>();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDisabled = password.length < 12 || password !== confirm || loading;

  async function handleReset() {
    if (isDisabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetCode, newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reset failed");
      router.replace("/(auth)/sign-in");
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

          <AppText style={styles.title}>Reset password</AppText>
          <AppText style={styles.subtitle}>Choose a new password for your account.</AppText>

          <AppText style={styles.label}>NEW PASSWORD</AppText>
          <PasswordInput
            value={password}
            onChangeText={setPassword}
            placeholder="Min. 12 characters"
            returnKeyType="next"
            containerStyle={styles.passwordRow}
          />
          {password.length > 0 && password.length < 12 ? (
            <AppText style={styles.hintText}>Password must be at least 12 characters</AppText>
          ) : null}

          <AppText style={styles.label}>CONFIRM PASSWORD</AppText>
          <PasswordInput
            value={confirm}
            onChangeText={setConfirm}
            placeholder="Re-enter password"
            returnKeyType="done"
            onSubmitEditing={handleReset}
            containerStyle={styles.passwordRow}
            accessibilityLabel="confirm password"
          />
          {confirm.length > 0 && password !== confirm ? (
            <AppText style={styles.hintText}>Passwords do not match</AppText>
          ) : null}

          {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

          <TouchableOpacity
            style={[styles.button, isDisabled && styles.buttonDisabled]}
            onPress={handleReset}
            disabled={isDisabled}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Reset password"
            accessibilityState={{ disabled: isDisabled }}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <AppText style={styles.buttonText}>Reset password</AppText>
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
  passwordRow: {
    marginBottom: 8,
  },
  hintText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginBottom: 16,
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
});
