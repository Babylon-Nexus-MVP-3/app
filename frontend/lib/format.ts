/*
  Display formatters shared across screens.

  Each of these previously existed as two to five hand-rolled copies. They were
  identical when written and had already started to diverge in the details
  (which separator, whether "+61" was stripped, how partial input was grouped),
  so the same number could render differently on two screens.
*/

// ── ABN ──────────────────────────────────────────────────────────────────────

export const ABN_LENGTH = 11;

/** Digits only, capped at ABN length. */
export function abnDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, ABN_LENGTH);
}

/** "12345678901" → "12 345 678 901", formatting partial input as it's typed. */
export function formatAbn(raw: string): string {
  const d = abnDigits(raw);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 8) return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
}

// ── Australian mobile ────────────────────────────────────────────────────────

export const MOBILE_LENGTH = 10;

/** Digits only, capped at local mobile length — for feeding a text input. */
export function mobileDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, MOBILE_LENGTH);
}

/*
  Normalises however a number is stored to local 10-digit form.
  The backend stores "0XXXXXXXXX" but Twilio round-trips produce "+61XXXXXXXXX",
  so both shapes turn up in user records.
*/
export function toLocalMobile(raw: string): string {
  const withoutCountry = raw.replace(/^\+?61/, "");
  const digits = withoutCountry.replace(/\D/g, "");
  return digits.startsWith("0")
    ? digits.slice(0, MOBILE_LENGTH)
    : `0${digits}`.slice(0, MOBILE_LENGTH);
}

/** Groups local digits as "0412 345 678", formatting partial input as it's typed. */
export function formatMobileDisplay(digits: string): string {
  if (digits.length <= 4) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

/** Whatever is on the user record → "0412 345 678". */
export function formatStoredMobile(raw: string): string {
  return formatMobileDisplay(toLocalMobile(raw));
}
