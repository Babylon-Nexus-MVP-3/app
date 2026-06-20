/**
 * Seeds a test account that already has 3 vouches received and Give Vouch unlocked.
 * Safe to run multiple times — skips if vouched@ladder.dev already exists.
 *
 * Run: npm run seed:vouched
 *
 * Seeded account (password: Password123!)
 *   vouched@ladder.dev  — Subbie, ABN set, 3 responded vouch requests, 3 received vouches
 */

import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { UserModel } from "../src/models/userModel";
import { VouchRequestModel } from "../src/models/vouchRequestModel";
import { GivenVouchModel } from "../src/models/givenVouchModel";

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/babylon-nexus";
const PASSWORD = "Password123!";

const VOUCHED_EMAIL = "vouched@ladder.dev";
const VOUCHED_ABN = "47100074445";
const VOUCHED_BUSINESS = "Vouched Test Co";

const VOUCHERS = [
  {
    email: "builder@ladder.dev",
    name: "Sam Mitchell",
    businessName: "Mitchell Construction",
    abn: "83914571673",
    mobile: "0411000001",
    relationship: "Head Contractor",
    project: "Strathfield Residential",
    attributes: ["Reliable", "Quality Work", "On Time"],
    note: "Worked together for two years — always delivers.",
  },
  {
    email: "pm@ladder.dev",
    name: "Jordan Lee",
    businessName: "Lee Project Management",
    abn: "28611070749",
    mobile: "0411000002",
    relationship: "Project Manager",
    project: "Bondi Beach Renovation",
    attributes: ["Professional", "Safe on Site"],
  },
  {
    email: "subbie@ladder.dev",
    name: "Taylor Brooks",
    businessName: "Brooks Framing Co",
    abn: "46253070000",
    mobile: "0411000003",
    relationship: "Subcontractor",
    project: "Parramatta Tower",
    attributes: ["Communication", "Honest", "Fair"],
    note: "Would work with again without hesitation.",
  },
];

async function seedVouched() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const existing = await UserModel.findOne({ email: VOUCHED_EMAIL });
  if (existing) {
    console.log(`${VOUCHED_EMAIL} already exists — skipping.`);
    return;
  }

  const hashed = await bcrypt.hash(PASSWORD, 10);

  const vouched = await UserModel.create({
    name: "Casey Vouched",
    email: VOUCHED_EMAIL,
    password: hashed,
    role: "Subbie",
    status: "Active",
    emailVerified: true,
    mobile: "0412999999",
    mobileVerified: true,
    abn: VOUCHED_ABN,
    businessName: VOUCHED_BUSINESS,
  });
  console.log(`Created user: ${VOUCHED_EMAIL}`);

  for (const v of VOUCHERS) {
    // Look up existing seeded user, create minimal stub if not found
    let voucher = await UserModel.findOne({ email: v.email });
    if (!voucher) {
      voucher = await UserModel.create({
        name: v.name,
        email: v.email,
        password: hashed,
        role: "Builder",
        status: "Active",
        emailVerified: true,
        abn: v.abn,
        businessName: v.businessName,
      });
      console.log(`Created stub voucher: ${v.email}`);
    }

    await GivenVouchModel.create({
      fromUserId: voucher._id,
      toAbn: VOUCHED_ABN,
      toBusinessName: VOUCHED_BUSINESS,
      attributes: v.attributes,
      note: v.note,
    });

    await VouchRequestModel.create({
      fromUserId: vouched._id,
      fromName: "Casey Vouched",
      fromCompany: VOUCHED_BUSINESS,
      fromAbn: VOUCHED_ABN,
      toEmail: v.email,
      toMobile: v.mobile,
      relationship: v.relationship,
      projectName: v.project,
      status: "responded",
      respondedAt: new Date(),
    });

    console.log(`  ✓ Vouch from ${v.name}`);
  }

  console.log("\n✓ Seed complete");
  console.log("─────────────────────────────────────────");
  console.log(`  vouched@ladder.dev  →  Password123!`);
  console.log(`  ABN: ${VOUCHED_ABN}`);
  console.log(`  3 vouches received — Give Vouch unlocked`);
  console.log("─────────────────────────────────────────");
}

seedVouched()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    process.exit(process.exitCode ?? 0);
  });
