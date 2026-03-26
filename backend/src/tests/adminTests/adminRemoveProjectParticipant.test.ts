import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { app } from "../../app";
import { UserModel } from "../../models/userModel";
import { ProjectModel } from "../../models/projectModel";
import { ProjectParticipantModel } from "../../models/projectParticipantModel";
import { hashPassword } from "../../utils/authHelper";
import { UserRole } from "../../models/userModel";

dotenv.config();

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

beforeAll(async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set.");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, MONGO_OPTIONS);
  }
});

beforeEach(async () => {
  await request(app).delete("/clear");
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe("Admin participant removal endpoints", () => {
  it("returns 200 and deletes a pending participant by email + role", async () => {
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

    const res = await request(app)
      .delete(`/admin/projects/${project._id}/participants/remove`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "pending@example.com", role: UserRole.Subbie });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.removedCount).toBe(1);

    const remaining = await ProjectParticipantModel.find({
      projectId: project._id.toString(),
      email: "pending@example.com",
      role: UserRole.Subbie,
    }).lean();
    expect(remaining.length).toBe(0);
  });

  it("returns 200 and clears Project.pmId when removing accepted PM", async () => {
    const token = await getAdminToken();

    const pmUserId = "pm_user_1";
    const project = await ProjectModel.create({
      name: "Test Project",
      location: "L1",
      council: "C1",
      status: "Active",
      pmId: pmUserId,
      ownerId: "owner_user_1",
      builderId: "builder_user_1",
    });

    // PM participant being removed
    await ProjectParticipantModel.create({
      projectId: project._id.toString(),
      userId: pmUserId,
      email: "pm@example.com",
      role: UserRole.PM,
      status: "Accepted",
    });

    // Keep Owner/Builder participants to ensure we don't disturb other display fields
    await ProjectParticipantModel.create({
      projectId: project._id.toString(),
      userId: "owner_user_1",
      email: "owner@example.com",
      role: UserRole.Owner,
      status: "Accepted",
    });
    await ProjectParticipantModel.create({
      projectId: project._id.toString(),
      userId: "builder_user_1",
      email: "builder@example.com",
      role: UserRole.Builder,
      status: "Accepted",
    });

    const res = await request(app)
      .delete(`/admin/projects/${project._id}/participants/remove`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "pm@example.com", role: UserRole.PM });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.removedCount).toBe(1);

    const updated = await ProjectModel.findById(project._id).lean();
    expect(updated?.pmId).toBeUndefined();
    expect(updated?.ownerId).toBe("owner_user_1");
    expect(updated?.builderId).toBe("builder_user_1");
  });

  it("returns 404 when participant does not exist", async () => {
    const token = await getAdminToken();

    const project = await ProjectModel.create({
      name: "Test Project",
      location: "L1",
      council: "C1",
      status: "Active",
    });

    const res = await request(app)
      .delete(`/admin/projects/${project._id}/participants/remove`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "missing@example.com", role: UserRole.Subbie });

    expect(res.status).toBe(404);
  });

  it("returns 403 when user is not Admin", async () => {
    // Create a non-admin user token (role can be undefined; requireRole will still 403)
    const hashed = await hashPassword("SecurePassword123!");
    await UserModel.create({
      name: "Normal User",
      email: "normal@remove-participant-test.com",
      password: hashed,
      status: "Active",
      emailVerified: true,
      role: UserRole.Subbie,
    });

    const loginRes = await request(app).post("/auth/login").send({
      email: "normal@remove-participant-test.com",
      password: "SecurePassword123!",
    });
    expect(loginRes.status).toBe(200);
    const token = loginRes.body.accessToken as string;

    const project = await ProjectModel.create({
      name: "Test Project",
      location: "L1",
      council: "C1",
      status: "Active",
    });

    const res = await request(app)
      .delete(`/admin/projects/${project._id}/participants/remove`)
      .set("Authorization", `Bearer ${token}`)
      .send({ email: "any@example.com", role: UserRole.Subbie });

    expect(res.status).toBe(403);
  });
});
