/*
  Client-side mirrors of the backend's validation rules.

  These MUST stay in step with `backend/src/utils/authHelper.ts` — the server is
  the authority and rejects anything that slips through. They live here so that
  every screen enforces and displays the same rule; previously each screen wrote
  its own, and the reset-password screen only checked length, letting users
  submit a password the server would refuse without ever warning them.
*/

// ── Email ────────────────────────────────────────────────────────────────────

// RFC 5321 caps the whole address at 254 characters. Mirrors validateEmailFormat.
export const EMAIL_MAX_LENGTH = 254;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  return trimmed.length <= EMAIL_MAX_LENGTH && EMAIL_RE.test(trimmed);
}

// ── Password ─────────────────────────────────────────────────────────────────

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 50;

// The backend requires length plus at least 3 of the 4 complexity rules, so the
// complexity rules are listed separately from the length rule that is mandatory.
export const PASSWORD_COMPLEXITY_REQUIRED = 3;

export interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_LENGTH_RULE: PasswordRule = {
  label: `At least ${PASSWORD_MIN_LENGTH} characters`,
  test: (p) => p.length >= PASSWORD_MIN_LENGTH,
};

export const PASSWORD_COMPLEXITY_RULES: PasswordRule[] = [
  { label: "Uppercase letter (A–Z)", test: (p) => /[A-Z]/.test(p) },
  { label: "Lowercase letter (a–z)", test: (p) => /[a-z]/.test(p) },
  { label: "Number (0–9)", test: (p) => /[0-9]/.test(p) },
  { label: "Special character (!@#$ …)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function countPasswordComplexity(password: string): number {
  return PASSWORD_COMPLEXITY_RULES.filter((rule) => rule.test(password)).length;
}

export function isValidPassword(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH &&
    countPasswordComplexity(password) >= PASSWORD_COMPLEXITY_REQUIRED
  );
}
