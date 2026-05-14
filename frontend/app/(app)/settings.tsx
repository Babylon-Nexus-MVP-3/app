import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { appStyles } from "@/constants/appStyles";
import { AppText } from "@/components/AppText";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

export default function Settings() {
  const { user, logout, fetchWithAuth } = useAuth();

  function handleLogoutPress() {
    Alert.alert("Sign out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/");
        },
      },
    ]);
  }

  function handleDeleteAccountPress() {
    Alert.alert(
      "Delete Account",
      "Your account will be deactivated immediately and permanently deleted after 30 days. You can reactivate it any time within that period by signing back in.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Deactivate", style: "destructive", onPress: confirmDeleteAccount },
      ]
    );
  }

  async function confirmDeleteAccount() {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/auth/delete-account`, { method: "DELETE" });
      if (!res.ok) {
        const text = await res.text();
        let data: { error?: string } = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = {};
        }
        Alert.alert("Error", data.error ?? text ?? "Failed to delete account. Please try again.");
        return;
      }
      await logout();
      router.replace("/");
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  }

  const initials = user?.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={appStyles.screen}>
      <View style={[appStyles.header, styles.headerTaller]}>
        <SafeAreaView edges={["top"]}>
          <AppText style={styles.headerTitle}>Settings</AppText>
        </SafeAreaView>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <AppText style={styles.avatarText}>{initials}</AppText>
        </View>
        <View style={styles.profileInfo}>
          <AppText style={styles.name}>{user?.name}</AppText>
          <AppText style={styles.email}>{user?.email}</AppText>
        </View>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push("/(app)/change-password" as any)}
          activeOpacity={0.75}
        >
          <Ionicons name="lock-closed-outline" size={20} color={Colors.grey500} />
          <AppText style={styles.menuRowText}>Change Password</AppText>
          <Ionicons name="chevron-forward" size={18} color={Colors.grey300} />
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={handleLogoutPress}
          activeOpacity={0.85}
        >
          <AppText style={styles.signOutText}>Sign Out</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDeleteAccountPress}
          activeOpacity={0.75}
        >
          <Ionicons name="trash-outline" size={15} color={Colors.red} />
          <AppText style={styles.deleteBtnText}>Delete Account</AppText>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerTaller: {
    paddingBottom: 48,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: Colors.white,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  profileCard: {
    marginHorizontal: 20,
    marginTop: -32,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.vouchGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    color: Colors.grey500,
    fontFamily: Fonts.medium,
  },
  menu: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: Colors.white,
    borderRadius: 14,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuRowText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.black,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 20,
    right: 20,
    gap: 12,
  },
  signOutBtn: {
    backgroundColor: Colors.red,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: "center",
  },
  signOutText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.red,
  },
  deleteBtnText: {
    color: Colors.red,
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
});
