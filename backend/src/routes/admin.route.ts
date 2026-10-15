import express from "express";
import * as AdminController from "../controllers/admin.controller";
import { requireAuth, requireRole } from "../middleware";
import { UserRole } from "../models/userModel";

export const adminRouter = express.Router();

adminRouter.use(requireAuth, requireRole(UserRole.Admin));

// There is no project approval queue: projects are Active from creation. The
// old pending/approve/reject endpoints were removed with it.

adminRouter.get("/projects/active", AdminController.listActiveProjects);
adminRouter.get("/projects/inactive", AdminController.listInactiveProjects);
adminRouter.get("/projects/:projectId", AdminController.getAdminProjectDetail);
adminRouter.delete(
  "/projects/:projectId/participants/remove",
  AdminController.removeProjectParticipant
);

adminRouter.delete("/projects/:projectId", AdminController.removeProject);
