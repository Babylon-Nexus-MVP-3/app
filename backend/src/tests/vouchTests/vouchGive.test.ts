import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../app";
import { requestDelete, getToken } from "../requestHelpers";
import { UserModel } from "../../models/userModel";
import { GivenVouchModel } from "../../models/givenVouchModel";

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
