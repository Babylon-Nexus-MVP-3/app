/**
 * Person names are stored as two fields — firstName and lastName — everywhere in
 * the app. A single free-text "full name" box was ambiguous: we had no reliable
 * way to tell which word was the surname, and the sign-up screen used to paper
 * over that by writing a literal "-" as the last name for anyone who typed a
 * single word.
 *
 * Business names (User.businessName, GivenVouch.toBusinessName, a reference's
 * company) are NOT people and stay as one field.
 */

/** Display form of a person's name. Safe when either half is missing. */
export function fullName(firstName?: string | null, lastName?: string | null): string {
  return [firstName?.trim(), lastName?.trim()].filter(Boolean).join(" ");
}

/**
 * Best-effort split of a legacy single-field name. Only for migrating stored
 * data and reading documents written before the split — never for handling new
 * input, which arrives already separated.
 *
 * First word is the first name, the remainder is the surname, so
 * "Mary Anne Van Der Berg" → { firstName: "Mary", lastName: "Anne Van Der Berg" }.
 */
export function splitLegacyName(name?: string | null): { firstName: string; lastName: string } {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  const [first, ...rest] = parts;
  // Legacy rows carry a literal "-" where the old sign-up screen had no surname.
  const last = rest.join(" ");
  return { firstName: first, lastName: last === "-" ? "" : last };
}
