import mongoose from "mongoose";
import { UserModel } from "../../models/userModel";
import { RefreshTokenModel } from "../../models/refreshTokenModel";
import {
  requestAuthLogin,
  requestAuthRegister,
  requestDelete,
  requestDeleteAccount,
  requestRefreshToken,
  verifyEmail,
} from "../requestHelpers";

const EMAIL = "delete-account@example.com";
const PASSWORD = "DeleteAccount123!";

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

let accessToken: string;
let refreshToken: string;

beforeAll(async () => {
  if (!process.env.MONGODB_TEST_URI) {
    throw new Error(
      "MONGODB_TEST_URI is not set. Copy backend/.env.example to backend/.env and set MONGODB_URI."
    );
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI, MONGO_OPTIONS);
  }
}, 15000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}, 15000);

beforeEach(async () => {
  await requestDelete();

  const registerRes = await requestAuthRegister("Delete", "Account", PASSWORD, EMAIL);
  expect(registerRes.statusCode).toStrictEqual(201);

  await verifyEmail(EMAIL, registerRes.body.code);

  const loginRes = await requestAuthLogin(EMAIL, PASSWORD);
  expect(loginRes.statusCode).toStrictEqual(200);

  accessToken = loginRes.body.accessToken;
  refreshToken = loginRes.body.refreshToken;
});

afterEach(async () => {
  await requestDelete();
});

describe("DELETE /auth/delete-account", () => {
  it("soft-deletes the user and revokes refresh tokens", async () => {
    const res = await requestDeleteAccount(accessToken);

    expect(res.statusCode).toStrictEqual(200);
    expect(res.body).toStrictEqual({ success: true });

    const deletedUser = await UserModel.findOne({ email: EMAIL });
    expect(deletedUser?.deletedAt).toBeInstanceOf(Date);

    const revokedToken = await RefreshTokenModel.findOne({ token: refreshToken });
    expect(revokedToken).toBeNull();

    const refreshRes = await requestRefreshToken(refreshToken);
    expect(refreshRes.statusCode).toStrictEqual(400);
    expect(refreshRes.body).toStrictEqual({ error: expect.any(String) });
  });

  it("keeps deletedAt on a 30 day TTL instead of hard deleting immediately", () => {
    const indexes = UserModel.schema.indexes() as Array<[Record<string, number>, Record<string, number>]>;
    const deletedAtIndex = indexes.find(([fields]) => fields.deletedAt === 1)?.[1];

    expect(deletedAtIndex).toMatchObject({
      expireAfterSeconds: 30 * 24 * 60 * 60,
    });
  });
});
