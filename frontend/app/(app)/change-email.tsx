import { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
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
import { useAuth } from "@/context/AuthContext";

const CODE_LENGTH = 6;

export default function ChangeEmail() {
  const { fetchWithAuth, updateUser } = useAuth();

  const [step, setStep] = useState<"enter" | "otp">("enter");
  const [newEmail, setNewEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>(Array(CODE_LENGTH).fill(null));
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCountdown() {
    setCountdown(60);
    setCanResend(false);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  const trimmedEmail = newEmail.trim().toLowerCase();
  const canSend = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);

  async function handleSendCode() {
    if (!canSend) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/auth/request-email-change`, {
        method: "POST",
        body: JSON.stringify({ newEmail: trimmedEmail }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to send code. Please try again.");
      }
    } catch (err: unknown) {
      if (!(err instanceof TypeError)) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setLoading(false);
        return;
      }
    } finally {
      setLoading(false);
    }
    setStep("otp");
    startCountdown();
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }

  async function handleResend() {
    if (!canResend) return;
    setDigits(Array(CODE_LENGTH).fill(""));
    setError("");
    await handleSendCode();
  }

  function handleDigitChange(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    setError("");
    if (digit && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(index: number, key: string) {
    if (key === "Backspace" && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = "";
      setDigits(next);
      inputRefs.current[index - 1]?.focus();
    }
  }

  const code = digits.join("");
  const isComplete = code.length === CODE_LENGTH;

  async function handleVerify() {
    if (!isComplete) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/auth/verify-email-change`, {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Incorrect code. Please try again.");
      }
      const data = await res.json();
      if (data.user) await updateUser({ email: data.user.email });
      router.replace("/(app)/me" as any);
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        router.replace("/(app)/me" as any);
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
        <View style={styles.inner}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (step === "otp" ? setStep("enter") : router.back())}
            hitSlop={14}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.vouchGreen} />
          </TouchableOpacity>

          {step === "enter" ? (
            <>
              <View style={styles.iconCircle}>
                <Ionicons name="mail-outline" size={32} color={Colors.white} />
              </View>
              <AppText style={styles.title}>Change your email</AppText>
              <AppText style={styles.subtitle}>
                {"Enter your new email address. We'll send a confirmation code to verify it."}
              </AppText>

              <AppText style={styles.label}>NEW EMAIL ADDRESS</AppText>
              <TextInput
                style={styles.input}
                value={newEmail}
                onChangeText={setNewEmail}
                placeholder="you@example.com"
                placeholderTextColor={Colors.grey300}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleSendCode}
                autoFocus
              />

              {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

              <TouchableOpacity
                style={[styles.primaryButton, (!canSend || loading) && styles.primaryButtonDisabled]}
                onPress={handleSendCode}
                disabled={!canSend || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <AppText style={styles.primaryButtonText}>Send confirmation code</AppText>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.iconCircle}>
                <Ionicons name="chatbubble-ellipses-outline" size={32} color={Colors.white} />
              </View>
              <AppText style={styles.title}>Enter the code</AppText>
              <View style={styles.sentRow}>
                <AppText style={styles.sentText}>Sent to {trimmedEmail} · </AppText>
                <TouchableOpacity onPress={() => setStep("enter")} hitSlop={8}>
                  <AppText style={styles.editLink}>Edit</AppText>
                </TouchableOpacity>
              </View>

              <View style={styles.boxRow}>
                {digits.map((d, i) => (
                  <TextInput
                    key={i}
                    ref={(ref) => { inputRefs.current[i] = ref; }}
                    style={[styles.box, d ? styles.boxFilled : null]}
                    value={d}
                    onChangeText={(v) => handleDigitChange(i, v)}
                    onKeyPress={({ nativeEvent }) => handleKeyPress(i, nativeEvent.key)}
                    keyboardType="numeric"
                    maxLength={1}
                    textAlign="center"
                    selectTextOnFocus
                  />
                ))}
              </View>

              <View style={styles.resendRow}>
                <AppText style={styles.resendBase}>{"Didn't get a code?  "}</AppText>
                {canResend ? (
                  <TouchableOpacity onPress={handleResend} hitSlop={8}>
                    <AppText style={styles.resendLink}>Resend</AppText>
                  </TouchableOpacity>
                ) : (
                  <AppText style={styles.resendTimer}>
                    Resend in 0:{countdown.toString().padStart(2, "0")}
                  </AppText>
                )}
              </View>

              {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

              <TouchableOpacity
                style={[styles.primaryButton, (!isComplete || loading) && styles.primaryButtonDisabled]}
                onPress={handleVerify}
                disabled={!isComplete || loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <AppText style={styles.primaryButtonText}>Confirm new email</AppText>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: "center",
  },
  backBtn: { alignSelf: "flex-start", marginBottom: 32, padding: 4 },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.vouchGreen,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontFamily: Fonts.extraBold,
    color: Colors.black,
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textAlign: "center",
    marginBottom: 36,
    lineHeight: 20,
  },
  label: {
    alignSelf: "flex-start",
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    height: 52,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black,
    backgroundColor: Colors.white,
    marginBottom: 20,
  },
  sentRow: { flexDirection: "row", alignItems: "center", marginBottom: 32 },
  sentText: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.grey500 },
  editLink: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.vouchGreen },
  boxRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  box: {
    width: 48,
    height: 60,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    borderRadius: 12,
    fontSize: 28,
    fontWeight: "700",
    color: Colors.black,
    backgroundColor: Colors.white,
  },
  boxFilled: { borderColor: Colors.vouchGreen },
  resendRow: { flexDirection: "row", alignItems: "center", marginBottom: 28 },
  resendBase: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.grey500 },
  resendLink: { fontSize: 14, fontFamily: Fonts.semiBold, color: Colors.vouchGreen },
  resendTimer: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.grey500 },
  errorText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.red,
    textAlign: "center",
    marginBottom: 16,
  },
  primaryButton: {
    width: "100%",
    height: 54,
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryButtonDisabled: { opacity: 0.4 },
  primaryButtonText: { color: Colors.white, fontSize: 16, fontFamily: Fonts.bold },
});
