import express from "express";
import * as AdminController from "../controllers/admin.controller";
import { requireAuth, requireRole } from "../middleware";
import { UserRole } from "../models/userModel";

export const adminRouter = express.Router();

adminRouter.use(requireAuth, requireRole(UserRole.Admin));

adminRouter.get("/projects/pending", AdminController.listPendingProjects);
adminRouter.get("/projects/active", AdminController.listActiveProjects);
adminRouter.get("/projects/inactive", AdminController.listInactiveProjects);
adminRouter.get("/projects/:projectId", AdminController.getAdminProjectDetail);
adminRouter.put("/projects/:projectId/approve", AdminController.approveProject);
adminRouter.put("/projects/:projectId/reject", AdminController.rejectProject);
adminRouter.delete(
  "/projects/:projectId/participants/remove",
  AdminController.removeProjectParticipant
);

adminRouter.delete("/projects/:projectId", AdminController.removeProject);
