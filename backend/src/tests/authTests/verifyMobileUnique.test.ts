import mongoose from "mongoose";
import request from "supertest";
import { app } from "../../app";
import { UserModel } from "../../models/userModel";
import { requestDelete, getToken } from "../requestHelpers";

const PASSWORD = "Abcdefgh123456$";
const MOBILE = "0412345678";

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

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

function verifyMobile(token: string, mobile: string) {
  return request(app)
    .post("/auth/verify-mobile-otp")
    .set("Authorization", `Bearer ${token}`)
    .send({ mobile, code: "123456" });
}

describe("POST /auth/verify-mobile-otp", () => {
  it("attaches the number to the account on first verification", async () => {
    const token = await getToken("First", "User", "first@example.com", PASSWORD);

    const res = await verifyMobile(token, MOBILE);
    expect(res.status).toBe(200);

    const user = await UserModel.findOne({ email: "first@example.com" });
    expect(user?.mobile).toBe(MOBILE);
    expect(user?.mobileVerified).toBe(true);
  });

  it("rejects a number already verified on another account", async () => {
    const firstToken = await getToken("First", "User", "first@example.com", PASSWORD);
    expect((await verifyMobile(firstToken, MOBILE)).status).toBe(200);

    const secondToken = await getToken("Second", "User", "second@example.com", PASSWORD);
    const res = await verifyMobile(secondToken, MOBILE);

    expect(res.status).toBe(409);

    const second = await UserModel.findOne({ email: "second@example.com" });
    expect(second?.mobileVerified).toBe(false);
    expect(second?.mobile).toBeUndefined();
  });

  it("allows re-verifying the same number on the same account", async () => {
    const token = await getToken("First", "User", "first@example.com", PASSWORD);
    expect((await verifyMobile(token, MOBILE)).status).toBe(200);
    expect((await verifyMobile(token, MOBILE)).status).toBe(200);
  });
});
