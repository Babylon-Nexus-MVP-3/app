import express from "express";
import * as AuthController from "../controllers/auth.controller";
import {
  refreshLimiter,
  registrationLimiter,
  resendVerifLimiter,
  loginLimiter,
  verifyEmailLimiter,
  requireAuth,
} from "../middleware";

export const authRouter = express.Router();

authRouter.post("/register", registrationLimiter, AuthController.register);
authRouter.post("/login", loginLimiter, AuthController.login);
authRouter.post("/refresh", refreshLimiter, AuthController.refresh);

// Forgot Password Flow
authRouter.post("/forgot-password", AuthController.forgot);
authRouter.post("/resend-reset-code", AuthController.resendResetCode);
authRouter.post("/verify-reset-code", AuthController.verifyResetCode);
authRouter.post("/reset-password", AuthController.resetPasswd);

// Email Verification Flow
authRouter.post("/verify-email", verifyEmailLimiter, AuthController.verifyEmail);
authRouter.post("/resend-verification", resendVerifLimiter, AuthController.resendVerifyEmail);

authRouter.post("/change-password", requireAuth, AuthController.changePassword);
