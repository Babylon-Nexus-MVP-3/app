/**
 * One-off migration: collapse the two trade fields into one.
 *
 * Trade used to be asked twice — free text as `vouchprofiles.trade` in wizard
 * step 1, and as the licence class `vouchprofiles.tradeType` in step 2. The two
 * answers drifted, so the Me card and the wizard could show different trades for
 * the same person. `tradeType` is now the only field the app collects or reads.
 *
 *   vouchprofiles.trade  -> vouchprofiles.tradeType   (when tradeType is empty)
 *   vouchprofiles.tradeType -> users.businessTrade    (the copy screens read)
 *
 * A legacy `trade` is free text, so it is only carried over when it matches one
 * of TRADE_TYPES case-insensitively. Anything else is left for the user to pick
 * again — a select cannot render a value that is not one of its options, and a
 * blank that looks like a bug is worse than one question.
 *
 * `users.businessTrade` is only filled where it is empty. Where it already holds
 * something that disagrees with tradeType, the disagreement is reported and left
 * alone: that is the very drift this merge is about, and which of the two the
 * user meant is not ours to guess. Re-run with --prefer-trade-type to overwrite
 * those once you have looked at the list.
 *
 * Idempotent, and leaves `trade` in place rather than unsetting it, so a
 * rollback to the previous build still works. Drop the field in a follow-up once
 * the new build is confirmed live.
 *
 * Run with:  npm run migrate:merge-trade        (add --apply to write)
 */
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const APPLY = process.argv.includes("--apply");
const PREFER_TRADE_TYPE = process.argv.includes("--prefer-trade-type");

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

/** Step 1: fill an empty tradeType from the retired free-text trade. */
async function fillTradeType(db: mongoose.mongo.Db): Promise<void> {
  const coll = db.collection("vouchprofiles");
  const cursor = coll.find({
    trade: { $exists: true, $nin: ["", null] },
    $or: [{ tradeType: { $exists: false } }, { tradeType: "" }],
  });

  let seen = 0;
  let written = 0;
  const unmatched: string[] = [];

  for await (const doc of cursor) {
    seen += 1;
    const matched = matchTradeType(doc.trade);
    if (!matched) {
      if (unmatched.length < 10) unmatched.push(String(doc.trade));
      continue;
    }
    if (APPLY) await coll.updateOne({ _id: doc._id }, { $set: { tradeType: matched } });
    written += 1;
  }

  console.log(
    `vouchprofiles.trade -> tradeType: ${seen} candidates, ${written} ${APPLY ? "updated" : "would update"}`
  );
  if (unmatched.length) {
    console.log(`    ${unmatched.length}+ free-text values matched no option, left for the user:`);
    unmatched.forEach((u) => console.log(`      "${u}"`));
  }
}

/** Step 2: mirror tradeType onto the User record every screen reads. */
async function syncBusinessTrade(db: mongoose.mongo.Db): Promise<void> {
  const profiles = db.collection("vouchprofiles");
  const users = db.collection("users");
  const cursor = profiles.find({ tradeType: { $exists: true, $nin: ["", null] } });

  let filled = 0;
  let overwritten = 0;
  const conflicts: string[] = [];

  for await (const doc of cursor) {
    const tradeType = String(doc.tradeType);
    const user = await users.findOne(
      { _id: new mongoose.Types.ObjectId(String(doc.userId)) },
      { projection: { businessTrade: 1, email: 1 } }
    );
    if (!user) continue;

    const current = typeof user.businessTrade === "string" ? user.businessTrade.trim() : "";
    if (current === tradeType) continue;

    if (current && !PREFER_TRADE_TYPE) {
      if (conflicts.length < 20) {
        conflicts.push(`${user.email}: businessTrade "${current}" vs tradeType "${tradeType}"`);
      }
      continue;
    }

    if (APPLY) {
      await users.updateOne({ _id: user._id }, { $set: { businessTrade: tradeType } });
    }
    if (current) overwritten += 1;
    else filled += 1;
  }

  console.log(
    `users.businessTrade: ${filled} empty ${APPLY ? "filled" : "would fill"}, ` +
      `${overwritten} conflicting ${APPLY ? "overwritten" : "would overwrite"}`
  );
  if (conflicts.length) {
    console.log(
      `    ${conflicts.length} disagree and were left alone — re-run with --prefer-trade-type to take tradeType:`
    );
    conflicts.forEach((c) => console.log(`      ${c}`));
  }
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database handle");

  console.log(APPLY ? "APPLYING changes" : "DRY RUN — pass --apply to write");
  if (PREFER_TRADE_TYPE) console.log("Conflicts will be resolved in favour of tradeType");
  await fillTradeType(db);
  await syncBusinessTrade(db);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
