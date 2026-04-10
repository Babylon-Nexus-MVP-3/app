import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../app";
import { requestDelete, requestAuthLogin, requestAuthRegister } from "../requestHelpers";
import { UserModel } from "../../models/userModel";
import { ProjectModel } from "../../models/projectModel";
import { ProjectParticipantModel } from "../../models/projectParticipantModel";

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

const PASSWORD = "SecurePassword123!";

async function registerActiveUser(email: string) {
  const reg = await requestAuthRegister("Test", "User", PASSWORD, email);
  expect(reg.status).toBe(201);
  await UserModel.updateOne({ email }, { $set: { status: "Active", emailVerified: true } });
  const login = await requestAuthLogin(email, PASSWORD);
  expect(login.status).toBe(200);
  return { token: login.body.accessToken as string, userId: reg.body.userId as string };
}

beforeAll(async () => {
  if (!process.env.MONGODB_TEST_URI) {
    throw new Error(
      "MONGODB_TEST_URI is not set. Copy backend/.env.example to backend/.env and set MONGODB_URI."
    );
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI, MONGO_OPTIONS);
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
    const { token, userId } = await registerActiveUser("dash@test.com");

    // Direct association by stored IDs (status Active = admin-approved, visible on dashboard)
    const ownerProj = await ProjectModel.create({
      name: "Owner Project",
      location: "L1",
      council: "C1",
      ownerId: userId,
      status: "Active",
    });
    const builderProj = await ProjectModel.create({
      name: "Builder Project",
      location: "L2",
      council: "C2",
      builderId: userId,
      status: "Active",
    });
    const pmProj = await ProjectModel.create({
      name: "PM Project",
      location: "L3",
      council: "C3",
      pmId: userId,
      status: "Active",
    });

    // Participant association (Accepted)
    const participantProj = await ProjectModel.create({
      name: "Participant Project",
      location: "L4",
      council: "C4",
      status: "Active",
    });
    await ProjectParticipantModel.create({
      projectId: participantProj._id.toString(),
      userId,
      email: "dash@test.com",
      trade: "Electrical",
      role: "Subbie",
      status: "Accepted",
      dateInvited: new Date(),
    });

    // A project that should NOT appear (different owner; or Pending/Rejected)
    await ProjectModel.create({
      name: "Other Project",
      location: "L5",
      council: "C5",
      ownerId: "someone-else",
      status: "Active",
    });

    const res = await request(app).get("/projects").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.projects)).toBe(true);

    const ids = res.body.projects.map((p: any) => p._id);
    expect(ids).toEqual(
      expect.arrayContaining([
        ownerProj._id.toString(),
        builderProj._id.toString(),
        pmProj._id.toString(),
        participantProj._id.toString(),
      ])
    );
    expect(res.body.projects).toHaveLength(4);

    const byId = new Map<string, any>(res.body.projects.map((p: any) => [p._id, p]));
    expect(byId.get(ownerProj._id.toString())?.userRole).toBe("Owner");
    expect(byId.get(builderProj._id.toString())?.userRole).toBe("Builder");
    expect(byId.get(pmProj._id.toString())?.userRole).toBe("PM");
    expect(byId.get(participantProj._id.toString())?.userRole).toBe("Subbie");

    expect(byId.get(ownerProj._id.toString())?.name).toBe("Owner Project");
  });

  it("returns only Active (admin-approved) projects, not Pending or Rejected", async () => {
    const { token, userId } = await registerActiveUser("filter@test.com");
    const activeProj = await ProjectModel.create({
      name: "Active Project",
      location: "L1",
      council: "C1",
      pmId: userId,
      status: "Active",
    });
    await ProjectModel.create({
      name: "Pending Project",
      location: "L2",
      council: "C2",
      pmId: userId,
      status: "Pending",
    });
    await ProjectModel.create({
      name: "Rejected Project",
      location: "L3",
      council: "C3",
      pmId: userId,
      status: "Rejected",
    });

    const res = await request(app).get("/projects").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.projects).toHaveLength(1);
    expect(res.body.projects[0]._id).toBe(activeProj._id.toString());
  });
});
