import { useState, useEffect, useRef } from "react";
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { API_BASE_URL } from "@/constants/api";
import { useAuth } from "@/context/AuthContext";
import { AppText } from "@/components/AppText";
import { OtpInput, OtpInputRef } from "@/components/OtpInput";

const CODE_LENGTH = 6;

export default function VerifyOtp() {
  const { mobile, flow } = useLocalSearchParams<{ mobile: string; flow: "signup" | "signin" }>();
  const { login } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const otpRef = useRef<OtpInputRef>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startCountdown();
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

  async function handleResend() {
    if (!canResend) return;
    try {
      await fetch(`${API_BASE_URL}/auth/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile }),
      });
    } catch {
      // Not live yet — ignore
    }
    setDigits(Array(CODE_LENGTH).fill(""));
    otpRef.current?.focusFirst();
    startCountdown();
  }

  const code = digits.join("");
  const isComplete = code.length === CODE_LENGTH;

  async function handleVerify() {
    if (!isComplete) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile, code, flow }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Incorrect code. Please try again.");
      }
      const { accessToken, refreshToken, user } = await res.json();
      await login(accessToken, refreshToken, user);
      router.replace("/(app)/(tabs)/home");
    } catch (err: unknown) {
      if (err instanceof TypeError) {
        // Network error — backend not live, mock login for dev
        await login("mock-access-token", "mock-refresh-token", {
          id: "mock-id",
          name: "Tom Cheng",
          email: "tom@example.com",
          role: "Subbie" as never,
          status: "Active",
        });
        router.replace("/(app)/(tabs)/home");
      } else {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  const displayMobile = mobile
    ? `0${mobile.slice(-9, -6)} ${mobile.slice(-6, -3)} ${mobile.slice(-3)}`
    : "";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Back */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <Ionicons name="arrow-back" size={24} color={Colors.vouchGreen} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="chatbubble-ellipses-outline" size={36} color={Colors.white} />
        </View>

        {/* Title */}
        <AppText style={styles.title}>Enter the code</AppText>
        <View style={styles.sentRow}>
          <AppText style={styles.sentText}>Sent to {displayMobile} · </AppText>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Edit phone number"
          >
            <AppText style={styles.editLink}>Edit</AppText>
          </TouchableOpacity>
        </View>

        {/* OTP boxes */}
        <OtpInput
          ref={otpRef}
          digits={digits}
          onChange={(d) => {
            setDigits(d);
            setError("");
          }}
          style={styles.boxRow}
        />

        {/* Resend */}
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

        {/* Verify button */}
        <TouchableOpacity
          style={[styles.primaryButton, (!isComplete || loading) && styles.primaryButtonDisabled]}
          onPress={handleVerify}
          disabled={!isComplete || loading}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Verify code"
          accessibilityState={{ disabled: !isComplete || loading }}
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <AppText style={styles.primaryButtonText}>Verify</AppText>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
  },
  backBtn: {
    alignSelf: "flex-start",
    marginTop: 8,
    marginBottom: 16,
    padding: 4,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingTop: 24,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.vouchGreen,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    fontFamily: Fonts.extraBold,
    color: Colors.black,
    marginBottom: 8,
  },
  sentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 36,
  },
  sentText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  editLink: {
    fontSize: 14,
    color: Colors.vouchGreen,
    fontFamily: Fonts.semiBold,
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
    color: Colors.vouchGreen,
    fontFamily: Fonts.semiBold,
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
