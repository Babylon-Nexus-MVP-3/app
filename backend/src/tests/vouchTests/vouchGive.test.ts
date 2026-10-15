import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../app";
import { requestDelete, getToken } from "../requestHelpers";
import { UserModel } from "../../models/userModel";
import { GivenVouchModel } from "../../models/givenVouchModel";
import { VouchRequestModel } from "../../models/vouchRequestModel";

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

const EMAIL = "giver@give-test.com";
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
  const token = await getToken("Gina", "Giver", EMAIL, PASSWORD);
  const user = (await UserModel.findOne({ email: EMAIL }).lean())!;
  return { token, userId: user._id.toString() };
}

async function give(token: string, body: Record<string, unknown>) {
  return request(app).post("/vouch/give").set("Authorization", `Bearer ${token}`).send(body);
}

/*
  The attribute pick-list and the minimum of two are enforced by the app, but
  the endpoint is callable directly — these cover the same rules server-side.
*/
describe("POST /vouch/give validation", () => {
  it.each([
    ["a spaced ABN", { toAbn: "51 824 753 556", attributes: ["Honest", "Reliable"] }],
    ["an operator object as the ABN", { toAbn: { $ne: null }, attributes: ["Honest", "Reliable"] }],
    ["one attribute", { toAbn: "51824753556", attributes: ["Honest"] }],
    ["a repeated attribute", { toAbn: "51824753556", attributes: ["Honest", "Honest"] }],
    ["an unlisted attribute", { toAbn: "51824753556", attributes: ["Honest", "Never pays"] }],
    ["no attributes", { toAbn: "51824753556" }],
    [
      "an over-long note",
      { toAbn: "51824753556", attributes: ["Honest", "Reliable"], note: "x".repeat(1001) },
    ],
    [
      "a non-string business name",
      { toAbn: "51824753556", attributes: ["Honest", "Reliable"], toBusinessName: { a: 1 } },
    ],
  ])("rejects %s", async (_label, body) => {
    const { token } = await signedInUser();

    const res = await give(token, body);

    expect(res.status).toBe(400);
    expect(await GivenVouchModel.countDocuments({})).toBe(0);
  });
});

/*
  The exists() checks in the routes can't stop two concurrent requests — both
  pass before either writes. These pin the indexes that do.
*/
describe("vouch uniqueness indexes", () => {
  beforeAll(async () => {
    await Promise.all([GivenVouchModel.init(), VouchRequestModel.init()]);
  });

  afterEach(async () => {
    await Promise.all([GivenVouchModel.deleteMany({}), VouchRequestModel.deleteMany({})]);
  });

  it("refuses a second vouch from the same giver to the same ABN", async () => {
    const fromUserId = new mongoose.Types.ObjectId();
    const vouch = { fromUserId, toAbn: "51824753556", attributes: ["Honest", "Reliable"] };
    await GivenVouchModel.create(vouch);

    await expect(GivenVouchModel.create(vouch)).rejects.toMatchObject({ code: 11000 });
  });

  it("allows one pending request per address, but a new one after an ignore", async () => {
    const request = {
      fromUserId: new mongoose.Types.ObjectId(),
      fromFirstName: "Gina",
      fromCompany: "Giver Co",
      fromAbn: "51824753556",
      toEmail: "ref@example.com",
      relationship: "Client",
    };
    const first = await VouchRequestModel.create(request);

    await expect(VouchRequestModel.create(request)).rejects.toMatchObject({ code: 11000 });

    await VouchRequestModel.updateOne({ _id: first._id }, { status: "ignored" });
    await expect(VouchRequestModel.create(request)).resolves.toBeDefined();
  });

  it("ignores legacy mobile-only requests, which have no email", async () => {
    // Pre-email requests carry toEmail "" and were addressed by mobile, so two
    // pending ones from one sender are two different references.
    const legacy = {
      fromUserId: new mongoose.Types.ObjectId(),
      fromFirstName: "Gina",
      fromCompany: "Giver Co",
      fromAbn: "51824753556",
      relationship: "Other",
    };
    // Inserted raw: the schema now requires toEmail, but legacy rows predate that.
    await VouchRequestModel.collection.insertMany([
      { ...legacy, toEmail: "", toMobile: "+61400000001", status: "pending" },
      { ...legacy, toEmail: "", toMobile: "+61400000002", status: "pending" },
    ]);

    expect(await VouchRequestModel.countDocuments({ fromUserId: legacy.fromUserId })).toBe(2);
  });
});
