import mongoose from "mongoose";
import { UserModel } from "../../models/userModel";
import {
  requestDelete,
  requestAuthRegister,
  requestAuthLogin,
  verifyEmail,
} from "../requestHelpers";

const EMAIL = "probe@example.com";
const PASSWORD = "Abcdefgh123456$";

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

/*
  Sign-in used to report "not verified" or "deactivated" before checking the
  password, so anyone could learn an email's account state without knowing
  the password. Those answers now come only after the password matches.
*/
describe("login does not reveal account state to a wrong password", () => {
  it("says only 'Invalid credentials' for an unverified account", async () => {
    const reg = await requestAuthRegister("Pro", "Be", PASSWORD, EMAIL);
    expect(reg.status).toBe(201);

    const wrong = await requestAuthLogin(EMAIL, "WrongPassword1!");
    expect(wrong.status).toBe(400);
    expect(wrong.body.error).toBe("Invalid credentials");

    const right = await requestAuthLogin(EMAIL, PASSWORD);
    expect(right.body.error).toBe("User email is not verified");
  });

  it("says only 'Invalid credentials' for a deactivated account", async () => {
    const reg = await requestAuthRegister("Pro", "Be", PASSWORD, EMAIL);
    await verifyEmail(EMAIL, reg.body.code);
    await UserModel.updateOne({ email: EMAIL }, { $set: { deletedAt: new Date() } });

    const wrong = await requestAuthLogin(EMAIL, "WrongPassword1!");
    expect(wrong.status).toBe(400);
    expect(wrong.body.code).toBeUndefined();

    const right = await requestAuthLogin(EMAIL, PASSWORD);
    expect(right.status).toBe(403);
    expect(right.body.code).toBe("ACCOUNT_DEACTIVATED");
  });

  it("answers an unknown email the same way as a wrong password", async () => {
    const res = await requestAuthLogin("nobody@example.com", PASSWORD);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Invalid credentials");
  });
});
