import express from "express";
import * as AuthController from "../controllers/auth.controller";
import {
  refreshLimiter,
  registrationLimiter,
  resendVerifLimiter,
  loginLimiter,
  verifyEmailLimiter,
  requireAuth,
  forgotPasswordLimiter,
  resetCodeLimiter,
  otpRequestLimiter,
  otpVerifyLimiter,
} from "../middleware";

export const authRouter = express.Router();

authRouter.post("/register", registrationLimiter, AuthController.register);
authRouter.post("/login", loginLimiter, AuthController.login);
authRouter.post("/reactivate", loginLimiter, AuthController.reactivate);
authRouter.post("/refresh", refreshLimiter, AuthController.refresh);

// Forgot Password Flow
authRouter.post("/forgot-password", forgotPasswordLimiter, AuthController.forgot);
authRouter.post("/resend-reset-code", forgotPasswordLimiter, AuthController.resendResetCode);
authRouter.post("/verify-reset-code", resetCodeLimiter, AuthController.verifyResetCode);
authRouter.post("/reset-password", resetCodeLimiter, AuthController.resetPasswd);

// Email Verification Flow
authRouter.post("/verify-email", verifyEmailLimiter, AuthController.verifyEmail);
authRouter.post("/resend-verification", resendVerifLimiter, AuthController.resendVerifyEmail);

authRouter.post("/change-password", requireAuth, AuthController.changePassword);
authRouter.post("/logout", requireAuth, AuthController.logout);
authRouter.delete("/delete-account", requireAuth, AuthController.deleteUserAccount);
authRouter.patch("/push-token", requireAuth, AuthController.updatePushToken);
authRouter.patch("/profile", requireAuth, AuthController.updateProfileHandler);
authRouter.get("/me", requireAuth, AuthController.meHandler);

// OTP-based auth (v3)
authRouter.post("/request-otp", otpRequestLimiter, AuthController.requestOtpHandler);
authRouter.post("/verify-otp", otpVerifyLimiter, AuthController.verifyOtpHandler);
authRouter.post("/resend-otp", otpRequestLimiter, AuthController.resendOtpHandler);

// Mobile verification (authenticated)
authRouter.post(
  "/request-mobile-otp",
  requireAuth,
  otpRequestLimiter,
  AuthController.requestMobileOtpHandler
);
authRouter.post(
  "/verify-mobile-otp",
  requireAuth,
  otpVerifyLimiter,
  AuthController.verifyMobileOtpHandler
);
