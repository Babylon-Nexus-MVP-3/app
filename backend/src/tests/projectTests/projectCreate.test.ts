import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../app";
import { getToken, requestDelete, validProjectBody } from "../requestHelpers";
import { NotificationModel, NotificationType } from "../../models/notificationModel";
import { UserModel, UserRole } from "../../models/userModel";
import { ProjectModel } from "../../models/projectModel";

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
    const daNumber = "DA-2026-1001";

    const res = await request(app)
      .post("/project")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validProjectBody, daNumber, creatorRole: UserRole.PM });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.projectId).toBeDefined();
    expect(typeof res.body.projectId).toBe("string");
    expect(res.body.projectId.length).toBeGreaterThan(0);

    const project = await ProjectModel.findById(res.body.projectId).lean();
    expect(project?.daNumber).toBe(daNumber);
  });

  it("returns 200 with notification sent correctly", async () => {
    const token = await getToken("Project", "Manager", PM_EMAIL, PASSWORD);

    const res = await request(app)
      .post("/project")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...validProjectBody, creatorRole: UserRole.PM });

    expect(res.status).toBe(200);

    const creator = await UserModel.findOne({ email: PM_EMAIL.toLowerCase() }).lean();
    expect(creator?._id).toBeDefined();

    const notification = await NotificationModel.findOne({
      recipientUserId: creator!._id.toString(),
      projectId: res.body.projectId,
      type: NotificationType.ProjectPendingApproval,
    }).lean();

    expect(notification).toBeTruthy();
    expect(notification?.message).toContain("pending admin approval");
    expect(notification?.read).toBe(false);
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
