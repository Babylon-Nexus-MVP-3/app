import { useState } from "react";
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
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { HEADER_HIT_SLOP } from "@/constants/touch";

export default function SignUp() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("https://app-production-574c.up.railway.app/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.toLowerCase().trim(),
          password,
        }),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : {};
      if (!response.ok) {
        throw new Error(data.error ?? text ?? "Registration failed. Please try again.");
      }
      router.replace({
        pathname: "/(auth)/verify-email",
        params: { email: email.toLowerCase().trim() },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.gradient}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={HEADER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Enter your details to get started</Text>

          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Alex"
            placeholderTextColor="rgba(255,255,255,0.3)"
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Text style={styles.label}>Last Name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Jordan"
            placeholderTextColor="rgba(255,255,255,0.3)"
            autoCapitalize="words"
            returnKeyType="next"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />

          <Text style={styles.label}>Password</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, styles.inputNoMargin, styles.inputPadRight]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.3)"
              secureTextEntry={!showPassword}
              returnKeyType="next"
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword((v) => !v)}>
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="rgba(255,255,255,0.5)"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.hints}>
            <Text style={styles.hintLabel}>Password must contain at least:</Text>
            <Text
              style={[
                styles.hint,
                password.length >= 12 && password.length <= 50 && styles.hintMet,
              ]}
            >
              · 12 characters
            </Text>
            <Text
              style={[
                styles.hint,
                [
                  /[a-z]/.test(password),
                  /[A-Z]/.test(password),
                  /[0-9]/.test(password),
                  /[^a-zA-Z0-9]/.test(password),
                ].filter(Boolean).length >= 3 && styles.hintMet,
              ]}
            >
              · 3 of 4: uppercase, lowercase, number, special character
            </Text>
          </View>

          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={[styles.input, styles.inputNoMargin, styles.inputPadRight]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor="rgba(255,255,255,0.3)"
              secureTextEntry={!showConfirmPassword}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowConfirmPassword((v) => !v)}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color="rgba(255,255,255,0.5)"
              />
            </TouchableOpacity>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.navy} />
            ) : (
              <Text style={styles.primaryButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  keyboardView: { flex: 1 },
  inner: {
    paddingTop: 70,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    direction: "ltr",
  },
  backArrow: {
    fontSize: 28,
    color: Colors.gold,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.white,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 36,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.goldLight,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: "rgba(201,168,76,0.25)",
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    color: Colors.white,
  },
  hints: {
    gap: 4,
    marginTop: -8,
    marginBottom: 24,
  },
  hintLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    marginBottom: 2,
  },
  hint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
  },
  hintMet: {
    color: Colors.green,
  },
  errorText: {
    fontSize: 13,
    color: Colors.red,
    marginBottom: 16,
    textAlign: "center",
  },
  primaryButton: {
    height: 54,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: Colors.navy,
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputNoMargin: {
    marginBottom: 0,
  },
  inputPadRight: {
    paddingRight: 48,
  },
  eyeBtn: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
});
