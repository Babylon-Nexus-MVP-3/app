/**
 * Seeds everything a developer needs to walk through the app locally:
 *
 *   1. Dev accounts — one per project role, plus vouched@ladder.dev.
 *   2. Projects and invoices — five projects covering every invoice state, with
 *      the event history the Audit Log screen reads.
 *   3. A vouched account — three vouches received with their answered
 *      requests, and a complete profile, so Give a Vouch is unlocked.
 *   4. A vouch-back — vouched@ladder.dev has vouched for the builder, so in its
 *      Received tab the builder shows "Vouched" and the PM and subbie show
 *      "Vouch back".
 *
 * Safe to run more than once: each step checks before it writes, so a re-run
 * only fills in what is missing.
 *
 * Run: npm run seed:dev
 *
 * Accounts (all passwords: Password123!)
 *   owner@ladder.dev    — Owner
 *   builder@ladder.dev  — Builder     (ABN 83914571673)
 *   pm@ladder.dev       — PM          (ABN 28611070749)
 *   subbie@ladder.dev   — Subbie      (ABN 46253070000)
 *   consult@ladder.dev  — Consultant
 *   finance@ladder.dev  — Financier
 *   vouched@ladder.dev  — Subbie      (ABN 47100074445, 3 vouches received)
 */

import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { UserModel } from "../src/models/userModel";
import { ProjectModel } from "../src/models/projectModel";
import { ProjectParticipantModel } from "../src/models/projectParticipantModel";
import { InvoiceModel, InvoiceStatus } from "../src/models/invoiceModel";
import { EventModel } from "../src/models/eventModel";
import { getNextSequence } from "../src/models/counterModel";
import { GivenVouchModel } from "../src/models/givenVouchModel";
import { VouchRequestModel } from "../src/models/vouchRequestModel";
import { VouchProfileModel } from "../src/models/vouchProfileModel";
import { splitLegacyName } from "../src/utils/name";

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/babylon-nexus";
const PASSWORD = "Password123!";
const SEED_MARKER = "SEED_DEV_PROJECT";

type SeededUser = InstanceType<typeof UserModel>;

/* ─── Helpers ─── */
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

/* ─── 1. Dev accounts ─── */

// Received vouches are keyed by ABN, so the builder, PM and subbie need one for
// the vouched account's Received tab to show them.
const DEV_USERS = [
  { name: "Alex Carter",   email: "owner@ladder.dev",   role: "Owner"      },
  { name: "Sam Mitchell",  email: "builder@ladder.dev", role: "Builder",    abn: "83914571673", businessName: "Mitchell Construction"  },
  { name: "Jordan Lee",    email: "pm@ladder.dev",      role: "PM",         abn: "28611070749", businessName: "Lee Project Management" },
  { name: "Taylor Brooks", email: "subbie@ladder.dev",  role: "Subbie",     abn: "46253070000", businessName: "Brooks Framing Co"      },
  { name: "Morgan Hayes",  email: "consult@ladder.dev", role: "Consultant" },
  { name: "Riley Chen",    email: "finance@ladder.dev", role: "Financier"  },
] as const;

const BUILDER = DEV_USERS[1];

const VOUCHED = {
  email: "vouched@ladder.dev",
  firstName: "Casey",
  lastName: "Vouched",
  mobile: "0412999999",
  abn: "47100074445",
  businessName: "Vouched Test Co",
};

async function seedUsers(hashed: string): Promise<Record<string, SeededUser>> {
  const users: Record<string, SeededUser> = {};

  for (const u of DEV_USERS) {
    const business = "abn" in u ? { abn: u.abn, businessName: u.businessName } : {};
    let user = await UserModel.findOne({ email: u.email });
    if (!user) {
      user = await UserModel.create({
        ...splitLegacyName(u.name),
        email: u.email,
        password: hashed,
        role: u.role,
        status: "Active",
        emailVerified: true,
        loginAttempts: 0,
        accountLocked: false,
        ...business,
      });
      console.log(`Created user: ${u.email} (${u.role})`);
    } else if ("abn" in u && !user.abn) {
      // Accounts made before ABNs were part of the seed.
      user = await UserModel.findByIdAndUpdate(user._id, { $set: business }, { new: true });
      console.log(`User exists: ${u.email} — added ABN`);
    } else {
      console.log(`User exists: ${u.email} — skipping`);
    }
    users[u.role] = user!;
  }

  let vouched = await UserModel.findOne({ email: VOUCHED.email });
  if (!vouched) {
    vouched = await UserModel.create({
      firstName: VOUCHED.firstName,
      lastName: VOUCHED.lastName,
      email: VOUCHED.email,
      password: hashed,
      role: "Subbie",
      status: "Active",
      emailVerified: true,
      mobile: VOUCHED.mobile,
      mobileVerified: true,
      abn: VOUCHED.abn,
      businessName: VOUCHED.businessName,
    });
    console.log(`Created user: ${VOUCHED.email} (Subbie)`);
  } else {
    console.log(`User exists: ${VOUCHED.email} — skipping`);
  }
  users["Vouched"] = vouched;

  return users;
}

