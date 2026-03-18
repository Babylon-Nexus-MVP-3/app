import express from "express";
import * as ProjectController from "../controllers/project.controller";
import * as InvoiceController from "../controllers/invoice.controller";
import { requireAuth, requireProjectRole } from "../middleware";
import { UserRole } from "../models/userModel";

export const projectRouter = express.Router();

projectRouter.post("/", requireAuth, ProjectController.create);
projectRouter.post("/:projectId/invite", requireAuth, ProjectController.invite);
projectRouter.post("/:projectId/accept", requireAuth, ProjectController.acceptInvite);
projectRouter.post(
  "/:projectId/invoice",
  requireAuth,
  requireProjectRole(UserRole.Subbie, UserRole.Consultant, UserRole.Builder, UserRole.PM),
  InvoiceController.create
);
