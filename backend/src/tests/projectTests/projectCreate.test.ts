import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { app } from "../../app";
import { requestDelete, requestAuthRegister, requestAuthLogin } from "../requestHelpers";
import { UserModel } from "../../models/userModel";

dotenv.config();

const PM_EMAIL = "pm@project-test.com";
const PM_PASSWORD = "SecurePassword123!";
const SUBBIE_EMAIL = "subbie@project-test.com";

// Allow time for MongoDB connection in beforeAll/afterAll (default 5s is too short)
jest.setTimeout(15000);

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

beforeEach(async () => {
  await requestDelete();
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
    throw new Error("MONGODB_URI is not set. Copy backend/.env.example to backend/.env and set MONGODB_URI.");
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

/** Register a Subbie user, activate them, login and return access token */
async function getSubbieToken(): Promise<string> {
  const reg = await requestAuthRegister("Sub", "Contractor", PM_PASSWORD, SUBBIE_EMAIL, "Subbie");
  expect(reg.status).toBe(201);
  await UserModel.updateOne(
    { email: SUBBIE_EMAIL },
    { $set: { status: "Active", emailVerified: true } }
  );
  const login = await requestAuthLogin(SUBBIE_EMAIL, PM_PASSWORD);
  expect(login.status).toBe(200);
  return login.body.accessToken;
}

const validProjectBody = {
  location: "2-4 Mintaro Ave, Strathfield 2135 (Lot 1, DP: 954705)",
  council: "Strathfield",
  ownerId: "user_owner123",
  builderId: "user_builder123",
  status: "90% Complete",
};

describe("POST /project", () => {
  it("returns 200 and projectId when PM creates project with valid body", async () => {
    const token = await getPmToken();

    const res = await request(app)
      .post("/project")
      .set("Authorization", `Bearer ${token}`)
      .send(validProjectBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.projectId).toBeDefined();
    expect(typeof res.body.projectId).toBe("string");
    expect(res.body.projectId.length).toBeGreaterThan(0);
  });

  it("returns 401 when no Authorization header", async () => {
    const res = await request(app).post("/project").send(validProjectBody);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authentication Required");
  });

  it("returns 401 when token is invalid", async () => {
    const res = await request(app)
      .post("/project")
      .set("Authorization", "Bearer invalid-token")
      .send(validProjectBody);
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authentication Required");
  });

  it("returns 403 when user is not PM", async () => {
    const token = await getSubbieToken();
    const res = await request(app)
      .post("/project")
      .set("Authorization", `Bearer ${token}`)
      .send(validProjectBody);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Forbidden");
  });

  it("returns 400 when required fields are missing", async () => {
    const token = await getPmToken();
    const res = await request(app)
      .post("/project")
      .set("Authorization", `Bearer ${token}`)
      .send({ location: "Some place" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required|missing/i);
  });
});
