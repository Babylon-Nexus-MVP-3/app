import { Request, Response, NextFunction } from "express";
import { listAssociatedProjects } from "../service/projects.service";

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: "Authentication Required" });
      return;
    }

    const { projects, total } = await listAssociatedProjects(userId);
    res.status(200).json({ success: true, projects, total });
  } catch (err) {
    next(err);
  }
}

