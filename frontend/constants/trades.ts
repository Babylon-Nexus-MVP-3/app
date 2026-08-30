/*
  The trades a user can pick from.

  This is the app's single source of truth for what someone does. It used to be
  asked twice — a free-text "trade / business type" box in wizard step 1 and this
  fixed list as the licence class in step 2 — which let the Me card and the
  wizard show different answers for the same person. Step 1's box is gone; this
  list is the only question.

  "Other" keeps the list short without shutting anyone out.
*/
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

/*
  Maps a legacy free-text trade onto one of the options above.

  Profiles saved before the two fields were merged carry an arbitrary string.
  Anything that doesn't match an option is dropped rather than shown — a select
  rendering a value absent from its own list has nothing to highlight, and the
  user is better asked once than shown a blank that looks like a bug.
*/
export function matchTradeType(legacy: string | undefined | null): string {
  if (!legacy) return "";
  const needle = legacy.trim().toLowerCase();
  return TRADE_TYPES.find((t) => t.toLowerCase() === needle) ?? "";
}
