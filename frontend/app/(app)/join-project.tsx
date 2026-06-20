import { useState } from "react";
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
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

const ROLE_DISPLAY: Record<string, string> = { PM: "Project Manager", Subbie: "Subcontractor" };
function displayRole(role: string): string {
  return ROLE_DISPLAY[role] ?? role;
}

export default function JoinProject() {
  const { fetchWithAuth } = useAuth();

  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinedRole, setJoinedRole] = useState<string | null>(null);
  const [joinHasLicence, setJoinHasLicence] = useState<boolean | null>(null);
  const [joinHasInsurance, setJoinHasInsurance] = useState<boolean | null>(null);

  async function handleJoin() {
    if (joinCode.length < 6) return;
    setJoinLoading(true);
    setJoinError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/project/accept`, {
        method: "POST",
        body: JSON.stringify({
          inviteCode: joinCode.trim(),
          hasLicence: joinHasLicence,
          hasInsurance: joinHasInsurance,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error ?? "Invalid or expired invite code.");
      } else {
        setJoinedRole(data.participant?.role ?? "Team Member");
      }
    } catch {
      setJoinError("Network error. Please try again.");
    } finally {
      setJoinLoading(false);
    }
  }

  if (joinedRole) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.successWrap}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={40} color={Colors.white} />
          </View>
          <AppText style={styles.successTitle}>{"You're in!"}</AppText>
          <AppText style={styles.successHint}>{"You've been added as"}</AppText>
          <View style={styles.roleBadge}>
            <AppText style={styles.roleBadgeText}>{displayRole(joinedRole)}</AppText>
          </View>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.replace("/(app)/(tabs)/projects")}
          >
            <AppText style={styles.doneBtnText}>View my projects</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>JOIN A PROJECT</AppText>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AppText style={styles.heading}>Enter your invite code</AppText>
          <AppText style={styles.subheading}>
            Check the email you received from VouchPay for your 6-digit code.
          </AppText>

          <TextInput
            style={styles.codeInput}
            value={joinCode}
            onChangeText={(t) => setJoinCode(t.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            placeholderTextColor={Colors.grey300}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />

          <AppText style={styles.sectionLabel}>DO YOU HOLD A CURRENT LICENCE?</AppText>
          <View style={styles.optionRow}>
            {(
              [
                ["Yes", true],
                ["No", false],
                ["N/A", null],
              ] as const
            ).map(([label, val]) => (
              <TouchableOpacity
                key={label}
                style={[styles.chip, joinHasLicence === val && styles.chipActive]}
                onPress={() => setJoinHasLicence(val)}
              >
                <AppText style={[styles.chipText, joinHasLicence === val && styles.chipTextActive]}>
                  {label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          <AppText style={styles.sectionLabel}>DO YOU HOLD PUBLIC LIABILITY INSURANCE?</AppText>
          <View style={styles.optionRow}>
            {(
              [
                ["Yes", true],
                ["No", false],
                ["N/A", null],
              ] as const
            ).map(([label, val]) => (
              <TouchableOpacity
                key={label}
                style={[styles.chip, joinHasInsurance === val && styles.chipActive]}
                onPress={() => setJoinHasInsurance(val)}
              >
                <AppText
                  style={[styles.chipText, joinHasInsurance === val && styles.chipTextActive]}
                >
                  {label}
                </AppText>
              </TouchableOpacity>
            ))}
          </View>

          {joinError && <AppText style={styles.errorText}>{joinError}</AppText>}

          <TouchableOpacity
            style={[
              styles.primaryBtn,
              (joinCode.length < 6 || joinLoading) && styles.primaryBtnDisabled,
            ]}
            onPress={handleJoin}
            disabled={joinCode.length < 6 || joinLoading}
            activeOpacity={0.85}
          >
            {joinLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <AppText style={styles.primaryBtnText}>Join Project</AppText>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
    letterSpacing: 1,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 48,
  },
  heading: {
    fontSize: 26,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    lineHeight: 20,
    marginBottom: 32,
  },
  codeInput: {
    height: 80,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    borderRadius: 16,
    paddingHorizontal: 24,
    fontSize: 40,
    fontFamily: Fonts.extraBold,
    letterSpacing: 12,
    marginBottom: 32,
    backgroundColor: Colors.white,
    color: Colors.vouchGreen,
    textAlign: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.black,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  chip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    backgroundColor: Colors.white,
  },
  chipActive: {
    borderColor: Colors.vouchGreen,
    backgroundColor: Colors.vouchGreenLight,
  },
  chipText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.grey700,
  },
  chipTextActive: {
    color: Colors.vouchGreen,
  },
  errorText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.red,
    textAlign: "center",
    marginBottom: 16,
  },
  primaryBtn: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  primaryBtnDisabled: { opacity: 0.4 },
  primaryBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },

  // Success state
  successWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.vouchGreen,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 28,
    fontFamily: Fonts.extraBold,
    color: Colors.black,
  },
  successHint: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  roleBadge: {
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 16,
  },
  roleBadgeText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.vouchGreen,
  },
  doneBtn: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  doneBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
});
