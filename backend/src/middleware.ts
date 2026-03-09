import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { config } from "./config";

export interface JwtPayload {
  sub: string;
  role: string;
  email: string;
  name: string;
  verticalGroup?: string;
  horizontalAttribute?: string;
  licenceNumber?: string;
  status: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// Limits registration attempts to 5 per IP every 15 minutes to prevent abuse.
// Skipped in test environments.
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: "Too many registration attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
});

/**
 * Verifies JWT from Authorization: Bearer <token> and attaches decoded payload to req.user.
 * Responds with 401 if missing or invalid.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  if (!token) {
    res.status(401).json({ error: "Authentication Required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, config.jwtAccessSecret) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Authentication Required" });
  }
}

/**
 * Requires req.user.role to match one of the allowed roles. Use after requireAuth.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication Required" });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}

export { registrationLimiter };
