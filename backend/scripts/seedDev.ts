/**
 * Seeds realistic dev/test data: users, a project, participants, and invoices
 * with full event history so the Audit Log screen has something to show.
 *
 * Safe to run multiple times — skips if the seed project already exists.
 *
 * Seeded accounts (all passwords: Password123!)
 *   owner@ladder.dev    — Owner
 *   builder@ladder.dev  — Builder
 *   pm@ladder.dev       — PM
 *   subbie@ladder.dev   — Subbie
 *   consult@ladder.dev  — Consultant
 *   finance@ladder.dev  — Financier
 */

import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { UserModel } from "../src/models/userModel";
import { ProjectModel } from "../src/models/projectModel";
import { ProjectParticipantModel } from "../src/models/projectParticipantModel";
import { InvoiceModel, InvoiceStatus } from "../src/models/invoiceModel";
import { EventModel } from "../src/models/eventModel";
import { getNextSequence } from "../src/models/counterModel";

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/babylon-nexus";
const PASSWORD = "Password123!";
const SEED_MARKER = "SEED_DEV_PROJECT";

/* ─── Helpers ─── */
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}

async function seedDev() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB");

  // Idempotency check
  const existing = await ProjectModel.findOne({ council: SEED_MARKER });
  if (existing) {
    console.log("Seed data already exists. Skipping.");
    return;
  }

  const hashed = await bcrypt.hash(PASSWORD, 10);

  /* ── 1. Users ── */
  const userData = [
    { name: "Alex Carter",   email: "owner@ladder.dev",   role: "Owner"      },
    { name: "Sam Mitchell",  email: "builder@ladder.dev", role: "Builder"    },
    { name: "Jordan Lee",    email: "pm@ladder.dev",      role: "PM"         },
    { name: "Taylor Brooks", email: "subbie@ladder.dev",  role: "Subbie"     },
    { name: "Morgan Hayes",  email: "consult@ladder.dev", role: "Consultant" },
    { name: "Riley Chen",    email: "finance@ladder.dev", role: "Financier"  },
  ];

  const users: Record<string, InstanceType<typeof UserModel>> = {};
  for (const u of userData) {
    let user = await UserModel.findOne({ email: u.email });
    if (!user) {
      user = await UserModel.create({
        name: u.name,
        email: u.email,
        password: hashed,
        role: u.role,
        status: "Active",
        emailVerified: true,
        loginAttempts: 0,
        accountLocked: false,
      });
      console.log(`Created user: ${u.email} (${u.role})`);
    } else {
      console.log(`User exists: ${u.email} — skipping`);
    }
    users[u.role] = user;
  }

  /* ── 2. Project ── */
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
  ];

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
     Pending — awaiting admin approval
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
  console.log(`Created project: ${project4.name} (${p4Id}) — Pending approval`);

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
  console.log("");
  console.log("Projects:");
  console.log("  Strathfield Residential Development  → Active  | Good health");
  console.log("  Parramatta Commercial Tower          → Active  | Poor health (overdue)");
  console.log("  Bondi Beach Apartment Renovation     → Active  | All invoice statuses");
  console.log("  Chatswood Mixed Use Development      → Pending | Awaiting admin approval");
  console.log("  North Sydney Office Fitout           → Inactive| Archived");
  console.log("─────────────────────────────────────────");
}

seedDev()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.connection.close();
    process.exit(process.exitCode ?? 0);
  });
