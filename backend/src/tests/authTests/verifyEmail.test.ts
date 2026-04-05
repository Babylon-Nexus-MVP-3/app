import {
  requestDelete,
  requestAuthRegister,
  requestVerifyEmail,
  verifyEmail,
} from "../requestHelpers";
import mongoose from "mongoose";

beforeEach(async () => {
  await requestDelete();
});

afterEach(async () => {
  await requestDelete();
});

beforeAll(async () => {
  // Ensure DB is connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!);
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe("Success", () => {
  test("verifyEmail marks user as verified", async () => {
    const res = await requestAuthRegister(
      "Mubashir",
      "Hussain",
      "Abcdefgh123456$",
      "example@gmail.com"
    );
    await verifyEmail("example@gmail.com", res.body.code);
  });
});

describe("Error", () => {
  test("Invalid Verification Code", async () => {
    await requestAuthRegister("Mubashir", "Hussain", "Abcdefgh123456$", "example@gmail.com");
    const res = await requestVerifyEmail("123456");
    expect(res.statusCode).toStrictEqual(400);
  });
});
