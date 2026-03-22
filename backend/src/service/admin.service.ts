import { UserModel } from "../models/userModel";
import { ProjectModel } from "../models/projectModel";
import { ProjectParticipantModel } from "../models/projectParticipantModel";
import { sendInviteEmail } from "./email.service";

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
    { $set: { status: "Rejected" } }
  );
  if (result.matchedCount === 0) {
    throw new AdminError("User not found or already processed", 404);
  }
}

export async function listPendingProjects(): Promise<any[]> {
  const projects = await ProjectModel.find({ status: "Pending" }).sort({ createdAt: -1 }).lean();

  const projectIds = projects.map((p) => p._id.toString());
  const allParticipants = await ProjectParticipantModel.find({
    projectId: { $in: projectIds },
  }).lean();

  // Fetch creator users in one query
  const creatorParticipants = allParticipants.filter((p) => p.status === "Accepted" && p.userId);
  const creatorUserIds = creatorParticipants.map((p) => p.userId);
  const creatorUsers = await UserModel.find({ _id: { $in: creatorUserIds } })
    .select("name email")
    .lean();
  const creatorUserMap = Object.fromEntries(creatorUsers.map((u) => [u._id.toString(), u]));

  return projects.map((p) => {
    const projectId = p._id.toString();
    const participants = allParticipants.filter((pp) => pp.projectId === projectId);

    const creatorParticipant = participants.find((pp) => pp.status === "Accepted");
    let creator = null;
    if (creatorParticipant) {
      const user = creatorUserMap[creatorParticipant.userId];
      creator = {
        name: user?.name ?? "—",
        email: creatorParticipant.email,
        role: creatorParticipant.role,
      };
    }

    const invitees = participants
      .filter((pp) => pp.status === "Pending")
      .map((pp) => ({ email: pp.email, role: pp.role }));

    return {
      _id: projectId,
      name: p.name,
      location: p.location,
      council: p.council,
      status: p.status,
      createdAt: p.createdAt,
      creator,
      invitees,
    };
  });
}

export async function listActiveProjects(): Promise<any[]> {
  const projects = await ProjectModel.find({ status: "Active" }).sort({ createdAt: -1 }).lean();
  return projects.map((p) => ({
    _id: p._id.toString(),
    name: p.name,
    location: p.location,
    council: p.council,
    status: p.status,
    createdAt: p.createdAt,
  }));
}

export async function approveProject(projectId: string): Promise<void> {
  const project = await ProjectModel.findOneAndUpdate(
    { _id: projectId, status: "Pending" },
    { $set: { status: "Active" } },
    { returnDocument: "after" }
  );
  if (!project) {
    throw new AdminError("Project not found or already processed", 404);
  }

  const pendingParticipants = await ProjectParticipantModel.find({
    projectId,
    status: "Pending",
  });

  for (const participant of pendingParticipants) {
    if (participant.email && participant.inviteCode) {
      sendInviteEmail(participant.email, participant.inviteCode, project.location).catch((err) => {
        console.error(`Failed to send invite email to ${participant.email}:`, err);
      });
    }
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
