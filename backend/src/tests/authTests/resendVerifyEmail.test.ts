import {
  requestDelete,
  requestAuthRegister,
  requestVerifyEmail,
  requestResendVerification,
} from "../requestHelpers";
import mongoose from "mongoose";
import { UserModel } from "../../models/userModel";

beforeEach(async () => {
  await requestDelete();
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
    await mongoose.connect(process.env.MONGODB_URI);
  }
});

describe("Success", () => {
  test("Sent Successfully", async () => {
    await requestAuthRegister("Mubashir", "Hussain", "Abcdefgh123456$", "example@gmail.com");

    await requestResendVerification("example@gmail.com");
    // Get the verification code directly from DB
    const user = await UserModel.findOne({ email: "example@gmail.com" });
    const verificationCode = user?.verificationCode;

    const response = await requestVerifyEmail(verificationCode);
    expect(response.statusCode).toBe(200);

    // Verify user is actually verified from db
    const updatedUser = await UserModel.findOne({ email: "example@gmail.com" });
    expect(updatedUser?.emailVerified).toBe(true);
    expect(updatedUser?.verificationCode).toBe(null);
  });
});

describe("Error", () => {
  test("Invalid Email", async () => {
    await requestAuthRegister("Mubashir", "Hussain", "Abcdefgh123456$", "example@gmail.com");
    const res = await requestResendVerification("invalid@gmail.com");
    const data = res.body;

    expect(res.statusCode).toStrictEqual(400);
    expect(data).toStrictEqual({ error: expect.any(String) });
  });
});
