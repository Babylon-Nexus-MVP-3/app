import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";

export default function VouchMyProjectScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>VOUCH MY PROJECT</Text>
        <TouchableOpacity hitSlop={8}>
          <Ionicons name="help-circle-outline" size={24} color={Colors.grey500} />
        </TouchableOpacity>
      </View>

      <View style={styles.scroll}>
        {/* Hero illustration */}
        <View style={styles.heroContainer}>
          <View style={styles.heroBigCircle}>
            <Ionicons name="radio-button-on-outline" size={38} color={Colors.amber} />
          </View>
          <View style={styles.heroLockBadge}>
            <Ionicons name="lock-closed-outline" size={14} color={Colors.black} />
          </View>
        </View>

        {/* Heading */}
        <Text style={styles.heading}>Your Score is locked.</Text>
        <Text style={styles.subheading}>Get paid on time through trust and{"\n"}transparency.</Text>

        {/* What your score will show */}
        <View style={styles.featureCard}>
          <Text style={styles.featureCardLabel}>WHAT YOUR SCORE WILL SHOW</Text>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="pulse-outline" size={20} color={Colors.amber} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Payment health on active projects</Text>
              <Text style={styles.featureDesc}>See how your project is flowing in real time.</Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="calendar-outline" size={20} color={Colors.amber} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.featureTitle}>Calendar view of Project Financial Health</Text>
              <Text style={styles.featureDesc}>Every claim, every due date, all in one place.</Text>
            </View>
          </View>
        </View>

        {/* Privacy card */}
        <View style={styles.privacyCard}>
          <Ionicons name="lock-closed-outline" size={18} color={Colors.vouchGreen} />
          <View style={styles.privacyText}>
            <Text style={styles.privacyTitle}>Amounts stay private</Text>
            <Text style={styles.privacyDesc}>
              Only you see invoice values. Vouch uses payment timing, not amounts.
            </Text>
          </View>
        </View>
      </View>

      {/* CTA */}
      <View style={styles.ctaContainer}>
        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.85}
          onPress={() => router.push("/(app)/projects")}
        >
          <Text style={styles.ctaText}>Set up my project →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.grey500,
    letterSpacing: 1,
  },
  scroll: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heroContainer: {
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    width: 84,
    height: 84,
  },
  heroBigCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.beige,
    alignItems: "center",
    justifyContent: "center",
  },
  heroLockBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    alignItems: "center",
    justifyContent: "center",
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.black,
    textAlign: "center",
    marginBottom: 10,
  },
  subheading: {
    fontSize: 15,
    color: Colors.grey700,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  featureCard: {
    width: "100%",
    backgroundColor: Colors.beige,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    gap: 16,
  },
  featureCardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.amber,
    letterSpacing: 0.8,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.black,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: Colors.grey700,
    lineHeight: 19,
  },
  privacyCard: {
    width: "100%",
    backgroundColor: Colors.vouchGreenLight,
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  privacyText: {
    flex: 1,
  },
  privacyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.black,
    marginBottom: 4,
  },
  privacyDesc: {
    fontSize: 13,
    color: Colors.grey700,
    lineHeight: 19,
  },
  ctaContainer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.grey300,
  },
  ctaButton: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
  },
  ctaText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.white,
  },
});
