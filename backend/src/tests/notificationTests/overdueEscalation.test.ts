import request from "supertest";
import mongoose from "mongoose";
import { app } from "../../app";
import { UserModel, UserRole } from "../../models/userModel";
import { hashPassword } from "../../utils/authHelper";
import { ProjectModel } from "../../models/projectModel";
import { ProjectParticipantModel } from "../../models/projectParticipantModel";
import { InvoiceModel, InvoiceStatus } from "../../models/invoiceModel";
import { runOverdueInvoiceEscalations } from "../../service/notification.service";
import { NotificationModel, NotificationType } from "../../models/notificationModel";

const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

beforeAll(async () => {
  if (!process.env.MONGODB_TEST_URI) throw new Error("MONGODB_TEST_URI is not set.");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_TEST_URI, MONGO_OPTIONS);
  }
});

beforeEach(async () => {
  if (process.env.NODE_ENV === "test") {
    await request(app).delete("/clear");
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe("Overdue escalation notifications", () => {
  it("sends overdue milestone notifications once and prevents duplicates", async () => {
    const hashed = await hashPassword("SecurePassword123!");
    const user = await UserModel.create({
      name: "Escalation User",
      email: "escalation-user@test.com",
      password: hashed,
      status: "Active",
      emailVerified: true,
      role: UserRole.Owner,
    });

    const project = await ProjectModel.create({
      name: "Escalation Project",
      location: "Sydney",
      council: "Inner West",
      status: "Active",
    });

    await ProjectParticipantModel.create({
      projectId: project._id.toString(),
      userId: user._id.toString(),
      email: user.email,
      role: UserRole.Owner,
      status: "Accepted",
    });

    const now = new Date();
    const due14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const invoice = await InvoiceModel.create({
      invoiceNumber: "INV-9001",
      projectId: project._id.toString(),
      submittingParty: "Party",
      submittingCategory: "Category",
      submittedByUserId: user._id.toString(),
      description: "desc",
      amount: 1000,
      dateSubmitted: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      dateDue: due14,
      status: InvoiceStatus.Pending,
      approverRole: UserRole.Owner,
      escalationsSent: [],
    });

    const firstRunCount = await runOverdueInvoiceEscalations(now);
    expect(firstRunCount).toBe(1);

    let notifications = await NotificationModel.find({
      recipientUserId: user._id.toString(),
      invoiceId: invoice._id.toString(),
      type: NotificationType.InvoiceOverdue14,
    }).lean();
    expect(notifications.length).toBe(1);

    const firstRunInvoice = await InvoiceModel.findById(invoice._id).lean();
    expect(firstRunInvoice?.escalationsSent).toEqual([14]);

    const secondRunCount = await runOverdueInvoiceEscalations(now);
    expect(secondRunCount).toBe(0);

    notifications = await NotificationModel.find({
      recipientUserId: user._id.toString(),
      invoiceId: invoice._id.toString(),
      type: NotificationType.InvoiceOverdue14,
    }).lean();
    expect(notifications.length).toBe(1);
  });
});
