import { useCallback, useRef, useState } from "react";
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
import { router, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { HEADER_HIT_SLOP } from "@/constants/touch";
import { useAuth } from "@/context/AuthContext";

export default function ChangePassword() {
  const { fetchWithAuth } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const newPassRef = useRef<TextInput>(null);
  const confirmPassRef = useRef<TextInput>(null);

  useFocusEffect(
    useCallback(() => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setError(null);
      setSuccess(false);
    }, [])
  );

  async function handleSubmit() {
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetchWithAuth(
        "https://app-production-574c.up.railway.app/auth/change-password",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to change password.");
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <View style={styles.successScreen}>
            <View style={styles.successCenter}>
              <View style={styles.successIconWrap}>
                <Ionicons name="checkmark" size={40} color={Colors.white} />
              </View>
              <Text style={styles.successTitle}>Password Updated</Text>
              <Text style={styles.successSubtitle}>
                Your password has been changed successfully.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.doneButton}
              activeOpacity={0.85}
            >
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[Colors.navy, Colors.navyLight]} style={styles.gradient}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
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
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Change Password</Text>
            <Text style={styles.subtitle}>Your new password must be at least 12 characters.</Text>

            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="••••••••••••"
              placeholderTextColor="rgba(255,255,255,0.3)"
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => newPassRef.current?.focus()}
            />

            <Text style={styles.label}>New Password</Text>
            <TextInput
              ref={newPassRef}
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="••••••••••••"
              placeholderTextColor="rgba(255,255,255,0.3)"
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={() => confirmPassRef.current?.focus()}
            />

            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              ref={confirmPassRef}
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••••••"
              placeholderTextColor="rgba(255,255,255,0.3)"
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />

            {error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={Colors.navy} />
              ) : (
                <Text style={styles.submitText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  inner: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 24,
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
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 40,
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
  errorText: {
    fontSize: 13,
    color: Colors.red,
    marginBottom: 16,
    textAlign: "center",
  },
  submitButton: {
    height: 54,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  submitText: {
    color: Colors.navy,
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  successBox: {
    marginTop: 16,
    gap: 24,
  },
  successText: {
    fontSize: 16,
    color: Colors.green,
    fontWeight: "600",
    textAlign: "center",
  },
  doneButton: {
    height: 54,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: {
    color: Colors.navy,
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  successScreen: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  successCenter: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.green,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.white,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
  },
});
