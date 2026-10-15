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
