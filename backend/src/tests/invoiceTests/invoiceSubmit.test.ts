import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  requestDelete,
  requestInvite,
  requestAcceptInvite,
  requestSubmitInvoice,
  getProjectId,
  getToken,
} from "../requestHelpers";
import { UserRole } from "../../models/userModel";
import { ProjectModel } from "../../models/projectModel";

dotenv.config();

const PM_EMAIL = "pm@project-test.com";
const PASSWORD = "SecurePassword123!";
const SUBBIE_EMAIL = "subbie@project-test.com";
const BUILDER_EMAIL = "builder@project-test.com";

jest.setTimeout(15000);
const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

let projectId: string;
let token: string;

beforeEach(async () => {
  await requestDelete();
  token = await getToken("Subbie", "Person", SUBBIE_EMAIL, PASSWORD);

  projectId = await getProjectId(token, UserRole.Subbie);
  await ProjectModel.updateOne({ _id: projectId }, { $set: { status: "Active" } });
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
    // Invite and onboard builder
    const builderInviteRes = await requestInvite(projectId, token, BUILDER_EMAIL, UserRole.Builder);
    expect(builderInviteRes.status).toBe(200);
    const builderToken = await getToken("Bob", "Build", BUILDER_EMAIL, PASSWORD);

    await requestAcceptInvite(builderInviteRes.body.participant.inviteCode, builderToken);

    const submitRes = await requestSubmitInvoice(
      token,
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

  it("returns 200 in case Builder Doesnt exist due to fallback approval", async () => {
    // Invite and onboard PM
    const pmInviteRes = await requestInvite(projectId, token, PM_EMAIL, UserRole.PM);
    expect(pmInviteRes.status).toBe(200);
    const pmToken = await getToken("Project", "Manage", PM_EMAIL, PASSWORD);
    await requestAcceptInvite(pmInviteRes.body.participant.inviteCode, pmToken);

    const submitRes = await requestSubmitInvoice(
      token,
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
    const fakeProjectId = new mongoose.Types.ObjectId().toString();
    const submitRes = await requestSubmitInvoice(
      token,
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
    const pmToken = await getToken("Project", "Manager", PM_EMAIL, PASSWORD);

    const submitRes = await requestSubmitInvoice(
      pmToken,
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

  it("returns 400 if no PM, Builder or Owner is  part of the project", async () => {
    const submitRes = await requestSubmitInvoice(
      token,
      projectId,
      "ABC Electrical",
      "Electrical",
      new Date("2026-06-01"),
      "Phase 2 elec",
      5000
    );

    expect(submitRes.statusCode).toBe(400);
    expect(submitRes.body.error)
      .toBe(`Cannot submit invoice: none of the required approver roles are on this project yet.
      Please Invite them before submitting this invoice`);
  });

  /**
   * Each row tests one missing field at a time.
   * The pattern is that in each row, one field is empty/null while the rest have valid values:
   */
  it.each([
    ["submittingParty", "", "Electrical", new Date("2026-06-01"), "Phase 2 elec", 10000],
    ["submittingCategory", "Builder", "", new Date("2026-06-01"), "Phase 2 elec", 10000],
    ["dateDue", "Builder", "Electrical", null, "Phase 2 elec", 10000],
    ["description", "Builder", "Electrical", new Date("2026-06-01"), "", 10000],
    ["amount", "Builder", "Electrical", new Date("2026-06-01"), "Phase 2 elec", null],
  ])(
    "returns 400 when %s is missing",
    async (_, submittingParty, submittingCategory, dateDue, description, amount) => {
      const res = await requestSubmitInvoice(
        token,
        projectId,
        submittingParty,
        submittingCategory,
        dateDue,
        description,
        amount
      );
      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Required fields missing: submittingParty, submittingCategory, dateDue, description, amount"
      );
    }
  );

  it("returns 400 if amount <= 0", async () => {
    const submitRes = await requestSubmitInvoice(
      token,
      projectId,
      "ABC Electrical",
      "Electrical",
      new Date("2026-06-01"),
      "Phase 2 elec",
      0
    );

    expect(submitRes.statusCode).toBe(400);
    expect(submitRes.body.error).toBe("Invalid amount. Amount must be a positive number");
  });
});
