import express, { Request, Response } from "express";
import { abrLookupLimiter } from "../middleware";
import { lookupAbn, AbrCancelledError, AbrNotFoundError } from "../service/abr.service";

export const abrRouter = express.Router();

// ABR Lookup via the free ABN Lookup JSON API
// Requires ABR_GUID env var (register at https://abr.business.gov.au/Tools/WebServices)
// Falls back to mock in dev/test so the signup form works before the key is set up.
abrRouter.get("/lookup", abrLookupLimiter, async (req: Request, res: Response) => {
  const abn = String(req.query.abn ?? "").replace(/\D/g, "");

  if (abn.length !== 11) {
    res.status(400).json({ error: "ABN must be 11 digits" });
    return;
  }

  try {
    res.status(200).json(await lookupAbn(abn));
  } catch (err) {
    if (err instanceof AbrCancelledError) {
      res.status(410).json({ error: "ABN cancelled" });
      return;
    }
    if (err instanceof AbrNotFoundError) {
      res.status(404).json({ error: "ABN not found" });
      return;
    }
    res.status(503).json({ error: "ABR lookup temporarily unavailable" });
  }
});

abrRouter.get("/search", abrLookupLimiter, async (req: Request, res: Response) => {
  const name = String(req.query.name ?? "").trim();

  if (name.length < 3) {
    res.status(400).json({ error: "Name must be at least 3 characters" });
    return;
  }

  const guid = process.env.ABR_GUID;

  if (!guid) {
    // Dev/test fallback — return plausible mocks so UI works without a real key
    res.status(200).json({ results: buildSearchMock(name) });
    return;
  }

  try {
    const encodedName = encodeURIComponent(name);
    const url = `https://abr.business.gov.au/json/MatchingNames.aspx?name=${encodedName}&guid=${guid}`;
    const upstream = await fetch(url);
    if (!upstream.ok) throw new Error("ABR upstream error");

    const text = await upstream.text();
    const jsonStr = text.replace(/^[^(]+\(/, "").replace(/\)\s*$/, "");
    const raw = JSON.parse(jsonStr);

    const names: Array<{
      Abn: string;
      Name: string;
      State: string;
      Postcode: string;
      Score: number;
    }> = raw.Names ?? [];

    const results = names.slice(0, 10).map((entry) => ({
      abn: entry.Abn,
      entityName: entry.Name,
      state: entry.State,
    }));

    res.status(200).json({ results });
  } catch {
    res.status(503).json({ error: "ABR search temporarily unavailable" });
  }
});

function buildSearchMock(name: string): Array<{ abn: string; entityName: string; state: string }> {
  return [
    { abn: "12345678901", entityName: `${name} Pty Ltd`, state: "NSW" },
    { abn: "98765432101", entityName: `${name} Group Pty Ltd`, state: "VIC" },
    { abn: "11223344556", entityName: `${name} Services Pty Ltd`, state: "QLD" },
    { abn: "55667788990", entityName: `${name} & Associates`, state: "WA" },
  ];
}
