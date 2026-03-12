import { ProjectModel } from "../models/projectModel";
import { ProjectParticipantModel } from "../models/projectParticipantModel";

export interface ListProjectsResult {
  projects: any[];
  total: number;
}

export async function listAssociatedProjects(userId: string): Promise<ListProjectsResult> {
  const normalizedUserId = userId?.trim();
  if (!normalizedUserId) {
    return { projects: [], total: 0 };
  }

  const participantProjectIds = await ProjectParticipantModel.find({
    userId: normalizedUserId,
    status: "Accepted",
  }).distinct("projectId");

  const orClauses: Record<string, unknown>[] = [
    { ownerId: normalizedUserId },
    { builderId: normalizedUserId },
    { pmId: normalizedUserId },
  ];

  if (participantProjectIds.length > 0) {
    orClauses.push({ _id: { $in: participantProjectIds } });
  }

  const projects = await ProjectModel.find({ $or: orClauses }).sort({ createdAt: -1 }).lean();

  return { projects, total: projects.length };
}

