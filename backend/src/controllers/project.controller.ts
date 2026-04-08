import { Request, Response, NextFunction } from "express";
import validator from "validator";
import {
  acceptInviteParticipant,
  createProject,
  inviteParticipant,
} from "../service/project.service";
import { getProjectDetails } from "../service/projectDetails.service";
import { UserRole } from "../models/userModel";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidRole(value: unknown): value is UserRole {
  return typeof value === "string" && Object.values(UserRole).includes(value as UserRole);
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const {
      name,
      location,
      council,
      daNumber,
      creatorRole,
      creatorHasInsurance,
      creatorHasLicence,
      invitees,
    } = req.body;
    if (!isNonEmptyString(location) || !isNonEmptyString(council)) {
      res.status(400).json({ error: "Location and council are required" });
      return;
    }
    if (name != null && !isNonEmptyString(name)) {
      res.status(400).json({ error: "Name must be a non-empty string when provided" });
      return;
    }
    if (daNumber != null && !isNonEmptyString(daNumber)) {
      res.status(400).json({ error: "DA Number must be a non-empty string when provided" });
      return;
    }
    if (creatorRole != null && !isValidRole(creatorRole)) {
      res.status(400).json({ error: "Creator role is invalid" });
      return;
    }
    if (creatorHasInsurance != null && typeof creatorHasInsurance !== "boolean") {
      res.status(400).json({ error: "creatorHasInsurance must be a boolean" });
      return;
    }
    if (creatorHasLicence != null && typeof creatorHasLicence !== "boolean") {
      res.status(400).json({ error: "creatorHasLicence must be a boolean" });
      return;
    }
    if (invitees != null) {
      if (!Array.isArray(invitees)) {
        res.status(400).json({ error: "Invitees must be an array" });
        return;
      }

      const hasInvalidInvitee = invitees.some(
        (invitee) =>
          !invitee ||
          !isNonEmptyString(invitee.email) ||
          !validator.isEmail(invitee.email) ||
          !isValidRole(invitee.role)
      );

      if (hasInvalidInvitee) {
        res.status(400).json({ error: "Each invitee must include a valid email and role" });
        return;
      }
    }

    const projectId = await createProject({
      creatorId: req.user!.sub,
      name,
      location,
      daNumber,
      council,
      creatorRole,
      creatorHasInsurance,
      creatorHasLicence,
      invitees,
    });
    res.status(200).json({ success: true, projectId });
  } catch (err) {
    next(err);
  }
}

/*
Allow Project Manager to invite SubContracters to created project
*/
export async function invite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, role, trade } = req.body;
    if (!isNonEmptyString(email) || !validator.isEmail(email)) {
      res.status(400).json({ error: "A valid email is required" });
      return;
    }
    if (!isValidRole(role)) {
      res.status(400).json({ error: "Role is invalid" });
      return;
    }
    const requiresTrade = role === UserRole.Subbie || role === UserRole.Consultant;
    if (requiresTrade && !isNonEmptyString(trade)) {
      res.status(400).json({ error: "Trade is required for subbies and consultants" });
      return;
    }
    if (trade != null && !isNonEmptyString(trade)) {
      res.status(400).json({ error: "Trade must be a non-empty string when provided" });
      return;
    }

    const userId = req.user!.sub;
    const projectId = req.params.projectId as string;
    const result = await inviteParticipant({ email, role, trade }, projectId, userId);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function acceptInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const { inviteCode, hasInsurance, hasLicence } = req.body;
    if (!isNonEmptyString(inviteCode)) {
      res.status(400).json({ error: "Invite code is required" });
      return;
    }
    if (hasInsurance != null && typeof hasInsurance !== "boolean") {
      res.status(400).json({ error: "hasInsurance must be a boolean" });
      return;
    }
    if (hasLicence != null && typeof hasLicence !== "boolean") {
      res.status(400).json({ error: "hasLicence must be a boolean" });
      return;
    }

    const userId = req.user!.sub;
    const { participant } = await acceptInviteParticipant(inviteCode, userId, {
      hasInsurance,
      hasLicence,
    });
    res.status(200).json({ success: true, participant });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const projectId = req.params.projectId as string;
    const details = await getProjectDetails(projectId, userId);
    res.status(200).json({ success: true, ...details });
  } catch (err) {
    next(err);
  }
}
