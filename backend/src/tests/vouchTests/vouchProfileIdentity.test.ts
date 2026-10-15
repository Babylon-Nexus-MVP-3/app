import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../app";
import { requestDelete, getToken } from "../requestHelpers";
import { UserModel } from "../../models/userModel";
import { VouchProfileModel } from "../../models/vouchProfileModel";

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

const EMAIL = "identity@profile-test.com";
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
  const token = await getToken("Ida", "Owner", EMAIL, PASSWORD);
  const user = (await UserModel.findOne({ email: EMAIL }).lean())!;
  return { token, userId: user._id.toString() };
}

/*
  Received vouches are looked up purely by ABN, so the ABN on a vouch profile
  must be the one on the account — never whatever the request body says.
*/
describe("POST /vouch/profile identity", () => {
  it("ignores name and ABN in the body and copies them from the account", async () => {
    const { token, userId } = await signedInUser();
    await UserModel.findByIdAndUpdate(userId, { abn: "12345678901" });

    const res = await request(app)
      .post("/vouch/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({
        firstName: "Someone",
        lastName: "Else",
        abn: "98765432109",
        idType: "passport",
        idNumber: "BLD123456",
        idExpiry: "01/01/2030",
        idState: "NSW",
        references: [],
      });

    expect(res.status).toBe(201);
    const profile = await VouchProfileModel.findOne({ userId }).lean();
    expect(profile?.abn).toBe("12345678901");
    expect(profile?.firstName).toBe("Ida");
    expect(profile?.lastName).toBe("Owner");
    expect(profile?.idType).toBe("trade-licence");
    const user = await UserModel.findById(userId).lean();
    expect(user?.abn).toBe("12345678901");
  });

  it("does not give an account without an ABN someone else's", async () => {
    const { token, userId } = await signedInUser();

    await request(app).post("/vouch/profile").set("Authorization", `Bearer ${token}`).send({
      abn: "98765432109",
      idNumber: "BLD123456",
      idExpiry: "01/01/2030",
      references: [],
    });

    const profile = await VouchProfileModel.findOne({ userId }).lean();
    expect(profile?.abn).toBeUndefined();
    const user = await UserModel.findById(userId).lean();
    expect(user?.abn).toBeUndefined();
  });

  it("rejects licence fields that are not strings", async () => {
    const { token } = await signedInUser();

    const res = await request(app)
      .post("/vouch/profile")
      .set("Authorization", `Bearer ${token}`)
      .send({ idNumber: { $ne: null }, references: [] });

    expect(res.status).toBe(400);
  });
});
