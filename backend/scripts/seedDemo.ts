/**
 * Seeds demo accounts that exercise every state of the vouch flow, so the app
 * can be walked through (or screen-recorded) without hand-building data.
 *
 * Re-runnable: wipes only what it created (matched by the @vouchpay.demo email
 * domain and the demo ABNs) and rebuilds it.
 *
 * Accounts — all passwords: Password123!
 *
 *   dave@vouchpay.demo    100% verified. 3 vouches received, 2 given,
 *                         1 request still waiting (nudgeable), 1 answered,
 *                         2 projects in history, 1 vouch request in his inbox.
 *                         → the "everything works" account.
 *
 *   sam@vouchpay.demo     50% — details done, no trade licence.
 *                         → giving a vouch and creating a project are locked.
 *
 *   new@vouchpay.demo     0% — nothing done, mobile unverified.
 *                         → every empty state, start of onboarding.
 *
 *   Supporting cast (mia/tom/priya@vouchpay.demo) exist so vouches and
 *   requests come from real accounts rather than dangling references.
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
import { ProjectModel } from "../src/models/projectModel";
import { ProjectParticipantModel } from "../src/models/projectParticipantModel";

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/babylon-nexus";
const PASSWORD = "Password123!";
const DEMO_DOMAIN = "@vouchpay.demo";

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

type DemoUser = {
  key: string;
  name: string;
  email: string;
  mobile: string;
  abn: string;
  businessName: string;
  businessTrade?: string;
  mobileVerified: boolean;
};

const USERS: DemoUser[] = [
  {
    key: "dave",
    name: "Dave Miller",
    email: `dave${DEMO_DOMAIN}`,
    mobile: "0411000001",
    abn: "51824753556",
    businessName: "Miller Electrical",
    businessTrade: "Electrical",
    mobileVerified: true,
  },
  {
    key: "sam",
    name: "Sam Okafor",
    email: `sam${DEMO_DOMAIN}`,
    mobile: "0411000002",
    abn: "29002589460",
    businessName: "Okafor Carpentry",
    businessTrade: "Carpentry",
    mobileVerified: true,
  },
  {
    key: "newbie",
    name: "Chris Nguyen",
    email: `new${DEMO_DOMAIN}`,
    mobile: "0411000003",
    abn: "",
    businessName: "",
    mobileVerified: false,
  },
  {
    key: "mia",
    name: "Mia Rossi",
    email: `mia${DEMO_DOMAIN}`,
    mobile: "0411000004",
    abn: "83914571673",
    businessName: "Rossi Constructions",
    businessTrade: "Builder",
    mobileVerified: true,
  },
  {
    key: "tom",
    name: "Tom Hardy",
    email: `tom${DEMO_DOMAIN}`,
    mobile: "0411000005",
    abn: "44622334455",
    businessName: "Hardy Plumbing",
    businessTrade: "Plumbing",
    mobileVerified: true,
  },
  {
    key: "priya",
    name: "Priya Sharma",
    email: `priya${DEMO_DOMAIN}`,
    mobile: "0411000006",
    abn: "77118899220",
    businessName: "Sharma Project Group",
    businessTrade: "Project Management",
    mobileVerified: true,
  },
];

async function wipeDemoData() {
  const demoUsers = await UserModel.find({ email: { $regex: `${DEMO_DOMAIN}$` } })
    .select("_id abn")
    .lean();
  const ids = demoUsers.map((u) => u._id);
  const abns = demoUsers.map((u) => u.abn).filter(Boolean) as string[];

  const demoProjects = await ProjectModel.find({ council: "VOUCHPAY_DEMO" }).select("_id").lean();
  const projectIds = demoProjects.map((p) => p._id.toString());

  await Promise.all([
    VouchProfileModel.deleteMany({ userId: { $in: ids } }),
    VouchRequestModel.deleteMany({ fromUserId: { $in: ids } }),
    GivenVouchModel.deleteMany({ $or: [{ fromUserId: { $in: ids } }, { toAbn: { $in: abns } }] }),
    VouchNotificationModel.deleteMany({ recipientUserId: { $in: ids } }),
    ProjectParticipantModel.deleteMany({ projectId: { $in: projectIds } }),
    ProjectModel.deleteMany({ council: "VOUCHPAY_DEMO" }),
    UserModel.deleteMany({ _id: { $in: ids } }),
  ]);

  if (ids.length) console.log(`Cleared previous demo data (${ids.length} accounts)`);
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to ${MONGODB_URI.replace(/\/\/[^@]+@/, "//***@")}`);

  await wipeDemoData();

  const hashed = await bcrypt.hash(PASSWORD, 10);
  const users: Record<string, InstanceType<typeof UserModel>> = {};

  for (const u of USERS) {
    users[u.key] = await UserModel.create({
      name: u.name,
      email: u.email,
      password: hashed,
      role: "Subbie",
      status: "Active",
      emailVerified: true,
      loginAttempts: 0,
      accountLocked: false,
      mobile: u.mobile,
      mobileVerified: u.mobileVerified,
      ...(u.abn ? { abn: u.abn } : {}),
      ...(u.businessName ? { businessName: u.businessName } : {}),
      ...(u.businessTrade ? { businessTrade: u.businessTrade } : {}),
    });
    console.log(`  user  ${u.email}`);
  }

  /* ── Vouch profiles ────────────────────────────────────────────────────
     dave is complete (100%); sam has details but no licence (50%); the
     supporting cast are complete so they read as real businesses; the new
     account has no profile at all. */
  const completeProfile = (u: DemoUser, licence: string, tradeType: string, state: string) => ({
    userId: users[u.key]._id,
    name: u.name,
    abn: u.abn,
    trade: u.businessTrade ?? "",
    idType: "trade-licence" as const,
    tradeType,
    idNumber: licence,
    idExpiry: "14/03/2028",
    idState: state,
    references: [],
    submittedAt: daysAgo(30),
  });

  await VouchProfileModel.create(completeProfile(USERS[0], "EC38214", "Electrical", "NSW"));
  await VouchProfileModel.create(completeProfile(USERS[3], "BLD221904", "Builder", "NSW"));
  await VouchProfileModel.create(completeProfile(USERS[4], "PL55182", "Plumbing", "VIC"));
  await VouchProfileModel.create(completeProfile(USERS[5], "PM90233", "Builder", "QLD"));

  // sam: details only, no licence — strength sits at 50%.
  //
  // Written the same way the app writes a partial profile: $set of just the
  // fields that step owns, with validators off. `create()` would fail here
  // because idNumber/idExpiry are marked required on the schema, which a
  // half-finished profile legitimately doesn't have yet.
  await VouchProfileModel.findOneAndUpdate(
    { userId: users.sam._id },
    {
      $set: {
        userId: users.sam._id,
        name: USERS[1].name,
        abn: USERS[1].abn,
        trade: USERS[1].businessTrade,
        idType: "trade-licence",
        references: [],
        submittedAt: daysAgo(10),
      },
    },
    { upsert: true, runValidators: false }
  );
  console.log("  profiles: dave 100%, sam 50%, new 0%");

  /* ── Vouches received by Dave ── */
  const received = [
    {
      from: "mia",
      attributes: ["Quality work", "Reliable", "Work with again"],
      note: "Dave rewired two units for us and never held up the program.",
      days: 21,
    },
    {
      from: "tom",
      attributes: ["Professional", "Communication"],
      note: "Easy to coordinate with on site.",
      days: 9,
    },
    {
      from: "priya",
      attributes: ["Pays on time", "Quality work", "Reliable"],
      note: "",
      days: 2,
    },
  ];
  for (const v of received) {
    await GivenVouchModel.create({
      fromUserId: users[v.from]._id,
      toAbn: USERS[0].abn,
      toBusinessName: USERS[0].businessName,
      attributes: v.attributes,
      ...(v.note ? { note: v.note } : {}),
      createdAt: daysAgo(v.days),
    });
  }

  /* ── Vouches Dave has given ── */
  await GivenVouchModel.create({
    fromUserId: users.dave._id,
    toAbn: USERS[4].abn,
    toBusinessName: USERS[4].businessName,
    attributes: ["Reliable", "Work with again"],
    note: "Tom's crew turned up when they said they would.",
    createdAt: daysAgo(12),
  });
  await GivenVouchModel.create({
    fromUserId: users.dave._id,
    toAbn: USERS[3].abn,
    toBusinessName: USERS[3].businessName,
    attributes: ["Pays on time", "Professional"],
    createdAt: daysAgo(4),
  });
  console.log("  vouches: dave has 3 received, 2 given");

  /* ── Dave's sent requests ──────────────────────────────────────────────
     One answered (by Priya), and one sent 6 days ago that is still waiting —
     old enough to be past the 24h nudge cooldown, so the Nudge button is live
     and the sender-side nudge reminder will generate. */
  await VouchRequestModel.create({
    fromUserId: users.dave._id,
    fromName: USERS[0].name,
    fromCompany: USERS[0].businessName,
    fromAbn: USERS[0].abn,
    toEmail: USERS[5].email,
    toMobile: USERS[5].mobile,
    relationship: "Worked together",
    projectName: "Strathfield Units",
    status: "responded",
    respondedAt: daysAgo(2),
    lastSentAt: daysAgo(5),
    createdAt: daysAgo(5),
  });
  await VouchRequestModel.create({
    fromUserId: users.dave._id,
    fromName: USERS[0].name,
    fromCompany: USERS[0].businessName,
    fromAbn: USERS[0].abn,
    toEmail: "kate.builder@example.com",
    toMobile: "0411000099",
    relationship: "Client",
    projectName: "Marrickville Fitout",
    status: "pending",
    lastSentAt: daysAgo(6),
    createdAt: daysAgo(6),
  });
  console.log("  requests: 1 answered, 1 waiting (nudgeable)");

  /* ── A request sitting in Dave's inbox, so Give a Vouch has something ── */
  const inbound = await VouchRequestModel.create({
    fromUserId: users.sam._id,
    fromName: USERS[1].name,
    fromCompany: USERS[1].businessName,
    fromAbn: USERS[1].abn,
    toEmail: USERS[0].email,
    toMobile: USERS[0].mobile,
    relationship: "Subcontractor",
    projectName: "Newtown Terrace",
    status: "pending",
    lastSentAt: daysAgo(3),
    createdAt: daysAgo(3),
  });
  await VouchNotificationModel.create({
    recipientUserId: users.dave._id,
    type: "vouch_request",
    requestId: inbound._id,
    fromName: USERS[1].name,
    fromCompany: USERS[1].businessName,
    projectName: "Newtown Terrace",
    read: false,
  });

  // and an unread "someone vouched for you" so the bell has a badge
  await VouchNotificationModel.create({
    recipientUserId: users.dave._id,
    type: "vouch_received",
    fromName: USERS[5].name,
    fromCompany: USERS[5].businessName,
    toBusinessName: USERS[0].businessName,
    read: false,
  });
  console.log("  inbox: 1 vouch request, 1 unread vouch received");

  /* ── Projects, for the Me screen's history timeline ── */
  const active = await ProjectModel.create({
    name: "Strathfield Residential Units",
    location: "2-4 Mintaro Ave, Strathfield NSW 2135",
    council: "VOUCHPAY_DEMO",
    daNumber: "DA-DEMO-001",
    ownerId: users.mia._id.toString(),
    status: "Active",
    createdAt: daysAgo(120),
  });
  const finished = await ProjectModel.create({
    name: "Marrickville Warehouse Fitout",
    location: "88 Victoria Rd, Marrickville NSW 2204",
    council: "VOUCHPAY_DEMO",
    daNumber: "DA-DEMO-002",
    ownerId: users.priya._id.toString(),
    status: "Inactive",
    createdAt: daysAgo(400),
  });

  for (const [project, role] of [
    [active, "Subbie"],
    [finished, "Subbie"],
  ] as const) {
    await ProjectParticipantModel.create({
      projectId: project._id.toString(),
      userId: users.dave._id.toString(),
      role,
      email: USERS[0].email,
      hasInsurance: true,
      hasLicence: true,
      status: "Accepted",
    });
  }
  console.log("  projects: 1 active, 1 finished (history timeline)");

  console.log("\nDemo data ready. Sign in with any of:");
  for (const u of USERS) console.log(`  ${u.email}  /  ${PASSWORD}`);
  console.log("\nStart with dave@vouchpay.demo — it has every feature populated.");
}

const clearOnly = process.argv.includes("--clear");

async function run() {
  if (!clearOnly) return seed();
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to ${MONGODB_URI.replace(/\/\/[^@]+@/, "//***@")}`);
  await wipeDemoData();
  console.log("Demo data removed.");
}

run()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
