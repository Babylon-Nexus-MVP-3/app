import { requestDelete, requestAuthRegister, requestResendVerification } from "../requestHelpers";
import mongoose from "mongoose";

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
    await mongoose.connect(process.env.MONGODB_URI!);
  }
});

describe("Success", () => {
  test("Sent Successfully", async () => {
    await requestAuthRegister("Mubashir", "Hussain", "Abcdefgh123456$", "example@gmail.com");

    const res = await requestResendVerification("example@gmail.com");

    expect(res.statusCode).toStrictEqual(200);
    expect(res.body).toStrictEqual({ success: true, code: expect.any(String) });
  });
});

describe("Error", () => {
  test("Invalid Email with no code sent", async () => {
    await requestAuthRegister("Mubashir", "Hussain", "Abcdefgh123456$", "example@gmail.com");
    const res = await requestResendVerification("invalid@gmail.com");
    const data = res.body;

    expect(res.statusCode).toStrictEqual(200);
    expect(data.code).toBeUndefined();
  });
});
