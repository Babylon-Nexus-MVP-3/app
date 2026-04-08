import { ProjectModel } from "../models/projectModel";
import { EventModel } from "../models/eventModel";
import { ProjectParticipantModel } from "../models/projectParticipantModel";
import { UserModel, UserRole } from "../models/userModel";
import { AuthError } from "./auth.service";
import { sendInviteEmail } from "./email.service";
import { notifyProjectPendingApproval } from "./notification.service";
import { randomInt } from "crypto";
import { hashCode } from "../utils/authHelper";
import { notifySafely } from "./notificationScheduler.service";
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
  daNumber?: string;
  creatorRole?: UserRole;
  creatorHasInsurance: boolean | null;
  creatorHasLicence: boolean | null;
  invitees?: InviteeInput[];
}

/**
 * MongoDB throws error code 11000 for unique index violations. This type guard
 * lets us catch only that case and rethrow as a clean 400, without swallowing
 * unrelated errors like network or validation failures.
 */
function isDuplicateKeyError(error: unknown): error is { code: number } {
  return (
    typeof error === "object" && error !== null && "code" in error && (error as any).code === 11000
  );
}

/** Sets Project.pmId / ownerId / builderId for frontend display when role is PM / Owner / Builder. */
export async function syncProjectRoleDisplayFields(
  projectId: string,
  userId: string,
  role: UserRole | undefined
): Promise<void> {
  const r = role;
  if (!r) return;
  const set: Record<string, string> = {};
  if (r === UserRole.PM) set.pmId = userId;
  else if (r === UserRole.Owner) set.ownerId = userId;
  else if (r === UserRole.Builder) set.builderId = userId;
  if (Object.keys(set).length === 0) return;
  await ProjectModel.updateOne({ _id: projectId }, { $set: set });
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
  const creatorRole = input.creatorRole;
  const daNumber = input.daNumber?.trim();
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

  const creatorEmail = user.email.toLowerCase();
  const participantRole = creatorRole ?? user.role;

  // Normalise and validate invitees before touching the DB
  const normalizedInvitees = invitees.map((invitee) => ({
    email: invitee.email.trim().toLowerCase(),
    role: invitee.role,
  }));

  // Prevent duplicate invites
  // Fail before any DB writes — the DB unique index catches this too but only
  // after the project and creator participant have already been written.
  const seenInvitees = new Set<string>();
  for (const invitee of normalizedInvitees) {
    const key = `${invitee.email}::${invitee.role}`;
    if (seenInvitees.has(key)) {
      throw new ProjectError("Duplicate invitees are not allowed");
    }
    seenInvitees.add(key);
  }

  // Reject any invitee that matches the creator's email, regardless of role
  const creatorAsInvitee = normalizedInvitees.find((i) => i.email === creatorEmail);
  if (creatorAsInvitee) {
    throw new ProjectError("Creator cannot be added as an invitee");
  }

  const project = await ProjectModel.create({
    name: name || location,
    location,
    council,
    daNumber,
    ownerId: creatorRole === UserRole.Owner ? creatorId : undefined,
    builderId: creatorRole === UserRole.Builder ? creatorId : undefined,
    pmId: creatorRole === UserRole.PM ? creatorId : undefined,
    status,
  });

  // Associate creator as an accepted participant
  await ProjectParticipantModel.create({
    projectId: project._id.toString(),
    userId: user._id.toString(),
    role: participantRole,
    hasLicence: input.creatorHasLicence,
    hasInsurance: input.creatorHasInsurance,
    email: creatorEmail,
    status: "Accepted",
  });

  await syncProjectRoleDisplayFields(project._id.toString(), user._id.toString(), participantRole);

  // DB unique index on { projectId, email, role } prevents duplicates.
  // Catch the violation and surface it as a clean 400 instead of a 500.
  try {
    for (const invitee of normalizedInvitees) {
      await ProjectParticipantModel.create({
        projectId: project._id.toString(),
        email: invitee.email,
        role: invitee.role,
        dateInvited: new Date(),
        status: "Pending",
      });
    }
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ProjectError("User is already invited to this project in that role");
    }
    throw error;
  }

  await EventModel.create({
    type: "ProjectCreated",
    aggregateType: "Project",
    aggregateId: project._id.toString(),
    userId: creatorId,
    payload: { name: name || location, location, council, daNumber, status },
  });

  await notifySafely(() =>
    notifyProjectPendingApproval(project._id.toString(), user._id.toString(), project.name)
  );

  return project._id.toString();
}

