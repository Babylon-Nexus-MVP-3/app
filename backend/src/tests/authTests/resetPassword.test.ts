import mongoose from "mongoose";
import {
  requestDelete,
  requestAuthRegister,
  requestForgotPassword,
  requestVerifyResetCode,
  resetPassword,
} from "../requestHelpers";

const EMAIL = "example@gmail.com";
const PASSWORD = "Abcdefgh123456$";

jest.setTimeout(15000);
const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

let resetCode: string;

beforeEach(async () => {
  await requestDelete();

  await requestAuthRegister("Mubashir", "Hussain", PASSWORD, EMAIL);
  const res = await requestForgotPassword(EMAIL);
  resetCode = res.body.code;

  const res1 = await requestVerifyResetCode(resetCode);
  expect(res1.statusCode).toStrictEqual(200);
  expect(res1.body).toStrictEqual({ success: true });
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

describe("POST /auth/reset-password", () => {
  it("returns 200 when password is reset successfully", async () => {
    const res = await resetPassword(resetCode, "NewerPassword1234*");

    expect(res.statusCode).toStrictEqual(200);
    expect(res.body).toStrictEqual({
      success: true,
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      user: {
        id: expect.any(String),
        name: expect.any(String),
        email: expect.any(String),
        status: expect.any(String),
      },
    });
  });

  it("returns 400 when using the same password", async () => {
    const res = await resetPassword(resetCode, PASSWORD);

    expect(res.statusCode).toStrictEqual(400);
    expect(res.body).toStrictEqual({ error: expect.any(String) });
  });
});
