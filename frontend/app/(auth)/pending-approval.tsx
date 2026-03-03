import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";

export default function PendingApproval() {
  return (
    <LinearGradient
      colors={[Colors.navy, Colors.navyLight]}
      style={styles.gradient}
    >
      <View style={styles.container}>
        <View style={styles.iconWrapper}>
          <Text style={styles.icon}>⏳</Text>
        </View>

        <Text style={styles.title}>Request Submitted</Text>
        <Text style={styles.subtitle}>
          Pending admin approval. You'll be notified once approved.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace("/")}
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Back to Welcome</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "rgba(201,168,76,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  icon: {
    fontSize: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.white,
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  button: {
    height: 48,
    paddingHorizontal: 32,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.navy,
  },
});
