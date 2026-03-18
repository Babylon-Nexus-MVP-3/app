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

  const participants = await ProjectParticipantModel.find({
    userId: normalizedUserId,
    status: "Accepted",
  })
    .select("projectId role")
    .lean();

  const participantProjectIds = participants.map((p) => p.projectId);
  const roleByProjectId = new Map<string, string>(
    participants.map((p) => [p.projectId, p.role as string])
  );

  const orClauses: Record<string, unknown>[] = [
    { ownerId: normalizedUserId },
    { builderId: normalizedUserId },
    { pmId: normalizedUserId },
  ];

  if (participantProjectIds.length > 0) {
    orClauses.push({ _id: { $in: participantProjectIds } });
  }

  const projects = await ProjectModel.find({
    $or: orClauses,
    status: "Active",
  })
    .sort({ createdAt: -1 })
    .lean();

  const projectsWithRole = projects.map((p: any) => {
    const projectId = p._id.toString();
    const participantRole = roleByProjectId.get(projectId);

    // Fallback: infer role from explicit assignment fields when no participant record exists.
    const inferredRole =
      participantRole ??
      (p.pmId === normalizedUserId
        ? "PM"
        : p.ownerId === normalizedUserId
          ? "Owner"
          : p.builderId === normalizedUserId
            ? "Builder"
            : undefined);

    return { ...p, userRole: inferredRole };
  });

  return { projects: projectsWithRole, total: projectsWithRole.length };
}
