import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { displayRole } from "@/components/project/helpers";

export default function Settings() {
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace("/");
  }

  const initials = user?.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Profile card */}
      <View style={styles.card}>
        <View style={styles.avatarWrapper}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <Text style={styles.name}>{user?.name}</Text>

        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{user ? displayRole(user.role) : ""}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>
      </View>

      {/* Sign out */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleLogout} activeOpacity={0.85}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.offWhite,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  card: {
    marginHorizontal: 20,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarWrapper: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.navyDeep,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.white,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 8,
  },
  rolePill: {
    backgroundColor: Colors.navyIcon,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 20,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.goldLight,
    letterSpacing: 0.4,
  },
  divider: {
    width: "100%",
    height: 1,
    backgroundColor: Colors.offWhite,
    marginBottom: 16,
  },
  infoRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: "500",
    flexShrink: 1,
    textAlign: "right",
    marginLeft: 12,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 20,
    right: 20,
  },
  signOutButton: {
    backgroundColor: Colors.red,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  signOutText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
});
