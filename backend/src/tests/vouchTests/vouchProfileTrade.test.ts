import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../app";
import { requestDelete, getToken } from "../requestHelpers";
import { UserModel } from "../../models/userModel";
import { VouchProfileModel } from "../../models/vouchProfileModel";
import { getProfileCompletion } from "../../service/vouchProfile.service";

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

const EMAIL = "trade@profile-test.com";
const PASSWORD = "SecurePassword123!";

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

async function signedInUser() {
  const token = await getToken("Trade", "Tester", EMAIL, PASSWORD);
  const user = (await UserModel.findOne({ email: EMAIL }).lean())!;
  return { token, userId: user._id.toString() };
}

/*
  Trade used to be asked twice — free text in wizard step 1 and as the licence
  class in step 2 — and the two answers drifted apart. Step 2 is now the only
  place it is collected, so these cover the seam that move created: the User's
  businessTrade must follow tradeType, and step 1 must still be able to complete
  now that it has no field of its own.
*/
describe("trade is collected once, in step 2", () => {
  it("mirrors tradeType onto the user's businessTrade", async () => {
    const { token, userId } = await signedInUser();
    await UserModel.findByIdAndUpdate(userId, { abn: "12345678901" });

    const res = await request(app)
      .post("/vouch/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        idType: "trade-licence",
        tradeType: "Carpentry",
        idNumber: "BLD123456",
        idExpiry: "01/01/2030",
        idState: "NSW",
        references: [],
      });

    expect(res.status).toBe(201);
    const user = await UserModel.findById(userId).lean();
    expect(user?.businessTrade).toBe("Carpentry");
  });

  it("ignores a `trade` field in the body — it is no longer writable", async () => {
    const { token, userId } = await signedInUser();
    await UserModel.findByIdAndUpdate(userId, { abn: "12345678901" });

    const res = await request(app)
      .post("/vouch/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        idType: "trade-licence",
        tradeType: "Plumbing",
        trade: "Carpentry",
        idNumber: "BLD123456",
        idExpiry: "01/01/2030",
        idState: "NSW",
        references: [],
      });

    expect(res.status).toBe(201);
    const profile = await VouchProfileModel.findOne({ userId }).lean();
    expect(profile?.tradeType).toBe("Plumbing");
    expect(profile?.trade).toBeUndefined();
    const user = await UserModel.findById(userId).lean();
    expect(user?.businessTrade).toBe("Plumbing");
  });
});

describe("getProfileCompletion", () => {
  it("counts step 1 as done from sign-up details alone, without a trade", async () => {
    const { userId } = await signedInUser();
    await UserModel.findByIdAndUpdate(userId, { abn: "12345678901" });

    const completion = await getProfileCompletion(userId);

    expect(completion.stepsDone[0]).toBe(true);
    expect(completion.profileStrength).toBe(50);
    expect(completion.isComplete).toBe(false);
  });

  it("leaves step 1 incomplete without an ABN", async () => {
    const { userId } = await signedInUser();

    const completion = await getProfileCompletion(userId);

    expect(completion.stepsDone[0]).toBe(false);
    expect(completion.profileStrength).toBe(0);
  });

  it("reaches 100% once the licence is saved", async () => {
    const { token, userId } = await signedInUser();
    await UserModel.findByIdAndUpdate(userId, { abn: "12345678901" });

    await request(app).post("/vouch/profile").set("Authorization", `Bearer ${token}`).send({
      idType: "trade-licence",
      tradeType: "Electrical",
      idNumber: "BLD123456",
      idExpiry: "01/01/2030",
      idState: "NSW",
      references: [],
    });

    const completion = await getProfileCompletion(userId);

    expect(completion.isComplete).toBe(true);
    expect(completion.profileStrength).toBe(100);
  });
});
