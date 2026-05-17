/**
 * Reset & Seed — wipes ALL collections and creates fresh test users
 * covering every vouch flow state.
 *
 * Run from EC2:
 *   npm run seed:reset
 *
 * Seeded accounts (password: Password123!)
 *
 *   alice@vouchpay.dev   — Verified (2 vouches received, full profile)
 *   bob@vouchpay.dev     — Waiting  (profile + requests sent, 0 responded)
 *   charlie@vouchpay.dev — Fresh    (no vouch profile, wizard state)
 *   diana@vouchpay.dev   — Voucher  (gave vouch to Alice, pending request from Bob)
 *   evan@vouchpay.dev    — Voucher  (gave vouch to Alice, pending request from Bob)
 *   admin@vouchpay.dev   — Admin
 */

import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { UserModel } from "../src/models/userModel";
import { VouchProfileModel } from "../src/models/vouchProfileModel";
import { VouchRequestModel } from "../src/models/vouchRequestModel";
import { GivenVouchModel } from "../src/models/givenVouchModel";
import { VouchNotificationModel } from "../src/models/vouchNotificationModel";
import { NotificationModel } from "../src/models/notificationModel";
import { ProjectModel } from "../src/models/projectModel";
import { ProjectParticipantModel } from "../src/models/projectParticipantModel";
import { InvoiceModel } from "../src/models/invoiceModel";
import { EventModel } from "../src/models/eventModel";

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/babylon-nexus";
const PASSWORD = "Password123!";

