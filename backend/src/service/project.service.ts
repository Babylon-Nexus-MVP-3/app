import { ProjectModel } from "../models/projectModel";
import { EventModel } from "../models/eventModel";
import { ProjectParticipantModel } from "../models/projectParticipantModel";
import { UserModel, UserRole } from "../models/userModel";
import { AuthError } from "./auth.service";

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
  const creatorRole = input.creatorRole?.trim();
  const invitees = input.invitees ?? [];
  const status = "Pending";

  if (!creatorId) {
    throw new ProjectError("Authentication Required", 401);
  }

  const user = await UserModel.findById(creatorId);
  if (!user) {
    throw new AuthError("User not found");
  }

  if (!location || !council) {
    throw new ProjectError("Required fields missing: location, council");
  }

  const project = await ProjectModel.create({
    name: name || location,
    location,
    council,
    ownerId: creatorRole === UserRole.Owner ? creatorId : undefined,
    builderId: creatorRole === UserRole.Builder ? creatorId : undefined,
    pmId: creatorRole === UserRole.PM ? creatorId : undefined,
    status,
  });

  // Associate creator with project
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
    payload: { name: name || location, location, council, status },
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
    throw new ProjectError("Missing Required Fields to add particpant: email, trade, role");
  }

  const inviteCode = generateOTP();

  const participant = await ProjectParticipantModel.create({
    projectId,
    role,
    email,
    inviteCode,
    trade,
    dateInvited: new Date(Date.now()),
  });

  return { participant };
}

export async function acceptInviteParticipant(inviteCode: string, userId: string) {
  if (!inviteCode) {
    throw new ProjectError("Invite code is required");
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AuthError("User Does not exist");
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

  if (participant.role === UserRole.PM) project.pmId = userId;
  if (participant.role === UserRole.Owner) project.ownerId = userId;
  if (participant.role === UserRole.Builder) project.builderId = userId;
  await project.save();

  return { participant: updatedParticipant };
}
