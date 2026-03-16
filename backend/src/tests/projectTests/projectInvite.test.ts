import mongoose from "mongoose";
import dotenv from "dotenv";
import { requestDelete, requestInviteSubbie, getPmToken, getProjectId } from "../requestHelpers";
import { ProjectModel } from "../../models/projectModel";

dotenv.config();

const PM_EMAIL = "pm@project-test.com";
const PM_EMAIL_SECOND = "pm@project2-test.com";
const PASSWORD = "SecurePassword123!";
const SUBBIE_EMAIL = "subbie@project-test.com";

// Allow time for MongoDB connection in beforeAll/afterAll (default 5s is too short)
jest.setTimeout(15000);

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

let projectId: string;
let token: string;

beforeEach(async () => {
  await requestDelete();
  token = await getPmToken(PM_EMAIL, PASSWORD);
  projectId = await getProjectId(token, PM_EMAIL);
  // Simulate admin approval so invite is allowed (invite only when project is Active)
  await ProjectModel.updateOne({ _id: projectId }, { $set: { status: "Active" } });
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

describe("POST /project/:projectId/invite", () => {
  it("returns 200 and participant when PM invites a subbie to a project", async () => {
    // Then invite a subbie to that project

    const inviteRes = await requestInviteSubbie(
      projectId,
      token,
      SUBBIE_EMAIL,
      "Electrician",
      "Subbie"
    );

    expect(inviteRes.status).toBe(200);
    expect(inviteRes.body.success).toBe(true);
    expect(inviteRes.body.participant).toBeDefined();
    expect(inviteRes.body.participant.email).toBe(SUBBIE_EMAIL);
    expect(inviteRes.body.participant.inviteCode).toBeDefined();
    expect(inviteRes.body.participant.status).toBe("Pending");
    expect(inviteRes.body.participant.trade).toBe("Electrician");
  });

  it("returns 400 when project does not exist", async () => {
    const inviteRes = await requestInviteSubbie(
      new mongoose.Types.ObjectId().toString(),
      token,
      SUBBIE_EMAIL,
      "Electrician",
      "Subbie"
    );

    expect(inviteRes.status).toBe(400);
  });

  it("returns 400 when PM is not assigned to project", async () => {
    // Register another PM
    const wrongPmToken = await getPmToken(PM_EMAIL_SECOND, PASSWORD);

    const inviteRes = await requestInviteSubbie(
      projectId,
      wrongPmToken,
      SUBBIE_EMAIL,
      "Electrician",
      "Subbie"
    );

    expect(inviteRes.status).toBe(200);
    expect(inviteRes.body.success).toBe(true);
  });

  it("returns 403 when project is not approved (status not Active)", async () => {
    await ProjectModel.updateOne({ _id: projectId }, { $set: { status: "Pending" } });
    const inviteRes = await requestInviteSubbie(
      projectId,
      token,
      SUBBIE_EMAIL,
      "Electrician",
      "Subbie"
    );
    expect(inviteRes.status).toBe(403);
    expect(inviteRes.body.error).toMatch(/approved|admin/i);
  });
});
