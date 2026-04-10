import mongoose from "mongoose";
import {
  getProjectId,
  getToken,
  requestAcceptInvite,
  requestApproveInvoice,
  requestInvite,
  requestMarkPaid,
  requestMarkReceived,
  requestRejectInvoice,
  requestSubmitInvoice,
  requestDelete,
} from "../requestHelpers";
import { UserRole } from "../../models/userModel";
import { ProjectModel } from "../../models/projectModel";
import { NotificationModel, NotificationType } from "../../models/notificationModel";

const SUBBIE_EMAIL = "subbie@notification-actions-test.com";
const BUILDER_EMAIL = "builder@notification-actions-test.com";
const PASSWORD = "SecurePassword123!";

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

let subbieToken: string;
let builderToken: string;
let projectId: string;
let subbieUserId: string;
let builderUserId: string;

async function submitTestInvoice(token: string, pId: string): Promise<string> {
  const res = await requestSubmitInvoice(
    token,
    pId,
    "ABC Electrical",
    "Electrical",
    "Phase 1 work",
    5000
  );
  expect(res.statusCode).toBe(200);
  return res.body.invoiceId as string;
}

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

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}, 10000);

beforeEach(async () => {
  await requestDelete();

  subbieToken = await getToken("Sub", "Contractor", SUBBIE_EMAIL, PASSWORD);
  projectId = await getProjectId(subbieToken, UserRole.Subbie);
  await ProjectModel.updateOne({ _id: projectId }, { $set: { status: "Active" } });

  const builderInviteRes = await requestInvite(
    projectId,
    subbieToken,
    BUILDER_EMAIL,
    UserRole.Builder
  );
  expect(builderInviteRes.status).toBe(200);

  builderToken = await getToken("Bob", "Builder", BUILDER_EMAIL, PASSWORD);
  await requestAcceptInvite(builderInviteRes.body.inviteCode, builderToken);

  // Decode user ids from access token payload segment
  const subPayload = JSON.parse(Buffer.from(subbieToken.split(".")[1], "base64").toString("utf8"));
  const builderPayload = JSON.parse(
    Buffer.from(builderToken.split(".")[1], "base64").toString("utf8")
  );
  subbieUserId = subPayload.sub;
  builderUserId = builderPayload.sub;
});

afterEach(async () => {
  await requestDelete();
});

describe("Immediate invoice action notifications", () => {
  it("Invoice submitted notifies the approver role participant", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);

    const notifications = await NotificationModel.find({
      invoiceId,
      recipientUserId: builderUserId,
      type: NotificationType.InvoiceSubmitted,
    }).lean();

    expect(notifications.length).toBe(1);
    expect(notifications[0].message).toContain("submitted invoice");
  });

  it("Invoice approved notifies the submitter", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);
    const approveRes = await requestApproveInvoice(builderToken, projectId, invoiceId);
    expect(approveRes.statusCode).toBe(200);

    const notifications = await NotificationModel.find({
      invoiceId,
      recipientUserId: subbieUserId,
      type: NotificationType.InvoiceApproved,
    }).lean();

    expect(notifications.length).toBe(1);
  });

  it("Invoice marked paid notifies the submitter", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);
    await requestApproveInvoice(builderToken, projectId, invoiceId);

    const paidRes = await requestMarkPaid(builderToken, projectId, invoiceId);
    expect(paidRes.statusCode).toBe(200);

    const notifications = await NotificationModel.find({
      invoiceId,
      recipientUserId: subbieUserId,
      type: NotificationType.InvoicePaid,
    }).lean();

    expect(notifications.length).toBe(1);
  });

  it("Invoice rejected notifies the submitter and includes reason", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);

    const rejectRes = await requestRejectInvoice(
      builderToken,
      projectId,
      invoiceId,
      "Incorrect amount"
    );
    expect(rejectRes.statusCode).toBe(200);

    const notifications = await NotificationModel.find({
      invoiceId,
      recipientUserId: subbieUserId,
      type: NotificationType.InvoiceRejected,
    }).lean();

    expect(notifications.length).toBe(1);
    expect(notifications[0].message).toContain("Incorrect amount");
  });

  it("Invoice received notifies the approver role participant", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);
    await requestApproveInvoice(builderToken, projectId, invoiceId);
    await requestMarkPaid(builderToken, projectId, invoiceId);

    const receivedRes = await requestMarkReceived(subbieToken, projectId, invoiceId);
    expect(receivedRes.statusCode).toBe(200);

    const notifications = await NotificationModel.find({
      invoiceId,
      recipientUserId: builderUserId,
      type: NotificationType.InvoiceReceived,
    }).lean();

    expect(notifications.length).toBe(1);
  });
});
