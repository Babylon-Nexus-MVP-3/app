import { Request, Response, NextFunction } from "express";
import { listAssociatedProjects, listProjectHistory } from "../service/projects.service";

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

export async function history(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    if (!userId) {
      res.status(401).json({ error: "Authentication Required" });
      return;
    }

    const projects = await listProjectHistory(userId);
    res.status(200).json({ success: true, projects, total: projects.length });
  } catch (err) {
    next(err);
  }
}
