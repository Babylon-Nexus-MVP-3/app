import { View, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";

export default function ProjectLocked() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <AppText style={styles.headerTitle}>NEW PROJECT</AppText>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconWrap}>
          <Ionicons name="lock-closed-outline" size={44} color={Colors.grey500} />
        </View>

        <AppText style={styles.title}>Project health is locked</AppText>
        <AppText style={styles.subtitle}>
          You need at least 2 people to vouch for you before you can create and manage a project.
        </AppText>

        <View style={styles.stepsCard}>
          <AppText style={styles.stepsHeading}>How to unlock</AppText>

          <View style={styles.step}>
            <View style={styles.stepNum}>
              <AppText style={styles.stepNumText}>1</AppText>
            </View>
            <AppText style={styles.stepText}>Complete your Vouch Profile on the home screen</AppText>
          </View>

          <View style={styles.step}>
            <View style={styles.stepNum}>
              <AppText style={styles.stepNumText}>2</AppText>
            </View>
            <AppText style={styles.stepText}>
              Request a vouch from two people you've worked with
            </AppText>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepNum, styles.stepNumGreen]}>
              <AppText style={[styles.stepNumText, styles.stepNumTextGreen]}>3</AppText>
            </View>
            <AppText style={styles.stepText}>
              Once 2 vouches are confirmed, you can create your project
            </AppText>
          </View>
        </View>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.push("/(app)/get-vouched")}
          activeOpacity={0.85}
        >
          <Ionicons name="shield-checkmark-outline" size={18} color={Colors.white} />
          <AppText style={styles.primaryBtnText}>Get Vouched</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <AppText style={styles.secondaryBtnText}>Back to Projects</AppText>
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
    color: Colors.black,
    letterSpacing: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: "center",
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.beige,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.black,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  stepsCard: {
    backgroundColor: Colors.offWhite,
    borderRadius: 16,
    padding: 20,
    width: "100%",
    gap: 16,
    marginBottom: 32,
  },
  stepsHeading: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.black,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.grey300,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumGreen: {
    backgroundColor: Colors.vouchGreenLight,
  },
  stepNumText: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.grey700,
  },
  stepNumTextGreen: {
    color: Colors.vouchGreen,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.black,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    marginBottom: 12,
  },
  primaryBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.bold,
  },
  secondaryBtn: {
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.grey500,
  },
});
