import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import type { AbrResult } from "@/lib/useAbrLookup";

type Props = {
  abrResult: AbrResult | null;
  abrLoading: boolean;
  abrError: string;
};

export function AbrCard({ abrResult, abrLoading, abrError }: Props) {
  if (abrLoading) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={Colors.vouchGreen} />
        <AppText style={styles.loadingText}>Looking up ABN…</AppText>
      </View>
    );
  }
  if (abrResult) {
    return (
      <View style={styles.confirmed}>
        <Ionicons name="checkmark-circle" size={16} color={Colors.vouchGreen} />
        <AppText style={styles.confirmedText}>
          {abrResult.entityName}
          {abrResult.state ? ` · ${abrResult.state}` : ""}
          {abrResult.businessType ? ` · ${abrResult.businessType}` : ""}
        </AppText>
      </View>
    );
  }
  if (abrError) {
    return <AppText style={styles.error}>{abrError}</AppText>;
  }
  return null;
}

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  confirmed: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: Colors.vouchGreenLight,
    borderRadius: 10,
    padding: 10,
  },
  confirmedText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.vouchGreen,
    lineHeight: 18,
  },
  error: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.red,
  },
});
