import {
  requestDelete,
  requestAuthRegister,
  requestResendVerification,
  verifyEmail,
} from "../requestHelpers";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

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
    await verifyEmail("example@gmail.com");
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
