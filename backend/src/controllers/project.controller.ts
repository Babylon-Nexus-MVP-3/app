import { Request, Response, NextFunction } from "express";
import {
  acceptInviteParticipant,
  createProject,
  inviteParticipant,
} from "../service/project.service";
import { getProjectDetails } from "../service/projectDetails.service";

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, location, council, creatorRole, invitees } = req.body;

    const projectId = await createProject({
      creatorId: req.user!.sub,
      name,
      location,
      council,
      creatorRole,
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
    const { inviteCode } = req.body;
    const userId = req.user!.sub;
    const { participant } = await acceptInviteParticipant(inviteCode, userId);
    res.status(200).json({ success: true, participant });
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // requireAuth already attaches req.user; sub is always present for a valid access token.
    const userId = req.user!.sub;
    const projectId = req.params.projectId as string;
    const details = await getProjectDetails(projectId, userId);
    res.status(200).json({ success: true, ...details });
  } catch (err) {
    next(err);
  }
}
