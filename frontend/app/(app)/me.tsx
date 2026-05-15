import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

export default function MeScreen() {
  const { user, logout, fetchWithAuth } = useAuth();

  const initials = user?.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function handleSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
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

  function handleDeleteAccount() {
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <AppText style={styles.logo}>VOUCHPAY</AppText>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <AppText style={styles.avatarText}>{initials}</AppText>
        </View>
        <View style={styles.profileInfo}>
          <AppText style={styles.name}>{user?.name}</AppText>
          {user?.email ? <AppText style={styles.email}>{user.email}</AppText> : null}
          {user?.businessName ? (
            <AppText style={styles.businessName}>{user.businessName}</AppText>
          ) : null}
        </View>
      </View>

      <View style={styles.menu}>
        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push("/(app)/verify-mobile")}
          activeOpacity={0.75}
        >
          <Ionicons name="phone-portrait-outline" size={20} color={Colors.grey500} />
          <View style={styles.menuRowContent}>
            <AppText style={styles.menuRowText}>Mobile Number</AppText>
            {user?.mobile ? (
              <AppText style={styles.menuRowSub}>
                {`0${user.mobile.replace(/^\+61/, "").replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3")}`}
              </AppText>
            ) : null}
          </View>
          {user?.mobileVerified ? (
            <Ionicons name="checkmark-circle" size={20} color={Colors.vouchGreen} />
          ) : (
            <>
              {!user?.mobileVerified && (
                <View style={styles.verifyBadge}>
                  <AppText style={styles.verifyBadgeText}>
                    {user?.mobile ? "Verify" : "Add"}
                  </AppText>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color={Colors.grey300} />
            </>
          )}
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuRow}
          onPress={() => router.push("/(app)/add-abn")}
          activeOpacity={0.75}
        >
          <Ionicons name="business-outline" size={20} color={Colors.grey500} />
          <View style={styles.menuRowContent}>
            <AppText style={styles.menuRowText}>ABN</AppText>
            {user?.abn ? (
              <AppText style={styles.menuRowSub}>
                {user.abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4")}
              </AppText>
            ) : null}
          </View>
          {!user?.abn && (
            <View style={styles.verifyBadge}>
              <AppText style={styles.verifyBadgeText}>Add</AppText>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={Colors.grey300} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

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
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.85}>
          <AppText style={styles.signOutText}>Sign Out</AppText>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteAccount}
          activeOpacity={0.75}
        >
          <Ionicons name="trash-outline" size={15} color={Colors.red} />
          <AppText style={styles.deleteText}>Delete Account</AppText>
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
    paddingTop: 8,
    paddingBottom: 20,
  },
  logo: {
    fontSize: 20,
    fontFamily: Fonts.extraBold,
    color: Colors.vouchGreen,
    letterSpacing: 1,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginHorizontal: 24,
    padding: 20,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.grey300,
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
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  businessName: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginTop: 2,
  },
  menu: {
    marginHorizontal: 24,
    marginTop: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.grey300,
  },
  menuDivider: {
    height: 1,
    backgroundColor: Colors.grey300,
    marginHorizontal: 16,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  menuRowContent: {
    flex: 1,
  },
  menuRowText: {
    fontSize: 15,
    fontFamily: Fonts.medium,
    color: Colors.black,
  },
  menuRowSub: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginTop: 2,
  },
  verifyBadge: {
    backgroundColor: Colors.amberBg,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 4,
  },
  verifyBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.amber,
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 24,
    right: 24,
    gap: 12,
  },
  signOutButton: {
    backgroundColor: Colors.vouchGreen,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: "center",
  },
  signOutText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.bold,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.red,
  },
  deleteText: {
    color: Colors.red,
    fontSize: 14,
    fontFamily: Fonts.semiBold,
  },
});
