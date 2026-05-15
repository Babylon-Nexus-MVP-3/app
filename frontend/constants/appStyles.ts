import { StyleSheet } from "react-native";
import { Colors } from "./colors";
import { Fonts } from "./fonts";

/** Shared styles for app & admin list/detail screens. */
export const appStyles = StyleSheet.create({
  // ─── Root ───────────────────────────────────────────────
  screen: {
    flex: 1,
    backgroundColor: Colors.grey100,
  },

  // ─── Green header bar ───────────────────────────────────
  header: {
    backgroundColor: Colors.vouchGreen,
    paddingBottom: 20,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerBadge: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    fontFamily: Fonts.semiBold,
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: Fonts.extraBold,
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  headerIconBtn: {
    padding: 4,
    minWidth: 36,
    alignItems: "center",
    justifyContent: "center",
  },

  // ─── Stat chips (on green header) ───────────────────────
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
  },
  statChip: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    minHeight: 88,
    justifyContent: "space-between",
  },
  statChipAlert: {
    backgroundColor: "rgba(231,76,60,0.28)",
  },
  statChipLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.6)",
    fontFamily: Fonts.semiBold,
    letterSpacing: 0.5,
    lineHeight: 14,
  },
  statChipNum: {
    fontSize: 22,
    fontFamily: Fonts.extraBold,
    color: Colors.white,
    lineHeight: 26,
    marginTop: 6,
  },
  statChipSuffix: {
    fontSize: 11,
    fontFamily: Fonts.regular,
    color: "rgba(255,255,255,0.55)",
    marginBottom: 1,
  },

  // ─── Back button (on green header) ──────────────────────
  headerBackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    minWidth: 44,
    alignSelf: "flex-start",
  },
  headerBackLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontFamily: Fonts.semiBold,
  },

  // ─── Body / list ────────────────────────────────────────
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 11,
    color: Colors.grey500,
    fontFamily: Fonts.bold,
    letterSpacing: 1.5,
    marginBottom: 14,
  },

  // ─── Cards ──────────────────────────────────────────────
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
  },

  // ─── Buttons ────────────────────────────────────────────
  primaryBtn: {
    height: 54,
    backgroundColor: Colors.vouchGreen,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  primaryBtnDisabled: {
    opacity: 0.45,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  outlineBtn: {
    height: 44,
    borderWidth: 1.5,
    borderColor: Colors.vouchGreen,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  outlineBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: Colors.vouchGreen,
  },

  // ─── Badges ─────────────────────────────────────────────
  roleBadge: {
    borderWidth: 1,
    borderColor: Colors.vouchGreen,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleBadgeText: {
    fontSize: 11,
    color: Colors.vouchGreen,
    fontFamily: Fonts.semiBold,
  },
  overdueBadge: {
    backgroundColor: Colors.redBg,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  overdueBadgeText: {
    fontSize: 11,
    color: Colors.red,
    fontFamily: Fonts.semiBold,
  },

  // ─── State: empty / error / loading ─────────────────────
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.red,
    textAlign: "center",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    textAlign: "center",
    marginTop: 32,
    paddingHorizontal: 16,
    lineHeight: 20,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: Colors.vouchGreen,
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryBtnText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.vouchGreen,
  },

  // ─── Form inputs (used in forms within app screens) ──────
  fieldLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.grey700,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  textInput: {
    height: 52,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: Fonts.regular,
    marginBottom: 20,
    backgroundColor: Colors.white,
    color: Colors.black,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputNoMargin: {
    marginBottom: 0,
  },
  inputPadRight: {
    paddingRight: 48,
  },
  eyeButton: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },

  // ─── Option chip row (yes/no/n/a selectors) ──────────────
  optionRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  optionChip: {
    flex: 1,
    height: 44,
    borderWidth: 1.5,
    borderColor: Colors.grey300,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
  },
  optionChipActive: {
    borderColor: Colors.vouchGreen,
    backgroundColor: Colors.vouchGreenLight,
  },
  optionChipText: {
    fontSize: 14,
    fontFamily: Fonts.semiBold,
    color: Colors.grey500,
  },
  optionChipTextActive: {
    color: Colors.vouchGreen,
  },

  // ─── Section divider (in forms) ─────────────────────────
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.grey100,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: Colors.black,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginBottom: 20,
    lineHeight: 18,
  },
});
