import express from "express";
import * as AuthController from "../controllers/auth.controller";
import { registrationLimiter } from "../middleware";

export const authRouter = express.Router();

authRouter.post("/register", registrationLimiter, AuthController.register);
