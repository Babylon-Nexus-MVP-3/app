import { Request, Response, NextFunction } from "express";
import {
  authRefresh,
  forgotPassword,
  loginUser,
  registerUser,
  resendResetCodeService,
  resendVerificationCode,
  resetPassword,
  userChangePassword,
  userVerifyEmail,
  verifyResetCodeService,
} from "../service/auth.service";

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }
    const result = await registerUser({ firstName, lastName, password, email });
    res.status(201).json({ userId: result });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body;
    const result = await loginUser({ email, password });

    res.status(200).json({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        status: result.user.status,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  const refreshToken = req.body?.refreshToken;
  if (!refreshToken) {
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

  try {
    const result = await forgotPassword(email);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

export const resendResetCode = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

  try {
    const result = await resendResetCodeService(email);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const verifyResetCode = async (req: Request, res: Response, next: NextFunction) => {
  const { resetCode } = req.body;

  try {
    const result = await verifyResetCodeService(resetCode);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const resetPasswd = async (req: Request, res: Response, next: NextFunction) => {
  const { resetCode, newPassword } = req.body;

  if (!resetCode || !newPassword) {
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
  try {
    const result = await userVerifyEmail(verificationCode);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const resendVerifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  const { email } = req.body;

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

  try {
    const result = await userChangePassword(userId, currentPassword, newPassword);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
