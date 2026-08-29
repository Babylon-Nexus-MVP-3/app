/**
 * One-off migration: split every stored single-field person name into
 * firstName + lastName.
 *
 *   users.name              -> firstName, lastName
 *   vouchprofiles.name      -> firstName, lastName
 *   vouchprofiles.references[].name -> firstName, lastName
 *   vouchrequests.fromName  -> fromFirstName, fromLastName
 *   givenvouches.recipientName -> recipientFirstName, recipientLastName
 *
 * Business names (businessName, toBusinessName, a reference's company) are
 * organisations, not people, and are deliberately left alone.
 *
 * Idempotent: a document that already has the split fields is skipped, so this
 * is safe to re-run. The legacy field is left in place rather than unset, so a
 * rollback to the previous build still works; drop them in a follow-up once the
 * new build is confirmed live.
 *
 * Run with:  npm run migrate:split-names        (add --apply to write)
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
import { splitLegacyName } from "../src/utils/name";

dotenv.config();

const APPLY = process.argv.includes("--apply");

type Target = {
  collection: string;
  /** Legacy single field -> the two fields it becomes. */
  from: string;
  first: string;
  last: string;
};

const TARGETS: Target[] = [
  { collection: "users", from: "name", first: "firstName", last: "lastName" },
  { collection: "vouchprofiles", from: "name", first: "firstName", last: "lastName" },
  {
    collection: "vouchrequests",
    from: "fromName",
    first: "fromFirstName",
    last: "fromLastName",
  },
  {
    collection: "givenvouches",
    from: "recipientName",
    first: "recipientFirstName",
    last: "recipientLastName",
  },
];

async function migrateTarget(db: mongoose.mongo.Db, t: Target): Promise<void> {
  const coll = db.collection(t.collection);
  const cursor = coll.find({
    [t.from]: { $exists: true, $ne: "" },
    $or: [{ [t.first]: { $exists: false } }, { [t.first]: "" }],
  });

  let seen = 0;
  let written = 0;
  const samples: string[] = [];

  for await (const doc of cursor) {
    seen += 1;
    const { firstName, lastName } = splitLegacyName(doc[t.from] as string);
    if (!firstName) continue;
    if (samples.length < 5) {
      samples.push(`"${doc[t.from]}" -> "${firstName}" | "${lastName}"`);
    }
    if (APPLY) {
      await coll.updateOne({ _id: doc._id }, { $set: { [t.first]: firstName, [t.last]: lastName } });
    }
    written += 1;
  }

  console.log(`${t.collection}.${t.from}: ${seen} to migrate, ${written} ${APPLY ? "updated" : "would update"}`);
  samples.forEach((s) => console.log(`    ${s}`));
}

/** References live in an array, so they need their own pass. */
async function migrateReferences(db: mongoose.mongo.Db): Promise<void> {
  const coll = db.collection("vouchprofiles");
  const cursor = coll.find({ "references.name": { $exists: true } });

  let written = 0;
  for await (const doc of cursor) {
    const refs = (doc.references ?? []) as Record<string, unknown>[];
    let changed = false;
    const next = refs.map((r) => {
      if (r.firstName || !r.name) return r;
      const { firstName, lastName } = splitLegacyName(r.name as string);
      if (!firstName) return r;
      changed = true;
      return { ...r, firstName, lastName };
    });
    if (!changed) continue;
    if (APPLY) await coll.updateOne({ _id: doc._id }, { $set: { references: next } });
    written += 1;
  }
  console.log(`vouchprofiles.references[].name: ${written} profiles ${APPLY ? "updated" : "would update"}`);
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not defined");
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database handle");

  console.log(APPLY ? "APPLYING changes" : "DRY RUN — pass --apply to write");
  for (const t of TARGETS) await migrateTarget(db, t);
  await migrateReferences(db);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
