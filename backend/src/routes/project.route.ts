import express from "express";
import * as ProjectController from "../controllers/project.controller";
import { requireAuth, requireRole } from "../middleware";

export const projectRouter = express.Router();

projectRouter.post("/", requireAuth, ProjectController.create);
projectRouter.post("/:projectId/invite", requireAuth, requireRole("PM"), ProjectController.invite);
projectRouter.post(
  "/:projectId/accept",
  requireAuth,
  requireRole("Subbie", "Owner", "Builder", "Consultant"),
  ProjectController.acceptInvite
);
