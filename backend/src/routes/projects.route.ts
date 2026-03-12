import express from "express";
import * as ProjectsController from "../controllers/projects.controller";
import { requireAuth } from "../middleware";

export const projectsRouter = express.Router();

projectsRouter.get("/", requireAuth, ProjectsController.list);

