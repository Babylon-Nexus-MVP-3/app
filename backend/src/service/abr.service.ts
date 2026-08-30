/*
  Australian Business Register lookups.

  This lives in a service rather than inline in the route because registration
  needs it too: `businessName` is derived from the ABN server-side, not taken
  from the request body. It used to be a free-text box the sign-up screen
  prefilled from the ABR and let the user type over, so accounts ended up with a
  trade or a nickname stored as their business name.

  ABR_GUID stays server-side — that is the whole reason the app proxies these
  calls rather than hitting the ABR directly.
*/

export interface AbrDetails {
  entityName: string;
  tradingName?: string;
  businessType: string;
  state: string;
  activeYears: number;
  isActive: true;
}

export class AbrUnavailableError extends Error {}
export class AbrNotFoundError extends Error {}
export class AbrCancelledError extends Error {}

/** Strips the ABR's JSONP wrapper: `callback({...})` -> `{...}`. */
function parseJsonp(text: string): Record<string, unknown> {
  return JSON.parse(text.replace(/^[^(]+\(/, "").replace(/\)\s*$/, ""));
}

/*
  Looks up an ABN and returns the registered details.

  Throws AbrUnavailableError when the ABR cannot be reached or no key is
  configured — callers decide whether that is fatal. It is deliberately not
  collapsed into "not found": a lookup failing because the ABR is down must not
  be reported to a user as an invalid ABN.
*/
export async function lookupAbn(abn: string): Promise<AbrDetails> {
  const digits = abn.replace(/\D/g, "");
  if (digits.length !== 11) throw new AbrNotFoundError("ABN must be 11 digits");

  const guid = process.env.ABR_GUID;
  if (!guid) throw new AbrUnavailableError("ABN lookup not configured");

  let raw: Record<string, unknown>;
  try {
    const url = `https://abn.business.gov.au/json/AbnDetails.aspx?abn=${digits}&guid=${guid}`;
    const upstream = await fetch(url);
    if (!upstream.ok) throw new Error("ABR upstream error");
    raw = parseJsonp(await upstream.text());
  } catch {
    throw new AbrUnavailableError("ABR lookup temporarily unavailable");
  }

  if (raw.AbnStatus === "Cancelled") throw new AbrCancelledError("ABN cancelled");
  if (raw.AbnStatus !== "Active") throw new AbrNotFoundError("ABN not found");

  const legal = raw.LegalName as { GivenName?: string; FamilyName?: string } | undefined;
  const entityName =
    (raw.EntityName as string) ||
    [legal?.GivenName, legal?.FamilyName].filter(Boolean).join(" ") ||
    "Unknown";

  const businessNames = raw.BusinessName as Array<{ OrganisationName?: string }> | undefined;
  const tradingName = businessNames?.[0]?.OrganisationName || undefined;

  const registeredDate = (raw.AbnStatusEffectiveFrom as string) ?? "";
  const startYear = registeredDate ? parseInt(registeredDate.slice(0, 4), 10) : null;
  const activeYears = startYear ? new Date().getFullYear() - startYear : 0;

  const address = raw.MainBusinessPhysicalAddress as Array<{ StateCode?: string }> | undefined;

  return {
    entityName,
    tradingName,
    businessType: (raw.EntityTypeName as string) ?? (raw.EntityTypeCode as string) ?? "Business",
    state: address?.[0]?.StateCode ?? "",
    activeYears,
    isActive: true,
  };
}

/*
  The name to store on a user for a given ABN.

  Trading name first — it is what a business actually operates as — falling back
  to the registered entity name. Returns null when the ABR cannot answer, so a
  caller can carry on without a business name rather than storing a guess.
*/
export async function businessNameForAbn(abn: string): Promise<string | null> {
  // Registration calls this, and the test suite registers users constantly —
  // without this guard every auth test would fire a live request at the ABR,
  // since jest loads the real .env (ABR_GUID and all). Same reasoning as the
  // NODE_ENV check that keeps onboarding email out of tests.
  if (process.env.NODE_ENV === "test") return null;

  try {
    const details = await lookupAbn(abn);
    return details.tradingName || details.entityName || null;
  } catch {
    return null;
  }
}
