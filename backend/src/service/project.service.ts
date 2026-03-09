import { ProjectModel } from "../models/projectModel";
import { EventModel } from "../models/eventModel";

export class ProjectError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export interface CreateProjectInput {
  location: string;
  council: string;
  ownerId: string;
  builderId: string;
  pmId: string;
  status: string;
}

/**
 * Creates a new project. Caller must be authenticated as PM (enforced by route).
 * Emits ProjectCreated event to the immutable event ledger.
 */
export async function createProject(input: CreateProjectInput): Promise<string> {
  const location = input.location?.trim();
  const council = input.council?.trim();
  const ownerId = input.ownerId?.trim();
  const builderId = input.builderId?.trim();
  const pmId = input.pmId?.trim();
  const status = input.status?.trim();

  if (!location || !council || !ownerId || !builderId || !pmId || !status) {
    throw new ProjectError("Required fields missing: location, council, ownerId, builderId, pmId, status");
  }

  const project = await ProjectModel.create({
    location,
    council,
    ownerId,
    builderId,
    pmId,
    status,
  });

  await EventModel.create({
    type: "ProjectCreated",
    aggregateType: "Project",
    aggregateId: project._id.toString(),
    userId: pmId,
    payload: { location, council, ownerId, builderId, status },
  });

  return project._id.toString();
}
