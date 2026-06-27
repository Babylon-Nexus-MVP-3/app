export const Fonts = {
  regular: "DMSans_400Regular",
  medium: "DMSans_500Medium",
  semiBold: "DMSans_600SemiBold",
  bold: "DMSans_700Bold",
  extraBold: "DMSans_800ExtraBold",
} as const;

export const FontSizes = {
  badge: 10, // pill text, tiny status labels
  caption: 12, // timestamps, meta, helper text
  body: 14, // primary body text, list content
  label: 16, // field labels, section headers
  subtitle: 18, // card titles, screen subtitles
  title: 22, // screen titles, major headings
  display: 28, // hero numbers, OTP digits
} as const;