async function resetAndSeed() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // ── Wipe everything ──────────────────────────────────────────
  await Promise.all([
    UserModel.deleteMany({}),
    VouchProfileModel.deleteMany({}),
    VouchRequestModel.deleteMany({}),
    GivenVouchModel.deleteMany({}),
    VouchNotificationModel.deleteMany({}),
    NotificationModel.deleteMany({}),
    ProjectModel.deleteMany({}),
    ProjectParticipantModel.deleteMany({}),
    InvoiceModel.deleteMany({}),
    EventModel.deleteMany({}),
    mongoose.connection.collection("refreshtokens").deleteMany({}),
    mongoose.connection.collection("otps").deleteMany({}),
    mongoose.connection.collection("counters").deleteMany({}),
  ]);
  console.log("All collections cleared");

  const hashed = await bcrypt.hash(PASSWORD, 10);

  // ── 1. Users ─────────────────────────────────────────────────
  const admin = await UserModel.create({
    name: "Admin",
    email: "admin@vouchpay.dev",
    password: hashed,
    role: "Admin",
    status: "Active",
    emailVerified: true,
  });

  const alice = await UserModel.create({
    name: "Alice Cooper",
    email: "alice@vouchpay.dev",
    password: hashed,
    role: "Subbie",
    status: "Active",
    emailVerified: true,
    mobile: "+61400000001",
    mobileVerified: true,
    abn: "51824753556",
    businessName: "Alice Cooper Electrical",
  });

  const bob = await UserModel.create({
    name: "Bob Smith",
    email: "bob@vouchpay.dev",
    password: hashed,
    role: "Builder",
    status: "Active",
    emailVerified: true,
    mobile: "+61400000002",
    mobileVerified: true,
    abn: "83914571673",
    businessName: "Smith Construction",
  });

  const charlie = await UserModel.create({
    name: "Charlie Brown",
    email: "charlie@vouchpay.dev",
    password: hashed,
    role: "Subbie",
    status: "Active",
    emailVerified: true,
    mobile: "+61400000003",
    mobileVerified: true,
  });

  const diana = await UserModel.create({
    name: "Diana Prince",
    email: "diana@vouchpay.dev",
    password: hashed,
    role: "Consultant",
    status: "Active",
    emailVerified: true,
    mobile: "+61400000004",
    mobileVerified: true,
    abn: "46253070000",
    businessName: "Prince Consulting",
  });

  const evan = await UserModel.create({
    name: "Evan Williams",
    email: "evan@vouchpay.dev",
    password: hashed,
    role: "PM",
    status: "Active",
    emailVerified: true,
    mobile: "+61400000005",
    mobileVerified: true,
    abn: "28611070749",
    businessName: "Williams Project Management",
  });

  console.log("Created 6 users");

  // ── 2. Alice — full vouch profile (step 1+2+3 complete) ──────
  await VouchProfileModel.create({
    userId: alice._id,
    name: "Alice Cooper",
    abn: "51824753556",
    trade: "Alice Cooper Electrical",
    idType: "licence",
    idNumber: "NSW12345678",
    idExpiry: "2028-06-30",
    currentProjectName: "Strathfield Residential",
    address: "2 Mintaro Ave",
    suburb: "Strathfield",
    state: "NSW",
    postcode: "2135",
    value: "$500,000 – $1M",
    pastProjectName: "Bondi Renovation",
    pastSuburb: "Bondi Beach",
    pastState: "NSW",
    pastPostcode: "2026",
    pastMonthYear: "2023-09",
    pastValue: "$250,000 – $500K",
    references: [
      {
        name: "Diana Prince",
        company: "Prince Consulting",
        mobile: "+61400000004",
        email: "diana@vouchpay.dev",
        relationship: "Subcontractor",
        project: "Strathfield Residential",
      },
      {
        name: "Evan Williams",
        company: "Williams Project Management",
        mobile: "+61400000005",
        email: "evan@vouchpay.dev",
        relationship: "Subcontractor",
        project: "Bondi Renovation",
      },
    ],
    submittedAt: new Date(),
  });

  // ── 3. Diana & Evan gave vouches to Alice ─────────────────────
  await GivenVouchModel.create({
    fromUserId: diana._id,
    toAbn: "51824753556",
    toBusinessName: "Alice Cooper Electrical",
    attributes: ["Reliable", "Quality Work", "On Time"],
    note: "Worked with Alice on two projects. Always delivers.",
  });

  await GivenVouchModel.create({
    fromUserId: evan._id,
    toAbn: "51824753556",
    toBusinessName: "Alice Cooper Electrical",
    attributes: ["Professional", "Safe on Site"],
  });

  console.log("Alice: verified (2 vouches received)");

  // ── 4. Bob — profile submitted, requests sent to Diana & Evan ─
  await VouchProfileModel.create({
    userId: bob._id,
    name: "Bob Smith",
    abn: "83914571673",
    trade: "Smith Construction",
    idType: "passport",
    idNumber: "PA1234567",
    idExpiry: "2030-03-15",
    currentProjectName: "Parramatta Tower",
    address: "1 Darcy St",
    suburb: "Parramatta",
    state: "NSW",
    postcode: "2150",
    value: "$1M – $5M",
    pastProjectName: "",
    pastSuburb: "",
    pastState: "",
    pastPostcode: "",
    pastMonthYear: "",
    pastValue: "",
    references: [
      {
        name: "Diana Prince",
        company: "Prince Consulting",
        mobile: "+61400000004",
        email: "diana@vouchpay.dev",
        relationship: "Project Manager",
        project: "Parramatta Tower",
      },
      {
        name: "Evan Williams",
        company: "Williams Project Management",
        mobile: "+61400000005",
        email: "evan@vouchpay.dev",
        relationship: "Client",
        project: "Parramatta Tower",
      },
    ],
    submittedAt: new Date(),
  });

  const req1 = await VouchRequestModel.create({
    fromUserId: bob._id,
    fromName: "Bob Smith",
    fromCompany: "Smith Construction",
    fromAbn: "83914571673",
    toEmail: "diana@vouchpay.dev",
    toMobile: "+61400000004",
    relationship: "Project Manager",
    projectName: "Parramatta Tower",
    status: "pending",
  });

  const req2 = await VouchRequestModel.create({
    fromUserId: bob._id,
    fromName: "Bob Smith",
    fromCompany: "Smith Construction",
    fromAbn: "83914571673",
    toEmail: "evan@vouchpay.dev",
    toMobile: "+61400000005",
    relationship: "Client",
    projectName: "Parramatta Tower",
    status: "pending",
  });

  // In-app notifications for Diana & Evan
  await VouchNotificationModel.create({
    recipientUserId: diana._id,
    requestId: req1._id,
    fromName: "Bob Smith",
    fromCompany: "Smith Construction",
    projectName: "Parramatta Tower",
  });

  await VouchNotificationModel.create({
    recipientUserId: evan._id,
    requestId: req2._id,
    fromName: "Bob Smith",
    fromCompany: "Smith Construction",
    projectName: "Parramatta Tower",
  });

  console.log("Bob: waiting (2 requests sent, 0 responded)");
  console.log("Charlie: fresh (no vouch profile)");

  console.log("\n✓ Reset & seed complete");
  console.log("─────────────────────────────────────────────────────");
  console.log("Password: Password123! (all accounts)");
  console.log("");
  console.log("  alice@vouchpay.dev   → VERIFIED  (2 vouches received)");
  console.log("  bob@vouchpay.dev     → WAITING   (requests sent, pending)");
  console.log("  charlie@vouchpay.dev → FRESH     (no profile, wizard)");
  console.log("  diana@vouchpay.dev   → VOUCHER   (has pending request from Bob)");
  console.log("  evan@vouchpay.dev    → VOUCHER   (has pending request from Bob)");
  console.log("  admin@vouchpay.dev   → ADMIN");
  console.log("─────────────────────────────────────────────────────");
  console.log(`\nAdmin: ${admin._id}`);
}

resetAndSeed()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    process.exit(process.exitCode ?? 0);
  });
