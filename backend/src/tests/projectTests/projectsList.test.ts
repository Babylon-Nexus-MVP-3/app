import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { app } from "../../app";
import { requestDelete, requestAuthLogin, requestAuthRegister } from "../requestHelpers";
import { UserModel } from "../../models/userModel";
import { ProjectModel } from "../../models/projectModel";
import { ProjectParticipantModel } from "../../models/projectParticipantModel";

dotenv.config();

jest.setTimeout(15000);
const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

const PASSWORD = "SecurePassword123!";

async function registerActiveUser(email: string, role: string) {
  const reg = await requestAuthRegister("Test", "User", PASSWORD, email, role);
  expect(reg.status).toBe(201);
  await UserModel.updateOne({ email }, { $set: { status: "Active", emailVerified: true } });
  const login = await requestAuthLogin(email, PASSWORD);
  expect(login.status).toBe(200);
  return { token: login.body.accessToken as string, userId: reg.body.userId as string };
}

beforeAll(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set. Copy backend/.env.example to backend/.env and set MONGODB_URI.");
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, MONGO_OPTIONS);
  }
}, 10000);

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

describe("GET /projects", () => {
  it("returns 401 when no Authorization header", async () => {
    const res = await request(app).get("/projects");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("Authentication Required");
  });

  it("returns projects where user is owner/builder/pm, plus participant projects", async () => {
    const { token, userId } = await registerActiveUser("dash@test.com", "Subbie");

    // Direct association by stored IDs
    const ownerProj = await ProjectModel.create({ location: "L1", council: "C1", ownerId: userId });
    const builderProj = await ProjectModel.create({
      location: "L2",
      council: "C2",
      builderId: userId,
    });
    const pmProj = await ProjectModel.create({ location: "L3", council: "C3", pmId: userId });

    // Participant association (Accepted)
    const participantProj = await ProjectModel.create({ location: "L4", council: "C4" });
    await ProjectParticipantModel.create({
      projectId: participantProj._id.toString(),
      userId,
      email: "dash@test.com",
      trade: "Electrical",
      role: "Subbie",
      status: "Accepted",
      dateInvited: new Date(),
    });

    // A project that should NOT appear
    await ProjectModel.create({ location: "L5", council: "C5", ownerId: "someone-else" });

    const res = await request(app).get("/projects").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.projects)).toBe(true);

    const ids = res.body.projects.map((p: any) => p._id);
    expect(ids).toEqual(expect.arrayContaining([
      ownerProj._id.toString(),
      builderProj._id.toString(),
      pmProj._id.toString(),
      participantProj._id.toString(),
    ]));
  });
});

