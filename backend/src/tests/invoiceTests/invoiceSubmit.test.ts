import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  requestDelete,
  requestInvite,
  requestAcceptInvite,
  requestSubmitInvoice,
  getProjectId,
  getTokenForRole,
} from "../requestHelpers";
import { UserRole } from "../../models/userModel";
import { ProjectModel } from "../../models/projectModel";

dotenv.config();

const PM_EMAIL = "pm@project-test.com";
const PASSWORD = "SecurePassword123!";
const SUBBIE_EMAIL = "subbie@project-test.com";
const BUILDER_EMAIL = "builder@project-test.com";
const OWNER_EMAIL = "owner@project-test.com";

jest.setTimeout(15000);
const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

let projectId: string;
let token: string;

beforeEach(async () => {
  await requestDelete();
  token = await getTokenForRole("Project", "Manager", PM_EMAIL, PASSWORD, UserRole.PM);
  projectId = await getProjectId(token, PM_EMAIL);
  await ProjectModel.updateOne({ _id: projectId }, { $set: { status: "Active" } });

  // Invite and onboard builder
  const builderInviteRes = await requestInvite(projectId, token, BUILDER_EMAIL, UserRole.Builder);
  expect(builderInviteRes.status).toBe(200);
  const builderToken = await getTokenForRole(
    "Bob",
    "Build",
    BUILDER_EMAIL,
    PASSWORD,
    UserRole.Builder
  );
  await requestAcceptInvite(builderInviteRes.body.participant.inviteCode, builderToken);

  // Invite and onboard Ownder
  const ownerInviteRes = await requestInvite(projectId, token, OWNER_EMAIL, UserRole.Owner);
  expect(ownerInviteRes.status).toBe(200);
  const ownerToken = await getTokenForRole("Bob", "owner", OWNER_EMAIL, PASSWORD, UserRole.Owner);
  await requestAcceptInvite(ownerInviteRes.body.participant.inviteCode, ownerToken);
});

afterEach(async () => {
  await requestDelete();
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}, 10000);

beforeAll(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Copy backend/.env.example to backend/.env and set MONGODB_URI."
    );
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, MONGO_OPTIONS);
  }
}, 10000);

describe("POST /project/:projectId/invoice", () => {
  it("returns 200 when subbie submits invoice after accepting invite", async () => {
    // Invite and onboard subbie
    const subbieInviteRes = await requestInvite(
      projectId,
      token,
      SUBBIE_EMAIL,
      UserRole.Subbie,
      "Electrical"
    );
    expect(subbieInviteRes.status).toBe(200);
    const subbieToken = await getTokenForRole(
      "Sub",
      "Contractor",
      SUBBIE_EMAIL,
      PASSWORD,
      UserRole.Subbie
    );
    await requestAcceptInvite(subbieInviteRes.body.participant.inviteCode, subbieToken);

    const submitRes = await requestSubmitInvoice(
      subbieToken,
      projectId,
      "ABC Electrical",
      "Electrical",
      new Date("2026-06-01"),
      "Phase 2 elec",
      5000
    );

    expect(submitRes.statusCode).toBe(200);
    expect(submitRes.body).toEqual({ success: true, invoiceId: expect.any(String) });
  });

  it("returns 400 if projectId doesnt exist", async () => {
    const inviteRes = await requestInvite(
      projectId,
      token,
      SUBBIE_EMAIL,
      UserRole.Subbie,
      "Electrician"
    );
    expect(inviteRes.status).toBe(200);
    const { inviteCode } = inviteRes.body.participant;

    const subbieToken = await getTokenForRole(
      "Sub",
      "Contractor",
      SUBBIE_EMAIL,
      PASSWORD,
      UserRole.Subbie
    );
    await requestAcceptInvite(inviteCode, subbieToken);

    const fakeProjectId = new mongoose.Types.ObjectId().toString();
    const submitRes = await requestSubmitInvoice(
      subbieToken,
      fakeProjectId,
      "ABC Electrical",
      "Electrical",
      new Date("2026-06-01"),
      "Phase 2 elec",
      10000
    );

    expect(submitRes.statusCode).toBe(400);
    expect(submitRes.body.error).toBe("Project Does not Exist");
  });

  it("returns 400 if user is not part of the project", async () => {
    const subbieToken = await getTokenForRole(
      "Sub",
      "Contractor",
      SUBBIE_EMAIL,
      PASSWORD,
      UserRole.Subbie
    );

    const submitRes = await requestSubmitInvoice(
      subbieToken,
      projectId,
      "ABC Electrical",
      "Electrical",
      new Date("2026-06-01"),
      "Phase 2 elec",
      5000
    );

    expect(submitRes.statusCode).toBe(400);
    expect(submitRes.body.error).toBe("User not part of project");
  });
});
