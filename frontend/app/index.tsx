import { FontAwesome } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const NAVY = "#0D1B35";
const NAVY_LIGHT = "#112244";
const GOLD = "#C49A3C";
const GOLD_LIGHT = "#D4A853";
const WHITE = "#FFFFFF";
const GREY_TEXT = "#A0AABB";

export default function Index() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Background decorative circles */}
      <View style={styles.circleTopRight} />
      <View style={styles.circleTopRightInner} />

      {/* Main content */}
      <View style={styles.content}>
        {/* Logo icon */}
        <View style={styles.iconWrapper}>
          <FontAwesome name="university" size={40} color={GOLD_LIGHT} />
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
        <TouchableOpacity style={styles.signInButton}>
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.createAccountButton}>
          <Text style={styles.createAccountText}>Create Account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: NAVY,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  circleTopRight: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: NAVY_LIGHT,
    top: -100,
    right: -80,
    opacity: 0.6,
  },
  circleTopRightInner: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: NAVY_LIGHT,
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
    backgroundColor: "#17243E",
    borderWidth: 1.5,
    borderColor: GOLD,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  appName: {
    fontSize: 34,
    fontWeight: "800",
    color: WHITE,
    letterSpacing: 4,
    marginBottom: 6,
  },
  appSubtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: GOLD_LIGHT,
    letterSpacing: 6,
    marginBottom: 10,
  },
  divider: {
    width: 40,
    height: 2,
    backgroundColor: GOLD,
    marginBottom: 24,
  },
  tagline: {
    fontSize: 14,
    color: GREY_TEXT,
    textAlign: "center",
    lineHeight: 22,
  },
  buttonContainer: {
    paddingHorizontal: 32,
    gap: 14,
  },
  signInButton: {
    backgroundColor: GOLD,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
  },
  signInText: {
    color: "#1A1200",
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  createAccountButton: {
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: GOLD,
  },
  createAccountText: {
    color: GOLD_LIGHT,
    fontWeight: "700",
    fontSize: 16,
    letterSpacing: 0.5,
  },
});
