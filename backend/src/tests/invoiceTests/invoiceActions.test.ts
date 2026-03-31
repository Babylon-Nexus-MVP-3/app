import mongoose from "mongoose";
import dotenv from "dotenv";
import {
  requestDelete,
  requestInvite,
  requestAcceptInvite,
  requestSubmitInvoice,
  requestApproveInvoice,
  requestMarkPaid,
  requestMarkReceived,
  requestRejectInvoice,
  getProjectId,
  getToken,
} from "../requestHelpers";
import { UserRole } from "../../models/userModel";
import { ProjectModel } from "../../models/projectModel";

dotenv.config();

const SUBBIE_EMAIL = "subbie@invoice-actions-test.com";
const BUILDER_EMAIL = "builder@invoice-actions-test.com";
const PASSWORD = "SecurePassword123!";

jest.setTimeout(20000);
const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

let subbieToken: string;
let builderToken: string;
let projectId: string;

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
  if (!process.env.MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Copy backend/.env.example to backend/.env and set MONGODB_URI."
    );
  }
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, MONGO_OPTIONS);
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
  await requestAcceptInvite(builderInviteRes.body.participant.inviteCode, builderToken);
});

afterEach(async () => {
  await requestDelete();
});

// ─── Full lifecycle ───────────────────────────────────────────────────────────

describe("Full invoice lifecycle", () => {
  it("Submitted → Approved → Paid → Received", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);

    const approveRes = await requestApproveInvoice(builderToken, projectId, invoiceId);
    expect(approveRes.statusCode).toBe(200);
    expect(approveRes.body).toEqual({ success: true });

    const paidRes = await requestMarkPaid(builderToken, projectId, invoiceId);
    expect(paidRes.statusCode).toBe(200);
    expect(paidRes.body).toEqual({ success: true });

    const receivedRes = await requestMarkReceived(subbieToken, projectId, invoiceId);
    expect(receivedRes.statusCode).toBe(200);
    expect(receivedRes.body).toEqual({ success: true });
  });
});

// ─── Approve ─────────────────────────────────────────────────────────────────

describe("PATCH /project/:projectId/invoice/:invoiceId/approve", () => {
  it("returns 200 when approverRole user approves a Pending invoice", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);
    const res = await requestApproveInvoice(builderToken, projectId, invoiceId);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("returns 403 when wrong role tries to approve", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);
    const res = await requestApproveInvoice(subbieToken, projectId, invoiceId);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe("You are not authorised to approve this invoice");
  });

  it("returns 400 when invoice is already Approved", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);
    await requestApproveInvoice(builderToken, projectId, invoiceId);
    const res = await requestApproveInvoice(builderToken, projectId, invoiceId);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invoice must be in Pending status to approve");
  });

  it("returns 404 when invoice does not exist", async () => {
    const fakeInvoiceId = new mongoose.Types.ObjectId().toString();
    const res = await requestApproveInvoice(builderToken, projectId, fakeInvoiceId);
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Invoice not found");
  });
});

// ─── Paid ─────────────────────────────────────────────────────────────────────

describe("PATCH /project/:projectId/invoice/:invoiceId/paid", () => {
  it("returns 200 when approverRole user marks an Approved invoice as Paid", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);
    await requestApproveInvoice(builderToken, projectId, invoiceId);
    const res = await requestMarkPaid(builderToken, projectId, invoiceId);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("returns 400 when invoice is still Pending (not yet Approved)", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);
    const res = await requestMarkPaid(builderToken, projectId, invoiceId);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invoice must be Approved before marking as paid");
  });

  it("returns 403 when wrong role tries to mark as Paid", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);
    await requestApproveInvoice(builderToken, projectId, invoiceId);
    const res = await requestMarkPaid(subbieToken, projectId, invoiceId);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe("You are not authorised to mark this invoice as paid");
  });

  it("returns 404 when invoice does not exist", async () => {
    const fakeInvoiceId = new mongoose.Types.ObjectId().toString();
    const res = await requestMarkPaid(builderToken, projectId, fakeInvoiceId);
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Invoice not found");
  });
});

// ─── Received ────────────────────────────────────────────────────────────────

describe("PATCH /project/:projectId/invoice/:invoiceId/received", () => {
  it("returns 200 when submitter marks a Paid invoice as Received", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);
    await requestApproveInvoice(builderToken, projectId, invoiceId);
    await requestMarkPaid(builderToken, projectId, invoiceId);
    const res = await requestMarkReceived(subbieToken, projectId, invoiceId);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("returns 403 when a non-submitter tries to mark as Received", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);
    await requestApproveInvoice(builderToken, projectId, invoiceId);
    await requestMarkPaid(builderToken, projectId, invoiceId);
    const res = await requestMarkReceived(builderToken, projectId, invoiceId);
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe("Only the invoice submitter can mark it as received");
  });

  it("returns 400 when invoice is not yet Paid", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);
    await requestApproveInvoice(builderToken, projectId, invoiceId);
    const res = await requestMarkReceived(subbieToken, projectId, invoiceId);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invoice must be Paid before marking as received");
  });

  it("returns 404 when invoice does not exist", async () => {
    const fakeInvoiceId = new mongoose.Types.ObjectId().toString();
    const res = await requestMarkReceived(subbieToken, projectId, fakeInvoiceId);
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Invoice not found");
  });
});

// ─── Reject ───────────────────────────────────────────────────────────────────

describe("PATCH /project/:projectId/invoice/:invoiceId/reject", () => {
  it("returns 200 when approverRole rejects a Pending invoice with a reason", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);
    const res = await requestRejectInvoice(builderToken, projectId, invoiceId, "Incorrect amount");
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("returns 200 when approverRole rejects a Pending invoice without a reason", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);
    const res = await requestRejectInvoice(builderToken, projectId, invoiceId);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("returns 403 when wrong role tries to reject", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);
    const res = await requestRejectInvoice(subbieToken, projectId, invoiceId, "reason");
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe("You are not authorised to reject this invoice");
  });

  it("returns 400 when invoice is already Approved (only Pending can be rejected)", async () => {
    const invoiceId = await submitTestInvoice(subbieToken, projectId);
    await requestApproveInvoice(builderToken, projectId, invoiceId);
    const res = await requestRejectInvoice(builderToken, projectId, invoiceId, "late submission");
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe("Invoice can only be rejected when Pending");
  });

  it("returns 404 when invoice does not exist", async () => {
    const fakeInvoiceId = new mongoose.Types.ObjectId().toString();
    const res = await requestRejectInvoice(builderToken, projectId, fakeInvoiceId);
    expect(res.statusCode).toBe(404);
    expect(res.body.error).toBe("Invoice not found");
  });
});
