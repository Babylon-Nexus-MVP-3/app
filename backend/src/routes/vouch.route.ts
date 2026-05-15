import express, { NextFunction, Request, Response } from "express";
import { requireAuth } from "../middleware";
import { VouchProfileModel } from "../models/vouchProfileModel";

export const vouchRouter = express.Router();

// POST /vouch/profile — save or update the logged-in user's vouch profile
vouchRouter.post(
  "/profile",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const body = req.body;

      const profile = await VouchProfileModel.findOneAndUpdate(
        { userId },
        { ...body, userId, submittedAt: new Date() },
        { upsert: true, new: true, runValidators: true }
      );

      res.status(201).json(profile);
    } catch (err) {
      next(err);
    }
  }
);

// GET /vouch/profile/me — retrieve the logged-in user's vouch profile
vouchRouter.get(
  "/profile/me",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const profile = await VouchProfileModel.findOne({ userId });

      if (!profile) {
        res.status(404).json({ error: "No profile found" });
        return;
      }

      res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  }
);
