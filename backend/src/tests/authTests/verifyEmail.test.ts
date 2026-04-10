import {
  requestDelete,
  requestAuthRegister,
  requestVerifyEmail,
  verifyEmail,
} from "../requestHelpers";
import mongoose from "mongoose";

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

beforeEach(async () => {
  await requestDelete();
});

afterEach(async () => {
  await requestDelete();
});

beforeAll(async () => {
  // Ensure DB is connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI!, MONGO_OPTIONS);
  }
}, 15000);

afterAll(async () => {
  await mongoose.connection.close();
}, 15000);

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
