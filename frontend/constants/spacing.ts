/** 8pt spacing grid. Use these instead of raw numbers for padding, margin, and gap. */
export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 40,
  /** Between form fields / section rows */
  field: 20,
  /** Common list / chip gap */
  gap: 10,
} as const;

/** Shared border-radius values. */
export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  /** Full pill — buttons, chips */
  pill: 28,
} as const;

/** Fixed heights for interactive elements. */
export const Size = {
  /** Standard text input */
  input: 52,
  /** Primary action button */
  button: 54,
  /** OTP digit box */
  otpBox: 60,
  otpBoxWidth: 48,
} as const;
