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

  // Brand
  gold: "#C9A84C",
  goldLight: "#E8D5A0",

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
} as const;

export type ColorKey = keyof typeof Colors;
