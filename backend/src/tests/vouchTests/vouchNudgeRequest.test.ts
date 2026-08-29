import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../app";
import { requestDelete, getToken } from "../requestHelpers";
import { UserModel } from "../../models/userModel";
import { VouchRequestModel } from "../../models/vouchRequestModel";

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

const OWNER_EMAIL = "owner@nudge-test.com";
const OTHER_EMAIL = "other@nudge-test.com";
const PASSWORD = "SecurePassword123!";
const DAY_MS = 24 * 60 * 60 * 1000;

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

async function createRequest(fromUserId: string, overrides: Record<string, unknown> = {}) {
  return VouchRequestModel.create({
    fromUserId,
    fromFirstName: "Owner",
    fromLastName: "Test",
    fromCompany: "Owner Co",
    fromAbn: "12345678901",
    toEmail: "reference@nudge-test.com",
    toMobile: "0400000001",
    relationship: "Builder",
    projectName: "Site A",
    status: "pending",
    ...overrides,
  });
}

describe("POST /vouch/requests/:requestId/nudge", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).post(
      `/vouch/requests/${new mongoose.Types.ObjectId().toString()}/nudge`
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 for a malformed request id", async () => {
    const token = await getToken("Owner", "Test", OWNER_EMAIL, PASSWORD);
    const res = await request(app)
      .post("/vouch/requests/not-an-id/nudge")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it("blocks a second nudge inside the 24 hour cooldown", async () => {
    const token = await getToken("Owner", "Test", OWNER_EMAIL, PASSWORD);
    const userId = (await UserModel.findOne({ email: OWNER_EMAIL }).lean())!._id.toString();

    // Just created, so the reference has not had a day to respond yet.
    const vouchRequest = await createRequest(userId, { lastSentAt: new Date() });

    const res = await request(app)
      .post(`/vouch/requests/${vouchRequest._id}/nudge`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(429);
    expect(res.body.hoursLeft).toBeGreaterThan(0);
  });

  it("nudges once the cooldown has passed and records the time", async () => {
    const token = await getToken("Owner", "Test", OWNER_EMAIL, PASSWORD);
    const userId = (await UserModel.findOne({ email: OWNER_EMAIL }).lean())!._id.toString();

    const sentTwoDaysAgo = new Date(Date.now() - 2 * DAY_MS);
    const vouchRequest = await createRequest(userId, { lastSentAt: sentTwoDaysAgo });

    const res = await request(app)
      .post(`/vouch/requests/${vouchRequest._id}/nudge`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await VouchRequestModel.findById(vouchRequest._id).lean();
    expect(new Date(updated!.lastSentAt!).getTime()).toBeGreaterThan(sentTwoDaysAgo.getTime());
  });

  it("refuses to nudge a request that has already been answered", async () => {
    const token = await getToken("Owner", "Test", OWNER_EMAIL, PASSWORD);
    const userId = (await UserModel.findOne({ email: OWNER_EMAIL }).lean())!._id.toString();

    const vouchRequest = await createRequest(userId, {
      status: "responded",
      respondedAt: new Date(),
      lastSentAt: new Date(Date.now() - 2 * DAY_MS),
    });

    const res = await request(app)
      .post(`/vouch/requests/${vouchRequest._id}/nudge`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
  });

  it("will not let one user nudge on another user's behalf", async () => {
    await getToken("Owner", "Test", OWNER_EMAIL, PASSWORD);
    const ownerId = (await UserModel.findOne({ email: OWNER_EMAIL }).lean())!._id.toString();
    const vouchRequest = await createRequest(ownerId, {
      lastSentAt: new Date(Date.now() - 2 * DAY_MS),
    });

    const otherToken = await getToken("Other", "Test", OTHER_EMAIL, PASSWORD);

    const res = await request(app)
      .post(`/vouch/requests/${vouchRequest._id}/nudge`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(404);
  });
});

describe("DELETE /vouch/requests/:requestId", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).delete(
      `/vouch/requests/${new mongoose.Types.ObjectId().toString()}`
    );
    expect(res.status).toBe(401);
  });

  it("withdraws a pending request", async () => {
    const token = await getToken("Owner", "Test", OWNER_EMAIL, PASSWORD);
    const userId = (await UserModel.findOne({ email: OWNER_EMAIL }).lean())!._id.toString();
    const vouchRequest = await createRequest(userId);

    const res = await request(app)
      .delete(`/vouch/requests/${vouchRequest._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(await VouchRequestModel.findById(vouchRequest._id).lean()).toBeNull();
  });

  it("will not withdraw a request that has already been answered", async () => {
    const token = await getToken("Owner", "Test", OWNER_EMAIL, PASSWORD);
    const userId = (await UserModel.findOne({ email: OWNER_EMAIL }).lean())!._id.toString();
    const vouchRequest = await createRequest(userId, {
      status: "responded",
      respondedAt: new Date(),
    });

    const res = await request(app)
      .delete(`/vouch/requests/${vouchRequest._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(await VouchRequestModel.findById(vouchRequest._id).lean()).not.toBeNull();
  });

  it("will not let one user withdraw another user's request", async () => {
    await getToken("Owner", "Test", OWNER_EMAIL, PASSWORD);
    const ownerId = (await UserModel.findOne({ email: OWNER_EMAIL }).lean())!._id.toString();
    const vouchRequest = await createRequest(ownerId);
    const otherToken = await getToken("Other", "Test", OTHER_EMAIL, PASSWORD);

    const res = await request(app)
      .delete(`/vouch/requests/${vouchRequest._id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.status).toBe(404);
    expect(await VouchRequestModel.findById(vouchRequest._id).lean()).not.toBeNull();
  });
});
