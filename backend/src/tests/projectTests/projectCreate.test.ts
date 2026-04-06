import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../app";
import { getToken, requestDelete, validProjectBody } from "../requestHelpers";
import { UserRole } from "../../models/userModel";

// Allow time for MongoDB connection in beforeAll/afterAll (default 5s is too short)
jest.setTimeout(15000);

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };
const PM_EMAIL = "pm@project-test.com";
const PASSWORD = "SecurePassword123!";
const SUBBIE_EMAIL = "subbie@project-test.com";

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
    throw new Error(
      "MONGODB_URI is not set. Copy backend/.env.example to backend/.env and set MONGODB_URI."
    );
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, MONGO_OPTIONS);
  }
}, 10000);

describe("POST /project", () => {
  it("returns 200 and projectId when authenticated user creates project", async () => {
    const token = await getToken("Project", "Manager", PM_EMAIL, PASSWORD);

    const res = await request(app)
      .post("/project")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validProjectBody, creatorRole: UserRole.PM });

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
      .set("Authorization", `Bearer InvalidToken`)
      .send({ ...validProjectBody, creatorRole: UserRole.PM });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authentication Required");
  });

  it("returns 200 when Subbie (any role) creates project", async () => {
    const token = await getToken("Sub", "Contract", SUBBIE_EMAIL, PASSWORD);

    const res = await request(app)
      .post("/project")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validProjectBody, creatorRole: UserRole.Subbie });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.projectId).toBeDefined();
  });

  it("returns 400 when required fields are missing", async () => {
    const token = await getToken("Project", "Manager", PM_EMAIL, PASSWORD);
    const res = await request(app)
      .post("/project")
      .set("Authorization", `Bearer ${token}`)
      .send({ location: "Some place" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required|missing/i);
  });
});
