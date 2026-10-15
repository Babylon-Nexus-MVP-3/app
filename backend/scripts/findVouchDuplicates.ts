/**
 * Find Vouch Duplicates — READ-ONLY report of rows that would block the
 * unique indexes on GivenVouch {fromUserId, toAbn} and on pending
 * VouchRequest {fromUserId, toEmail}.
 *
 * Run it against a database before deploying those indexes. If it finds
 * anything, Mongoose's index build fails (logged, not fatal) and the index is
 * simply missing — the race it guards stays open. Resolve the listed rows by
 * hand, then deploy.
 *
 *   npx ts-node scripts/findVouchDuplicates.ts
 *
 * Writes nothing. Exits 1 when duplicates exist, so it can gate a deploy.
 */

import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { GivenVouchModel } from "../src/models/givenVouchModel";
import { VouchRequestModel } from "../src/models/vouchRequestModel";

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/babylon-nexus";

type DuplicateGroup = { _id: Record<string, unknown>; ids: mongoose.Types.ObjectId[]; n: number };

async function findDuplicates() {
  await mongoose.connect(MONGODB_URI);

  const vouches = await GivenVouchModel.aggregate<DuplicateGroup>([
    {
      $group: {
        _id: { fromUserId: "$fromUserId", toAbn: "$toAbn" },
        ids: { $push: "$_id" },
        n: { $sum: 1 },
      },
    },
    { $match: { n: { $gt: 1 } } },
  ]);

  const requests = await VouchRequestModel.aggregate<DuplicateGroup>([
    // Mirrors the index's partial filter: legacy mobile-only requests have
    // toEmail "" and are outside it.
    { $match: { status: "pending", toEmail: { $gt: "" } } },
    {
      $group: {
        _id: { fromUserId: "$fromUserId", toEmail: "$toEmail" },
        ids: { $push: "$_id" },
        n: { $sum: 1 },
      },
    },
    { $match: { n: { $gt: 1 } } },
  ]);

  console.log(`GivenVouch {fromUserId, toAbn} duplicate groups: ${vouches.length}`);
  for (const g of vouches) console.log("  ", JSON.stringify(g._id), g.ids.map(String));

  console.log(`Pending VouchRequest {fromUserId, toEmail} duplicate groups: ${requests.length}`);
  for (const g of requests) console.log("  ", JSON.stringify(g._id), g.ids.map(String));

  if (vouches.length || requests.length) process.exitCode = 1;
}

findDuplicates()
  .catch((err) => {
    console.error("Check failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    process.exit(process.exitCode ?? 0);
  });
