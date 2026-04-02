import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { app } from "../../app";
import { UserModel } from "../../models/userModel";
import { hashPassword } from "../../utils/authHelper";
import { NotificationModel, NotificationType } from "../../models/notificationModel";
import { ProjectModel } from "../../models/projectModel";

dotenv.config();

jest.setTimeout(15000);
const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

const USER_EMAIL = "notify-user@test.com";
const USER_PASSWORD = "SecurePassword123!";

async function getUserToken(): Promise<string> {
  const hashed = await hashPassword(USER_PASSWORD);
  const user = await UserModel.create({
    name: "Notify User",
    email: USER_EMAIL,
    password: hashed,
    status: "Active",
    emailVerified: true,
  });

  const login = await request(app).post("/auth/login").send({
    email: USER_EMAIL,
    password: USER_PASSWORD,
  });
  expect(login.status).toBe(200);
  expect(login.body.accessToken).toBeDefined();

  const project = await ProjectModel.create({
    name: "Notify Project",
    location: "Sydney",
    council: "Inner West",
    status: "Active",
  });

  await NotificationModel.create({
    recipientUserId: user._id.toString(),
    projectId: project._id.toString(),
    type: NotificationType.InvoiceSubmitted,
    message: "Test notification",
    read: false,
  });

  return login.body.accessToken as string;
}

beforeAll(async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set.");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, MONGO_OPTIONS);
  }
});

beforeEach(async () => {
  if (process.env.NODE_ENV === "test") {
    await request(app).delete("/clear");
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe("Notification endpoints", () => {
  it("GET /notifications returns notifications for logged-in user", async () => {
    const token = await getUserToken();

    const res = await request(app).get("/notifications").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.notifications)).toBe(true);
    expect(res.body.notifications.length).toBe(1);
    expect(res.body.notifications[0].message).toBe("Test notification");
    expect(res.body.notifications[0].read).toBe(false);
  });

  it("PATCH /notifications/read-all marks all unread notifications as read", async () => {
    const token = await getUserToken();

    const markRes = await request(app)
      .patch("/notifications/read-all")
      .set("Authorization", `Bearer ${token}`);
    expect(markRes.status).toBe(200);
    expect(markRes.body.success).toBe(true);
    expect(markRes.body.updatedCount).toBe(1);

    const listRes = await request(app)
      .get("/notifications")
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.notifications[0].read).toBe(true);
  });
});
