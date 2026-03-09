import express from "express";
import * as AuthController from "../controllers/auth.controller";
import { refreshLimiter, registrationLimiter } from "../middleware";

export const authRouter = express.Router();

authRouter.post("/register", registrationLimiter, AuthController.register);
authRouter.post("/login", AuthController.login);
authRouter.post("/refresh", refreshLimiter, AuthController.refresh);
