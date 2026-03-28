import request from "supertest";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { app } from "../../app";
import { UserModel, UserRole } from "../../models/userModel";
import { ProjectModel } from "../../models/projectModel";
import { ProjectParticipantModel } from "../../models/projectParticipantModel";
import { InvoiceModel } from "../../models/invoiceModel";
import { hashPassword } from "../../utils/authHelper";

dotenv.config();

jest.setTimeout(15000);
const MONGO_OPTIONS = { serverSelectionTimeoutMS: 8000 };

const ADMIN_EMAIL = "admin@admin-project-detail-test.com";
const ADMIN_PASSWORD = "SecurePassword123!";

async function getAdminToken(): Promise<string> {
  const hashed = await hashPassword(ADMIN_PASSWORD);
  await UserModel.create({
    name: "Admin User",
    email: ADMIN_EMAIL,
    password: hashed,
    role: "Admin",
    status: "Active",
    emailVerified: true,
  });
  const login = await request(app).post("/auth/login").send({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });
  expect(login.status).toBe(200);
  return login.body.accessToken as string;
}

beforeAll(async () => {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set.");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI, MONGO_OPTIONS);
  }
});

beforeEach(async () => {
  await request(app).delete("/clear");
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe("GET /admin/projects/:projectId", () => {
  it("returns 401 without auth token", async () => {
    const project = await ProjectModel.create({
      name: "Test Project",
      location: "Sydney",
      council: "Inner West",
      status: "Active",
    });

    const res = await request(app).get(`/admin/projects/${project._id}`);
    expect(res.status).toBe(401);
  });

  it("returns 403 for non-admin user", async () => {
    const hashed = await hashPassword("SecurePassword123!");
    await UserModel.create({
      name: "Regular User",
      email: "regular@admin-project-detail-test.com",
      password: hashed,
      role: UserRole.Subbie,
      status: "Active",
      emailVerified: true,
    });
    const login = await request(app).post("/auth/login").send({
      email: "regular@admin-project-detail-test.com",
      password: "SecurePassword123!",
    });
    const token = login.body.accessToken as string;

    const project = await ProjectModel.create({
      name: "Test Project",
      location: "Sydney",
      council: "Inner West",
      status: "Active",
    });

    const res = await request(app)
      .get(`/admin/projects/${project._id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it("returns 404 for a project that does not exist", async () => {
    const token = await getAdminToken();
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .get(`/admin/projects/${fakeId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("returns 200 with project info and empty participants and invoices", async () => {
    const token = await getAdminToken();
    const project = await ProjectModel.create({
      name: "Empty Project",
      location: "Melbourne",
      council: "CBD",
      status: "Active",
    });

    const res = await request(app)
      .get(`/admin/projects/${project._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.project.name).toBe("Empty Project");
    expect(res.body.project.location).toBe("Melbourne");
    expect(res.body.participants).toEqual([]);
    expect(res.body.invoices).toEqual([]);
    expect(res.body.healthScore).toBe(100);
    expect(res.body.overdueInvoiceCount).toBe(0);
    expect(res.body.monthOnMonthHealthChangePct).toBeNull();
  });

  it("returns all participants with correct email, role, and status", async () => {
    const token = await getAdminToken();
    const project = await ProjectModel.create({
      name: "Multi Member Project",
      location: "Brisbane",
      council: "BCC",
      status: "Active",
    });
    const projectId = project._id.toString();

    await ProjectParticipantModel.create([
      { projectId, email: "builder@test.com", role: UserRole.Builder, status: "Accepted" },
      { projectId, email: "subbie@test.com", role: UserRole.Subbie, status: "Pending" },
      { projectId, email: "owner@test.com", role: UserRole.Owner, status: "Accepted" },
    ]);

    const res = await request(app)
      .get(`/admin/projects/${projectId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.participants).toHaveLength(3);

    const emails = res.body.participants.map((p: any) => p.email);
    expect(emails).toContain("builder@test.com");
    expect(emails).toContain("subbie@test.com");
    expect(emails).toContain("owner@test.com");

    const subbie = res.body.participants.find((p: any) => p.email === "subbie@test.com");
    expect(subbie.status).toBe("Pending");
    expect(subbie.participantId).toBeDefined();
    expect(subbie.name).toBeNull();

    const builder = res.body.participants.find((p: any) => p.email === "builder@test.com");
    expect(builder.status).toBe("Accepted");
    expect(builder.role).toBe(UserRole.Builder);
    expect(builder.participantId).toBeDefined();
  });

  it("resolves participant name from UserModel for accepted participants", async () => {
    const token = await getAdminToken();
    const project = await ProjectModel.create({
      name: "Named Member Project",
      location: "Sydney",
      council: "Inner West",
      status: "Active",
    });
    const projectId = project._id.toString();

    const hashed = await hashPassword("SecurePassword123!");
    const user = await UserModel.create({
      name: "Jane Builder",
      email: "jane@admin-project-detail-test.com",
      password: hashed,
      role: UserRole.Builder,
      status: "Active",
      emailVerified: true,
    });

    await ProjectParticipantModel.create([
      {
        projectId,
        email: "jane@admin-project-detail-test.com",
        role: UserRole.Builder,
        status: "Accepted",
        userId: user._id.toString(),
      },
      { projectId, email: "pending@test.com", role: UserRole.Subbie, status: "Pending" },
    ]);

    const res = await request(app)
      .get(`/admin/projects/${projectId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);

    const jane = res.body.participants.find((p: any) => p.email === "jane@admin-project-detail-test.com");
    expect(jane.name).toBe("Jane Builder");

    const pending = res.body.participants.find((p: any) => p.email === "pending@test.com");
    expect(pending.name).toBeNull();
  });

  it("returns invoices with correct fields", async () => {
    const token = await getAdminToken();
    const project = await ProjectModel.create({
      name: "Invoice Project",
      location: "Perth",
      council: "City of Perth",
      status: "Active",
    });
    const projectId = project._id.toString();

    const submittedByUserId = new mongoose.Types.ObjectId();
    const dateDue = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    await InvoiceModel.create({
      projectId,
      submittingParty: "Acme Builders",
      submittingCategory: "Construction",
      submittedByUserId,
      description: "Foundation work",
      amount: 50000,
      dateSubmitted: new Date(),
      dateDue,
      status: "Pending",
      approverRole: UserRole.Owner,
    });

    const res = await request(app)
      .get(`/admin/projects/${projectId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.invoices).toHaveLength(1);
    const inv = res.body.invoices[0];
    expect(inv.submittingParty).toBe("Acme Builders");
    expect(inv.status).toBe("Pending");
    expect(inv.daysOverdue).toBe(0);
  });

  it("returns correct overdueInvoiceCount and healthScore of 100 when no invoices are paid", async () => {
    const token = await getAdminToken();
    const project = await ProjectModel.create({
      name: "Overdue Project",
      location: "Adelaide",
      council: "ACC",
      status: "Active",
    });
    const projectId = project._id.toString();

    const submittedByUserId = new mongoose.Types.ObjectId();
    const pastDue = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
    await InvoiceModel.create({
      projectId,
      submittingParty: "Late Co",
      submittingCategory: "Electrical",
      submittedByUserId,
      description: "Wiring",
      amount: 12000,
      dateSubmitted: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      dateDue: pastDue,
      status: "Pending",
      approverRole: UserRole.Owner,
    });

    const res = await request(app)
      .get(`/admin/projects/${projectId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.overdueInvoiceCount).toBe(1);
    // No paid invoices → health defaults to 100
    expect(res.body.healthScore).toBe(100);
  });
});
