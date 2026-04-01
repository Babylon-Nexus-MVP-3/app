import { Request, Response, NextFunction } from "express";
import { getNotificationsForUser, markAllNotificationsRead } from "../service/notification.service";

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const notifications = await getNotificationsForUser(userId);
    res.status(200).json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
}

export async function readAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user?.sub;
    const updatedCount = await markAllNotificationsRead(userId);
    res.status(200).json({ success: true, updatedCount });
  } catch (err) {
    next(err);
  }
}
