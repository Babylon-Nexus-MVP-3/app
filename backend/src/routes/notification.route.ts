import express from "express";
import * as NotificationController from "../controllers/notification.controller";
import { requireAuth } from "../middleware";

export const notificationRouter = express.Router();

notificationRouter.get("/", requireAuth, NotificationController.list);
notificationRouter.patch("/read-all", requireAuth, NotificationController.readAll);
