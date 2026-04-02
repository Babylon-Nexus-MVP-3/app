import { requestDelete, requestChangePassword, getToken } from "../requestHelpers";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

let token: string;
const PM_EMAIL = "pm@project-test.com";
const PASSWORD = "SecurePassword123!";

jest.setTimeout(15000);
const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

beforeEach(async () => {
  await requestDelete();
  token = await getToken("Project", "Manager", PM_EMAIL, PASSWORD);
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
  test("Password is changed", async () => {
    const res1 = await requestChangePassword(token, "SecurePassword123!", "NewerPassword1234*");
    const data1 = res1.body;

    expect(res1.statusCode).toStrictEqual(200);
    expect(data1).toStrictEqual({ success: true });
  });
});

describe("Error", () => {
  test("Current Password Invalid", async () => {
    const res1 = await requestChangePassword(token, "SecurePassword1234!", "NewerPassword1234*");

    expect(res1.statusCode).toStrictEqual(400);
    expect(res1.body).toStrictEqual({ error: expect.any(String) });
  });

  test("New Password is the same", async () => {
    const res1 = await requestChangePassword(token, "SecurePassword123!", "SecurePassword123!");
    const data1 = res1.body;

    expect(res1.statusCode).toStrictEqual(400);
    expect(data1).toStrictEqual({ error: expect.any(String) });
  });
});
