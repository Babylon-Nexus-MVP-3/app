import mongoose from "mongoose";
import {
  requestDelete,
  requestInvite,
  requestAcceptInvite,
  getProjectId,
  getToken,
} from "../requestHelpers";
import { ProjectModel } from "../../models/projectModel";
import { UserRole } from "../../models/userModel";

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
  token = await getToken("Project", "Manager", PM_EMAIL, PASSWORD);
  projectId = await getProjectId(token, UserRole.PM);
  // Simulate admin approval so invite is allowed (invite only when project is Active)
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

describe("POST /project/invite/accept", () => {
  it("returns 200 and accepted participant when subbie accepts a valid invite", async () => {
    const inviteRes = await requestInvite(projectId, token, SUBBIE_EMAIL, "Subbie", "Electrician");
    expect(inviteRes.status).toBe(200);

    const subbieToken = await getToken("Sub", "Contract", SUBBIE_EMAIL, PASSWORD);
    const acceptRes = await requestAcceptInvite(inviteRes.body.inviteCode, subbieToken, {
      hasInsurance: true,
      hasLicence: true,
    });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.participant).toBeDefined();
    expect(acceptRes.body.participant.status).toBe("Accepted");
    expect(acceptRes.body.participant.email).toBe(SUBBIE_EMAIL);
    expect(acceptRes.body.participant.hasInsurance).toBe(true);
    expect(acceptRes.body.participant.hasLicence).toBe(true);
  });

  it("stores hasInsurance and hasLicence when provided on accept", async () => {
    const inviteRes = await requestInvite(projectId, token, SUBBIE_EMAIL, "Subbie", "Electrician");
    expect(inviteRes.status).toBe(200);

    const subbieToken = await getToken("Sub", "Contract", SUBBIE_EMAIL, PASSWORD);
    const acceptRes = await requestAcceptInvite(inviteRes.body.inviteCode, subbieToken, {
      hasInsurance: true,
      hasLicence: false,
    });

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.participant.hasInsurance).toBe(true);
    expect(acceptRes.body.participant.hasLicence).toBe(false);
  });

  it("returns 400 when invite code is invalid", async () => {
    const subbieToken = await getToken("Sub", "Contract", SUBBIE_EMAIL, PASSWORD);
    const acceptRes = await requestAcceptInvite("INVALID_CODE", subbieToken);

    expect(acceptRes.status).toBe(400);
    expect(acceptRes.body.success).toBe(undefined);
  });
});
