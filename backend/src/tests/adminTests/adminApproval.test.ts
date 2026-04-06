import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../app";
import { requestDelete, requestAuthLogin } from "../requestHelpers";
import { UserModel } from "../../models/userModel";
import { ProjectModel } from "../../models/projectModel";
import { ProjectParticipantModel } from "../../models/projectParticipantModel";
import { NotificationModel, NotificationType } from "../../models/notificationModel";
import { hashPassword } from "../../utils/authHelper";

jest.setTimeout(15000);
const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

const ADMIN_EMAIL = "admin@admin-approval-test.com";
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
  const login = await requestAuthLogin(ADMIN_EMAIL, ADMIN_PASSWORD);
  expect(login.status).toBe(200);
  return login.body.accessToken;
}

beforeAll(async () => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set.");
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, MONGO_OPTIONS);
  }
}, 10000);

beforeEach(async () => {
  await requestDelete();
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}, 10000);

describe("Admin endpoints", () => {
  it("returns 200 and empty list for GET /admin/projects/pending as Admin", async () => {
    const token = await getAdminToken();
    const res = await request(app)
      .get("/admin/projects/pending")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.projects)).toBe(true);
  });

  it("approves project and returns 200", async () => {
    const token = await getAdminToken();
    const project = await ProjectModel.create({
      name: "Test Project",
      location: "L1",
      council: "C1",
      status: "Pending",
    });

    const res = await request(app)
      .put(`/admin/projects/${project._id}/approve`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await ProjectModel.findById(project._id).lean();
    expect(updated?.status).toBe("Active");
  });

  it("returns 200 for approvaing project with notification sent", async () => {
    const token = await getAdminToken();
    const hashed = await hashPassword("CreatorPassword123!");
    const creator = await UserModel.create({
      name: "Project Creator",
      email: "creator@project-approval-test.com",
      password: hashed,
      role: "PM",
      status: "Active",
      emailVerified: true,
    });

    const project = await ProjectModel.create({
      name: "Approved Project",
      location: "L1",
      council: "C1",
      status: "Pending",
    });

    await ProjectParticipantModel.create({
      projectId: project._id.toString(),
      userId: creator._id.toString(),
      email: creator.email,
      role: "PM",
      status: "Accepted",
    });

    const res = await request(app)
      .put(`/admin/projects/${project._id}/approve`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);

    const notification = await NotificationModel.findOne({
      recipientUserId: creator._id.toString(),
      projectId: project._id.toString(),
      type: NotificationType.ProjectApproved,
    }).lean();

    expect(notification).toBeTruthy();
    expect(notification?.message).toContain("has been approved by the admin");
    expect(notification?.read).toBe(false);
  });

  it("returns 404 when approving non-existent project", async () => {
    const token = await getAdminToken();
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .put(`/admin/projects/${fakeId}/approve`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
