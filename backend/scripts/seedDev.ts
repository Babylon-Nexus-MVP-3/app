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

  console.log("\n✓ Seed complete");
  console.log("─────────────────────────────────────────");
  console.log("Project:  Strathfield Residential Development");
  console.log("Password: Password123! (all accounts)");
  console.log("");
  console.log("  owner@ladder.dev    → Owner");
  console.log("  builder@ladder.dev  → Builder");
  console.log("  pm@ladder.dev       → PM");
  console.log("  subbie@ladder.dev   → Subbie");
  console.log("  consult@ladder.dev  → Consultant");
  console.log("  finance@ladder.dev  → Financier");
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
