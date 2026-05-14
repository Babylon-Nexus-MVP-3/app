import { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/roles";

export default function Index() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace(user.role === UserRole.Admin ? "/(admin)/projects" : "/(app)/home");
    }
  }, [isLoading, user]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>VOUCHPAY</Text>
        <Text style={styles.logoSub}>TRUST PLATFORM · CONSTRUCTION</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsSection}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>3,490</Text>
          <Text style={styles.statLabel}>collapses</Text>
          <Text style={styles.statSub}>Australian construction · FY24</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>A$3B+</Text>
          <Text style={styles.statLabel}>lost</Text>
          <Text style={styles.statSub}>by subbies, every year</Text>
        </View>
      </View>

      {/* Tagline */}
      <View style={styles.taglineSection}>
        <Text style={styles.tagline}>Sign up so it{"\n"}doesn't happen to you.</Text>
      </View>

      {/* Buttons */}
      <View style={styles.buttonSection}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push("/(auth)/sign-up")}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>Sign up — free</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/(auth)/sign-in")}
          activeOpacity={0.7}
        >
          <Text style={styles.signInLink}>Already on Vouch? Sign in</Text>
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
    justifyContent: "space-between",
    paddingBottom: 16,
  },
  header: {
    alignItems: "center",
    paddingTop: 32,
  },
  logo: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.vouchGreen,
    letterSpacing: 2,
  },
  logoSub: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.grey500,
    letterSpacing: 2,
    marginTop: 4,
  },
  statsSection: {
    gap: 12,
  },
  statCard: {
    backgroundColor: "#FDF0EE",
    borderRadius: 16,
    padding: 20,
  },
  statNumber: {
    fontSize: 36,
    fontWeight: "800",
    color: "#C0392B",
    lineHeight: 40,
  },
  statLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#C0392B",
  },
  statSub: {
    fontSize: 13,
    color: "#C0392B",
    opacity: 0.7,
    marginTop: 2,
  },
  taglineSection: {
    alignItems: "center",
  },
  tagline: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.black,
    textAlign: "center",
    lineHeight: 34,
  },
  buttonSection: {
    gap: 16,
    alignItems: "center",
  },
  primaryButton: {
    width: "100%",
    height: 54,
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  signInLink: {
    fontSize: 15,
    color: Colors.vouchGreen,
    fontWeight: "600",
  },
});
