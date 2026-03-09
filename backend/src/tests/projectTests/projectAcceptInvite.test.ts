import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { app } from "../../app";
import {
  requestDelete,
  requestAuthRegister,
  requestAuthLogin,
  requestInviteSubbie,
  requestAcceptInvite,
} from "../requestHelpers";
import { UserModel } from "../../models/userModel";

dotenv.config();

const PM_EMAIL = "pm@project-test.com";
const PM_PASSWORD = "SecurePassword123!";
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
  token = await getPmToken();

  const projectRes = await request(app)
    .post("/project")
    .set("Authorization", `Bearer ${token}`)
    .send(validProjectBody);

  projectId = projectRes.body.projectId;
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

/** Register a PM user, activate them so login succeeds, then login and return access token */
async function getPmToken(): Promise<string> {
  const reg = await requestAuthRegister("Project", "Manager", PM_PASSWORD, PM_EMAIL, "PM");
  expect(reg.status).toBe(201);
  await UserModel.updateOne(
    { email: PM_EMAIL },
    { $set: { status: "Active", emailVerified: true } }
  );
  const login = await requestAuthLogin(PM_EMAIL, PM_PASSWORD);
  expect(login.status).toBe(200);
  expect(login.body.accessToken).toBeDefined();
  return login.body.accessToken;
}

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
    console.log(inviteCode);

    // Register and login as the subbie
    await requestAuthRegister("Sub", "Contractor", "SecurePassword123!", SUBBIE_EMAIL, "Subbie");
    await UserModel.updateOne(
      { email: SUBBIE_EMAIL },
      { $set: { status: "Active", emailVerified: true } }
    );
    const subbieLogin = await requestAuthLogin(SUBBIE_EMAIL, "SecurePassword123!");
    const subbieToken = subbieLogin.body.accessToken;

    const acceptRes = await requestAcceptInvite(inviteCode, subbieToken);

    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.success).toBe(true);
    expect(acceptRes.body.participant).toBeDefined();
    expect(acceptRes.body.participant.status).toBe("Accepted");
    expect(acceptRes.body.participant.email).toBe(SUBBIE_EMAIL);
  });

  it("returns 400 when invite code is invalid", async () => {
    await requestAuthRegister("Sub", "Contractor", "SecurePassword123!", SUBBIE_EMAIL, "Subbie");
    await UserModel.updateOne(
      { email: SUBBIE_EMAIL },
      { $set: { status: "Active", emailVerified: true } }
    );
    const subbieLogin = await requestAuthLogin(SUBBIE_EMAIL, "SecurePassword123!");
    const subbieToken = subbieLogin.body.accessToken;

    const acceptRes = await requestAcceptInvite("INVALID_CODE", subbieToken);

    expect(acceptRes.status).toBe(400);
    expect(acceptRes.body.success).toBe(undefined);
  });
});
