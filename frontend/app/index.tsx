import { FontAwesome } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";

export default function Index() {
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
          {/* Logo icon */}
          <View style={styles.iconWrapper}>
            <FontAwesome name="university" size={40} color={Colors.goldLight} />
          </View>

          {/* App name */}
          <Text style={styles.appName}>BABYLON</Text>
          <Text style={styles.appSubtitle}>NEXUS</Text>
          <View style={styles.divider} />

          {/* Tagline */}
          <Text style={styles.tagline}>
            See the health of your project.{"\n"}Payment transparency for construction.
          </Text>
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
  iconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 20,
    backgroundColor: Colors.navyIcon,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  appName: {
    fontSize: 34,
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: 4,
    marginBottom: 6,
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.goldLight,
    letterSpacing: 6,
    marginBottom: 10,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: Colors.gold,
    marginBottom: 24,
  },
  tagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    lineHeight: 22,
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
