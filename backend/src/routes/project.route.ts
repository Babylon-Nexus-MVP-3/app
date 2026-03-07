import express from "express";
import * as ProjectController from "../controllers/project.controller";
import { requireAuth, requireRole } from "../middleware";

export const projectRouter = express.Router();

projectRouter.post("/", requireAuth, requireRole("PM"), ProjectController.create);
