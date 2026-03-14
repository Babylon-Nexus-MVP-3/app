import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  requestDelete,
  requestInviteSubbie,
  requestAcceptInvite,
  getPmToken,
  getSubbieToken,
  requestSubmitInvoice,
  getProjectId,
} from "../requestHelpers";

dotenv.config();

const PM_EMAIL = "pm@project-test.com";
const PASSWORD = "SecurePassword123!";
const SUBBIE_EMAIL = "subbie@project-test.com";

// Allow time for MongoDB connection in beforeAll/afterAll (default 5s is too short)
jest.setTimeout(15000);

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

let projectId: string;
let token: string;

beforeEach(async () => {
  await requestDelete();
  token = await getPmToken(PM_EMAIL, PASSWORD);
  projectId = await getProjectId(token, PM_EMAIL);
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

describe("POST /project/invite/accept", () => {
  it("returns 200 and accepted participant when subbie accepts a valid invite", async () => {
    const inviteRes = await requestInviteSubbie(
      projectId,
      token,
      SUBBIE_EMAIL,
      "Electrician",
      "Subbie"
    );
    expect(inviteRes.status).toBe(200);
    const { inviteCode } = inviteRes.body.participant;

    const subbieToken = await getSubbieToken(SUBBIE_EMAIL, PASSWORD);
    await requestAcceptInvite(inviteCode, subbieToken);
    const submitRes = await requestSubmitInvoice(
      subbieToken,
      projectId,
      "ABC Electrical",
      "Electrical",
      new Date("2026-06-01"),
      "Phase 2 elec"
    );

    console.log(submitRes.body);
    expect(submitRes.body.invoiceId).toEqual(expect.any(String));
    expect(submitRes.statusCode).toStrictEqual(200);
  });

  it("returns 400 If projectId doesnt exist", async () => {
    const inviteRes = await requestInviteSubbie(
      projectId,
      token,
      SUBBIE_EMAIL,
      "Electrician",
      "Subbie"
    );
    expect(inviteRes.status).toBe(200);
    const { inviteCode } = inviteRes.body.participant;

    const subbieToken = await getSubbieToken(SUBBIE_EMAIL, PASSWORD);
    await requestAcceptInvite(inviteCode, subbieToken);

    const fakeProjectId = new mongoose.Types.ObjectId().toString();
    const submitRes = await requestSubmitInvoice(
      subbieToken,
      fakeProjectId,
      "ABC Electrical",
      "Electrical",
      new Date("2026-06-01"),
      "Phase 2 elec"
    );

    expect(submitRes.statusCode).toBe(400);
    expect(submitRes.body.error).toBe("Project Does not Exist");
  });

  it("returns 400 If user is not part of the project", async () => {
    // Get a subbie token but never accept an invite — so they're not a participant
    const subbieToken = await getSubbieToken(SUBBIE_EMAIL, PASSWORD);

    const submitRes = await requestSubmitInvoice(
      subbieToken,
      projectId,
      "ABC Electrical",
      "Electrical",
      new Date("2026-06-01"),
      "Phase 2 elec"
    );

    expect(submitRes.statusCode).toBe(400);
    expect(submitRes.body.error).toBe("User not part of project");
  });
});
