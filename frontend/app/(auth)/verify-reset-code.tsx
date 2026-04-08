import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import { HEADER_HIT_SLOP } from "@/constants/touch";

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
      const res = await fetch("https://app-production-574c.up.railway.app/auth/verify-reset-code", {
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
      const res = await fetch("https://app-production-574c.up.railway.app/auth/resend-reset-code", {
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

          <Text style={styles.title}>Enter reset code</Text>
          <Text style={styles.subtitle}>
            {"A 6-digit code was sent to "}
            <Text style={styles.emailHighlight}>{email}</Text>
            {"."}
          </Text>

          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            placeholderTextColor="rgba(255,255,255,0.2)"
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          {resendMsg && <Text style={styles.resendMsg}>{resendMsg}</Text>}
          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, (code.length < 6 || loading) && styles.buttonDisabled]}
            onPress={handleVerify}
            disabled={code.length < 6 || loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={Colors.navy} />
            ) : (
              <Text style={styles.buttonText}>Verify Code</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleResend}
            disabled={resending || cooldown > 0}
            style={styles.resendButton}
          >
            <Text style={styles.resendText}>
              {resending
                ? "Resending..."
                : cooldown > 0
                  ? `Resend code (${cooldown}s)`
                  : "Resend code"}
            </Text>
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
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 40,
  },
  backButton: {
    marginBottom: 32,
    alignSelf: "flex-start",
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 4,
    direction: "ltr",
  },
  backArrow: {
    fontSize: 24,
    color: Colors.goldLight,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.white,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 22,
    marginBottom: 36,
  },
  emailHighlight: {
    color: Colors.goldLight,
    fontWeight: "600",
  },
  codeInput: {
    height: 72,
    borderWidth: 1.5,
    borderColor: Colors.gold + "40",
    borderRadius: 14,
    paddingHorizontal: 24,
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 10,
    marginBottom: 24,
    backgroundColor: "rgba(255,255,255,0.05)",
    color: Colors.gold,
    textAlign: "center",
  },
  resendMsg: {
    fontSize: 13,
    color: Colors.goldLight,
    textAlign: "center",
    marginBottom: 12,
  },
  errorText: {
    fontSize: 13,
    color: Colors.red,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 16,
  },
  button: {
    height: 54,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.navy,
    letterSpacing: 0.5,
  },
  resendButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  resendText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
});
