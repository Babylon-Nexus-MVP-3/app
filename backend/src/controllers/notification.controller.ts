import { Request, Response, NextFunction } from "express";
import Expo from "expo-server-sdk";
import { UserModel } from "../models/userModel";
import { getNotificationsForUser, markAllNotificationsRead } from "../service/notification.service";

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const notifications = await getNotificationsForUser(userId);
    res.status(200).json({ success: true, notifications });
  } catch (err) {
    next(err);
  }
}

export async function readAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.sub;
    const updatedCount = await markAllNotificationsRead(userId);
    res.status(200).json({ success: true, updatedCount });
  } catch (err) {
    next(err);
  }
}

export async function registerPushToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userId = req.user!.sub;
    const { token } = req.body;

    if (!token || typeof token !== "string") {
      res.status(400).json({ error: "token is required" });
      return;
    }

    if (!Expo.isExpoPushToken(token)) {
      res.status(400).json({ error: "Invalid Expo push token" });
      return;
    }

    await UserModel.findByIdAndUpdate(userId, { pushToken: token });
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}
