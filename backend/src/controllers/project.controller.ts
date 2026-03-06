import { Request, Response, NextFunction } from "express";
import { createProject } from "../service/project.service";

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { location, council, ownerId, builderId, pmId, status } = req.body;
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
