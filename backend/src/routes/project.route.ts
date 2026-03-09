import express from "express";
import * as ProjectController from "../controllers/project.controller";
import { requireAuth } from "../middleware";

export const projectRouter = express.Router();

projectRouter.post("/", requireAuth, ProjectController.create);
projectRouter.post("/:projectId/invite", requireAuth, ProjectController.invite);
projectRouter.post("/:projectId/accept", requireAuth, ProjectController.acceptInvite);
