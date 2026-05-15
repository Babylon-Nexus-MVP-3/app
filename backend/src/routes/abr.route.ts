import express, { Request, Response } from "express";

export const abrRouter = express.Router();

// ABR Lookup via the free ABN Lookup JSON API
// Requires ABR_GUID env var (register at https://abr.business.gov.au/Tools/WebServices)
// Falls back to mock in dev/test so the signup form works before the key is set up.
abrRouter.get("/lookup", async (req: Request, res: Response) => {
  const abn = String(req.query.abn ?? "").replace(/\D/g, "");

  if (abn.length !== 11) {
    res.status(400).json({ error: "ABN must be 11 digits" });
    return;
  }

  const guid = process.env.ABR_GUID;

  if (!guid) {
    // Dev/test fallback — return plausible mock so UI works without a real key
    res.status(200).json(buildMock(abn));
    return;
  }

  try {
    const url = `https://abn.business.gov.au/json/AbnDetails.aspx?abn=${abn}&guid=${guid}`;
    const upstream = await fetch(url);
    if (!upstream.ok) throw new Error("ABR upstream error");

    const raw = await upstream.json();

    // The ABR JSON API returns EntityTypeCode + EntityTypeName, main + trading names
    if (raw.AbnStatus !== "Active") {
      res.status(404).json({ error: "ABN is not active" });
      return;
    }

    const entityName: string =
      raw.EntityName ||
      [raw.LegalName?.GivenName, raw.LegalName?.FamilyName].filter(Boolean).join(" ") ||
      "Unknown";

    const tradingName: string | undefined = raw.BusinessName?.[0]?.OrganisationName || undefined;

    const registeredDate: string = raw.AbnStatusEffectiveFrom ?? "";
    const startYear = registeredDate ? parseInt(registeredDate.slice(0, 4), 10) : null;
    const activeYears = startYear ? new Date().getFullYear() - startYear : 0;

    const state: string = raw.MainBusinessPhysicalAddress?.[0]?.StateCode ?? "";

    res.status(200).json({
      entityName,
      tradingName,
      businessType: raw.EntityTypeName ?? raw.EntityTypeCode ?? "Business",
      state,
      activeYears,
      isActive: true,
    });
  } catch {
    res.status(404).json({ error: "ABN not found" });
  }
});

function buildMock(abn: string): {
  entityName: string;
  tradingName: string | undefined;
  businessType: string;
  state: string;
  activeYears: number;
  isActive: boolean;
} {
  return {
    entityName: `Business ${abn.slice(-4)} Pty Ltd`,
    tradingName: undefined,
    businessType: "Australian Private Company",
    state: "NSW",
    activeYears: 5,
    isActive: true,
  };
}
