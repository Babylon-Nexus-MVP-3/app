import mongoose from "mongoose";
import {
  requestDelete,
  requestAuthRegister,
  requestForgotPassword,
  requestVerifyResetCode,
  requestResendResetCode,
  resetPassword,
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
  if (!process.env.MONGODB_TEST_URI) {
    throw new Error(
      "MONGODB_TEST_URI is not set. Copy backend/.env.example to backend/.env and set MONGODB_URI."
    );
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI, MONGO_OPTIONS);
  }
}, 10000);

describe("POST /auth/verify-reset-code", () => {
  it("returns 200 when reset code is valid", async () => {
    await requestAuthRegister("Mubashir", "Hussain", PASSWORD, EMAIL);
    const res = await requestForgotPassword(EMAIL);

    const resetCode = res.body.code;
    const res1 = await requestVerifyResetCode(EMAIL, resetCode);

    expect(res1.statusCode).toBe(200);
  });

  it("returns 400 when reset code is invalid", async () => {
    await requestAuthRegister("Mubashir", "Hussain", PASSWORD, EMAIL);
    const res = await requestVerifyResetCode(EMAIL, "123456");

    expect(res.statusCode).toStrictEqual(400);
  });
});

/*
  The IP rate limiter alone doesn't bound guesses at one account's code — an
  attacker with many addresses gets five tries from each. The code itself now
  allows five wrong guesses, then must be re-requested.
*/
describe("reset code attempt limit", () => {
  // A code that can't be the real one: the real code is fixed per test.
  const wrongFor = (code: string) => (code === "000000" ? "111111" : "000000");

  it("burns the code after five wrong guesses, even if the right one follows", async () => {
    await requestAuthRegister("Mubashir", "Hussain", PASSWORD, EMAIL);
    const code = (await requestForgotPassword(EMAIL)).body.code;

    for (let i = 0; i < 5; i++) {
      expect((await requestVerifyResetCode(EMAIL, wrongFor(code))).statusCode).toBe(400);
    }

    expect((await requestVerifyResetCode(EMAIL, code)).statusCode).toBe(400);
    expect((await resetPassword(EMAIL, code, "Zyxwvuts987654$")).statusCode).toBe(400);
  });

  it("doesn't count correct checks against the limit", async () => {
    await requestAuthRegister("Mubashir", "Hussain", PASSWORD, EMAIL);
    const code = (await requestForgotPassword(EMAIL)).body.code;

    for (let i = 0; i < 4; i++) {
      await requestVerifyResetCode(EMAIL, wrongFor(code));
    }
    expect((await requestVerifyResetCode(EMAIL, code)).statusCode).toBe(200);
    expect((await resetPassword(EMAIL, code, "Zyxwvuts987654$")).statusCode).toBe(200);
  });

  it("starts a fresh count when a new code is sent", async () => {
    await requestAuthRegister("Mubashir", "Hussain", PASSWORD, EMAIL);
    const first = (await requestForgotPassword(EMAIL)).body.code;
    for (let i = 0; i < 5; i++) {
      await requestVerifyResetCode(EMAIL, wrongFor(first));
    }

    const second = (await requestResendResetCode(EMAIL)).body.code;

    expect((await requestVerifyResetCode(EMAIL, second)).statusCode).toBe(200);
  });
});
