import mongoose from "mongoose";
import { UserModel } from "../../models/userModel";
import { RefreshTokenModel } from "../../models/refreshTokenModel";
import {
  requestAuthLogin,
  requestAuthRegister,
  requestDelete,
  requestDeleteAccount,
  requestRefreshToken,
  requestReactivateAccount,
  verifyEmail,
} from "../requestHelpers";

const EMAIL = "delete-account@example.com";
const PASSWORD = "DeleteAccount123!";
const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

let accessToken: string;
let refreshToken: string;
let userId: string;

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
  userId = loginRes.body.user.id;
});

afterEach(async () => {
  await requestDelete();
});

describe("DELETE /auth/delete-account", () => {
  describe("success", () => {
    it("returns 200 with { success: true }", async () => {
      const res = await requestDeleteAccount(accessToken);

      expect(res.statusCode).toStrictEqual(200);
      expect(res.body).toStrictEqual({ success: true });
    });

    it("soft-deletes the user by setting deletedAt", async () => {
      const before = await UserModel.findOne({ email: EMAIL });
      expect(before?.deletedAt).toBeFalsy();

      await requestDeleteAccount(accessToken);

      const after = await UserModel.findOne({ email: EMAIL });
      expect(after?.deletedAt).toBeInstanceOf(Date);
      // Record still exists (soft delete, not hard delete)
      expect(after).not.toBeNull();
    });

    it("revokes the active refresh token", async () => {
      await requestDeleteAccount(accessToken);

      const revokedToken = await RefreshTokenModel.findOne({ token: refreshToken });
      expect(revokedToken).toBeNull();
    });

    it("revokes all refresh tokens when the user has multiple active sessions", async () => {
      // Establish a second session
      const loginRes2 = await requestAuthLogin(EMAIL, PASSWORD);
      const refreshToken2 = loginRes2.body.refreshToken;

      const tokensBefore = await RefreshTokenModel.find({ user: userId });
      expect(tokensBefore.length).toBeGreaterThanOrEqual(2);

      await requestDeleteAccount(accessToken);

      const tokensAfter = await RefreshTokenModel.find({ user: userId });
      expect(tokensAfter).toHaveLength(0);

      // Both tokens should be invalid
      const refresh1Res = await requestRefreshToken(refreshToken);
      expect(refresh1Res.statusCode).toStrictEqual(400);

      const refresh2Res = await requestRefreshToken(refreshToken2);
      expect(refresh2Res.statusCode).toStrictEqual(400);
    });

    it("makes all refresh tokens unusable after deletion", async () => {
      await requestDeleteAccount(accessToken);

      const refreshRes = await requestRefreshToken(refreshToken);
      expect(refreshRes.statusCode).toStrictEqual(400);
      expect(refreshRes.body).toStrictEqual({ error: expect.any(String) });
    });

    it("prevents further authenticated requests with the old access token", async () => {
      await requestDeleteAccount(accessToken);

      // A second delete attempt with the same access token should fail —
      // the account no longer exists as an active user
      const retryRes = await requestDeleteAccount(accessToken);
      expect(retryRes.statusCode).not.toStrictEqual(200);
    });
  });

  describe("authentication failures", () => {
    it("returns 401 when no token is provided", async () => {
      const res = await requestDeleteAccount("");

      expect(res.statusCode).toStrictEqual(401);
      expect(res.body).toStrictEqual({ error: expect.any(String) });
    });

    it("returns 401 when a malformed token is provided", async () => {
      const res = await requestDeleteAccount("not.a.valid.jwt");

      expect(res.statusCode).toStrictEqual(401);
      expect(res.body).toStrictEqual({ error: expect.any(String) });
    });

    it("returns 401 when a structurally valid but tampered token is provided", async () => {
      const [header, payload] = accessToken.split(".");
      const tamperedToken = `${header}.${payload}.invalidsignature`;

      const res = await requestDeleteAccount(tamperedToken);

      expect(res.statusCode).toStrictEqual(401);
      expect(res.body).toStrictEqual({ error: expect.any(String) });
    });
  });

  describe("idempotency and edge cases", () => {
    it("returns an error when called twice with the same token", async () => {
      const first = await requestDeleteAccount(accessToken);
      expect(first.statusCode).toStrictEqual(200);

      const second = await requestDeleteAccount(accessToken);
      // The account is already deleted; should not succeed again
      expect(second.statusCode).not.toStrictEqual(200);
      expect(second.body).toStrictEqual({ error: expect.any(String) });
    });

    it("does not affect other users' accounts or tokens", async () => {
      const OTHER_EMAIL = "other-user@example.com";
      const OTHER_PASSWORD = "OtherUser123!";

      const otherRegister = await requestAuthRegister("Other", "User", OTHER_PASSWORD, OTHER_EMAIL);
      expect(otherRegister.statusCode).toStrictEqual(201);
      await verifyEmail(OTHER_EMAIL, otherRegister.body.code);

      const otherLogin = await requestAuthLogin(OTHER_EMAIL, OTHER_PASSWORD);
      expect(otherLogin.statusCode).toStrictEqual(200);
      const otherRefreshToken = otherLogin.body.refreshToken;
      const otherUserId = otherLogin.body.user.id;

      // Delete the primary test account
      await requestDeleteAccount(accessToken);

      // The other user should be unaffected
      const otherUser = await UserModel.findOne({ email: OTHER_EMAIL });
      expect(otherUser?.deletedAt).toBeFalsy();

      const otherTokens = await RefreshTokenModel.find({ user: otherUserId });
      expect(otherTokens.length).toBeGreaterThan(0);

      const otherRefreshRes = await requestRefreshToken(otherRefreshToken);
      expect(otherRefreshRes.statusCode).toStrictEqual(200);

      // Cleanup
      await UserModel.deleteOne({ email: OTHER_EMAIL });
      await RefreshTokenModel.deleteMany({ user: otherUserId });
    });
  });

  describe("reactivation flow", () => {
    it("allows a deleted account to be reactivated with correct credentials", async () => {
      await requestDeleteAccount(accessToken);

      const reactivateRes = await requestReactivateAccount(EMAIL, PASSWORD);
      expect(reactivateRes.statusCode).toStrictEqual(200);
      expect(reactivateRes.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: expect.objectContaining({ email: EMAIL }),
      });

      const user = await UserModel.findOne({ email: EMAIL });
      expect(user?.deletedAt).toBeNull();
    });

    it("does not allow reactivation of an account that was never deleted", async () => {
      // Account is active — reactivation should fail
      const reactivateRes = await requestReactivateAccount(EMAIL, PASSWORD);
      expect(reactivateRes.statusCode).toStrictEqual(400);
      expect(reactivateRes.body).toStrictEqual({ error: expect.any(String) });
    });

    it("does not allow reactivation with the wrong password", async () => {
      await requestDeleteAccount(accessToken);

      const reactivateRes = await requestReactivateAccount(EMAIL, "WrongPassword99!");
      expect(reactivateRes.statusCode).toStrictEqual(400);
      expect(reactivateRes.body).toStrictEqual({ error: expect.any(String) });
    });

    it("issues fresh tokens on reactivation that can be used to refresh", async () => {
      await requestDeleteAccount(accessToken);

      const reactivateRes = await requestReactivateAccount(EMAIL, PASSWORD);
      expect(reactivateRes.statusCode).toStrictEqual(200);

      const newRefreshToken = reactivateRes.body.refreshToken;
      const refreshRes = await requestRefreshToken(newRefreshToken);
      expect(refreshRes.statusCode).toStrictEqual(200);
    });
  });
});
