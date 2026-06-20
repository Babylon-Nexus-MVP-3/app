import { useCallback, useState } from "react";
import { Alert, Linking, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

function VerifiedBadge() {
  return (
    <View style={styles.verifiedBadge}>
      <Ionicons name="checkmark-circle" size={13} color={Colors.vouchGreen} />
      <AppText style={styles.verifiedBadgeText}>Verified</AppText>
    </View>
  );
}

function UnverifiedBadge({ label }: { label: string }) {
  return (
    <View style={styles.unverifiedBadge}>
      <AppText style={styles.unverifiedBadgeText}>{label}</AppText>
    </View>
  );
}

export default function MeScreen() {
  const { user, logout, fetchWithAuth } = useAuth();
  const [vouchCount, setVouchCount] = useState<number | null>(null);

  const initials =
    user?.name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  useFocusEffect(
    useCallback(() => {
      fetchWithAuth(`${API_BASE_URL}/auth/me`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          const abn = data?.user?.abn ?? user?.abn;
          if (!abn) return;
          return fetchWithAuth(`${API_BASE_URL}/vouch/business/${abn}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((vd) => {
              if (vd) setVouchCount(vd.vouchCount ?? 0);
            });
        })
        .catch(() => {});
    }, [fetchWithAuth, user?.abn])
  );

  async function handleSignOut() {
    if (Platform.OS === "web") {
      if (!window.confirm("Are you sure you want to sign out?")) return;
      await logout();
      router.replace("/");
    } else {
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
  }

  async function handleDeleteAccount() {
    const msg =
      "Your account will be deactivated immediately and permanently deleted after 30 days. You can reactivate it any time within that period by signing back in.";
    if (Platform.OS === "web") {
      if (!window.confirm(`Delete Account\n\n${msg}`)) return;
      await confirmDeleteAccount();
    } else {
      Alert.alert("Delete Account", msg, [
        { text: "Cancel", style: "cancel" },
        { text: "Deactivate", style: "destructive", onPress: confirmDeleteAccount },
      ]);
    }
  }

  async function confirmDeleteAccount() {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/auth/delete-account`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        Alert.alert("Error", data.error ?? "Failed to delete account. Please try again.");
        return;
      }
      await logout();
      router.replace("/");
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  }

  const displayMobile = user?.mobile
    ? (() => {
        const m = user.mobile.replace(/^\+61/, "");
        const digits = m.startsWith("0") ? m : `0${m}`;
        return digits.replace(/(\d{4})(\d{3})(\d{3})/, "$1 $2 $3");
      })()
    : null;

  const displayAbn = user?.abn
    ? user.abn.replace(/(\d{2})(\d{3})(\d{3})(\d{3})/, "$1 $2 $3 $4")
    : null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.scroll}>
        {/* VouchPay credential card */}
        <View style={styles.vpCard}>
          {/* Card top row */}
          <View style={styles.vpCardTop}>
            <AppText style={styles.vpWordmark}>VOUCHPAY</AppText>
            <Ionicons name="shield-checkmark" size={22} color="rgba(255,255,255,0.3)" />
          </View>

          {/* Avatar + name */}
          <View style={styles.vpIdentity}>
            <View style={styles.vpAvatar}>
              <AppText style={styles.vpAvatarText}>{initials}</AppText>
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={styles.vpName}>{user?.name}</AppText>
              {user?.businessName ? (
                <AppText style={styles.vpBusiness}>{user.businessName}</AppText>
              ) : null}
            </View>
          </View>

          {/* Bottom row — vouch count */}
          <TouchableOpacity
            style={styles.vpCardBottom}
            activeOpacity={0.75}
            onPress={() =>
              router.push({
                pathname: "/(app)/(tabs)/vouches",
                params: { tab: "received" },
              } as any)
            }
          >
            <View style={styles.vpStat}>
              <AppText style={styles.vpStatLabel}>VOUCHES RECEIVED</AppText>
              <AppText style={styles.vpStatValue}>{vouchCount ?? 0}</AppText>
            </View>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>

        {/* Credentials */}
        <AppText style={styles.sectionLabel}>CREDENTIALS</AppText>
        <View style={styles.credCard}>
          {/* Email */}
          <View style={styles.credRow}>
            <View style={[styles.credIcon, { backgroundColor: Colors.vouchGreenLight }]}>
              <Ionicons name="mail-outline" size={18} color={Colors.vouchGreen} />
            </View>
            <View style={styles.credBody}>
              <AppText style={styles.credTitle}>Email</AppText>
              <AppText style={styles.credValue}>{user?.email ?? "—"}</AppText>
            </View>
            <VerifiedBadge />
          </View>

          <View style={styles.credDivider} />

          {/* Mobile */}
          <TouchableOpacity
            style={styles.credRow}
            onPress={() =>
              router.push(
                user?.mobileVerified ? ("/(app)/mobile-status" as any) : "/(app)/verify-mobile"
              )
            }
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.credIcon,
                { backgroundColor: user?.mobileVerified ? Colors.vouchGreenLight : Colors.amberBg },
              ]}
            >
              <Ionicons
                name="phone-portrait-outline"
                size={18}
                color={user?.mobileVerified ? Colors.vouchGreen : Colors.amber}
              />
            </View>
            <View style={styles.credBody}>
              <AppText style={styles.credTitle}>Mobile</AppText>
              <AppText style={styles.credValue}>{displayMobile ?? "Not added"}</AppText>
            </View>
            {user?.mobileVerified ? (
              <VerifiedBadge />
            ) : (
              <>
                <UnverifiedBadge label={displayMobile ? "Verify" : "Add"} />
                <Ionicons name="chevron-forward" size={16} color={Colors.grey300} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.credDivider} />

          {/* ABN — display only if set (write-once), tappable only to add */}
          {user?.abn ? (
            <View style={styles.credRow}>
              <View style={[styles.credIcon, { backgroundColor: Colors.vouchGreenLight }]}>
                <Ionicons name="business-outline" size={18} color={Colors.vouchGreen} />
              </View>
              <View style={styles.credBody}>
                <AppText style={styles.credTitle}>ABN</AppText>
                <AppText style={styles.credValue}>{displayAbn}</AppText>
              </View>
              <VerifiedBadge />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.credRow}
              onPress={() => router.push("/(app)/add-abn")}
              activeOpacity={0.7}
            >
              <View style={[styles.credIcon, { backgroundColor: Colors.amberBg }]}>
                <Ionicons name="business-outline" size={18} color={Colors.amber} />
              </View>
              <View style={styles.credBody}>
                <AppText style={styles.credTitle}>ABN</AppText>
                <AppText style={styles.credValue}>Not added</AppText>
              </View>
              <UnverifiedBadge label="Add" />
              <Ionicons name="chevron-forward" size={16} color={Colors.grey300} />
            </TouchableOpacity>
          )}
        </View>

        {/* Settings */}
        <AppText style={styles.sectionLabel}>SETTINGS</AppText>
        <View style={styles.credCard}>
          <TouchableOpacity
            style={styles.credRow}
            onPress={() => router.push("/(app)/change-password" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.credIcon, { backgroundColor: Colors.offWhite }]}>
              <Ionicons name="lock-closed-outline" size={18} color={Colors.grey500} />
            </View>
            <View style={styles.credBody}>
              <AppText style={styles.credTitle}>Change Password</AppText>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.grey300} />
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <AppText style={styles.signOutText}>Sign Out</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={handleDeleteAccount}
          activeOpacity={0.75}
        >
          <Ionicons name="trash-outline" size={15} color={Colors.red} />
          <AppText style={styles.deleteText}>Delete Account</AppText>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => Linking.openURL("mailto:support@vouchpay.app")}
          activeOpacity={0.7}
          style={styles.feedbackRow}
        >
          <AppText style={styles.feedbackText}>Have feedback or suggestions? </AppText>
          <AppText style={styles.feedbackLink}>Email us</AppText>
          <AppText style={styles.feedbackEmail}>support@vouchpay.app</AppText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  scroll: { paddingHorizontal: 24, paddingBottom: 16, paddingTop: 12, gap: 8 },

  // VouchPay credential card
  vpCard: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  vpCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  vpWordmark: {
    fontSize: 16,
    fontFamily: Fonts.extraBold,
    color: Colors.white,
    letterSpacing: 1.5,
    opacity: 0.9,
  },
  vpIdentity: { flexDirection: "row", alignItems: "center", gap: 14 },
  vpAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.3)",
  },
  vpAvatarText: { fontSize: 20, fontFamily: Fonts.bold, color: Colors.white },
  vpName: { fontSize: 20, fontFamily: Fonts.bold, color: Colors.white },
  vpBusiness: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  vpCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 12,
  },
  vpStat: { flex: 1, gap: 2 },
  vpStatLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.8,
  },
  vpStatRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  vpStatValue: { fontSize: 28, fontFamily: Fonts.extraBold, color: Colors.white },

  sectionLabel: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: -2,
  },

  credCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.grey300,
    overflow: "hidden",
  },
  credDivider: { height: 1, backgroundColor: Colors.grey300, marginHorizontal: 16 },
  credRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  credIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  credBody: { flex: 1 },
  credTitle: { fontSize: 15, fontFamily: Fonts.semiBold, color: Colors.black },
  credValue: { fontSize: 14, fontFamily: Fonts.regular, color: Colors.grey500, marginTop: 1 },

  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.vouchGreenLight,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  verifiedBadgeText: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.vouchGreen },

  unverifiedBadge: {
    backgroundColor: Colors.amberBg,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  unverifiedBadgeText: { fontSize: 11, fontFamily: Fonts.bold, color: Colors.amber },

  signOutBtn: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  signOutText: { color: Colors.white, fontSize: 17, fontFamily: Fonts.bold },

  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 50,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.red,
  },
  deleteText: { color: Colors.red, fontSize: 15, fontFamily: Fonts.semiBold },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    marginTop: 8,
  },
  feedbackText: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.grey500 },
  feedbackLink: { fontSize: 13, fontFamily: Fonts.semiBold, color: Colors.vouchGreen },
  feedbackEmail: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    width: "100%",
    textAlign: "center",
    marginTop: 2,
  },
});
