import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { API_BASE_URL } from "@/constants/api";
import { AppText } from "@/components/AppText";
import { AppInput } from "@/components/AppInput";

export default function VerifyResetCode() {
  const { email } = useLocalSearchParams<{ email: string }>();

  const COOLDOWN = 60;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function handleVerify() {
    if (code.length < 6) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetCode: code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invalid or expired code");
      router.push({
        pathname: "/(auth)/reset-password",
        params: { resetCode: code },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function startCooldown() {
    setCooldown(COOLDOWN);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleResend() {
    setResending(true);
    setError(null);
    setResendMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/resend-reset-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to resend code");
      setResendMsg("Code resent. Check your email.");
      startCooldown();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setResending(false);
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

          <AppText style={styles.title}>Enter reset code</AppText>
          <AppText style={styles.subtitle}>
            {"A 6-digit code was sent to "}
            <AppText style={styles.emailHighlight}>{email}</AppText>
            {"."}
          </AppText>

          <AppInput
            style={styles.codeInput}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          {resendMsg ? <AppText style={styles.resendMsg}>{resendMsg}</AppText> : null}
          {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

          <TouchableOpacity
            style={[styles.button, (code.length < 6 || loading) && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={code.length < 6 || loading}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Verify code"
            accessibilityState={{ disabled: code.length < 6 || loading }}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <AppText style={styles.buttonText}>Verify code</AppText>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResend}
            disabled={resending || cooldown > 0}
            style={styles.resendBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              cooldown > 0 ? `Resend code, available in ${cooldown} seconds` : "Resend code"
            }
            accessibilityState={{ disabled: resending || cooldown > 0 }}
          >
            <AppText style={styles.resendText}>
              {resending
                ? "Resending..."
                : cooldown > 0
                  ? `Resend code (${cooldown}s)`
                  : "Resend code"}
            </AppText>
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
  emailHighlight: {
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
  codeInput: {
    height: 72,
    paddingHorizontal: 24,
    fontSize: 36,
    fontFamily: Fonts.extraBold,
    letterSpacing: 10,
    marginBottom: 24,
    textAlign: "center",
  },
  resendMsg: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.vouchGreen,
    textAlign: "center",
    marginBottom: 12,
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
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  resendBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
});
