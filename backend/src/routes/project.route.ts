import express from "express";
import * as ProjectController from "../controllers/project.controller";
import * as InvoiceController from "../controllers/invoice.controller";
import { requireAuth, requireProjectRole } from "../middleware";

export const projectRouter = express.Router();

projectRouter.post("/", requireAuth, ProjectController.create);
projectRouter.post("/:projectId/invite", requireAuth, ProjectController.invite);
projectRouter.post("/accept", requireAuth, ProjectController.acceptInvite);
projectRouter.post(
  "/:projectId/invoice",
  requireAuth,
  requireProjectRole("Subbie"),
  InvoiceController.create
);
