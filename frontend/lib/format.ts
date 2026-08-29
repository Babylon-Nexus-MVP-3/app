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

// ── Person names ─────────────────────────────────────────────────────────────

/*
  People are stored as two fields, firstName and lastName, everywhere in the app
  and the database. A single free-text "full name" box gave us no reliable way to
  tell which word was the surname — sign-up used to split on the first space and
  write a literal "-" when someone typed a single word.

  Business names are not people and stay as one field.
*/

/** Display form of a person's name. Safe when either half is missing. */
export function fullName(firstName?: string | null, lastName?: string | null): string {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
}

/*
  Best-effort split of a legacy single-field name. Only for reading data written
  before names were split — never for handling new input, which arrives already
  separated. First word is the first name, the remainder is the surname.
*/
export function splitLegacyName(name?: string | null): { firstName: string; lastName: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  const [first, ...rest] = parts;
  // Legacy rows carry a literal "-" where the old sign-up screen had no surname.
  const last = rest.join(" ");
  return { firstName: first, lastName: last === "-" ? "" : last };
}

/** Up to two initials, e.g. "Jo Bloggs" → "JB". Falls back to one. */
export function initials(firstName?: string | null, lastName?: string | null): string {
  return [firstName?.trim()[0], lastName?.trim()[0]].filter(Boolean).join("").toUpperCase();
}
