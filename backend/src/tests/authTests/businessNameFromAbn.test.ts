import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../app";
import { requestDelete } from "../requestHelpers";
import { UserModel } from "../../models/userModel";
import { lookupAbn, businessNameForAbn, AbrNotFoundError } from "../../service/abr.service";

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

beforeAll(async () => {
  if (!process.env.MONGODB_TEST_URI) {
    throw new Error(
      "MONGODB_TEST_URI is not set. Copy backend/.env.example to backend/.env and set MONGODB_URI."
    );
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI, MONGO_OPTIONS);
  }
}, 10000);

beforeEach(async () => {
  await requestDelete();
});

afterEach(async () => {
  await requestDelete();
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}, 10000);

/*
  businessName is the registered name for the ABN, not something a caller may
  set. It used to be an editable box on sign-up prefilled from the ABR, so
  people typed their trade over it and that is what got stored.
*/
describe("businessName is derived from the ABN, never from the request", () => {
  it("ignores a businessName sent to /auth/register", async () => {
    // Posted directly rather than through requestAuthRegister — that helper
    // takes a fixed positional signature with no abn or businessName.
    const res = await request(app).post("/auth/register").send({
      firstName: "Trade",
      lastName: "Tester",
      password: "SecurePassword123!",
      email: "derive@abn-test.com",
      abn: "12345678901",
      businessName: "Plumbing",
    });

    expect([200, 201]).toContain(res.status);
    const user = await UserModel.findOne({ email: "derive@abn-test.com" }).lean();
    expect(user?.businessName).not.toBe("Plumbing");
  });
});

describe("lookupAbn", () => {
  it("rejects an ABN that is not 11 digits", async () => {
    await expect(lookupAbn("123")).rejects.toBeInstanceOf(AbrNotFoundError);
  });

  it("returns null rather than throwing when the ABR cannot be reached", async () => {
    // The suite runs with the ABR disabled, so this exercises the path a caller
    // depends on: a lookup failure must not take registration down with it.
    await expect(businessNameForAbn("12345678901")).resolves.toBeNull();
  });
});
