import mongoose from "mongoose";
import { requestDelete, requestAuthRegister, requestForgotPassword } from "../requestHelpers";

const EMAIL = "example@gmail.com";
const PASSWORD = "Abcdefgh1234$";

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
  if (!process.env.MONGODB_TEST_URI) {
    throw new Error(
      "MONGODB_TEST_URI is not set. Copy backend/.env.example to backend/.env and set MONGODB_URI."
    );
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI, MONGO_OPTIONS);
  }
}, 10000);

describe("POST /auth/forgot-password", () => {
  it("returns 200 when email is sent successfully", async () => {
    await requestAuthRegister("Mubashir", "Hussain", PASSWORD, EMAIL);
    const res = await requestForgotPassword(EMAIL);

    expect(res.statusCode).toStrictEqual(200);
    expect(res.body).toStrictEqual({ success: true, code: expect.any(String) });
  });

  it("returns 200 when email does not exist but with no code", async () => {
    await requestAuthRegister("Mubashir", "Hussain", PASSWORD, EMAIL);
    const res = await requestForgotPassword("invalid@gmail.com");

    expect(res.statusCode).toStrictEqual(200);
    expect(res.body.code).toBeUndefined();
  });
});
