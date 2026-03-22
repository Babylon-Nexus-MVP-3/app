import { requestDelete, requestAuthRegister, requestVerifyEmail } from "../requestHelpers";
import { UserModel } from "../../models/userModel";
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

beforeEach(async () => {
  await requestDelete();
});

afterEach(async () => {
  await requestDelete();
});

beforeAll(async () => {
  // Ensure DB is connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Success", () => {
  test("verifyEmail marks user as verified", async () => {
    await requestAuthRegister("Mubashir", "Hussain", "Abcdefgh123456$", "example@gmail.com");

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
  test("Invalid Verification Code", async () => {
    await requestAuthRegister("Mubashir", "Hussain", "Abcdefgh123456$", "example@gmail.com");
    const res = await requestVerifyEmail("123456");
    expect(res.statusCode).toStrictEqual(400);
  });
});
