import { Request, Response, NextFunction } from "express";
import { registerUser } from "../service/auth.service";

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({ error: "All fields are required" });
    }
    const result = await registerUser({ firstName, lastName, password, email });
    res.status(201).json({ userId: result });
  } catch (err) {
    next(err);
  }
}
