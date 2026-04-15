import { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import BabylonLogo from "@/components/BabylonLogo";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types/roles";

export default function Index() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace(user.role === UserRole.Admin ? "/(admin)/projects" : "/(app)/projects");
    }
  }, [isLoading, user]);

  return (
    <LinearGradient
      colors={[Colors.navy, Colors.navyLight, Colors.navyDeep]}
      locations={[0, 0.6, 1]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.container}>
        {/* Background decorative circles */}
        <View style={styles.circleTopRight} />
        <View style={styles.circleTopRightInner} />

        {/* Main content */}
        <View style={styles.content}>
          {/* Logo */}
          <BabylonLogo width={250} height={350} />

          {/* Tagline */}
          <Text style={styles.tagline}>Payment Transparency App</Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => router.push("/(auth)/sign-in")}
            activeOpacity={0.85}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={() => router.push("/(auth)/sign-up")}
            activeOpacity={0.85}
          >
            <Text style={styles.createAccountText}>Create Account</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  circleTopRight: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: Colors.navyLight,
    top: -100,
    right: -80,
    opacity: 0.6,
  },
  circleTopRightInner: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: Colors.navyLight,
    top: -40,
    right: 20,
    opacity: 0.5,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  tagline: {
    fontSize: 20,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 16,
  },
  buttonContainer: {
    paddingHorizontal: 32,
    gap: 14,
  },
  signInButton: {
    height: 54,
    backgroundColor: Colors.gold,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  signInText: {
    color: Colors.navy,
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  createAccountButton: {
    height: 54,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
  createAccountText: {
    color: Colors.goldLight,
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