/* ─── 2. Projects and invoices ─── */

async function seedProjects(users: Record<string, SeededUser>): Promise<void> {
  if (await ProjectModel.exists({ council: SEED_MARKER })) {
    console.log("Projects already seeded — skipping");
    return;
  }

  /* ── Project 1 ── */
  const project = await ProjectModel.create({
    name: "Strathfield Residential Development",
    location: "2-4 Mintaro Ave, Strathfield NSW 2135",
    council: SEED_MARKER,
    ownerId: users["Owner"]._id.toString(),
    builderId: users["Builder"]._id.toString(),
    pmId: users["PM"]._id.toString(),
    status: "Active",
  });
  const projectId = project._id.toString();
  console.log(`Created project: ${project.name} (${projectId})`);

  /* ── 3. Participants ── */
  const participantData = [
    { role: "Owner",      user: users["Owner"]      },
    { role: "Builder",    user: users["Builder"]    },
    { role: "PM",         user: users["PM"]         },
    { role: "Subbie",     user: users["Subbie"]     },
    { role: "Consultant", user: users["Consultant"] },
    { role: "Financier",  user: users["Financier"]  },
  ] as const;

  for (const p of participantData) {
    await ProjectParticipantModel.create({
      projectId,
      userId: p.user._id.toString(),
      role: p.role,
      email: p.user.email,
      status: "Accepted",
      dateAccepted: daysAgo(30),
    });
  }
  console.log("Created participants");

  /* ── 4. Invoices + Events ── */

  // Invoice 1: Fully received — Framing Works
  const inv1 = await InvoiceModel.create({
    invoiceNumber: `INV-${String(await getNextSequence("invoice")).padStart(4, "0")}`,
    projectId,
    submittingParty: "Brooks Framing Co.",
    submittingCategory: "Structural",
    submittedByUserId: users["Subbie"]._id,
    description: "Framing Works — Stage 1",
    amount: 18500,
    dateSubmitted: daysAgo(28),
    dateDue: daysAgo(14),
    datePaid: daysAgo(18),
    dateReceived: daysAgo(16),
    status: InvoiceStatus.Received,
    approverRole: "Builder",
  });
  await EventModel.create([
    { type: "InvoiceSubmitted", aggregateType: "Invoice", aggregateId: inv1._id.toString(), userId: users["Subbie"]._id.toString(), payload: { projectId }, createdAt: daysAgo(28) },
    { type: "InvoiceApproved",  aggregateType: "Invoice", aggregateId: inv1._id.toString(), userId: users["Builder"]._id.toString(), payload: { projectId }, createdAt: daysAgo(26) },
    { type: "InvoicePaid",      aggregateType: "Invoice", aggregateId: inv1._id.toString(), userId: users["Builder"]._id.toString(), payload: { projectId }, createdAt: daysAgo(18) },
    { type: "InvoiceReceived",  aggregateType: "Invoice", aggregateId: inv1._id.toString(), userId: users["Subbie"]._id.toString(),  payload: { projectId }, createdAt: daysAgo(16) },
  ]);
  console.log("Created invoice 1: Framing Works (Received)");

  // Invoice 2: Paid, awaiting receipt — Concrete Pour
  const inv2 = await InvoiceModel.create({
    invoiceNumber: `INV-${String(await getNextSequence("invoice")).padStart(4, "0")}`,
    projectId,
    submittingParty: "Hayes Consulting Group",
    submittingCategory: "Civil",
    submittedByUserId: users["Consultant"]._id,
    description: "Concrete Pour — Ground Slab",
    amount: 45000,
    dateSubmitted: daysAgo(20),
    dateDue: daysAgo(6),
    datePaid: daysAgo(4),
    status: InvoiceStatus.Paid,
    approverRole: "Builder",
  });
  await EventModel.create([
    { type: "InvoiceSubmitted", aggregateType: "Invoice", aggregateId: inv2._id.toString(), userId: users["Consultant"]._id.toString(), payload: { projectId }, createdAt: daysAgo(20) },
    { type: "InvoiceApproved",  aggregateType: "Invoice", aggregateId: inv2._id.toString(), userId: users["Builder"]._id.toString(),    payload: { projectId }, createdAt: daysAgo(17) },
    { type: "InvoicePaid",      aggregateType: "Invoice", aggregateId: inv2._id.toString(), userId: users["Builder"]._id.toString(),    payload: { projectId }, createdAt: daysAgo(4) },
  ]);
  console.log("Created invoice 2: Concrete Pour (Paid)");

  // Invoice 3: Approved, awaiting payment — Electrical Rough-In
  const inv3 = await InvoiceModel.create({
    invoiceNumber: `INV-${String(await getNextSequence("invoice")).padStart(4, "0")}`,
    projectId,
    submittingParty: "Brooks Framing Co.",
    submittingCategory: "Electrical",
    submittedByUserId: users["Subbie"]._id,
    description: "Electrical Rough-In",
    amount: 24000,
    dateSubmitted: daysAgo(15),
    dateDue: daysAgo(1),
    status: InvoiceStatus.Approved,
    approverRole: "Builder",
  });
  await EventModel.create([
    { type: "InvoiceSubmitted", aggregateType: "Invoice", aggregateId: inv3._id.toString(), userId: users["Subbie"]._id.toString(),  payload: { projectId }, createdAt: daysAgo(15) },
    { type: "InvoiceApproved",  aggregateType: "Invoice", aggregateId: inv3._id.toString(), userId: users["Builder"]._id.toString(), payload: { projectId }, createdAt: daysAgo(12) },
  ]);
  console.log("Created invoice 3: Electrical Rough-In (Approved)");

  // Invoice 4: Rejected then re-submitted, now pending — Plumbing
  const inv4 = await InvoiceModel.create({
    invoiceNumber: `INV-${String(await getNextSequence("invoice")).padStart(4, "0")}`,
    projectId,
    submittingParty: "Brooks Framing Co.",
    submittingCategory: "Plumbing",
    submittedByUserId: users["Subbie"]._id,
    description: "Plumbing Rough-In",
    amount: 12000,
    dateSubmitted: daysAgo(10),
    dateDue: daysAgo(3) ,
    status: InvoiceStatus.Pending,
    approverRole: "Builder",
  });
  await EventModel.create([
    { type: "InvoiceSubmitted", aggregateType: "Invoice", aggregateId: inv4._id.toString(), userId: users["Subbie"]._id.toString(),  payload: { projectId }, createdAt: daysAgo(12) },
    { type: "InvoiceRejected",  aggregateType: "Invoice", aggregateId: inv4._id.toString(), userId: users["Builder"]._id.toString(), payload: { projectId, rejectionReason: "Missing variation reference number" }, createdAt: daysAgo(11) },
    { type: "InvoiceSubmitted", aggregateType: "Invoice", aggregateId: inv4._id.toString(), userId: users["Subbie"]._id.toString(),  payload: { projectId }, createdAt: daysAgo(10) },
  ]);
  console.log("Created invoice 4: Plumbing Rough-In (Pending, re-submitted after rejection)");

  // Invoice 5: Pending — Roofing Works
  const inv5 = await InvoiceModel.create({
    invoiceNumber: `INV-${String(await getNextSequence("invoice")).padStart(4, "0")}`,
    projectId,
    submittingParty: "Hayes Consulting Group",
    submittingCategory: "Roofing",
    submittedByUserId: users["Consultant"]._id,
    description: "Roofing Works — Truss Installation",
    amount: 32000,
    dateSubmitted: daysAgo(3),
    dateDue: daysAgo(0),
    status: InvoiceStatus.Pending,
    approverRole: "Builder",
  });
  await EventModel.create([
    { type: "InvoiceSubmitted", aggregateType: "Invoice", aggregateId: inv5._id.toString(), userId: users["Consultant"]._id.toString(), payload: { projectId }, createdAt: daysAgo(3) },
  ]);
  console.log("Created invoice 5: Roofing Works (Pending)");

  /* ══════════════════════════════════════════════════════════
     PROJECT 2 — Parramatta Commercial Tower
     Active | Poor health (overdue invoices, late payments)
  ══════════════════════════════════════════════════════════ */
  const project2 = await ProjectModel.create({
    name: "Parramatta Commercial Tower",
    location: "1 Darcy St, Parramatta NSW 2150",
    council: "City of Parramatta",
    ownerId: users["Owner"]._id.toString(),
    builderId: users["Builder"]._id.toString(),
    pmId: users["PM"]._id.toString(),
    status: "Active",
  });
  const p2Id = project2._id.toString();
  console.log(`Created project: ${project2.name} (${p2Id})`);

  for (const p of participantData) {
    await ProjectParticipantModel.create({
      projectId: p2Id, userId: p.user._id.toString(), role: p.role,
      email: p.user.email, status: "Accepted", dateAccepted: daysAgo(60),
    });
  }

  const p2inv1 = await InvoiceModel.create({
    invoiceNumber: `INV-${String(await getNextSequence("invoice")).padStart(4, "0")}`,
    projectId: p2Id, submittingParty: "Mitchell Construction", submittingCategory: "Structural",
    submittedByUserId: users["Builder"]._id, description: "Foundation Works — Stage 1",
    amount: 95000, dateSubmitted: daysAgo(55), dateDue: daysAgo(40),
    datePaid: daysAgo(30), dateReceived: daysAgo(28), status: InvoiceStatus.Received, approverRole: "PM",
  });
  await EventModel.create([
    { type: "InvoiceSubmitted", aggregateType: "Invoice", aggregateId: p2inv1._id.toString(), userId: users["Builder"]._id.toString(), payload: { projectId: p2Id }, createdAt: daysAgo(55) },
    { type: "InvoiceApproved",  aggregateType: "Invoice", aggregateId: p2inv1._id.toString(), userId: users["PM"]._id.toString(),      payload: { projectId: p2Id }, createdAt: daysAgo(50) },
    { type: "InvoicePaid",      aggregateType: "Invoice", aggregateId: p2inv1._id.toString(), userId: users["PM"]._id.toString(),      payload: { projectId: p2Id }, createdAt: daysAgo(30) },
    { type: "InvoiceReceived",  aggregateType: "Invoice", aggregateId: p2inv1._id.toString(), userId: users["Builder"]._id.toString(), payload: { projectId: p2Id }, createdAt: daysAgo(28) },
  ]);

  const p2inv2 = await InvoiceModel.create({
    invoiceNumber: `INV-${String(await getNextSequence("invoice")).padStart(4, "0")}`,
    projectId: p2Id, submittingParty: "Hayes Consulting Group", submittingCategory: "Civil",
    submittedByUserId: users["Consultant"]._id, description: "Structural Engineering Report",
    amount: 28000, dateSubmitted: daysAgo(45), dateDue: daysAgo(30),
    datePaid: daysAgo(15), dateReceived: daysAgo(13), status: InvoiceStatus.Received, approverRole: "PM",
  });
  await EventModel.create([
    { type: "InvoiceSubmitted", aggregateType: "Invoice", aggregateId: p2inv2._id.toString(), userId: users["Consultant"]._id.toString(), payload: { projectId: p2Id }, createdAt: daysAgo(45) },
    { type: "InvoiceApproved",  aggregateType: "Invoice", aggregateId: p2inv2._id.toString(), userId: users["PM"]._id.toString(),         payload: { projectId: p2Id }, createdAt: daysAgo(42) },
    { type: "InvoicePaid",      aggregateType: "Invoice", aggregateId: p2inv2._id.toString(), userId: users["PM"]._id.toString(),         payload: { projectId: p2Id }, createdAt: daysAgo(15) },
    { type: "InvoiceReceived",  aggregateType: "Invoice", aggregateId: p2inv2._id.toString(), userId: users["Consultant"]._id.toString(), payload: { projectId: p2Id }, createdAt: daysAgo(13) },
  ]);

  // Overdue — approved but not paid
  const p2inv3 = await InvoiceModel.create({
    invoiceNumber: `INV-${String(await getNextSequence("invoice")).padStart(4, "0")}`,
    projectId: p2Id, submittingParty: "Brooks Framing Co.", submittingCategory: "Electrical",
    submittedByUserId: users["Subbie"]._id, description: "High Voltage Switchboard Installation",
    amount: 67000, dateSubmitted: daysAgo(25), dateDue: daysAgo(10),
    status: InvoiceStatus.Approved, approverRole: "PM", escalationsSent: [3, 7],
  });
  await EventModel.create([
    { type: "InvoiceSubmitted", aggregateType: "Invoice", aggregateId: p2inv3._id.toString(), userId: users["Subbie"]._id.toString(), payload: { projectId: p2Id }, createdAt: daysAgo(25) },
    { type: "InvoiceApproved",  aggregateType: "Invoice", aggregateId: p2inv3._id.toString(), userId: users["PM"]._id.toString(),    payload: { projectId: p2Id }, createdAt: daysAgo(22) },
  ]);

  // Overdue — still pending
  const p2inv4 = await InvoiceModel.create({
    invoiceNumber: `INV-${String(await getNextSequence("invoice")).padStart(4, "0")}`,
    projectId: p2Id, submittingParty: "Mitchell Construction", submittingCategory: "Plumbing",
    submittedByUserId: users["Builder"]._id, description: "Fire Suppression System — Level 1-5",
    amount: 43000, dateSubmitted: daysAgo(20), dateDue: daysAgo(5),
    status: InvoiceStatus.Pending, approverRole: "PM", escalationsSent: [3],
  });
  await EventModel.create([
    { type: "InvoiceSubmitted", aggregateType: "Invoice", aggregateId: p2inv4._id.toString(), userId: users["Builder"]._id.toString(), payload: { projectId: p2Id }, createdAt: daysAgo(20) },
  ]);
  console.log("Created invoices for Parramatta Commercial Tower (poor health)");

  /* ══════════════════════════════════════════════════════════
     PROJECT 3 — Bondi Beach Apartment Renovation
     Active | All invoice statuses covered incl. Rejected
  ══════════════════════════════════════════════════════════ */
  const project3 = await ProjectModel.create({
    name: "Bondi Beach Apartment Renovation",
    location: "88 Campbell Parade, Bondi Beach NSW 2026",
    council: "Waverley Council",
    ownerId: users["Owner"]._id.toString(),
    builderId: users["Builder"]._id.toString(),
    pmId: users["PM"]._id.toString(),
    status: "Active",
  });
  const p3Id = project3._id.toString();
  console.log(`Created project: ${project3.name} (${p3Id})`);

  for (const p of participantData) {
    await ProjectParticipantModel.create({
      projectId: p3Id, userId: p.user._id.toString(), role: p.role,
      email: p.user.email, status: "Accepted", dateAccepted: daysAgo(45),
    });
  }

  const p3inv1 = await InvoiceModel.create({
    invoiceNumber: `INV-${String(await getNextSequence("invoice")).padStart(4, "0")}`,
    projectId: p3Id, submittingParty: "Brooks Framing Co.", submittingCategory: "Demolition",
    submittedByUserId: users["Subbie"]._id, description: "Internal Demolition Works",
    amount: 15000, dateSubmitted: daysAgo(40), dateDue: daysAgo(26),
    datePaid: daysAgo(27), dateReceived: daysAgo(25), status: InvoiceStatus.Received, approverRole: "Builder",
  });
  await EventModel.create([
    { type: "InvoiceSubmitted", aggregateType: "Invoice", aggregateId: p3inv1._id.toString(), userId: users["Subbie"]._id.toString(),  payload: { projectId: p3Id }, createdAt: daysAgo(40) },
    { type: "InvoiceApproved",  aggregateType: "Invoice", aggregateId: p3inv1._id.toString(), userId: users["Builder"]._id.toString(), payload: { projectId: p3Id }, createdAt: daysAgo(38) },
    { type: "InvoicePaid",      aggregateType: "Invoice", aggregateId: p3inv1._id.toString(), userId: users["Builder"]._id.toString(), payload: { projectId: p3Id }, createdAt: daysAgo(27) },
    { type: "InvoiceReceived",  aggregateType: "Invoice", aggregateId: p3inv1._id.toString(), userId: users["Subbie"]._id.toString(),  payload: { projectId: p3Id }, createdAt: daysAgo(25) },
  ]);

  // Rejected invoice
  const p3inv2 = await InvoiceModel.create({
    invoiceNumber: `INV-${String(await getNextSequence("invoice")).padStart(4, "0")}`,
    projectId: p3Id, submittingParty: "Hayes Consulting Group", submittingCategory: "Flooring",
    submittedByUserId: users["Consultant"]._id, description: "Timber Flooring Supply & Install",
    amount: 22000, dateSubmitted: daysAgo(30), dateDue: daysAgo(16),
    status: InvoiceStatus.Rejected, approverRole: "Builder",
    rejectionReason: "Amount exceeds approved variation — resubmit with updated scope",
  });
  await EventModel.create([
    { type: "InvoiceSubmitted", aggregateType: "Invoice", aggregateId: p3inv2._id.toString(), userId: users["Consultant"]._id.toString(), payload: { projectId: p3Id }, createdAt: daysAgo(30) },
    { type: "InvoiceRejected",  aggregateType: "Invoice", aggregateId: p3inv2._id.toString(), userId: users["Builder"]._id.toString(),    payload: { projectId: p3Id, rejectionReason: "Amount exceeds approved variation — resubmit with updated scope" }, createdAt: daysAgo(28) },
  ]);

  // Approved — awaiting payment
  const p3inv3 = await InvoiceModel.create({
    invoiceNumber: `INV-${String(await getNextSequence("invoice")).padStart(4, "0")}`,
    projectId: p3Id, submittingParty: "Mitchell Construction", submittingCategory: "Tiling",
    submittedByUserId: users["Builder"]._id, description: "Bathroom Tiling — All Units",
    amount: 18500, dateSubmitted: daysAgo(14), dateDue: new Date(Date.now() + 0),
    status: InvoiceStatus.Approved, approverRole: "Builder",
  });
  await EventModel.create([
    { type: "InvoiceSubmitted", aggregateType: "Invoice", aggregateId: p3inv3._id.toString(), userId: users["Builder"]._id.toString(), payload: { projectId: p3Id }, createdAt: daysAgo(14) },
    { type: "InvoiceApproved",  aggregateType: "Invoice", aggregateId: p3inv3._id.toString(), userId: users["Builder"]._id.toString(), payload: { projectId: p3Id }, createdAt: daysAgo(11) },
  ]);

  // Paid — awaiting receipt
  const p3inv4 = await InvoiceModel.create({
    invoiceNumber: `INV-${String(await getNextSequence("invoice")).padStart(4, "0")}`,
    projectId: p3Id, submittingParty: "Brooks Framing Co.", submittingCategory: "Painting",
    submittedByUserId: users["Subbie"]._id, description: "Interior Painting — All Levels",
    amount: 9800, dateSubmitted: daysAgo(10), dateDue: daysAgo(3), datePaid: daysAgo(2),
    status: InvoiceStatus.Paid, approverRole: "Builder",
  });
  await EventModel.create([
    { type: "InvoiceSubmitted", aggregateType: "Invoice", aggregateId: p3inv4._id.toString(), userId: users["Subbie"]._id.toString(),  payload: { projectId: p3Id }, createdAt: daysAgo(10) },
    { type: "InvoiceApproved",  aggregateType: "Invoice", aggregateId: p3inv4._id.toString(), userId: users["Builder"]._id.toString(), payload: { projectId: p3Id }, createdAt: daysAgo(8) },
    { type: "InvoicePaid",      aggregateType: "Invoice", aggregateId: p3inv4._id.toString(), userId: users["Builder"]._id.toString(), payload: { projectId: p3Id }, createdAt: daysAgo(2) },
  ]);

  // Pending — just submitted
  const p3inv5 = await InvoiceModel.create({
    invoiceNumber: `INV-${String(await getNextSequence("invoice")).padStart(4, "0")}`,
    projectId: p3Id, submittingParty: "Hayes Consulting Group", submittingCategory: "Joinery",
    submittedByUserId: users["Consultant"]._id, description: "Kitchen Cabinetry & Joinery",
    amount: 31000, dateSubmitted: daysAgo(2), dateDue: new Date(Date.now() + 12 * 86_400_000),
    status: InvoiceStatus.Pending, approverRole: "Builder",
  });
  await EventModel.create([
    { type: "InvoiceSubmitted", aggregateType: "Invoice", aggregateId: p3inv5._id.toString(), userId: users["Consultant"]._id.toString(), payload: { projectId: p3Id }, createdAt: daysAgo(2) },
  ]);
  console.log("Created invoices for Bondi Beach Apartment Renovation (all statuses)");

  /* ══════════════════════════════════════════════════════════
     PROJECT 4 — Chatswood Mixed Use Development
     Pending (legacy status — projects are Active from creation now)
  ══════════════════════════════════════════════════════════ */
  const project4 = await ProjectModel.create({
    name: "Chatswood Mixed Use Development",
    location: "312 Victoria Ave, Chatswood NSW 2067",
    council: "Willoughby City Council",
    ownerId: users["Owner"]._id.toString(),
    builderId: users["Builder"]._id.toString(),
    pmId: users["PM"]._id.toString(),
    status: "Pending",
  });
  const p4Id = project4._id.toString();
  console.log(`Created project: ${project4.name} (${p4Id}) — Pending`);

  for (const p of participantData) {
    await ProjectParticipantModel.create({
      projectId: p4Id, userId: p.user._id.toString(), role: p.role,
      email: p.user.email, status: "Accepted", dateAccepted: daysAgo(2),
    });
  }

  /* ══════════════════════════════════════════════════════════
     PROJECT 5 — North Sydney Office Fitout
     Inactive (archived)
  ══════════════════════════════════════════════════════════ */
  const project5 = await ProjectModel.create({
    name: "North Sydney Office Fitout",
    location: "100 Miller St, North Sydney NSW 2060",
    council: "North Sydney Council",
    ownerId: users["Owner"]._id.toString(),
    builderId: users["Builder"]._id.toString(),
    pmId: users["PM"]._id.toString(),
    status: "Inactive",
    isDeleted: true,
    deletedAt: daysAgo(10),
  });
  const p5Id = project5._id.toString();
  console.log(`Created project: ${project5.name} (${p5Id}) — Inactive`);

  for (const p of participantData) {
    await ProjectParticipantModel.create({
      projectId: p5Id, userId: p.user._id.toString(), role: p.role,
      email: p.user.email, status: "Accepted", dateAccepted: daysAgo(90),
    });
  }

  const p5inv1 = await InvoiceModel.create({
    invoiceNumber: `INV-${String(await getNextSequence("invoice")).padStart(4, "0")}`,
    projectId: p5Id, submittingParty: "Mitchell Construction", submittingCategory: "Fitout",
    submittedByUserId: users["Builder"]._id, description: "Office Fitout — Levels 3 & 4",
    amount: 210000, dateSubmitted: daysAgo(80), dateDue: daysAgo(66),
    datePaid: daysAgo(65), dateReceived: daysAgo(63), status: InvoiceStatus.Received, approverRole: "PM",
  });
  await EventModel.create([
    { type: "InvoiceSubmitted", aggregateType: "Invoice", aggregateId: p5inv1._id.toString(), userId: users["Builder"]._id.toString(), payload: { projectId: p5Id }, createdAt: daysAgo(80) },
    { type: "InvoiceApproved",  aggregateType: "Invoice", aggregateId: p5inv1._id.toString(), userId: users["PM"]._id.toString(),      payload: { projectId: p5Id }, createdAt: daysAgo(77) },
    { type: "InvoicePaid",      aggregateType: "Invoice", aggregateId: p5inv1._id.toString(), userId: users["PM"]._id.toString(),      payload: { projectId: p5Id }, createdAt: daysAgo(65) },
    { type: "InvoiceReceived",  aggregateType: "Invoice", aggregateId: p5inv1._id.toString(), userId: users["Builder"]._id.toString(), payload: { projectId: p5Id }, createdAt: daysAgo(63) },
  ]);
  console.log("Created invoice for North Sydney Office Fitout (Inactive)");
}

