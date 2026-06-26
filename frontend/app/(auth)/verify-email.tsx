import { API_BASE_URL } from "@/constants/api";
import { useRef, useState } from "react";
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
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { HEADER_HIT_SLOP } from "@/constants/touch";
import { useAuth } from "@/context/AuthContext";
import { authStyles } from "@/constants/authStyles";
import { AppText } from "@/components/AppText";
import { OtpInput, OtpInputRef } from "@/components/OtpInput";

export default function VerifyEmail() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { login } = useAuth();
  const otpRef = useRef<OtpInputRef>(null);
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const code = digits.join("");

  async function handleVerify() {
    if (code.length < 6) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationCode: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Invalid code. Please try again.");
        return;
      }
      await login(data.accessToken, data.refreshToken, data.user);
      router.replace("/(app)/home" as any);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
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
            onPress={() => router.back()}
            style={authStyles.backButton}
            hitSlop={HEADER_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="arrow-back" size={22} color={Colors.black} />
          </TouchableOpacity>

          <View style={styles.iconCircle}>
            <Ionicons name="chatbubble-ellipses-outline" size={28} color={Colors.vouchGreen} />
          </View>

          <AppText style={[authStyles.screenTitle, styles.centeredTitle]}>Enter the code</AppText>
          <AppText style={[authStyles.screenSubtitle, styles.centeredSubtitle]}>
            {"Sent to "}
            <AppText style={styles.emailHighlight}>{email}</AppText>
          </AppText>

          <OtpInput
            ref={otpRef}
            digits={digits}
            onChange={setDigits}
            style={styles.boxRow}
          />

          <AppText style={styles.hint}>{"Didn't receive a code? Check your spam folder."}</AppText>

          {error && <AppText style={authStyles.errorText}>{error}</AppText>}

          <TouchableOpacity
            style={[
              authStyles.primaryButton,
              (code.length < 6 || loading) && authStyles.primaryButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={code.length < 6 || loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Verify email"
            accessibilityState={{ disabled: code.length < 6 || loading }}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <AppText style={authStyles.primaryButtonText}>Verify</AppText>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.vouchGreenLight,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  centeredTitle: {
    textAlign: "center",
    marginBottom: 8,
  },
  centeredSubtitle: {
    textAlign: "center",
  },
  emailHighlight: {
    color: Colors.vouchGreen,
    fontFamily: Fonts.semiBold,
  },
  boxRow: {
    justifyContent: "center",
    marginTop: 8,
    marginBottom: 24,
  },
  hint: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textAlign: "center",
    marginBottom: 32,
  },
});
