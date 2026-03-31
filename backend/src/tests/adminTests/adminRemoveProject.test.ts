import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { app } from "../../app";
import { requestDelete, requestDeleteProject } from "../requestHelpers";
import { UserModel, UserRole } from "../../models/userModel";
import { ProjectModel } from "../../models/projectModel";
import { ProjectParticipantModel } from "../../models/projectParticipantModel";
import { hashPassword } from "../../utils/authHelper";
import { DeletedProjectModel } from "../../models/deletedProjectModel";

dotenv.config();

// Allow time for MongoDB connection in beforeAll/afterAll (default 5s is too short)
jest.setTimeout(15000);

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };
const ADMIN_EMAIL = "admin@admin-participant-remove-test.com";
const ADMIN_PASSWORD = "SecurePassword123!";

async function getAdminToken(): Promise<string> {
  const hashed = await hashPassword(ADMIN_PASSWORD);
  await UserModel.create({
    name: "Admin User",
    email: ADMIN_EMAIL,
    password: hashed,
    role: "Admin",
    status: "Active",
    emailVerified: true,
  });

  const loginRes = await request(app).post("/auth/login").send({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  expect(loginRes.status).toBe(200);
  return loginRes.body.accessToken as string;
}

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

describe("Delete /project/:projectId", () => {
  it("returns 200 and moves project to Deleted Project", async () => {
    const token = await getAdminToken();

    const project = await ProjectModel.create({
      name: "Test Project",
      location: "L1",
      council: "C1",
      status: "Active",
    });

    await ProjectParticipantModel.create({
      projectId: project._id.toString(),
      email: "pending@example.com",
      role: UserRole.Subbie,
      status: "Pending",
    });

    const res = await requestDeleteProject(token, project._id.toString());

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // original records should be removed
    const remainingParticipants = await ProjectParticipantModel.find({
      projectId: project._id.toString(),
    }).lean();
    expect(remainingParticipants.length).toBe(0);

    const remainingProject = await ProjectModel.findById(project._id);
    expect(remainingProject).toBeNull();

    // archived record should exist with all data
    const archived = await DeletedProjectModel.findOne({
      "project._id": project._id,
    }).lean();
    expect(archived).not.toBeNull();
    expect(archived?.participants).toHaveLength(1);
  });

  it("returns 400 for a non existing project", async () => {
    const token = await getAdminToken();
    const res = await requestDeleteProject(token, new mongoose.Types.ObjectId().toString());
    console.log(res.body);
    expect(res.statusCode).toStrictEqual(400);
  });
});