/* ─── 3. The vouched account ─── */

// Attributes must come from the list in src/utils/vouchRules.ts — the app only
// offers those.
const VOUCHES_RECEIVED = [
  {
    role: "Builder",
    relationship: "Head Contractor",
    projectName: "Strathfield Residential",
    attributes: ["Reliable", "Quality work", "Turns up on time"],
    note: "Worked together for two years — always delivers.",
  },
  {
    role: "PM",
    relationship: "Project Manager",
    projectName: "Bondi Beach Renovation",
    attributes: ["Professional", "Safety first"],
  },
  {
    role: "Subbie",
    relationship: "Subcontractor",
    projectName: "Parramatta Tower",
    attributes: ["Good communication", "Honest", "Fair pricing"],
    note: "Would work with again without hesitation.",
  },
];

async function seedVouchedAccount(users: Record<string, SeededUser>): Promise<void> {
  const vouched = users["Vouched"];

  // A licence on file takes the profile to 100%, which unlocks giving a vouch
  // and creating a project.
  if (!(await VouchProfileModel.exists({ userId: vouched._id }))) {
    await VouchProfileModel.create({
      userId: vouched._id,
      firstName: VOUCHED.firstName,
      lastName: VOUCHED.lastName,
      abn: VOUCHED.abn,
      idType: "trade-licence",
      idNumber: "LIC4471000",
      idExpiry: "01/01/2030",
      idState: "NSW",
      references: [],
    });
    console.log(`Created vouch profile: ${VOUCHED.email}`);
  }

  for (const v of VOUCHES_RECEIVED) {
    const voucher = users[v.role];

    let request = await VouchRequestModel.findOne({ fromUserId: vouched._id, toEmail: voucher.email });
    if (!request) {
      request = await VouchRequestModel.create({
        fromUserId: vouched._id,
        fromFirstName: VOUCHED.firstName,
        fromLastName: VOUCHED.lastName,
        fromCompany: VOUCHED.businessName,
        fromAbn: VOUCHED.abn,
        toEmail: voucher.email,
        relationship: v.relationship,
        projectName: v.projectName,
        status: "responded",
        respondedAt: new Date(),
      });
    }

    if (!(await GivenVouchModel.exists({ fromUserId: voucher._id, toAbn: VOUCHED.abn }))) {
      await GivenVouchModel.create({
        fromUserId: voucher._id,
        toAbn: VOUCHED.abn,
        toBusinessName: VOUCHED.businessName,
        attributes: v.attributes,
        note: v.note,
        requestId: request._id,
        recipientFirstName: VOUCHED.firstName,
        recipientLastName: VOUCHED.lastName,
        recipientEmail: VOUCHED.email,
      });
      console.log(`Created vouch: ${voucher.email} → ${VOUCHED.email}`);
    }
  }
}

