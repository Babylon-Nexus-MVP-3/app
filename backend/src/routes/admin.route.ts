import express from "express";
import * as AdminController from "../controllers/admin.controller";
import { requireAuth, requireRole } from "../middleware";

export const adminRouter = express.Router();

adminRouter.use(requireAuth, requireRole("Admin"));

adminRouter.get("/users/pending", AdminController.listPendingUsers);
adminRouter.put("/users/:userId/approve", AdminController.approveUser);
adminRouter.put("/users/:userId/reject", AdminController.rejectUser);
adminRouter.get("/projects/pending", AdminController.listPendingProjects);
adminRouter.get("/projects/active", AdminController.listActiveProjects);
adminRouter.put("/projects/:projectId/approve", AdminController.approveProject);
adminRouter.put("/projects/:projectId/reject", AdminController.rejectProject);
adminRouter.delete(
  "/projects/:projectId/participants/remove",
  AdminController.removeProjectParticipant
);
