import { Request, Response, NextFunction } from "express";
import { acceptInviteSubbie, createProject, inviteSubbie } from "../service/project.service";

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { location, council, ownerId, builderId, status } = req.body;
    const pmId = req.user?.sub;

    if (!pmId) {
      res.status(401).json({ error: "Authentication Required" });
      return;
    }

    const projectId = await createProject({
      location,
      council,
      ownerId,
      builderId,
      pmId,
      status,
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
    const projectId = req.params.projectId as string;
    const userId = req.user.sub;
    const { participant } = await inviteSubbie({ email, role, trade }, projectId, userId);
    res.status(200).json({ success: true, participant });
  } catch (err) {
    next(err);
  }
}

export async function acceptInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const { inviteCode } = req.body;
    const userId = req.user.sub;
    const { participant } = await acceptInviteSubbie(inviteCode, userId);
    res.status(200).json({ success: true, participant });
  } catch (err) {
    next(err);
  }
}
