import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import {
  PASSWORD_COMPLEXITY_REQUIRED,
  PASSWORD_COMPLEXITY_RULES,
  PASSWORD_LENGTH_RULE,
  countPasswordComplexity,
} from "@/lib/validation";

export function PasswordStrengthHints({ password }: { password: string }) {
  if (!password) return null;

  // The server wants the length rule plus any 3 of the 4 complexity rules.
  // Listing all five as flat requirements used to imply all five were needed.
  const complexityMet = countPasswordComplexity(password);
  const rules = [
    PASSWORD_LENGTH_RULE,
    {
      label: `Any ${PASSWORD_COMPLEXITY_REQUIRED} of: uppercase, lowercase, number, special character (${complexityMet}/${PASSWORD_COMPLEXITY_REQUIRED})`,
      test: () => complexityMet >= PASSWORD_COMPLEXITY_REQUIRED,
    },
  ];

  return (
    <View style={styles.container}>
      {rules.map(({ label, test }) => {
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
      <View style={styles.subRules}>
        {PASSWORD_COMPLEXITY_RULES.map(({ label, test }) => {
          const met = test(password);
          return (
            <AppText key={label} style={[styles.subLabel, met && styles.labelMet]}>
              {met ? "· " : "· "}
              {label}
            </AppText>
          );
        })}
      </View>
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
  subRules: {
    paddingLeft: 21,
    gap: 2,
  },
  subLabel: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
});
