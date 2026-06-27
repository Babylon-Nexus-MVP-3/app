import { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import { API_BASE_URL } from "@/constants/api";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { AppInput } from "@/components/AppInput";
import { OtpInput, OtpInputRef } from "@/components/OtpInput";
import { useAuth } from "@/context/AuthContext";

const CODE_LENGTH = 6;

export default function VerifyMobile() {
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { user, fetchWithAuth, updateUser } = useAuth();

  function navigateAfterVerify() {
    if (returnTo === "get-vouched") {
      router.push("/(app)/get-vouched" as any);
    } else {
      router.push("/(app)/me" as any);
    }
  }

  const [step, setStep] = useState<"enter" | "otp">("enter");
  const [mobile, setMobile] = useState(user?.mobile ?? "");
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const otpRef = useRef<OtpInputRef>(null);
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

  const mobileDigits = mobile.replace(/\D/g, "");
  const canSend = mobileDigits.length >= 10;

  function formatMobileDisplay(digits: string): string {
    if (digits.length <= 4) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
    return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
  }

  async function handleSendCode() {
    if (!canSend) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/auth/request-mobile-otp`, {
        method: "POST",
        body: JSON.stringify({ mobile: mobileDigits }),
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
    setTimeout(() => otpRef.current?.focusFirst(), 300);
  }

  async function handleResend() {
    if (!canResend) return;
    setDigits(Array(CODE_LENGTH).fill(""));
    setError("");
    await handleSendCode();
  }

  const code = digits.join("");
  const isComplete = code.length === CODE_LENGTH;

  async function handleVerify() {
    if (!isComplete) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/auth/verify-mobile-otp`, {
        method: "POST",
        body: JSON.stringify({ mobile: mobileDigits, code }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Incorrect code. Please try again.");
      }
      await updateUser({ mobile: mobileDigits, mobileVerified: true });
      navigateAfterVerify();
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        await updateUser({ mobile: mobileDigits, mobileVerified: true });
        navigateAfterVerify();
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  const displayMobile = `0${mobileDigits.slice(-9, -6)} ${mobileDigits.slice(-6, -3)} ${mobileDigits.slice(-3)}`;

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
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color={Colors.vouchGreen} />
          </TouchableOpacity>

          {step === "enter" ? (
            <>
              <View style={styles.iconCircle}>
                <Ionicons name="phone-portrait-outline" size={32} color={Colors.white} />
              </View>
              <AppText style={styles.title}>Verify your mobile</AppText>
              <AppText style={styles.subtitle}>
                {"We'll send a one-time code to confirm your number."}
              </AppText>

              <AppText style={styles.label}>MOBILE NUMBER</AppText>
              <AppInput
                style={styles.input}
                value={formatMobileDisplay(mobileDigits)}
                onChangeText={(v) => setMobile(v.replace(/\D/g, "").slice(0, 10))}
                placeholder="0412 345 678"
                keyboardType="number-pad"
                maxLength={12}
                returnKeyType="done"
                onSubmitEditing={handleSendCode}
                autoFocus
              />

              {error ? <AppText style={styles.errorText}>{error}</AppText> : null}

              <TouchableOpacity
                style={[
                  styles.primaryButton,
                  (!canSend || loading) && styles.primaryButtonDisabled,
                ]}
                onPress={handleSendCode}
                disabled={!canSend || loading}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Send code"
                accessibilityState={{ disabled: !canSend || loading }}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <AppText style={styles.primaryButtonText}>Send code</AppText>
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
                <AppText style={styles.sentText}>Sent to {displayMobile} · </AppText>
                <TouchableOpacity
                  onPress={() => setStep("enter")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Edit mobile number"
                >
                  <AppText style={styles.editLink}>Edit</AppText>
                </TouchableOpacity>
              </View>

              <OtpInput
                ref={otpRef}
                digits={digits}
                onChange={(d) => {
                  setDigits(d);
                  setError("");
                }}
                style={styles.boxRow}
              />

              <View style={styles.resendRow}>
                <AppText style={styles.resendBase}>{"Didn't get a code?  "}</AppText>
                {canResend ? (
                  <TouchableOpacity
                    onPress={handleResend}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Resend code"
                  >
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
                style={[
                  styles.primaryButton,
                  (!isComplete || loading) && styles.primaryButtonDisabled,
                ]}
                onPress={handleVerify}
                disabled={!isComplete || loading}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Verify mobile number"
                accessibilityState={{ disabled: !isComplete || loading }}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <AppText style={styles.primaryButtonText}>Verify</AppText>
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
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
    alignItems: "center",
  },
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 32,
    padding: 4,
  },
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
    marginBottom: 20,
  },
  sentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  sentText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  editLink: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
  boxRow: {
    marginBottom: 24,
  },
  resendRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 28,
  },
  resendBase: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  resendLink: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
  resendTimer: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
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
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
});
