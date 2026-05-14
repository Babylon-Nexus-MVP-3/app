/**
 * Design token colors.
 * Use these everywhere. Do not hardcode hex values in component files.
 */
export const Colors = {
  // Core backgrounds
  navy: "#1A1A2E",
  navyLight: "#16213E",
  navyDeep: "#0F3460", // third stop in welcome screen gradient
  navyIcon: "#17243E", // icon wrapper background
  offWhite: "#F8F9FA",
  white: "#FFFFFF",

  // Brand (legacy v2)
  gold: "#C9A84C",
  goldLight: "#E8D5A0",

  // v3 Brand
  vouchGreen: "#1B5C38",
  vouchGreenMid: "#2D7A4F",
  vouchGreenLight: "#E8F5EE",
  beige: "#F5EFE6",
  black: "#1A1A1A",
  grey100: "#F3F3F3",
  grey300: "#D1D1D1",
  grey500: "#9B9B9B",
  grey700: "#5A5A5A",

  // Text
  textPrimary: "#1A1A2E",
  textSecondary: "#6B7280",

  // Status: text / icon
  green: "#2ECC71",
  amber: "#F39C12",
  red: "#E74C3C",
  purple: "#9B59B6",
  grey: "#95A5A6",

  // Status: background tints
  greenBg: "#E8F8F0",
  amberBg: "#FEF5E7",
  redBg: "#FDECEB",
  purpleBg: "#F3E8F9",
  greyBg: "#F0F1F2",
  issuedBg: "#E8EAF0",
} as const;

export type ColorKey = keyof typeof Colors;
