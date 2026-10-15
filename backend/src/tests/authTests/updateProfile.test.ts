import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../app";
import { requestDelete, getToken } from "../requestHelpers";
import { UserModel } from "../../models/userModel";

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };
const PASSWORD = "SecurePassword123!";
const ME_EMAIL = "me@profile-test.com";
const OTHER_EMAIL = "other@profile-test.com";
const ABN = "51824753556";

beforeAll(async () => {
  if (!process.env.MONGODB_TEST_URI) {
    throw new Error("MONGODB_TEST_URI is not set.");
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

function patchProfile(token: string, body: Record<string, unknown>) {
  return request(app).patch("/auth/profile").set("Authorization", `Bearer ${token}`).send(body);
}

describe("PATCH /auth/profile — ABN", () => {
  it("lets a user re-save their own ABN", async () => {
    const token = await getToken("Me", "Test", ME_EMAIL, PASSWORD);
    expect((await patchProfile(token, { abn: ABN, businessName: "Me Co" })).status).toBe(200);

    const res = await patchProfile(token, { abn: ABN, businessName: "Me Co Renamed" });

    expect(res.status).toBe(200);
    const me = await UserModel.findOne({ email: ME_EMAIL }).lean();
    expect(me?.businessName).toBe("Me Co Renamed");
  });

  it("returns 409, not 500, when another account holds the ABN", async () => {
    const otherToken = await getToken("Other", "Test", OTHER_EMAIL, PASSWORD);
    await patchProfile(otherToken, { abn: ABN, businessName: "Other Co" });
    const token = await getToken("Me", "Test", ME_EMAIL, PASSWORD);

    const res = await patchProfile(token, { abn: ABN, businessName: "Me Co" });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already registered/i);
  });

  it("rejects an ABN that isn't 11 digits", async () => {
    const token = await getToken("Me", "Test", ME_EMAIL, PASSWORD);

    const res = await patchProfile(token, { abn: "1234", businessName: "Me Co" });

    expect(res.status).toBe(400);
  });
});
