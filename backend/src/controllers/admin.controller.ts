import { Request, Response, NextFunction } from "express";
import * as AdminService from "../service/admin.service";
import { deleteProject } from "../service/admin.service";

export async function listPendingUsers(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const users = await AdminService.listPendingUsers();
    res.status(200).json({ success: true, users });
  } catch (err) {
    next(err);
  }
}

export async function approveUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.params.userId as string;
    await AdminService.approveUser(userId);
    res.status(200).json({ success: true, message: "User approved" });
  } catch (err) {
    next(err);
  }
}

export async function rejectUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.params.userId as string;
    await AdminService.rejectUser(userId);
    res.status(200).json({ success: true, message: "User rejected" });
  } catch (err) {
    next(err);
  }
}

export async function listPendingProjects(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projects = await AdminService.listPendingProjects();
    res.status(200).json({ success: true, projects });
  } catch (err) {
    next(err);
  }
}

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

export async function approveProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    await AdminService.approveProject(projectId);
    res.status(200).json({ success: true, message: "Project approved" });
  } catch (err) {
    next(err);
  }
}

export async function rejectProject(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const projectId = req.params.projectId as string;
    await AdminService.rejectProject(projectId);
    res.status(200).json({ success: true, message: "Project rejected" });
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
