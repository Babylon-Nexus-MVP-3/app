import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { app } from "../../app";
import {
  requestDelete,
  requestInviteSubbie,
  requestAcceptInvite,
  getPmToken,
  getSubbieToken,
} from "../requestHelpers";
import { ProjectModel } from "../../models/projectModel";

dotenv.config();

const PM_EMAIL = "pm@project-test.com";
const PASSWORD = "SecurePassword123!";
const SUBBIE_EMAIL = "subbie@project-test.com";

// Allow time for MongoDB connection in beforeAll/afterAll (default 5s is too short)
jest.setTimeout(15000);

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

let projectId: string;
let token: string;

const validProjectBody = {
  location: "2-4 Mintaro Ave, Strathfield 2135 (Lot 1, DP: 954705)",
  council: "Strathfield",
  ownerId: "user_owner123",
  builderId: "user_builder123",
  status: "90% Complete",
};

beforeEach(async () => {
  await requestDelete();
  token = await getPmToken(PM_EMAIL, PASSWORD);

  const projectRes = await request(app)
    .post("/project")
    .set("Authorization", `Bearer ${token}`)
    .send(validProjectBody);

  projectId = projectRes.body.projectId;
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
    const acceptRes = await requestAcceptInvite(inviteCode, subbieToken);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.participant).toBeDefined();
    expect(acceptRes.body.participant.status).toBe("Accepted");
    expect(acceptRes.body.participant.email).toBe(SUBBIE_EMAIL);
  });

  it("returns 400 when invite code is invalid", async () => {
    const subbieToken = await getSubbieToken(SUBBIE_EMAIL, PASSWORD);
    const acceptRes = await requestAcceptInvite("INVALID_CODE", subbieToken);

    expect(acceptRes.status).toBe(400);
    expect(acceptRes.body.success).toBe(undefined);
  });
});
