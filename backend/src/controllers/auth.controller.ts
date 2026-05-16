import { Request, Response, NextFunction } from "express";
import { VouchProfileModel } from "../models/vouchProfileModel";
import {
  authRefresh,
  deleteAccount,
  forgotPassword,
  getMe,
  loginUser,
  reactivateAccount,
  registerUser,
  requestMobileOtp,
  requestOtp,
  resendOtp,
  resendResetCodeService,
  resendVerificationCode,
  resetPassword,
  savePushToken,
  updateProfile,
  userChangePassword,
  userLogout,
  userVerifyEmail,
  verifyMobileOtp,
  verifyOtp,
  verifyResetCodeService,
} from "../service/auth.service";

import validator from "validator";

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { firstName, lastName, email, password, mobile, abn, businessName } = req.body;
    if (
      !isNonEmptyString(firstName) ||
      !isNonEmptyString(lastName) ||
      !isNonEmptyString(email) ||
      !isNonEmptyString(password)
    ) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }
    const result = await registerUser({
      firstName,
      lastName,
      password,
      email,
      mobile,
      abn,
      businessName,
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!isNonEmptyString(email) || !validator.isEmail(email) || !isNonEmptyString(password)) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const result = await loginUser({ email, password });

    res.status(200).json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (err: any) {
    if (err?.code === "ACCOUNT_DEACTIVATED") {
      res.status(403).json({
        error: err.message,
        code: "ACCOUNT_DEACTIVATED",
        daysRemaining: err.daysRemaining,
      });
      return;
    }
    next(err);
  }
}

export async function reactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    if (!isNonEmptyString(email) || !validator.isEmail(email) || !isNonEmptyString(password)) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const result = await reactivateAccount(email, password);

    res.status(200).json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  const refreshToken = req.body?.refreshToken;
  if (!isNonEmptyString(refreshToken)) {
    return res.status(401).json({ error: "Authentication Required" });
  }

  try {
    const { accessToken, refreshToken: newRefreshToken } = await authRefresh(refreshToken);
    res.status(200).json({ accessToken: accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    next(error);
  }
}

export const forgot = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  if (!isNonEmptyString(email) || !validator.isEmail(email)) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const result = await forgotPassword(email);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const resendResetCode = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  if (!isNonEmptyString(email) || !validator.isEmail(email)) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const result = await resendResetCodeService(email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const verifyResetCode = async (req: Request, res: Response, next: NextFunction) => {
  const { resetCode } = req.body;
  if (!isNonEmptyString(resetCode)) {
    return res.status(400).json({ error: "Reset code is required" });
  }

  try {
    const result = await verifyResetCodeService(resetCode);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const resetPasswd = async (req: Request, res: Response, next: NextFunction) => {
  const { resetCode, newPassword } = req.body;

  if (!isNonEmptyString(resetCode) || !isNonEmptyString(newPassword)) {
    return res.status(400).json({ error: "Reset code and password are required" });
  }

  try {
    const result = await resetPassword(resetCode, newPassword);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  const { verificationCode } = req.body;
  if (!isNonEmptyString(verificationCode)) {
    return res.status(400).json({ error: "Verification code is required" });
  }

  try {
    const result = await userVerifyEmail(verificationCode);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const resendVerifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;
  if (!isNonEmptyString(email) || !validator.isEmail(email)) {
    return res.status(400).json({ error: "Email is required" });
  }

  try {
    const result = await resendVerificationCode(email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.sub;
  const { currentPassword, newPassword } = req.body;
  if (!isNonEmptyString(currentPassword) || !isNonEmptyString(newPassword)) {
    return res.status(400).json({ error: "Current password and new password are required" });
  }

  try {
    const result = await userChangePassword(userId, currentPassword, newPassword);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.sub;
  try {
    const result = await userLogout(userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const deleteUserAccount = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.sub;
  try {
    const result = await deleteAccount(userId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const requestOtpHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { mobile, flow, abn, businessName, email, name } = req.body;
  if (!isNonEmptyString(mobile)) {
    return res.status(400).json({ error: "Mobile number is required" });
  }
  if (flow !== "signup" && flow !== "signin") {
    return res.status(400).json({ error: "flow must be signup or signin" });
  }

  try {
    const result = await requestOtp({ mobile, flow, abn, businessName, email, name });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const verifyOtpHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { mobile, code, flow } = req.body;
  if (!isNonEmptyString(mobile) || !isNonEmptyString(code)) {
    return res.status(400).json({ error: "Mobile and code are required" });
  }
  if (flow !== "signup" && flow !== "signin") {
    return res.status(400).json({ error: "flow must be signup or signin" });
  }

  try {
    const result = await verifyOtp(mobile, code, flow);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const requestMobileOtpHandler = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.sub;
  const { mobile } = req.body;
  if (!isNonEmptyString(mobile)) {
    return res.status(400).json({ error: "Mobile number is required" });
  }
  try {
    const result = await requestMobileOtp(userId, mobile);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const verifyMobileOtpHandler = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.sub;
  const { mobile, code } = req.body;
  if (!isNonEmptyString(mobile) || !isNonEmptyString(code)) {
    return res.status(400).json({ error: "Mobile and code are required" });
  }
  try {
    await verifyMobileOtp(userId, mobile, code);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const resendOtpHandler = async (req: Request, res: Response, next: NextFunction) => {
  const { mobile } = req.body;
  if (!isNonEmptyString(mobile)) {
    return res.status(400).json({ error: "Mobile number is required" });
  }

  try {
    const result = await resendOtp(mobile);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const meHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await getMe(req.user!.sub);
    res.status(200).json({ user });
  } catch (err) {
    next(err);
  }
};

export const updateProfileHandler = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.sub;
  const { abn, businessName } = req.body;
  try {
    await updateProfile(userId, { abn, businessName });
    // Keep VouchProfile in sync if one exists
    if (abn) {
      await VouchProfileModel.updateOne({ userId }, { $set: { abn } });
    }
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

export const updatePushToken = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user!.sub;
  const { pushToken } = req.body;
  if (!isNonEmptyString(pushToken)) {
    return res.status(400).json({ error: "Push token is required" });
  }

  try {
    const result = await savePushToken(userId, pushToken);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
