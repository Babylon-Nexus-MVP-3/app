import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useWizard } from "./WizardContext";

const NEXT_STEPS = [
  "They confirm your relationship",
  "They vouch you in",
  "Apply for supplier credit in 1 tap",
];

export default function GetVouchedSuccess() {
  const { references } = useWizard();
  const ref1Name = references[0]?.name?.split(" ")[0] ?? "Your first reference";
  const ref2Name = references[1]?.name?.split(" ")[0] ?? "your second";

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.iconCircle}>
          <Ionicons name="send-outline" size={36} color={Colors.vouchGreen} />
        </View>

        <Text style={styles.title}>Vouch requests sent.</Text>
        <Text style={styles.subtitle}>
          {ref1Name} and {ref2Name} have been notified.
        </Text>

        {/* Profile status card */}
        <View style={styles.statusCard}>
          <Text style={styles.statusCardLabel}>YOUR PROFILE STATUS</Text>
          <Text style={styles.statusValue}>Pending vouches</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>
            <Text style={styles.progressCount}>0 / 2</Text>
          </View>
        </View>

        {/* What happens next */}
        <Text style={styles.nextLabel}>WHAT HAPPENS NEXT</Text>
        <View style={styles.nextList}>
          {NEXT_STEPS.map((step, i) => (
            <View key={i} style={styles.nextRow}>
              <View style={styles.nextCircle}>
                <Text style={styles.nextNum}>{i + 1}</Text>
              </View>
              <Text style={styles.nextText}>{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.outlineBtn}
          onPress={() => router.replace("/(app)/home")}
          activeOpacity={0.8}
        >
          <Text style={styles.outlineBtnText}>Done — back to home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  scroll: {
    paddingHorizontal: 28,
    paddingTop: 60,
    paddingBottom: 24,
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.vouchGreenLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.black,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.grey700,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 36,
  },

  // Status card
  statusCard: {
    width: "100%",
    backgroundColor: Colors.offWhite,
    borderRadius: 14,
    padding: 18,
    marginBottom: 36,
    gap: 8,
  },
  statusCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.grey500,
    letterSpacing: 0.8,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.black,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.grey300,
  },
  progressFill: {
    width: 0,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.vouchGreen,
  },
  progressCount: {
    fontSize: 13,
    color: Colors.grey500,
  },

  // What happens next
  nextLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.grey500,
    letterSpacing: 0.8,
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  nextList: { width: "100%", gap: 14 },
  nextRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  nextCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.vouchGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  nextNum: { fontSize: 14, fontWeight: "700", color: Colors.white },
  nextText: { flex: 1, fontSize: 15, color: Colors.black },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
  },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 28,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
  },
  outlineBtnText: {
    color: Colors.vouchGreen,
    fontSize: 16,
    fontWeight: "600",
  },
});
