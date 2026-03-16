import { UserModel } from "../models/userModel";
import { ProjectModel } from "../models/projectModel";

export class AdminError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function listPendingUsers(): Promise<any[]> {
  const users = await UserModel.find({ status: "Pending" })
    .select("name email role createdAt")
    .sort({ createdAt: -1 })
    .lean();
  return users.map((u) => ({
    _id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
  }));
}

export async function approveUser(userId: string): Promise<void> {
  const result = await UserModel.updateOne(
    { _id: userId, status: "Pending" },
    { $set: { status: "Active", emailVerified: true } }
  );
  if (result.matchedCount === 0) {
    throw new AdminError("User not found or already processed", 404);
  }
}

export async function rejectUser(userId: string): Promise<void> {
  const result = await UserModel.updateOne(
    { _id: userId, status: "Pending" },
    { $set: { status: "Pending" } }
  );
  if (result.matchedCount === 0) {
    throw new AdminError("User not found or already processed", 404);
  }
}

export async function listPendingProjects(): Promise<any[]> {
  const projects = await ProjectModel.find({ status: "Pending" }).sort({ createdAt: -1 }).lean();
  return projects.map((p) => ({
    _id: p._id.toString(),
    location: p.location,
    council: p.council,
    ownerId: p.ownerId,
    builderId: p.builderId,
    pmId: p.pmId,
    status: p.status,
    createdAt: p.createdAt,
  }));
}

export async function approveProject(projectId: string): Promise<void> {
  const result = await ProjectModel.updateOne(
    { _id: projectId, status: "Pending" },
    { $set: { status: "Active" } }
  );
  if (result.matchedCount === 0) {
    throw new AdminError("Project not found or already processed", 404);
  }
}

export async function rejectProject(projectId: string): Promise<void> {
  const result = await ProjectModel.updateOne(
    { _id: projectId, status: "Pending" },
    { $set: { status: "Rejected" } }
  );
  if (result.matchedCount === 0) {
    throw new AdminError("Project not found or already processed", 404);
  }
}
