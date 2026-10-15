/*
  The fixed vocabularies the vouch flow accepts, enforced server-side.

  The app offers these as pick-lists, but a pick-list is only a suggestion to
  anyone calling the API directly — without these checks a vouch could carry
  any string as an "attribute" (including negative ones the product promises
  never exist) and a profile any text as a trade.

  Both lists mirror the frontend: VOUCH_ATTRIBUTES is ATTRIBUTES in
  frontend/app/(app)/give-vouch/attributes.tsx, TRADE_TYPES is
  frontend/constants/trades.ts. Adding to a list is safe — stored values are
  never re-validated — but add to both, or the app offers an option the server
  refuses.
*/

export const VOUCH_ATTRIBUTES = [
  "Pays on time",
  "Turns up on time",
  "Quality work",
  "Reliable",
  "Safety first",
  "Professional",
  "Good communication",
  "Fair pricing",
  "Honest",
  "Knows their trade",
  "Solves problems",
  "Tidy work site",
  "No surprises",
  "Easy to deal with",
  "Fast turnaround",
  "Work with again",
] as const;

/** The only "minimum 2" rule in the product: attributes per vouch. */
export const MIN_VOUCH_ATTRIBUTES = 2;

export const TRADE_TYPES = [
  "Builder",
  "Carpentry",
  "Electrical",
  "Plumbing",
  "Concreting",
  "Bricklaying",
  "Roofing",
  "Painting",
  "Plastering",
  "Tiling",
  "Waterproofing",
  "Air conditioning & refrigeration",
  "Landscaping",
  "Glazing",
  "Demolition",
  "Other",
] as const;

/** An ABN as stored: exactly 11 digits, no spaces. */
export function isAbn(value: unknown): value is string {
  return typeof value === "string" && /^\d{11}$/.test(value);
}

/*
  Returns the attributes de-duplicated, or null when the selection is not a
  valid vouch: not an array, a value outside the fixed list, or fewer than the
  minimum once duplicates are removed (["Honest", "Honest"] is one attribute).
*/
export function normaliseVouchAttributes(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const allowed: readonly string[] = VOUCH_ATTRIBUTES;
  if (!value.every((v) => typeof v === "string" && allowed.includes(v))) return null;
  const unique = [...new Set(value as string[])];
  return unique.length >= MIN_VOUCH_ATTRIBUTES ? unique : null;
}

export function isTradeType(value: unknown): value is string {
  return typeof value === "string" && (TRADE_TYPES as readonly string[]).includes(value);
}

/*
  Length caps on the free-text fields. Generous next to anything the app's
  inputs produce; they exist so a direct API call can't park megabytes in a
  document that is then rendered into other people's inboxes and emails.
*/
export const TEXT_LIMITS = {
  name: 100,
  company: 200,
  email: 254,
  relationship: 100,
  project: 200,
  note: 1000,
} as const;

/** Shape check only — deliverability is the email provider's problem. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** True for undefined/null, or a string no longer than `max` once trimmed. */
export function isOptionalText(value: unknown, max: number): boolean {
  return value == null || (typeof value === "string" && value.trim().length <= max);
}

/*
  Returns an error message for a submitted reference, or null when it is fine.
  Relationship stays free text rather than an enum: the frontend's options
  have changed over time, and the full saved list is re-sent on every save,
  so an enum would start rejecting people for references they added months ago.
*/
export function referenceProblem(ref: unknown): string | null {
  if (typeof ref !== "object" || ref === null || Array.isArray(ref)) {
    return "Invalid reference details";
  }
  const r = ref as Record<string, unknown>;
  const fits =
    isOptionalText(r.firstName, TEXT_LIMITS.name) &&
    isOptionalText(r.lastName, TEXT_LIMITS.name) &&
    isOptionalText(r.company, TEXT_LIMITS.company) &&
    isOptionalText(r.mobile, 20) &&
    isOptionalText(r.email, TEXT_LIMITS.email) &&
    isOptionalText(r.relationship, TEXT_LIMITS.relationship) &&
    isOptionalText(r.project, TEXT_LIMITS.project);
  if (!fits) return "Invalid reference details";
  if (typeof r.email === "string" && r.email.trim() && !EMAIL_SHAPE.test(r.email.trim())) {
    return `"${r.email.trim()}" isn't a valid email address.`;
  }
  return null;
}

/** Most references a profile may carry, so the request loop stays bounded. */
export const MAX_REFERENCES = 50;
