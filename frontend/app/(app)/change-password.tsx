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

export default function ChangePassword() {
  const { fetchWithAuth } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
          <View style={authStyles.inputWrapper}>
            <TextInput
              style={[authStyles.textInput, authStyles.inputNoMargin, authStyles.inputPadRight]}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="••••••••••••"
              placeholderTextColor={Colors.grey300}
              secureTextEntry={!showCurrent}
              returnKeyType="next"
              onSubmitEditing={() => newPassRef.current?.focus()}
            />
            <TouchableOpacity
              style={authStyles.eyeButton}
              onPress={() => setShowCurrent((v) => !v)}
            >
              <Ionicons
                name={showCurrent ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={Colors.grey500}
              />
            </TouchableOpacity>
          </View>

          <AppText style={authStyles.fieldLabel}>NEW PASSWORD</AppText>
          <View style={authStyles.inputWrapper}>
            <TextInput
              ref={newPassRef}
              style={[authStyles.textInput, authStyles.inputNoMargin, authStyles.inputPadRight]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="••••••••••••"
              placeholderTextColor={Colors.grey300}
              secureTextEntry={!showNew}
              returnKeyType="next"
              onSubmitEditing={() => confirmPassRef.current?.focus()}
            />
            <TouchableOpacity style={authStyles.eyeButton} onPress={() => setShowNew((v) => !v)}>
              <Ionicons
                name={showNew ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={Colors.grey500}
              />
            </TouchableOpacity>
          </View>

          <AppText style={authStyles.fieldLabel}>CONFIRM NEW PASSWORD</AppText>
          <View style={authStyles.inputWrapper}>
            <TextInput
              ref={confirmPassRef}
              style={[authStyles.textInput, authStyles.inputNoMargin, authStyles.inputPadRight]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••••••"
              placeholderTextColor={Colors.grey300}
              secureTextEntry={!showConfirm}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity
              style={authStyles.eyeButton}
              onPress={() => setShowConfirm((v) => !v)}
            >
              <Ionicons
                name={showConfirm ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={Colors.grey500}
              />
            </TouchableOpacity>
          </View>

          {error && <AppText style={authStyles.errorText}>{error}</AppText>}

          <TouchableOpacity
            style={[authStyles.primaryButton, loading && authStyles.primaryButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
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
