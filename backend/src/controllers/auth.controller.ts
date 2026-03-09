import { Request, Response, NextFunction } from "express";
import { authRefresh, loginUser, registerUser } from "../service/auth.service";

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { firstName, lastName, email, password, role } = req.body;
    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({ error: "All fields are required" });
      return;
    }
    const result = await registerUser({ firstName, lastName, password, email, role });
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
        phoneNumber: result.user.phoneNumber,
        role: result.user.role,
        verticalGroup: result.user.verticalGroup,
        horizontalAttribute: result.user.horizontalAttribute,
        licenceNumber: result.user.licenceNumber,
        status: result.user.status,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = req.body?.refreshToken;
  if (!refreshToken) {
    return res.status(401).json({ error: "Authentication Required" });
  }

  try {
    const { accessToken, refreshToken: newRefreshToken } = await authRefresh(refreshToken);
    res.status(200).json({ accessToken: accessToken, refreshToken: newRefreshToken });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