/* ─── 4. Vouch-back ─── */

async function seedVouchBack(users: Record<string, SeededUser>): Promise<void> {
  const vouched = users["Vouched"];
  const builder = users["Builder"];

  if (!(await GivenVouchModel.exists({ fromUserId: vouched._id, toAbn: BUILDER.abn }))) {
    await GivenVouchModel.create({
      fromUserId: vouched._id,
      toAbn: BUILDER.abn,
      toBusinessName: BUILDER.businessName,
      attributes: ["Reliable", "Quality work"],
      recipientFirstName: builder.firstName,
      recipientLastName: builder.lastName,
      recipientEmail: builder.email,
    });
    console.log(`Created vouch: ${VOUCHED.email} → ${builder.email}`);
  }
}

async function seedDevAll() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  const hashed = await bcrypt.hash(PASSWORD, 10);
  const users = await seedUsers(hashed);
  await seedProjects(users);
  await seedVouchedAccount(users);
  await seedVouchBack(users);

  console.log("\n✓ Seed complete");
  console.log("─────────────────────────────────────────");
  console.log("Password: Password123! (all accounts)");
  console.log("");
  console.log("  owner@ladder.dev    → Owner");
  console.log("  builder@ladder.dev  → Builder");
  console.log("  pm@ladder.dev       → PM");
  console.log("  subbie@ladder.dev   → Subbie");
  console.log("  consult@ladder.dev  → Consultant");
  console.log("  finance@ladder.dev  → Financier");
  console.log("  vouched@ladder.dev  → Subbie | 3 vouches received, Give a Vouch unlocked");
  console.log("");
  console.log("Projects:");
  console.log("  Strathfield Residential Development  → Active  | Good health");
  console.log("  Parramatta Commercial Tower          → Active  | Poor health (overdue)");
  console.log("  Bondi Beach Apartment Renovation     → Active  | All invoice statuses");
  console.log("  Chatswood Mixed Use Development      → Pending | No invoices yet");
  console.log("  North Sydney Office Fitout           → Inactive| Archived");
  console.log("");
  console.log("Vouches (vouched@ladder.dev → Vouches → Received):");
  console.log("  builder → Vouched   pm → Vouch back   subbie → Vouch back");
  console.log("─────────────────────────────────────────");
}

seedDevAll()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    process.exit(process.exitCode ?? 0);
  });
