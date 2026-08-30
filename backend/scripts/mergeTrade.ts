/**
 * One-off migration: collapse three trade fields into one, and repair business
 * names that were typed rather than looked up.
 *
 * Trade used to live in three places that drifted apart, so different screens
 * showed different answers for the same person:
 *
 *   vouchprofiles.trade      free text from the old wizard step 1
 *   vouchprofiles.tradeType  a licence class picked in step 2
 *   users.businessTrade      the copy the Me card reads
 *
 * `users.businessTrade` is now the only one. This folds the other two into it
 * in precedence order — tradeType, then trade, then whatever businessTrade
 * already held — and then unsets both profile-level copies.
 *
 * tradeType wins because it was picked from a fixed list on the licence step,
 * which is a more deliberate answer than free text typed into a box. A legacy
 * `trade` is only used when it matches one of TRADE_TYPES case-insensitively;
 * anything else (a business name, a typo) loses to whatever businessTrade holds,
 * and if that is empty too the user is asked once on their next visit.
 *
 * The second half repairs users.businessName. It was an editable box on sign-up
 * prefilled from the ABR, so people typed over it and stored a trade or a
 * nickname as their business name. The server now derives it from the ABN; this
 * backfills the records created before that. Each repair costs one ABR call, so
 * it is throttled and off by default — pass --fix-business-names.
 *
 * Idempotent. Run with:
 *   npm run migrate:merge-trade                        dry run, trade only
 *   npm run migrate:merge-trade -- --apply             write
 *   npm run migrate:merge-trade -- --fix-business-names --apply
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { businessNameForAbn } from "../src/service/abr.service";

dotenv.config();

const APPLY = process.argv.includes("--apply");
const FIX_BUSINESS_NAMES = process.argv.includes("--fix-business-names");

// Mirrors frontend/constants/trades.ts. Kept as its own copy so this script has
// no cross-package import; if the list changes there, change it here too.
const TRADE_TYPES = [
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
];

function matchTradeType(legacy: unknown): string {
  if (typeof legacy !== "string" || !legacy.trim()) return "";
  const needle = legacy.trim().toLowerCase();
  return TRADE_TYPES.find((t) => t.toLowerCase() === needle) ?? "";
}

/*
  Folds the two profile-level trade copies onto users.businessTrade, then unsets
  them so there is only one field left.
*/
async function collapseTrade(db: mongoose.mongo.Db): Promise<void> {
  const profiles = db.collection("vouchprofiles");
  const users = db.collection("users");
  const cursor = profiles.find({
    $or: [{ trade: { $exists: true } }, { tradeType: { $exists: true } }],
  });

  let seen = 0;
  let userUpdates = 0;
  let unset = 0;
  const changes: string[] = [];
  const stillBlank: string[] = [];

  for await (const doc of cursor) {
    seen += 1;
    const user = await users.findOne(
      { _id: new mongoose.Types.ObjectId(String(doc.userId)) },
      { projection: { businessTrade: 1, email: 1 } }
    );

    const current = typeof user?.businessTrade === "string" ? user.businessTrade.trim() : "";
    // Precedence: the fixed-list pick beats free text, which beats whatever the
    // mirror already held. A free-text value only counts if it maps to an option.
    const resolved = String(doc.tradeType ?? "").trim() || matchTradeType(doc.trade) || current;

    if (user && resolved && resolved !== current) {
      if (changes.length < 20) {
        changes.push(`${user.email}: "${current || "(empty)"}" -> "${resolved}"`);
      }
      if (APPLY) {
        await users.updateOne({ _id: user._id }, { $set: { businessTrade: resolved } });
      }
      userUpdates += 1;
    }

    if (user && !resolved && stillBlank.length < 20) {
      stillBlank.push(`${user.email}: trade "${doc.trade ?? ""}" matched no option`);
    }

    if (APPLY) {
      await profiles.updateOne({ _id: doc._id }, { $unset: { trade: "", tradeType: "" } });
    }
    unset += 1;
  }

  console.log(`vouchprofiles with a trade copy: ${seen}`);
  console.log(`  users.businessTrade: ${userUpdates} ${APPLY ? "updated" : "would update"}`);
  changes.forEach((c) => console.log(`      ${c}`));
  console.log(`  profile copies: ${unset} ${APPLY ? "unset" : "would unset"}`);
  if (stillBlank.length) {
    console.log(`  ${stillBlank.length} left with no trade — they pick one on next visit:`);
    stillBlank.forEach((b) => console.log(`      ${b}`));
  }
}

/*
  Fills blank users.businessName values from the ABR.

  Only blanks. A name already stored is the user's own answer about what they
  trade as, and the ABR cannot contradict it — trading under an unregistered
  name is normal, and an individual's entity name comes back as
  "SURNAME, GIVEN", which would replace a perfectly good business name with a
  backwards personal one.

  One HTTP call per user, so it is sequential with a small delay rather than
  parallel — this is a background fill, not something anyone is waiting on, and
  the ABR is a shared public service.
*/
async function fillBlankBusinessNames(db: mongoose.mongo.Db): Promise<void> {
  const users = db.collection("users");
  const cursor = users.find(
    {
      abn: { $exists: true, $nin: ["", null] },
      $or: [{ businessName: { $exists: false } }, { businessName: "" }, { businessName: null }],
    },
    { projection: { abn: 1, email: 1 } }
  );

  let blank = 0;
  let filled = 0;
  let unreachable = 0;
  const fills: string[] = [];

  for await (const user of cursor) {
    blank += 1;
    const registered = await businessNameForAbn(String(user.abn));
    if (!registered) {
      unreachable += 1;
      continue;
    }

    filled += 1;
    if (fills.length < 30) fills.push(`${user.email}: (empty) -> "${registered}"`);
    if (APPLY) {
      await users.updateOne({ _id: user._id }, { $set: { businessName: registered } });
    }
    await new Promise((r) => setTimeout(r, 250));
  }

  console.log(`users with an ABN and no business name: ${blank}`);
  console.log(`  businessName: ${filled} ${APPLY ? "filled" : "would fill"}`);
  fills.forEach((f) => console.log(`      ${f}`));
  if (unreachable) console.log(`  ${unreachable} skipped — ABR could not answer`);
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database handle");

  console.log(APPLY ? "APPLYING changes" : "DRY RUN — pass --apply to write");
  await collapseTrade(db);
  if (FIX_BUSINESS_NAMES) {
    await fillBlankBusinessNames(db);
  } else {
    console.log("businessName fill skipped — pass --fix-business-names to include it");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
