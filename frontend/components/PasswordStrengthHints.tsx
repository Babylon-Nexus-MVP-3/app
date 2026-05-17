import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";

const RULES = [
  { label: "At least 12 characters", test: (p: string) => p.length >= 12 },
  { label: "Uppercase letter (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Lowercase letter (a–z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "Number (0–9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "Special character (!@#$ …)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function PasswordStrengthHints({ password }: { password: string }) {
  if (!password) return null;
  return (
    <View style={styles.container}>
      {RULES.map(({ label, test }) => {
        const met = test(password);
        return (
          <View key={label} style={styles.row}>
            {met ? (
              <Ionicons name="checkmark-circle" size={14} color={Colors.vouchGreen} />
            ) : (
              <Ionicons name="ellipse-outline" size={14} color={Colors.grey300} />
            )}
            <AppText style={[styles.label, met && styles.labelMet]}>{label}</AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 5,
    marginTop: -10,
    marginBottom: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  label: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  labelMet: {
    color: Colors.vouchGreen,
    fontFamily: Fonts.medium,
  },
});
