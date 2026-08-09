import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../app";
import { requestDelete, getToken } from "../requestHelpers";
import { ProjectModel } from "../../models/projectModel";
import { ProjectParticipantModel } from "../../models/projectParticipantModel";
import { UserModel, UserRole } from "../../models/userModel";

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

const SUBBIE_EMAIL = "subbie@project-history-test.com";
const PASSWORD = "SecurePassword123!";

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

async function addParticipant(projectId: string, userId: string, email: string, role: UserRole) {
  await ProjectParticipantModel.create({
    projectId,
    userId,
    role,
    email,
    hasInsurance: true,
    hasLicence: true,
    status: "Accepted",
  });
}

describe("GET /projects/history", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).get("/projects/history");
    expect(res.status).toBe(401);
  });

  it("returns an empty list for a user who has never joined a project", async () => {
    const token = await getToken("New", "User", SUBBIE_EMAIL, PASSWORD);

    const res = await request(app).get("/projects/history").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.projects).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it("includes inactive projects, which the active-projects list excludes", async () => {
    const token = await getToken("Sub", "Bie", SUBBIE_EMAIL, PASSWORD);
    const userId = (await UserModel.findOne({ email: SUBBIE_EMAIL }).lean())!._id.toString();

    const active = await ProjectModel.create({
      name: "Active Site",
      location: "1 Active St",
      council: "C1",
      daNumber: "DA-HIST-001",
      status: "Active",
    });
    const inactive = await ProjectModel.create({
      name: "Finished Site",
      location: "2 Done Rd",
      council: "C2",
      daNumber: "DA-HIST-002",
      status: "Inactive",
    });

    await addParticipant(active._id.toString(), userId, SUBBIE_EMAIL, "Subbie");
    await addParticipant(inactive._id.toString(), userId, SUBBIE_EMAIL, "Subbie");

    const historyRes = await request(app)
      .get("/projects/history")
      .set("Authorization", `Bearer ${token}`);

    expect(historyRes.status).toBe(200);
    const names = historyRes.body.projects.map((p: { name: string }) => p.name).sort();
    expect(names).toEqual(["Active Site", "Finished Site"]);

    // The working list only ever shows Active projects — that's the difference
    // between "my projects" and "everything I've been part of".
    const activeRes = await request(app).get("/projects").set("Authorization", `Bearer ${token}`);
    expect(activeRes.body.projects).toHaveLength(1);
  });

  it("reports the user's role and status on each project", async () => {
    const token = await getToken("Sub", "Bie", SUBBIE_EMAIL, PASSWORD);
    const userId = (await UserModel.findOne({ email: SUBBIE_EMAIL }).lean())!._id.toString();

    const project = await ProjectModel.create({
      name: "Role Site",
      location: "3 Role Ave",
      council: "C3",
      daNumber: "DA-HIST-003",
      status: "Active",
    });
    await addParticipant(project._id.toString(), userId, SUBBIE_EMAIL, "Subbie");

    const res = await request(app).get("/projects/history").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.projects).toHaveLength(1);
    expect(res.body.projects[0]).toMatchObject({
      name: "Role Site",
      role: "Subbie",
      status: "Active",
    });
    expect(res.body.projects[0].startedAt).toBeDefined();
  });

  it("excludes rejected and soft-deleted projects", async () => {
    const token = await getToken("Sub", "Bie", SUBBIE_EMAIL, PASSWORD);
    const userId = (await UserModel.findOne({ email: SUBBIE_EMAIL }).lean())!._id.toString();

    const rejected = await ProjectModel.create({
      name: "Rejected Site",
      location: "4 No Rd",
      council: "C4",
      daNumber: "DA-HIST-004",
      status: "Rejected",
    });
    const deleted = await ProjectModel.create({
      name: "Deleted Site",
      location: "5 Gone Rd",
      council: "C5",
      daNumber: "DA-HIST-005",
      status: "Active",
      isDeleted: true,
      deletedAt: new Date(),
    });

    await addParticipant(rejected._id.toString(), userId, SUBBIE_EMAIL, "Subbie");
    await addParticipant(deleted._id.toString(), userId, SUBBIE_EMAIL, "Subbie");

    const res = await request(app).get("/projects/history").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.projects).toEqual([]);
  });
});
