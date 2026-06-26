import { View, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useAuth } from "@/context/AuthContext";

export default function EmailStatus() {
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>EMAIL ADDRESS</AppText>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="mail-outline" size={32} color={Colors.vouchGreen} />
        </View>

        <AppText style={styles.email}>{user?.email ?? "—"}</AppText>

        <View style={styles.statusRow}>
          <Ionicons name="checkmark-circle" size={18} color={Colors.vouchGreen} />
          <AppText style={styles.statusText}>Verified</AppText>
        </View>

        <View style={styles.divider} />

        <AppText style={styles.hint}>
          {
            "Want to use a different email? Tap below to change it — we'll send a confirmation code to"
          }
          your new address.
        </AppText>

        <TouchableOpacity
          style={styles.changeBtn}
          onPress={() => router.push("/(app)/change-email" as any)}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Change email address"
        >
          <AppText style={styles.changeBtnText}>Change email address</AppText>
        </TouchableOpacity>
      </View>
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
    color: Colors.grey500,
    letterSpacing: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 32,
    paddingTop: 48,
    gap: 16,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.vouchGreenLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  email: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.black,
    textAlign: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: Colors.grey300,
    marginVertical: 8,
  },
  hint: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textAlign: "center",
    lineHeight: 21,
  },
  changeBtn: {
    width: "100%",
    height: 54,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  changeBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
});
