import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../app";
import {
  requestAuthLogin,
  requestAuthRegister,
  requestDelete,
  requestLogout,
  requestRefreshToken,
  verifyEmail,
} from "../requestHelpers";

const EMAIL = "logout@example.com";
const PASSWORD = "Abcdefgh123456$";

jest.setTimeout(15000);
const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

let accessToken: string;
let refreshToken: string;

beforeEach(async () => {
  await requestDelete();

  const registerRes = await requestAuthRegister("Mubashir", "Hussain", PASSWORD, EMAIL);
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

describe("POST /auth/logout", () => {
  it("returns 200 and revokes the refresh token", async () => {
    const logoutRes = await requestLogout(accessToken);

    expect(logoutRes.statusCode).toStrictEqual(200);
    expect(logoutRes.body).toStrictEqual({ success: true });

    const refreshRes = await requestRefreshToken(refreshToken);

    expect(refreshRes.statusCode).toStrictEqual(400);
    expect(refreshRes.body).toStrictEqual({ error: expect.any(String) });
  });

  it("returns 401 when Authorization header is missing", async () => {
    const res = await request(app).post("/auth/logout");

    expect(res.statusCode).toStrictEqual(401);
    expect(res.body).toStrictEqual({ error: "Authentication Required" });
  });
});
