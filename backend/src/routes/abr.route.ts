import express, { Request, Response } from "express";
import { abrLookupLimiter } from "../middleware";
import {
  lookupAbn,
  searchAbnByName,
  AbrCancelledError,
  AbrNotFoundError,
  type AbrSearchResult,
} from "../service/abr.service";

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
    res.status(200).json({ results: await searchAbnByName(name) });
  } catch {
    res.status(503).json({ error: "ABR search temporarily unavailable" });
  }
});

function buildSearchMock(name: string): AbrSearchResult[] {
  return [
    { abn: "12345678901", entityName: `${name} Pty Ltd`, state: "NSW" },
    { abn: "98765432101", entityName: `${name} Group Pty Ltd`, state: "VIC" },
    { abn: "11223344556", entityName: `${name} Services Pty Ltd`, state: "QLD" },
    { abn: "55667788990", entityName: `${name} & Associates`, state: "WA" },
  ];
}
