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
  businessName is the user's own answer about what they trade as. The ABR is a
  prefill and a fallback: trading under an unregistered name is normal, and an
  individual's registered name is their surname-first legal name, which is
  rarely what they call the business.
*/
describe("businessName is the user's, with the ABR as fallback", () => {
  it("stores the businessName sent to /auth/register", async () => {
    // Posted directly rather than through requestAuthRegister — that helper
    // takes a fixed positional signature with no abn or businessName.
    const res = await request(app).post("/auth/register").send({
      firstName: "Trade",
      lastName: "Tester",
      password: "SecurePassword123!",
      email: "derive@abn-test.com",
      abn: "12345678901",
      businessName: "Ritthick Plumbing Co",
    });

    expect([200, 201]).toContain(res.status);
    const user = await UserModel.findOne({ email: "derive@abn-test.com" }).lean();
    expect(user?.businessName).toBe("Ritthick Plumbing Co");
  });

  it("leaves businessName unset when neither the caller nor the ABR supplies one", async () => {
    // The suite runs with the ABR disabled, so this is the outage path: no name
    // given, none available, and registration still succeeds.
    const res = await request(app).post("/auth/register").send({
      firstName: "Trade",
      lastName: "Tester",
      password: "SecurePassword123!",
      email: "noname@abn-test.com",
      abn: "12345678902",
    });

    expect([200, 201]).toContain(res.status);
    const user = await UserModel.findOne({ email: "noname@abn-test.com" }).lean();
    expect(user?.businessName).toBeFalsy();
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
