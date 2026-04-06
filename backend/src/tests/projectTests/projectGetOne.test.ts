import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../app";
import { requestDelete, getToken } from "../requestHelpers";
import { ProjectModel } from "../../models/projectModel";
import { ProjectParticipantModel } from "../../models/projectParticipantModel";
import { InvoiceModel } from "../../models/invoiceModel";
import { UserModel, UserRole } from "../../models/userModel";

jest.setTimeout(30000);
const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

const PM_EMAIL = "pm@get-one-test.com";
const PASSWORD = "SecurePassword123!";

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

describe("GET /project/:projectId", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = await request(app).get(`/project/${new mongoose.Types.ObjectId().toString()}`);
    expect(res.status).toBe(401);
  });

  it("returns 200 with project details, role, metrics and invoices", async () => {
    const token = await getToken("Pm", "Test", PM_EMAIL, PASSWORD);

    const userId = (await UserModel.findOne({ email: PM_EMAIL }).lean())!._id.toString();

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const project = await ProjectModel.create({
      name: "Test Project",
      location: "123 St",
      council: "C1",
      status: "Active",
    });

    await ProjectParticipantModel.create({
      projectId: project._id.toString(),
      userId,
      role: "PM",
      email: PM_EMAIL,
      status: "Accepted",
    });

    // Previous month paid on time (June)
    await InvoiceModel.create({
      invoiceNumber: "INV-TEST-001",
      projectId: project._id.toString(),
      submittingParty: "ABC",
      submittingCategory: "Electrical",
      submittedByUserId: new mongoose.Types.ObjectId(userId),
      description: "Prev month on time",
      dateSubmitted: new Date(prevMonthStart.getTime() + 1 * 24 * 60 * 60 * 1000),
      dateDue: new Date(prevMonthStart.getTime() + 10 * 24 * 60 * 60 * 1000),
      datePaid: new Date(prevMonthStart.getTime() + 9 * 24 * 60 * 60 * 1000),
      amount: 1000,
      status: "Paid",
      approverRole: UserRole.Builder,
    });

    // Current month: one paid on time, one unpaid overdue
    await InvoiceModel.create({
      invoiceNumber: "INV-TEST-002",
      projectId: project._id.toString(),
      submittingParty: "DEF",
      submittingCategory: "Plumbing",
      submittedByUserId: new mongoose.Types.ObjectId(userId),
      description: "Current month on time",
      dateSubmitted: new Date(currentMonthStart.getTime() + 1 * 24 * 60 * 60 * 1000),
      dateDue: new Date(currentMonthStart.getTime() + 5 * 24 * 60 * 60 * 1000),
      datePaid: new Date(currentMonthStart.getTime() + 5 * 24 * 60 * 60 * 1000),
      amount: 2000,
      status: "Paid",
      approverRole: UserRole.Builder,
    });

    await InvoiceModel.create({
      invoiceNumber: "INV-TEST-003",
      projectId: project._id.toString(),
      submittingParty: "GHI",
      submittingCategory: "Concrete",
      submittedByUserId: new mongoose.Types.ObjectId(userId),
      description: "Overdue unpaid",
      dateSubmitted: new Date(currentMonthStart.getTime() + 1 * 24 * 60 * 60 * 1000),
      dateDue: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      amount: 3000,
      status: "Pending",
      approverRole: UserRole.Builder,
    });

    const res = await request(app)
      .get(`/project/${project._id.toString()}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.project).toEqual({
      id: project._id.toString(),
      name: "Test Project",
      location: "123 St",
      council: "C1",
    });
    expect(res.body.userRole).toBe("PM");

    // healthScore = % paid on/before due date among paid invoices (2/2 => 100)
    expect(res.body.healthScore).toBe(100);
    expect(res.body.overdueInvoiceCount).toBe(1);

    // Prev month health = 100, current month health = 100 => 0%
    expect(res.body.monthOnMonthHealthChangePct).toBe(0);

    expect(Array.isArray(res.body.invoices)).toBe(true);
    const overdue = res.body.invoices.find((i: any) => i.description === "Overdue unpaid");
    expect(overdue).toBeDefined();
    expect(overdue.amount).toBe(3000);
    expect(overdue.daysOverdue).toBeGreaterThan(0);
  });
});
