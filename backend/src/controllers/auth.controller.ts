import { Request, Response } from "express";
import { registerUser } from "../service/auth.service";

export const register = async (req: Request, res: Response) => {
  try {
    const { firstName, lastName, email, password } = req.body;
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const result = await registerUser(firstName, lastName, password, email);
    return res.status(201).json({ userId: result });
  } catch (error) {
    console.log(error.message);
    return res.status(400).json({ error: error.message });
  }
};
