import { Request, Response, NextFunction } from "express";
import { loginUser } from "../services/authService";

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
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

