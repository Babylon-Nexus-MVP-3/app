import { ProjectModel } from "../models/projectModel";
import { EventModel } from "../models/eventModel";
import { ProjectParticipantModel } from "../models/projectParticipantModel";
import { UserModel, UserRole } from "../models/userModel";

export class ProjectError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

export interface InviteeInput {
  email: string;
  role: UserRole;
}

export interface CreateProjectInput {
  creatorId: string;
  name?: string;
  location: string;
  council: string;
  ownerId?: string;
  builderId?: string;
  pmId?: string;
  creatorRole?: UserRole;
  invitees?: InviteeInput[];
}

/**
 * Creates a new project. Any authenticated user can create a project.
 * Emits ProjectCreated event to the immutable event ledger.
 */
export async function createProject(input: CreateProjectInput): Promise<string> {
  const creatorId = input.creatorId?.trim();
  const name = input.name?.trim();
  const location = input.location?.trim();
  const council = input.council?.trim();
  const ownerId = input.ownerId?.trim();
  const builderId = input.builderId?.trim();
  const pmId = input.pmId?.trim();
  const creatorRole = input.creatorRole?.trim();
  const invitees = input.invitees ?? [];
  const status = "Pending";

  if (!creatorId) {
    throw new ProjectError("Authentication Required", 401);
  }

  if (!location || !council) {
    throw new ProjectError("Required fields missing: location, council");
  }

  const project = await ProjectModel.create({
    name: name || location,
    location,
    council,
    ownerId,
    builderId,
    pmId,
    status,
  });

  // Associate creator with project
  const user = await UserModel.findById(creatorId);
  await ProjectParticipantModel.create({
    projectId: project._id.toString(),
    userId: user._id.toString(),
    role: creatorRole ?? user.role,
    email: user.email,
    status: "Accepted",
  });

  // Store invitees as pending participants with OTPs (emails sent on admin approval)
  for (const invitee of invitees) {
    const email = invitee.email?.trim();
    const role = invitee.role?.trim();
    if (email && role) {
      await ProjectParticipantModel.create({
        projectId: project._id.toString(),
        email,
        role,
        inviteCode: generateOTP(),
        dateInvited: new Date(),
        status: "Pending",
      });
    }
  }

  await EventModel.create({
    type: "ProjectCreated",
    aggregateType: "Project",
    aggregateId: project._id.toString(),
    userId: creatorId,
    payload: { name: name || location, location, council, ownerId, builderId, pmId, status },
  });

  return project._id.toString();
}

export interface InviteSubbieInput {
  email: string;
  role: UserRole;
  trade: string;
}

// Send Invite Code and Email directly for now
// Move to sending via email in production
export interface InviteSubbieResult {
  participant: {
    projectId: string;
    role: UserRole;
    email: string;
    inviteCode?: string;
    trade?: string;
    dateInvited?: Date;
    status: "Pending" | "Accepted";
  };
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Keep userId to tighten role permissions later
export async function inviteParticipant(
  input: InviteSubbieInput,
  projectId: string,
  userId: string
): Promise<InviteSubbieResult> {
  const email = input.email.trim();
  const trade = input.trade;
  const role = input.role;

  const project = await ProjectModel.findById(projectId);
  if (!project) {
    throw new ProjectError("Project Does not exist");
  }

  if (project.status !== "Active") {
    throw new ProjectError("Project must be approved by admin before inviting participants", 403);
  }

  // Since Builder/PM/Owner/Admin dont have a trade only check if the role is subbie or consultant
  const requiresTrade = role === UserRole.Subbie || role === UserRole.Consultant;
  if (!email || (requiresTrade && !trade) || !role) {
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

export async function acceptInviteParticipant(inviteCode: string, userId: string) {
  if (!inviteCode) {
    throw new ProjectError("Invite code is required");
  }

  const participant = await ProjectParticipantModel.findOne({ inviteCode });

  if (!participant) {
    throw new ProjectError("Invalid or expired invite code");
  }

  if (participant.status !== "Pending") {
    throw new ProjectError("Invite is no longer valid");
  }

  const project = await ProjectModel.findById(participant.projectId);
  if (!project) {
    throw new ProjectError("Associated project no longer exists");
  }

  const updatedParticipant = await ProjectParticipantModel.findByIdAndUpdate(
    participant._id,
    {
      userId,
      status: "Accepted",
      dateAccepted: new Date(Date.now()),
      inviteCode: null,
    },
    { returnDocument: "after" }
  );

  return { participant: updatedParticipant };
}
