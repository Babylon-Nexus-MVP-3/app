/**
 * Seeds vouch-back test data on top of seed:vouched.
 * Run seed:vouched first, then run this.
 *
 * What this does:
 *   - Ensures builder/pm/subbie have ABNs set (needed for fromAbn in /vouch/received)
 *   - Creates one GivenVouch FROM vouched@ladder.dev TO builder (shows "Vouched ✓" badge)
 *   - pm and subbie cards will show active "Vouch back" button
 *
 * Run: npm run seed:vouchback
 */

import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { UserModel } from "../src/models/userModel";
import { GivenVouchModel } from "../src/models/givenVouchModel";

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/babylon-nexus";

const VOUCHED_EMAIL = "vouched@ladder.dev";

const VOUCHERS = [
  { email: "builder@ladder.dev", abn: "83914571673", businessName: "Mitchell Construction" },
  { email: "pm@ladder.dev", abn: "28611070749", businessName: "Lee Project Management" },
  { email: "subbie@ladder.dev", abn: "46253070000", businessName: "Brooks Framing Co" },
];

async function seedVouchBack() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const vouched = await UserModel.findOne({ email: VOUCHED_EMAIL }).lean();
  if (!vouched) {
    console.error(`${VOUCHED_EMAIL} not found — run seed:vouched first.`);
    process.exitCode = 1;
    return;
  }

  // Ensure each voucher has their ABN set
  for (const v of VOUCHERS) {
    const user = await UserModel.findOne({ email: v.email });
    if (!user) {
      console.log(`  ! ${v.email} not found — skipping ABN patch`);
      continue;
    }
    if (!user.abn) {
      await UserModel.findByIdAndUpdate(user._id, { abn: v.abn, businessName: v.businessName });
      console.log(`  ✓ Patched ABN on ${v.email}`);
    } else {
      console.log(`  · ${v.email} already has ABN — skipping patch`);
    }
  }

  // Seed one vouch-back: vouched@ladder.dev → builder (shows "Vouched ✓" on that card)
  const builder = await UserModel.findOne({ email: "builder@ladder.dev" }).lean();
  if (builder) {
    const builderAbn = VOUCHERS[0].abn;
    const existing = await GivenVouchModel.exists({ fromUserId: vouched._id, toAbn: builderAbn });
    if (!existing) {
      await GivenVouchModel.create({
        fromUserId: vouched._id,
        toAbn: builderAbn,
        toBusinessName: VOUCHERS[0].businessName,
        attributes: ["Reliable", "Quality Work"],
      });
      console.log(`  ✓ Vouched back vouched@ladder.dev → builder (Mitchell Construction)`);
    } else {
      console.log(`  · Vouch back to builder already exists — skipping`);
    }
  }

  console.log("\n✓ Vouch-back seed complete");
  console.log("─────────────────────────────────────────");
  console.log("  Log in as: vouched@ladder.dev / Password123!");
  console.log("  Vouches tab → Received:");
  console.log("    builder  → Vouched ✓ badge");
  console.log("    pm       → Vouch back button (active)");
  console.log("    subbie   → Vouch back button (active)");
  console.log("─────────────────────────────────────────");
}

seedVouchBack()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    process.exit(process.exitCode ?? 0);
  });
