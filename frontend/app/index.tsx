import { useEffect } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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
      <View style={styles.body}>
        <Image source={require("../assets/appIcon.png")} style={styles.logo} />

        <Text style={styles.headline}>
          <Text style={styles.headlineBlack}>Stop losing money on bad jobs. </Text>
          <Text style={styles.headlineGreen}>Work with people you trust.</Text>
        </Text>

        <View style={styles.nswRow}>
          <View style={styles.nswLogoBox}>
            <Image source={require("../assets/nsw-government-logo.png")} style={styles.nswLogo} />
          </View>
          <View style={styles.nswTextBlock}>
            <AppText style={styles.nswBacked}>Backed by NSW Government</AppText>
            <AppText style={styles.nswGrant}>MVP Innovation Grant</AppText>
          </View>
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
  body: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 32,
  },
  logo: {
    width: 110,
    height: 110,
    borderRadius: 22,
    alignSelf: "flex-start",
  },
  headline: {
    fontSize: 42,
    lineHeight: 52,
  },
  headlineBlack: {
    fontFamily: Fonts.extraBold,
    color: Colors.black,
  },
  headlineGreen: {
    fontFamily: Fonts.extraBold,
    color: Colors.vouchGreen,
  },
  nswRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  nswLogoBox: {
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 10,
    padding: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  nswLogo: {
    width: 72,
    height: 72,
    resizeMode: "contain",
  },
  nswTextBlock: {
    gap: 2,
  },
  nswBacked: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  nswGrant: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.black,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    gap: 16,
  },
  signUpButton: {
    height: 58,
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  signUpText: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  signInButton: {
    height: 58,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    alignItems: "center",
    justifyContent: "center",
  },
  signInButtonText: {
    fontSize: 17,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
});
