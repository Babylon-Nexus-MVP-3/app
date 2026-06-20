import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  Platform,
  Share,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
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
  const [vouchesSent, setVouchesSent] = useState<number | null>(null);
  const [topAttributes, setTopAttributes] = useState<{ attr: string; count: number }[]>([]);
  const [cardModalVisible, setCardModalVisible] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0.85)).current;

  function openCardModal() {
    setCardModalVisible(true);
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.spring(cardAnim, { toValue: 1, useNativeDriver: true, bounciness: 6 }),
    ]).start();
  }

  function closeCardModal() {
    Animated.parallel([
      Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(cardAnim, { toValue: 0.85, duration: 160, useNativeDriver: true }),
    ]).start(() => setCardModalVisible(false));
  }

  async function handleShare() {
    if (!cardRef.current) return;
    setSharing(true);
    try {
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png" });
      } else {
        await Share.share({ url: uri });
      }
    } catch {}
    setSharing(false);
  }

  const initials =
    user?.name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  useFocusEffect(
    useCallback(() => {
      const abn = user?.abn;
      const fetches: Promise<void>[] = [
        fetchWithAuth(`${API_BASE_URL}/vouch/given`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => { if (d) setVouchesSent(d.vouches?.length ?? 0); }),
      ];
      if (abn) {
        fetches.push(
          fetchWithAuth(`${API_BASE_URL}/vouch/business/${abn}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((vd) => {
              if (!vd) return;
              setVouchCount(vd.vouchCount ?? 0);
              if (vd.attributes?.length) {
                setTopAttributes(vd.attributes.slice(0, 3));
              } else if (vd.attributeSummary) {
                setTopAttributes(
                  vd.attributeSummary.split(" · ").filter(Boolean).map((attr: string) => ({ attr, count: 0 }))
                );
              }
            })
        );
      }
      Promise.all(fetches).catch(() => {});
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
        {/* VouchPay credential card — tap to expand */}
        <TouchableOpacity activeOpacity={0.9} onPress={openCardModal}>
          <View style={styles.vpCard}>
            <View style={styles.vpCardTop}>
              <AppText style={styles.vpWordmark}>VOUCHPAY</AppText>
              <Ionicons name="expand-outline" size={16} color="rgba(255,255,255,0.5)" />
            </View>
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
            <View style={styles.vpCardBottom}>
              <View style={styles.vpStat}>
                <AppText style={styles.vpStatLabel}>VOUCHES RECEIVED</AppText>
                <AppText style={styles.vpStatValue}>{vouchCount ?? 0}</AppText>
              </View>
            </View>
          </View>
        </TouchableOpacity>

        {/* Expanded profile card modal */}
        <Modal visible={cardModalVisible} transparent animationType="none" onRequestClose={closeCardModal}>
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: backdropAnim }]}>
            <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFillObject} />
            <View style={styles.modalBackdrop} />
          </Animated.View>
          <TouchableWithoutFeedback onPress={closeCardModal}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent} pointerEvents="box-none">
            <Animated.View style={{ transform: [{ scale: cardAnim }], opacity: backdropAnim, width: "100%" }}>
              {/* Card to capture */}
              <View ref={cardRef} style={styles.expandedCard} collapsable={false}>
                <View style={styles.vpCardTop}>
                  <Image
                    source={require("../../../assets/appIcon.png")}
                    style={styles.expandedLogo}
                  />
                  <Ionicons name="shield-checkmark" size={20} color={Colors.vouchGreen} />
                </View>

                <View style={styles.expandedIdentity}>
                  <AppText style={styles.expandedName}>{user?.name}</AppText>
                  {user?.businessName ? (
                    <AppText style={styles.expandedBusiness}>{user.businessName}</AppText>
                  ) : null}
                  {user?.businessTrade ? (
                    <AppText style={styles.expandedTrade}>{user.businessTrade}</AppText>
                  ) : null}
                  {displayAbn ? (
                    <AppText style={styles.expandedAbn}>ABN {displayAbn}</AppText>
                  ) : null}
                </View>

                <View style={styles.expandedStats}>
                  <View style={styles.expandedStat}>
                    <AppText style={styles.expandedStatValue}>{vouchCount ?? 0}</AppText>
                    <AppText style={styles.expandedStatLabel}>VOUCHES</AppText>
                  </View>
                  <View style={styles.expandedStatDivider} />
                  <View style={styles.expandedStat}>
                    <AppText style={styles.expandedStatValue}>{vouchesSent ?? 0}</AppText>
                    <AppText style={styles.expandedStatLabel}>VOUCHED</AppText>
                  </View>
                </View>

                {topAttributes.length > 0 && (
                  <View style={styles.expandedAttributes}>
                    <AppText style={styles.expandedAttributesLabel}>TOP VOUCHES</AppText>
                    <View style={styles.expandedAttributeChips}>
                      {topAttributes.map(({ attr, count }) => (
                        <View key={attr} style={styles.attributeChip}>
                          <AppText style={styles.attributeChipText}>{attr}</AppText>
                          {count > 0 && (
                            <View style={styles.attributeChipCount}>
                              <AppText style={styles.attributeChipCountText}>{count}</AppText>
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                )}
                <View style={styles.expandedDivider} />

                <View style={styles.taglineRow}>
                  <AppText style={styles.taglineBlack}>Stop losing money on bad jobs. </AppText>
                  <AppText style={styles.taglineGreen}>Work with people you trust.</AppText>
                </View>

                <View style={styles.nswRow}>
                  <View style={styles.nswLogoBox}>
                    <Image
                      source={require("../../../assets/nsw-government-logo.png")}
                      style={styles.nswLogo}
                    />
                  </View>
                  <View style={styles.nswTextBlock}>
                    <AppText style={styles.nswBacked}>Backed by NSW Government</AppText>
                    <AppText style={styles.nswGrant}>MVP Innovation Grant</AppText>
                  </View>
                </View>
              </View>

              {/* Share button — outside capture ref */}
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={handleShare}
                disabled={sharing}
                activeOpacity={0.85}
              >
                <Ionicons name="share-outline" size={20} color={Colors.vouchGreen} />
                <AppText style={styles.shareBtnText}>
                  {sharing ? "Preparing..." : "Share my VouchPay card"}
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity onPress={closeCardModal} style={styles.closeHint}>
                <AppText style={styles.closeHintText}>Tap outside to close</AppText>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        {/* Credentials */}
        <AppText style={styles.sectionLabel}>CREDENTIALS</AppText>
        <View style={styles.credCard}>
          {/* Email */}
          <TouchableOpacity
            style={styles.credRow}
            onPress={() => router.push("/(app)/email-status" as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.credIcon, { backgroundColor: Colors.vouchGreenLight }]}>
              <Ionicons name="mail-outline" size={18} color={Colors.vouchGreen} />
            </View>
            <View style={styles.credBody}>
              <AppText style={styles.credTitle}>Email</AppText>
              <AppText style={styles.credValue}>{user?.email ?? "—"}</AppText>
            </View>
            <VerifiedBadge />
            <Ionicons name="chevron-forward" size={16} color={Colors.grey300} />
          </TouchableOpacity>

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
              <UnverifiedBadge label={displayMobile ? "Verify" : "Add"} />
            )}
            <Ionicons name="chevron-forward" size={16} color={Colors.grey300} />
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

  // Modal
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  modalContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  expandedCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    width: "100%",
    gap: 20,
  },
  expandedIdentity: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  expandedLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  expandedName: { fontSize: 22, fontFamily: Fonts.bold, color: Colors.black },
  expandedBusiness: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.grey700,
  },
  expandedTrade: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.grey500,
    marginTop: 1,
  },
  expandedAbn: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginTop: 2,
  },
  expandedAttributes: {
    gap: 8,
  },
  expandedAttributesLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
  },
  expandedAttributeChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  attributeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.vouchGreenLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.vouchGreen,
  },
  attributeChipText: {
    fontSize: 12,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
  attributeChipCount: {
    backgroundColor: Colors.vouchGreen,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  attributeChipCountText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  expandedStats: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.vouchGreenLight,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  expandedStat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  expandedStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.grey300,
  },
  expandedStatValue: {
    fontSize: 32,
    fontFamily: Fonts.extraBold,
    color: Colors.black,
  },
  expandedStatLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginTop: 14,
  },
  shareBtnText: {
    fontSize: 15,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },
  closeHint: {
    alignItems: "center",
    marginTop: 12,
    paddingVertical: 4,
  },
  closeHintText: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: "rgba(255,255,255,0.45)",
  },

  expandedDivider: {
    height: 1,
    backgroundColor: Colors.grey300,
  },

  taglineRow: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  taglineBlack: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.black,
    lineHeight: 20,
  },
  taglineGreen: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.vouchGreen,
    lineHeight: 20,
  },

  nswRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.offWhite,
    borderRadius: 12,
    padding: 12,
  },
  nswLogoBox: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 6,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.grey300,
  },
  nswLogo: {
    width: 44,
    height: 44,
    resizeMode: "contain",
  },
  nswTextBlock: { gap: 1 },
  nswBacked: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: Colors.black,
  },
  nswGrant: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
});
