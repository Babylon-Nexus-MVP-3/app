import { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { captureRef } from "react-native-view-shot";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { Colors } from "@/constants/colors";
import { Fonts } from "@/constants/fonts";
import { AppText } from "@/components/AppText";
import { Pill, SectionLabel } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { API_BASE_URL } from "@/constants/api";

function VerifiedBadge() {
  return <Pill label="Verified" tone="green" icon="checkmark-circle" />;
}

function UnverifiedBadge({ label }: { label: string }) {
  return <Pill label={label} tone="amber" />;
}

type ProjectHistoryEntry = {
  id: string;
  name: string;
  council?: string;
  location?: string;
  status: string;
  role?: string;
  startedAt: string;
};

function formatStarted(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export default function MeScreen() {
  const { user, logout, fetchWithAuth } = useAuth();
  const [vouchCount, setVouchCount] = useState<number | null>(null);
  const [vouchesSent, setVouchesSent] = useState<number | null>(null);
  const [topAttributes, setTopAttributes] = useState<{ attr: string; count: number }[]>([]);
  const [projectHistory, setProjectHistory] = useState<ProjectHistoryEntry[]>([]);
  const [hasLicence, setHasLicence] = useState(false);
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

  useFocusEffect(
    useCallback(() => {
      const abn = user?.abn;
      const fetches: Promise<void>[] = [
        fetchWithAuth(`${API_BASE_URL}/vouch/given`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d) setVouchesSent(d.vouches?.length ?? 0);
          }),
        fetchWithAuth(`${API_BASE_URL}/projects/history`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d) setProjectHistory(d.projects ?? []);
          }),
        fetchWithAuth(`${API_BASE_URL}/vouch/profile/me`)
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => {
            if (d) setHasLicence(!!d.idNumber);
          }),
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
                  vd.attributeSummary
                    .split(" · ")
                    .filter(Boolean)
                    .map((attr: string) => ({ attr, count: 0 }))
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

  // Same rule the rest of the app gates giving a vouch on.
  const profileVerified = !!(user?.name && user?.abn && user?.businessTrade && hasLicence);

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
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Green band the credential card sits across — the card is the one
            piece of identity on this screen, so nothing above repeats it. */}
        <View style={styles.band}>
          {/* The band scrolls with the content, so dragging past the top would
              otherwise expose the scroll view's white background above it.
              This extends the green upward beyond the bounce. */}
          <View style={styles.bandOverscroll} pointerEvents="none" />
          <AppText style={styles.bandTitle}>Me</AppText>
        </View>

        <View style={styles.cardWrap}>
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={openCardModal}
            accessibilityRole="button"
            accessibilityLabel="Open your shareable VouchPay card"
          >
            {/* Lit surface and a cast shadow so it sits on the page as an
                object rather than a panel. */}
            <View style={styles.cardShadow}>
              <LinearGradient
                colors={["#FFFFFF", "#F2F5F3"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
              >
                {/* Specular sheen — a diagonal band of light across the face. */}
                <LinearGradient
                  colors={["rgba(255,255,255,0)", "rgba(255,255,255,0.75)", "rgba(255,255,255,0)"]}
                  locations={[0.25, 0.45, 0.7]}
                  start={{ x: 0, y: 1 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                  pointerEvents="none"
                />

                <View style={styles.cardTop}>
                  <AppText style={styles.cardWordmark}>VouchPay</AppText>
                  {profileVerified ? (
                    <Pill label="Verified" tone="green" icon="shield-checkmark" />
                  ) : (
                    <Pill label="Unverified" tone="amber" />
                  )}
                </View>

                <View style={styles.cardNumberBlock}>
                  <AppText style={styles.cardNumberLabel}>ABN</AppText>
                  <AppText style={styles.cardNumber}>{displayAbn ?? "— — — —"}</AppText>
                </View>

                <View style={styles.cardBottom}>
                  <View style={{ flex: 1 }}>
                    <AppText style={styles.cardHolder} numberOfLines={1}>
                      {user?.name?.toUpperCase()}
                    </AppText>
                    {user?.businessName ? (
                      <AppText style={styles.cardBusiness} numberOfLines={1}>
                        {user.businessName}
                      </AppText>
                    ) : null}
                  </View>
                  {user?.businessTrade ? (
                    <AppText style={styles.cardTrade}>{user.businessTrade.toUpperCase()}</AppText>
                  ) : null}
                </View>
              </LinearGradient>
            </View>
          </TouchableOpacity>

          {/* Stats sit below the card — a credential shows identity, not
              analytics, and this keeps the card at true card proportions. */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <AppText style={styles.statValue}>{vouchCount ?? 0}</AppText>
              <AppText style={styles.statLabel}>RECEIVED</AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <AppText style={styles.statValue}>{vouchesSent ?? 0}</AppText>
              <AppText style={styles.statLabel}>GIVEN</AppText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.stat}>
              <AppText style={styles.statValue}>{projectHistory.length}</AppText>
              <AppText style={styles.statLabel}>PROJECTS</AppText>
            </View>
          </View>

          <TouchableOpacity
            style={styles.shareHint}
            activeOpacity={0.75}
            onPress={openCardModal}
            accessibilityRole="button"
            accessibilityLabel="Open your shareable card"
          >
            <Ionicons name="share-outline" size={15} color={Colors.vouchGreen} />
            <AppText style={styles.shareHintText}>Open your shareable card</AppText>
            <Ionicons name="chevron-forward" size={15} color={Colors.vouchGreen} />
          </TouchableOpacity>
        </View>

        {/* Expanded profile card modal */}
        <Modal
          visible={cardModalVisible}
          transparent
          animationType="none"
          onRequestClose={closeCardModal}
        >
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: backdropAnim }]}>
            {Platform.OS === "ios" ? (
              <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFillObject} />
            ) : (
              <View style={styles.modalBackdropAndroid} />
            )}
          </Animated.View>
          <TouchableWithoutFeedback onPress={closeCardModal}>
            <View style={StyleSheet.absoluteFillObject} />
          </TouchableWithoutFeedback>

          <View style={styles.modalContent} pointerEvents="box-none">
            <Animated.View
              style={{ transform: [{ scale: cardAnim }], opacity: backdropAnim, width: "100%" }}
            >
              {/* Card to capture. Built as one designed object: a green
                  masthead the identity sits on, then the evidence below. */}
              <View ref={cardRef} style={styles.expandedCard} collapsable={false}>
                <View style={styles.expHeader}>
                  <View style={styles.expHeaderRow}>
                    <AppText style={styles.expWordmark}>VouchPay</AppText>
                    {profileVerified && (
                      <View style={styles.expVerified}>
                        <Ionicons name="shield-checkmark" size={13} color={Colors.white} />
                        <AppText style={styles.expVerifiedText}>VERIFIED</AppText>
                      </View>
                    )}
                  </View>

                  <AppText style={styles.expName} numberOfLines={2}>
                    {user?.name}
                  </AppText>
                  {user?.businessName ? (
                    <AppText style={styles.expBusiness} numberOfLines={1}>
                      {user.businessName}
                    </AppText>
                  ) : null}
                  <View style={styles.expMetaRow}>
                    {user?.businessTrade ? (
                      <AppText style={styles.expMeta}>{user.businessTrade}</AppText>
                    ) : null}
                    {user?.businessTrade && displayAbn ? <View style={styles.expMetaDot} /> : null}
                    {displayAbn ? <AppText style={styles.expMeta}>ABN {displayAbn}</AppText> : null}
                  </View>
                </View>

                <View style={styles.expBody}>
                  <View style={styles.expStats}>
                    <View style={styles.expStat}>
                      <AppText style={styles.expStatValue}>{vouchCount ?? 0}</AppText>
                      <AppText style={styles.expStatLabel}>VOUCHES RECEIVED</AppText>
                    </View>
                    <View style={styles.expStatDivider} />
                    <View style={styles.expStat}>
                      <AppText style={styles.expStatValue}>{vouchesSent ?? 0}</AppText>
                      <AppText style={styles.expStatLabel}>VOUCHES GIVEN</AppText>
                    </View>
                  </View>

                  {topAttributes.length > 0 && (
                    <View style={styles.expAttributes}>
                      <AppText style={styles.expSectionLabel}>WHAT PEOPLE SAY</AppText>
                      <View style={styles.expChips}>
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

                  <View style={styles.expFooter}>
                    <Image
                      source={require("../../../assets/nsw-government-logo.png")}
                      style={styles.expNswLogo}
                    />
                    <AppText style={styles.expFooterText}>
                      VouchPay is backed by the NSW Government MVP Innovation Grant.
                    </AppText>
                  </View>
                </View>
              </View>

              {/* Share button — outside capture ref */}
              <TouchableOpacity
                style={styles.shareBtn}
                onPress={handleShare}
                disabled={sharing}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={sharing ? "Preparing to share" : "Share my VouchPay card"}
                accessibilityState={{ disabled: sharing }}
              >
                <Ionicons name="share-outline" size={20} color={Colors.vouchGreen} />
                <AppText style={styles.shareBtnText}>
                  {sharing ? "Preparing..." : "Share my VouchPay card"}
                </AppText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={closeCardModal}
                style={styles.closeHint}
                accessibilityRole="button"
                accessibilityLabel="Close card"
              >
                <AppText style={styles.closeHintText}>Tap outside to close</AppText>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Modal>

        <View style={styles.sections}>
          {/* Project history — a timeline, because this is a record over time
            rather than a list of settings. */}
          <SectionLabel>Project history</SectionLabel>
          {projectHistory.length === 0 ? (
            <View style={styles.historyEmpty}>
              <Ionicons name="briefcase-outline" size={18} color={Colors.grey500} />
              <AppText style={styles.historyEmptyText}>
                Projects you join will appear here as you work.
              </AppText>
            </View>
          ) : (
            <View style={styles.timeline}>
              {projectHistory.map((p, i) => {
                const isLast = i === projectHistory.length - 1;
                return (
                  <View key={p.id} style={styles.timelineItem}>
                    <View style={styles.timelineRail}>
                      <View
                        style={[
                          styles.timelineDot,
                          p.status !== "Active" && styles.timelineDotPast,
                        ]}
                      />
                      {!isLast && <View style={styles.timelineLine} />}
                    </View>
                    <View style={[styles.timelineContent, isLast && { paddingBottom: 0 }]}>
                      <View style={styles.timelineHeadRow}>
                        <AppText style={styles.timelineName} numberOfLines={1}>
                          {p.name}
                        </AppText>
                        {p.status === "Active" && <Pill label="Active" tone="green" />}
                      </View>
                      <AppText style={styles.timelineMeta}>
                        {[p.role, p.council || p.location, formatStarted(p.startedAt)]
                          .filter(Boolean)
                          .join("  ·  ")}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Verification */}
          <SectionLabel>Verification</SectionLabel>
          <View style={styles.credCard}>
            {/* Email */}
            <TouchableOpacity
              style={styles.credRow}
              onPress={() => router.push("/(app)/email-status" as any)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Email, ${user?.email ?? "—"}, verified`}
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
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`Mobile, ${displayMobile ?? "Not added"}, ${user?.mobileVerified ? "verified" : displayMobile ? "tap to verify" : "tap to add"}`}
            >
              <View
                style={[
                  styles.credIcon,
                  {
                    backgroundColor: user?.mobileVerified ? Colors.vouchGreenLight : Colors.amberBg,
                  },
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
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityLabel="ABN, not added, tap to add"
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

          {/* Account */}
          <SectionLabel>Account</SectionLabel>
          <View style={styles.credCard}>
            <TouchableOpacity
              style={styles.credRow}
              onPress={() => router.push("/(app)/change-password" as any)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Change password"
            >
              <View style={[styles.credIcon, { backgroundColor: Colors.grey100 }]}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.grey700} />
              </View>
              <View style={styles.credBody}>
                <AppText style={styles.credTitle}>Change password</AppText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.grey500} />
            </TouchableOpacity>

            <View style={styles.credDivider} />

            <TouchableOpacity
              style={styles.credRow}
              onPress={() => router.push("/(app)/notifications")}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Notifications"
            >
              <View style={[styles.credIcon, { backgroundColor: Colors.grey100 }]}>
                <Ionicons name="notifications-outline" size={18} color={Colors.grey700} />
              </View>
              <View style={styles.credBody}>
                <AppText style={styles.credTitle}>Notifications</AppText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.grey500} />
            </TouchableOpacity>
          </View>

          {/* Sign out is an exit, not the main thing to do here — it reads as a
            quiet outline button rather than the page's primary action. */}
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.vouchGreen} />
            <AppText style={styles.signOutText}>Sign out</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteAccount}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Delete account"
          >
            <Ionicons name="trash-outline" size={15} color={Colors.red} />
            <AppText style={styles.deleteText}>Delete account</AppText>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Linking.openURL("mailto:support@vouchpay.app")}
            activeOpacity={0.75}
            style={styles.feedbackRow}
            accessibilityRole="button"
            accessibilityLabel="Email us at support@vouchpay.app"
          >
            <AppText style={styles.feedbackText}>Have feedback or suggestions? </AppText>
            <AppText style={styles.feedbackLink}>Email us</AppText>
            <AppText style={styles.feedbackEmail}>support@vouchpay.app</AppText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.vouchGreen },
  body: { flex: 1, backgroundColor: Colors.white },
  scroll: { paddingBottom: 56 },
  sections: { paddingHorizontal: 16 },

  // Green band behind the top of the card. Short on purpose — it exists to
  // give the card something to sit against, not to hold content.
  band: {
    backgroundColor: Colors.vouchGreen,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 64,
  },
  bandOverscroll: {
    position: "absolute",
    top: -600,
    left: 0,
    right: 0,
    height: 600,
    backgroundColor: Colors.vouchGreen,
  },
  bandTitle: {
    fontSize: 28,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },

  // The card straddles the band/body boundary. Extra bottom room because the
  // tilt and its cast shadow extend past the card's own box.
  cardWrap: { paddingHorizontal: 20, marginTop: -52, marginBottom: 30 },

  // Shadow lives on the outer view: the gradient face clips its own overflow,
  // and a real card casts light downward and slightly out.
  cardShadow: {
    shadowColor: "#0B2B1B",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 12,
    borderRadius: 18,
    backgroundColor: Colors.white,
  },
  card: {
    // Card-shaped but not locked to a ratio — a profile with no business name
    // or trade should produce a shorter card, not empty space.
    borderRadius: 18,
    padding: 20,
    gap: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardWordmark: {
    fontSize: 15,
    fontFamily: Fonts.extraBold,
    color: Colors.vouchGreen,
    letterSpacing: 1.2,
  },
  cardNumberBlock: { gap: 3 },
  cardNumberLabel: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 1.2,
  },
  cardNumber: {
    fontSize: 18,
    fontFamily: Fonts.semiBold,
    color: Colors.black,
    letterSpacing: 3,
  },
  cardBottom: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  cardHolder: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.black,
    letterSpacing: 1.1,
  },
  cardBusiness: {
    fontSize: 12,
    fontFamily: Fonts.regular,
    color: Colors.grey700,
    marginTop: 2,
  },
  cardTrade: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 1,
  },

  // Stats and share hint, below the card
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 26,
  },
  stat: { flex: 1, alignItems: "center", gap: 3 },
  statDivider: { width: 1, height: 30, backgroundColor: Colors.grey300 },
  statValue: { fontSize: 22, fontFamily: Fonts.extraBold, color: Colors.black },
  statLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
  },
  shareHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    backgroundColor: Colors.vouchGreenLight,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 20,
  },
  shareHintText: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.vouchGreen },

  // Timeline
  timeline: { marginTop: 2, marginBottom: 26 },
  timelineItem: { flexDirection: "row", gap: 14 },
  timelineRail: { width: 12, alignItems: "center" },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.vouchGreen,
    marginTop: 4,
  },
  timelineDotPast: { backgroundColor: Colors.grey300 },
  timelineLine: { flex: 1, width: 2, backgroundColor: Colors.grey100, marginVertical: 4 },
  timelineContent: { flex: 1, paddingBottom: 22 },
  timelineHeadRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  timelineName: { flex: 1, fontSize: 16, fontFamily: Fonts.bold, color: Colors.black },
  timelineMeta: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginTop: 3,
  },

  sectionLabel: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.8,
    marginTop: 8,
    marginBottom: -2,
  },

  historyEmpty: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.offWhite,
    borderRadius: 16,
    padding: 16,
    marginBottom: 26,
  },
  historyEmptyText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
  },
  credCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.grey300,
    overflow: "hidden",
    marginBottom: 26,
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 28,
    height: 54,
    marginTop: 14,
  },
  signOutText: { color: Colors.vouchGreen, fontSize: 16, fontFamily: Fonts.bold },

  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 50,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: Colors.red,
    marginTop: 14,
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
  modalBackdropAndroid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.72)",
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
    width: "100%",
    overflow: "hidden",
  },
  // Green masthead: identity reversed out of brand colour, so the shared image
  // is unmistakably a VouchPay credential at thumbnail size.
  expHeader: {
    backgroundColor: Colors.vouchGreen,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 24,
  },
  expHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  expWordmark: {
    fontSize: 15,
    fontFamily: Fonts.extraBold,
    color: Colors.white,
    letterSpacing: 1.2,
  },
  expVerified: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.whiteGloss,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  expVerifiedText: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.white,
    letterSpacing: 0.8,
  },
  expName: { fontSize: 26, fontFamily: Fonts.bold, color: Colors.white },
  expBusiness: {
    fontSize: 16,
    fontFamily: Fonts.regular,
    color: Colors.white,
    opacity: 0.9,
    marginTop: 3,
  },
  expMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  expMeta: {
    fontSize: 12,
    fontFamily: Fonts.medium,
    color: Colors.white,
    opacity: 0.75,
  },
  expMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.white,
    opacity: 0.5,
  },
  expBody: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    gap: 20,
  },
  expStats: { flexDirection: "row", alignItems: "center" },
  expStat: { flex: 1, alignItems: "center", gap: 4 },
  expStatDivider: { width: 1, height: 32, backgroundColor: Colors.grey100 },
  expStatValue: { fontSize: 24, fontFamily: Fonts.extraBold, color: Colors.black },
  expStatLabel: {
    fontSize: 9,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 0.6,
    textAlign: "center",
  },
  expAttributes: { gap: 8 },
  expSectionLabel: {
    fontSize: 10,
    fontFamily: Fonts.bold,
    color: Colors.grey500,
    letterSpacing: 1,
  },
  expChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  expFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.grey100,
    paddingTop: 16,
  },
  expNswLogo: { width: 30, height: 30, resizeMode: "contain" },
  expFooterText: {
    flex: 1,
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    lineHeight: 15,
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
    color: Colors.white,
  },
});
