import { ProjectModel } from "../models/projectModel";
import { EventModel } from "../models/eventModel";
import { ProjectParticipantModel } from "../models/projectParticipantModel";

export class ProjectError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export interface CreateProjectInput {
  creatorId: string;
  location: string;
  council: string;
  ownerId?: string;
  builderId?: string;
  pmId?: string;
  status?: string;
}

/**
 * Creates a new project. Any authenticated user can create a project.
 * Emits ProjectCreated event to the immutable event ledger.
 */
export async function createProject(input: CreateProjectInput): Promise<string> {
  const creatorId = input.creatorId?.trim();
  const location = input.location?.trim();
  const council = input.council?.trim();
  const ownerId = input.ownerId?.trim();
  const builderId = input.builderId?.trim();
  const pmId = input.pmId?.trim();
  const status = input.status?.trim() ?? "Draft";

  if (!creatorId) {
    throw new ProjectError("Authentication Required", 401);
  }

  if (!location || !council) {
    throw new ProjectError("Required fields missing: location, council");
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
    userId: creatorId,
    payload: { location, council, ownerId, builderId, pmId, status },
  });

  return project._id.toString();
}

export interface InviteSubbieInput {
  email: string;
  role: string;
  trade: string;
}

// Send Invite Code and Email directly for now
// Move to sending via email in production
export interface InviteSubbieResult {
  participant: {
    projectId: string;
    role: string;
    email: string;
    inviteCode: string;
    trade: string;
    dateInvited: Date;
    status: "Pending" | "Accepted";
  };
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function inviteSubbie(
  input: InviteSubbieInput,
  projectId: string
): Promise<InviteSubbieResult> {
  const email = input.email.trim();
  const trade = input.trade;
  const role = input.role;

  const project = await ProjectModel.findById(projectId);
  if (!project) {
    throw new ProjectError("Project Does not exist");
  }

  if (!email || !trade || !role) {
    throw new ProjectError("Missing Required Fields to add partiicpant: email, trade, role");
  }

  const inviteCode = generateOTP();

  const participant = await ProjectParticipantModel.create({
    projectId,
    role,
    email,
    inviteCode,
    trade,
    dateInvited: new Date(Date.now()),
    status: "Pending",
  });

  return { participant };
}
