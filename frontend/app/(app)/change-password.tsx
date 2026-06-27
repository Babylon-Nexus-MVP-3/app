import { API_BASE_URL } from "@/constants/api";
import { useCallback, useRef, useState } from "react";
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
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { HEADER_HIT_SLOP } from "@/constants/touch";
import { useAuth } from "@/context/AuthContext";
import { authStyles } from "@/constants/authStyles";
import { AppText } from "@/components/AppText";
import { PasswordInput } from "@/components/PasswordInput";
import { PasswordStrengthHints } from "@/components/PasswordStrengthHints";

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
      const res = await fetchWithAuth(`${API_BASE_URL}/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
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
      <SafeAreaView style={authStyles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.successScreen}>
          <View style={styles.successCenter}>
            <View style={styles.successIconWrap}>
              <Ionicons name="checkmark" size={40} color={Colors.white} />
            </View>
            <AppText style={styles.successTitle}>Password Updated</AppText>
            <AppText style={styles.successSubtitle}>
              Your password has been changed successfully.
            </AppText>
          </View>
          <TouchableOpacity
            onPress={() => router.replace("/(app)/me" as any)}
            style={authStyles.primaryButton}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <AppText style={authStyles.primaryButtonText}>Done</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={authStyles.safeArea} edges={["top"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={authStyles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={authStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity
            onPress={() => router.replace("/(app)/me" as any)}
            style={authStyles.backButton}
            hitSlop={HEADER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={22} color={Colors.black} />
          </TouchableOpacity>

          <AppText style={authStyles.screenTitle}>Change Password</AppText>
          <AppText style={authStyles.screenSubtitle}>
            Your new password must be at least 12 characters.
          </AppText>

          <AppText style={authStyles.fieldLabel}>CURRENT PASSWORD</AppText>
          <PasswordInput
            value={currentPassword}
            onChangeText={setCurrentPassword}
            returnKeyType="next"
            onSubmitEditing={() => newPassRef.current?.focus()}
            containerStyle={styles.fieldSpacing}
            accessibilityLabel="current password"
          />

          <AppText style={authStyles.fieldLabel}>NEW PASSWORD</AppText>
          <PasswordInput
            ref={newPassRef}
            value={newPassword}
            onChangeText={setNewPassword}
            returnKeyType="next"
            onSubmitEditing={() => confirmPassRef.current?.focus()}
            containerStyle={styles.fieldSpacing}
            accessibilityLabel="new password"
          />

          <PasswordStrengthHints password={newPassword} />

          <AppText style={authStyles.fieldLabel}>CONFIRM NEW PASSWORD</AppText>
          <PasswordInput
            ref={confirmPassRef}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            containerStyle={styles.fieldSpacing}
            accessibilityLabel="confirm password"
          />

          {error && <AppText style={authStyles.errorText}>{error}</AppText>}

          <TouchableOpacity
            style={[authStyles.primaryButton, loading && authStyles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Update Password"
            accessibilityState={{ disabled: loading }}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <AppText style={authStyles.primaryButtonText}>Update Password</AppText>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fieldSpacing: {
    marginBottom: 20,
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
    backgroundColor: Colors.vouchGreen,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 26,
    fontFamily: Fonts.extraBold,
    color: Colors.black,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textAlign: "center",
  },
});
