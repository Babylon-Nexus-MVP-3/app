import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../app";
import { UserModel, UserRole } from "../../models/userModel";
import { ProjectModel } from "../../models/projectModel";
import { ProjectParticipantModel } from "../../models/projectParticipantModel";
import { NotificationModel, NotificationType } from "../../models/notificationModel";
import { RefreshTokenModel } from "../../models/refreshTokenModel";
import { EventModel } from "../../models/eventModel";
import { hashPassword } from "../../utils/authHelper";
import { createNotification } from "../../service/notification.service";

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };
const VALID_PUSH_TOKEN = "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]";

jest.mock("expo-server-sdk", () => {
  const mockSend = jest.fn().mockResolvedValue([{ status: "ok" }]);
  const MockExpo = jest.fn().mockImplementation(() => ({
    sendPushNotificationsAsync: mockSend,
  }));
  // isExpoPushToken is a static method on the Expo class
  (MockExpo as any).isExpoPushToken = (token: string) =>
    typeof token === "string" && token.startsWith("ExponentPushToken[");
  // Expose the shared mock so tests can assert on it
  (MockExpo as any).__mockSend = mockSend;
  return { __esModule: true, default: MockExpo };
});

// All Expo instances share the same mockSend via closure — this returns that reference
// eslint-disable-next-line @typescript-eslint/no-require-imports
const getMockSend = (): jest.Mock => (require("expo-server-sdk").default as any).__mockSend;

beforeAll(async () => {
  if (!process.env.MONGODB_TEST_URI) throw new Error("MONGODB_TEST_URI is not set.");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI, MONGO_OPTIONS);
  }
});

beforeEach(async () => {
  // Use deleteMany per collection instead of dropDatabase to avoid a race condition
  // where MongoDB's async drop is still in progress when the next test creates documents
  await Promise.all([
    UserModel.deleteMany({}),
    ProjectModel.deleteMany({}),
    ProjectParticipantModel.deleteMany({}),
    NotificationModel.deleteMany({}),
    RefreshTokenModel.deleteMany({}),
    EventModel.deleteMany({}),
  ]);
  getMockSend().mockClear();
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe("Push notifications", () => {
  async function createActiveUser(email: string, pushToken?: string) {
    const hashed = await hashPassword("SecurePassword123!");
    return UserModel.create({
      name: "Test User",
      email,
      password: hashed,
      status: "Active",
      emailVerified: true,
      role: UserRole.Subbie,
      ...(pushToken ? { pushToken } : {}),
    });
  }

  async function createProjectWithParticipant(userId: string, role: UserRole) {
    const project = await ProjectModel.create({
      name: "Push Test Project",
      location: "Sydney",
      council: "Inner West",
      status: "Active",
    });
    await ProjectParticipantModel.create({
      projectId: project._id.toString(),
      userId: userId.toString(),
      email: "test@example.com",
      role,
      status: "Accepted",
    });
    return project;
  }

  it("sends a push notification when the recipient has a valid push token", async () => {
    const user = await createActiveUser("push-with-token@test.com", VALID_PUSH_TOKEN);
    const project = await createProjectWithParticipant(user._id.toString(), UserRole.Subbie);

    await createNotification({
      recipientUserId: user._id.toString(),
      projectId: project._id.toString(),
      type: NotificationType.InvoiceApproved,
      message: "Your invoice has been approved.",
    });

    expect(getMockSend()).toHaveBeenCalledTimes(1);
    expect(getMockSend()).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          to: VALID_PUSH_TOKEN,
          body: "Your invoice has been approved.",
        }),
      ])
    );
  });

  it("does not send a push notification when the recipient has no push token", async () => {
    const user = await createActiveUser("push-no-token@test.com");
    const project = await createProjectWithParticipant(user._id.toString(), UserRole.Subbie);

    await createNotification({
      recipientUserId: user._id.toString(),
      projectId: project._id.toString(),
      type: NotificationType.InvoiceApproved,
      message: "Your invoice has been approved.",
    });

    expect(getMockSend()).not.toHaveBeenCalled();
  });

  it("does not send a push notification when the token is not a valid Expo token", async () => {
    const user = await createActiveUser("push-invalid-token@test.com", "not-a-valid-token");
    const project = await createProjectWithParticipant(user._id.toString(), UserRole.Subbie);

    await createNotification({
      recipientUserId: user._id.toString(),
      projectId: project._id.toString(),
      type: NotificationType.InvoiceApproved,
      message: "Your invoice has been approved.",
    });

    expect(getMockSend()).not.toHaveBeenCalled();
  });

  it("PATCH /auth/push-token saves the push token to the user document", async () => {
    const hashed = await hashPassword("SecurePassword123!");
    await UserModel.create({
      name: "Token User",
      email: "push-register@test.com",
      password: hashed,
      status: "Active",
      emailVerified: true,
    });

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "push-register@test.com", password: "SecurePassword123!" });
    expect(login.status).toBe(200);
    const token = login.body.accessToken as string;

    const res = await request(app)
      .patch("/auth/push-token")
      .set("Authorization", `Bearer ${token}`)
      .send({ pushToken: VALID_PUSH_TOKEN });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await UserModel.findOne({ email: "push-register@test.com" }).lean();
    expect(updated?.pushToken).toBe(VALID_PUSH_TOKEN);
  });

  it("PATCH /auth/push-token returns 400 when push token is missing", async () => {
    const hashed = await hashPassword("SecurePassword123!");
    await UserModel.create({
      name: "Token User",
      email: "push-missing@test.com",
      password: hashed,
      status: "Active",
      emailVerified: true,
    });

    const login = await request(app)
      .post("/auth/login")
      .send({ email: "push-missing@test.com", password: "SecurePassword123!" });
    const token = login.body.accessToken as string;

    const res = await request(app)
      .patch("/auth/push-token")
      .set("Authorization", `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });

  it("PATCH /auth/push-token returns 401 when called without authentication", async () => {
    const res = await request(app).patch("/auth/push-token").send({ pushToken: VALID_PUSH_TOKEN });

    expect(res.status).toBe(401);
  });
});
