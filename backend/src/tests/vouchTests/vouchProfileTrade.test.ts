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
  Trade used to live in three places — VouchProfile.trade (free text, wizard
  step 1), VouchProfile.tradeType (licence class, step 2) and User.businessTrade
  — and they drifted apart, so different screens showed different answers for
  the same person. There is one field now, User.businessTrade, and these cover
  the seams that collapse created.
*/
describe("trade has exactly one home", () => {
  it("writes businessTrade straight onto the user", async () => {
    const { token, userId } = await signedInUser();
    await UserModel.findByIdAndUpdate(userId, { abn: "12345678901" });

    const res = await request(app)
      .post("/vouch/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        idType: "trade-licence",
        businessTrade: "Carpentry",
        idNumber: "BLD123456",
        idExpiry: "01/01/2030",
        idState: "NSW",
        references: [],
      });

    expect(res.status).toBe(201);
    const user = await UserModel.findById(userId).lean();
    expect(user?.businessTrade).toBe("Carpentry");
  });

  it("does not store a copy of the trade on the profile document", async () => {
    const { token, userId } = await signedInUser();
    await UserModel.findByIdAndUpdate(userId, { abn: "12345678901" });

    const res = await request(app)
      .post("/vouch/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        idType: "trade-licence",
        businessTrade: "Plumbing",
        // Both retired fields — neither may be written back onto the profile.
        trade: "Carpentry",
        tradeType: "Roofing",
        idNumber: "BLD123456",
        idExpiry: "01/01/2030",
        idState: "NSW",
        references: [],
      });

    expect(res.status).toBe(201);
    // Cast through unknown: the retired fields are gone from the type, and the
    // point of this assertion is that they are gone from the document too.
    const profile = (await VouchProfileModel.findOne({ userId }).lean()) as unknown as Record<
      string,
      unknown
    > | null;
    expect(profile?.trade).toBeUndefined();
    expect(profile?.tradeType).toBeUndefined();
    const user = await UserModel.findById(userId).lean();
    expect(user?.businessTrade).toBe("Plumbing");
  });

  it("serves businessTrade from GET /vouch/profile/me so the wizard can rehydrate", async () => {
    const { token, userId } = await signedInUser();
    await UserModel.findByIdAndUpdate(userId, { abn: "12345678901" });

    await request(app).post("/vouch/profile").set("Authorization", `Bearer ${token}`).send({
      idType: "trade-licence",
      businessTrade: "Tiling",
      idNumber: "BLD123456",
      idExpiry: "01/01/2030",
      idState: "NSW",
      references: [],
    });

    const res = await request(app).get("/vouch/profile/me").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.businessTrade).toBe("Tiling");
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
