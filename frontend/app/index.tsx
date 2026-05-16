import { useEffect } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
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

  if (isLoading || user) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AppText style={styles.wordmark}>VOUCHPAY</AppText>
        <AppText style={styles.tagline}>TRUST PLATFORM · CONSTRUCTION</AppText>
      </View>

      <View style={styles.body}>
        <AppText style={styles.heading}>{"Sign up so it\ndoesn't happen\nto you."}</AppText>

        <View style={styles.statCard}>
          <AppText style={styles.statNumber}>3,490</AppText>
          <AppText style={styles.statLabel}>collapses</AppText>
          <AppText style={styles.statSub}>Australian construction · FY24</AppText>
        </View>

        <View style={styles.statCard}>
          <AppText style={styles.statNumber}>A$3B+</AppText>
          <AppText style={styles.statLabel}>lost</AppText>
          <AppText style={styles.statSub}>by subbies, every year</AppText>
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.signInButton}
          onPress={() => router.push("/(auth)/sign-in")}
          activeOpacity={0.85}
        >
          <AppText style={styles.signInButtonText}>Sign in</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signUpButton}
          onPress={() => router.push("/(auth)/sign-up")}
          activeOpacity={0.85}
        >
          <AppText style={styles.signUpText}>Sign up</AppText>
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
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  wordmark: {
    fontSize: 28,
    fontFamily: Fonts.extraBold,
    color: Colors.vouchGreen,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: Colors.grey700,
    letterSpacing: 0.5,
    marginTop: 3,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 12,
  },
  heading: {
    fontSize: 32,
    fontFamily: Fonts.extraBold,
    color: Colors.black,
    lineHeight: 40,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: Colors.redBg,
    borderRadius: 12,
    padding: 16,
  },
  statNumber: {
    fontSize: 28,
    fontFamily: Fonts.extraBold,
    color: Colors.red,
    lineHeight: 32,
  },
  statLabel: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.red,
  },
  statSub: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 16,
  },
  signUpButton: {
    height: 54,
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  signUpText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  signInButton: {
    height: 54,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  signInButtonText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.vouchGreen,
  },
});
