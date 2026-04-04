import {
  requestAuthRegister,
  requestAuthLogin,
  requestRefreshToken,
  requestDelete,
} from "../requestHelpers";
import mongoose from "mongoose";
import { UserModel } from "../../models/userModel";

let token: string;

beforeEach(async () => {
  await requestDelete();
  const res1 = await requestAuthRegister(
    "Mubashir",
    "Hussain",
    "Abcdefgh1234$",
    "example@gmail.com"
  );
  await UserModel.updateOne(
    { _id: res1.body.userId },
    { $set: { emailVerified: true, status: "Active" } }
  );

  const res2 = await requestAuthLogin("example@gmail.com", "Abcdefgh1234$");
  token = res2.body.refreshToken;
});

afterEach(async () => {
  await requestDelete();
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeAll(async () => {
  // Ensure DB is connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
  }
});

describe("Success Cases", () => {
  test("Success", async () => {
    const res2 = await requestRefreshToken(token);
    const data = res2.body;
    expect(data).toStrictEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
    expect(res2.statusCode).toStrictEqual(200);
  });
});

describe("Error Cases", () => {
  test("Invalid Token", async () => {
    const res = await requestRefreshToken("invalid");
    const data = res.body;
    expect(data).toStrictEqual({ error: expect.any(String) });
    expect(res.statusCode).toStrictEqual(400);
  });
});
