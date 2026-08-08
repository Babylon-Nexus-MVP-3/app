import mongoose from "mongoose";
import { UserModel } from "../../models/userModel";
import {
  requestDelete,
  requestAuthRegister,
  requestAuthLogin,
  verifyEmail,
} from "../requestHelpers";

const EMAIL = "lockout@example.com";
const PASSWORD = "Abcdefgh123456$";
const MAX_LOGIN_ATTEMPTS = 10;

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

async function createActiveUser() {
  const reg = await requestAuthRegister("Lock", "Out", PASSWORD, EMAIL);
  expect(reg.status).toBe(201);
  await verifyEmail(EMAIL, reg.body.code);
}

describe("per-account login lockout", () => {
  it("counts failed attempts and locks the account after the limit", async () => {
    await createActiveUser();

    for (let i = 0; i < MAX_LOGIN_ATTEMPTS - 1; i++) {
      const res = await requestAuthLogin(EMAIL, "WrongPassword1!");
      expect(res.status).toBe(400);
    }

    const beforeLock = await UserModel.findOne({ email: EMAIL });
    expect(beforeLock?.loginAttempts).toBe(MAX_LOGIN_ATTEMPTS - 1);
    expect(beforeLock?.accountLocked).toBe(false);

    const lockingAttempt = await requestAuthLogin(EMAIL, "WrongPassword1!");
    expect(lockingAttempt.status).toBe(400);

    const locked = await UserModel.findOne({ email: EMAIL });
    expect(locked?.accountLocked).toBe(true);
    expect(locked?.lockUntil?.getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects the correct password while the account is locked", async () => {
    await createActiveUser();
    await UserModel.updateOne(
      { email: EMAIL },
      { $set: { accountLocked: true, lockUntil: new Date(Date.now() + 15 * 60 * 1000) } }
    );

    const res = await requestAuthLogin(EMAIL, PASSWORD);
    expect(res.status).toBe(423);
    expect(res.body.error).toMatch(/Too many failed sign-in attempts/);
  });

  it("clears the lock state on a successful sign-in", async () => {
    await createActiveUser();
    await UserModel.updateOne(
      { email: EMAIL },
      { $set: { loginAttempts: 3, accountLocked: true, lockUntil: new Date(Date.now() - 1000) } }
    );

    const res = await requestAuthLogin(EMAIL, PASSWORD);
    expect(res.status).toBe(200);

    const user = await UserModel.findOne({ email: EMAIL });
    expect(user?.loginAttempts).toBe(0);
    expect(user?.accountLocked).toBe(false);
    expect(user?.lockUntil).toBeUndefined();
  });
});