export interface InviteSubbieInput {
  email: string;
  role: UserRole;
  trade: string;
}

export interface InviteSubbieResult {
  participant: {
    projectId: string;
    role: UserRole;
    email: string;
    trade?: string;
    dateInvited?: Date;
    status: "Pending" | "Accepted";
  };
  inviteCode?: string;
}

function generateOTP(): string {
  return randomInt(100000, 999999).toString();
}

export async function inviteParticipant(
  input: InviteSubbieInput,
  projectId: string,
  userId: string
): Promise<InviteSubbieResult> {
  const email = input.email.trim().toLowerCase();
  const trade = input.trade;
  const role = input.role;

  const project = await ProjectModel.findById(projectId);
  if (!project) {
    throw new ProjectError("Project does not exist");
  }

  if (project.status !== "Active") {
    throw new ProjectError("Project must be approved by admin before inviting participants", 403);
  }

  const requester = await ProjectParticipantModel.findOne({
    projectId,
    userId,
    status: "Accepted",
  });
  if (!requester) {
    throw new ProjectError("You are not a participant on this project", 403);
  }

  const inviteCode = generateOTP();
  const hashedCode = hashCode(inviteCode);

  // DB unique index on { projectId, email, role } prevents duplicates.
  // Catch the violation and surface it as a clean 400 instead of a 500.
  let participant;
  try {
    participant = await ProjectParticipantModel.create({
      projectId,
      role,
      email,
      inviteCode: hashedCode,
      trade,
      dateInvited: new Date(),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new ProjectError("User is already invited to this project in that role");
    }
    throw error;
  }

  if (process.env.NODE_ENV !== "test") {
    await sendInviteEmail(participant.email, inviteCode, project.location).catch((err) => {
      console.error(`Failed to send invite email to ${participant.email}:`, err);
    });
  }

  const safeParticipant = {
    projectId: participant.projectId,
    role: participant.role,
    email: participant.email,
    trade: participant.trade,
    dateInvited: participant.dateInvited,
    status: participant.status,
  };

  return { participant: safeParticipant, inviteCode };
}

export interface AcceptInviteInput {
  hasInsurance: boolean | null;
  hasLicence: boolean | null;
}

export async function acceptInviteParticipant(
  inviteCode: string,
  userId: string,
  input: AcceptInviteInput
) {
  if (!inviteCode) {
    throw new ProjectError("Invite code is required");
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AuthError("User does not exist");
  }

  const hashedCode = hashCode(inviteCode);
  const participant = await ProjectParticipantModel.findOne({ inviteCode: hashedCode });
  if (!participant) {
    throw new ProjectError("Invalid or expired invite code");
  }
  if (participant.status !== "Pending") {
    throw new ProjectError("Invite is no longer valid");
  }

  if (participant.email.toLowerCase() !== user.email.toLowerCase()) {
    throw new ProjectError("This invite code was not issued to your account", 403);
  }

  const project = await ProjectModel.findById(participant.projectId);
  if (!project) {
    throw new ProjectError("Associated project no longer exists");
  }

  if (project.status === "Rejected" || project.status === "Inactive") {
    throw new ProjectError("This project is no longer active", 403);
  }

  // Guard against the same user accepting a different invite for the same role on this project
  const alreadyMember = await ProjectParticipantModel.findOne({
    projectId: participant.projectId,
    userId,
    role: participant.role,
    status: "Accepted",
  });
  if (alreadyMember) {
    throw new ProjectError("You are already a member of this project in that role");
  }

  const updatedParticipant = await ProjectParticipantModel.findOneAndUpdate(
    { inviteCode: hashedCode, status: "Pending" },
    {
      $set: {
        userId,
        status: "Accepted",
        dateAccepted: new Date(),
        hasInsurance: input.hasInsurance,
        hasLicence: input.hasLicence,
      },
      $unset: { inviteCode: 1 },
    },
    { returnDocument: "after" }
  );

  if (!updatedParticipant) {
    throw new ProjectError("Invalid or expired invite code");
  }

  await syncProjectRoleDisplayFields(updatedParticipant.projectId, userId, updatedParticipant.role);

  return { participant: updatedParticipant };
}
