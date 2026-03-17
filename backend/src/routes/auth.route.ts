import express from "express";
import * as AuthController from "../controllers/auth.controller";
import { refreshLimiter, registrationLimiter } from "../middleware";

export const authRouter = express.Router();

authRouter.post("/register", registrationLimiter, AuthController.register);
authRouter.post("/login", AuthController.login);
authRouter.post("/refresh", refreshLimiter, AuthController.refresh);
authRouter.post("/forgot-password", AuthController.forgot);
authRouter.post("/resend-reset-code", AuthController.resendResetCode);
authRouter.post("/verify-reset-code", AuthController.verifyResetCode);
authRouter.post("/reset-password", AuthController.resetPasswd);
