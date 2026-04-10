import mongoose from "mongoose";
import {
  requestDelete,
  requestAuthRegister,
  requestForgotPassword,
  requestVerifyResetCode,
} from "../requestHelpers";

const EMAIL = "example@gmail.com";
const PASSWORD = "Abcdefgh123456$";

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

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

describe("POST /auth/verify-reset-code", () => {
  it("returns 200 when reset code is valid", async () => {
    await requestAuthRegister("Mubashir", "Hussain", PASSWORD, EMAIL);
    const res = await requestForgotPassword(EMAIL);

    const resetCode = res.body.code;
    const res1 = await requestVerifyResetCode(resetCode);

    expect(res1.statusCode).toBe(200);
  });

  it("returns 400 when reset code is invalid", async () => {
    await requestAuthRegister("Mubashir", "Hussain", PASSWORD, EMAIL);
    const res = await requestVerifyResetCode("123456");

    expect(res.statusCode).toStrictEqual(400);
  });
});
