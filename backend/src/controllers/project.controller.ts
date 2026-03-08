import { Request, Response, NextFunction } from "express";
import { createProject, inviteSubbie } from "../service/project.service";

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
    const participant = await inviteSubbie({ email, role, trade }, projectId);
    res.status(200).json({ success: true, participant });
  } catch (err) {
    next(err);
  }
}
