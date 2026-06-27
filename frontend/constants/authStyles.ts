import { StyleSheet } from "react-native";
import { Colors } from "./colors";
import { Fonts } from "./fonts";
import { Radius, Size, Spacing } from "./spacing";

/** Shared styles for all auth form screens. */
export const authStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: Spacing.xl,
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center",
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: Fonts.extraBold,
    color: Colors.black,
    marginBottom: Spacing.sm,
  },
  screenSubtitle: {
    fontSize: 15,
    fontFamily: Fonts.regular,
    color: Colors.grey500,
    marginBottom: 36,
  },
  fieldLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.black,
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  textInput: {
    height: Size.input,
    borderWidth: 1,
    borderColor: Colors.grey300,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    fontFamily: Fonts.regular,
    marginBottom: Spacing.field,
    backgroundColor: Colors.white,
    color: Colors.black,
  },
  inputWrapper: {
    marginBottom: Spacing.field,
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
  primaryButton: {
    height: Size.button,
    backgroundColor: Colors.vouchGreen,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: Colors.white,
  },
  errorText: {
    fontSize: 13,
    fontFamily: Fonts.semiBold,
    color: Colors.red,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
});
