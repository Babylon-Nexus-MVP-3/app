import { Request, Response, NextFunction } from "express";
import * as AdminService from "../service/admin.service";
import { deleteProject } from "../service/admin.service";

export async function listActiveProjects(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projects = await AdminService.listActiveProjects();
    res.status(200).json({ success: true, projects });
  } catch (err) {
    next(err);
  }
}

export async function listInactiveProjects(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projects = await AdminService.listInactiveProjects();
    res.status(200).json({ success: true, projects });
  } catch (err) {
    next(err);
  }
}

export async function getAdminProjectDetail(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const result = await AdminService.getAdminProjectDetail(projectId);
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
}

export async function removeProjectParticipant(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const { email, role } = req.body as { email?: string; role?: string };

    const { removedCount } = await AdminService.removeProjectParticipant({
      projectId,
      email,
      role,
    });

    res.status(200).json({ success: true, removedCount, message: "Participant removed" });
  } catch (err) {
    next(err);
  }
}

export async function removeProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    const result = await deleteProject(projectId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
