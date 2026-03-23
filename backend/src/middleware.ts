import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { config } from "./config";
import { ProjectModel } from "./models/projectModel";
import { ProjectError } from "./service/project.service";
import { ProjectParticipant, ProjectParticipantModel } from "./models/projectParticipantModel";
import { AuthError } from "./service/auth.service";

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
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
      projectParticipant?: ProjectParticipant;
    }
  }
}

// Limits registration attempts to 5 per IP every 15 minutes to prevent abuse.
// Skipped in test environments.
export const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "test" ? 1000 : 5,
  message: "Too many registration attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === "test",
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 1000 : 5,
  message: "Too many login attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: true,
});

export const resendVerifLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 1000 : 3,
  keyGenerator: (req) => req.body.email, // Rate limit per email
  message: "Too many attempts to resend verification code, Please try again later",
  standardHeaders: true,
  legacyHeaders: true,
});

export const verifyEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "test" ? 1000 : 10,
  keyGenerator: (req) => req.body.email, // Per email
  message: "Too many verification attempts. Please request a new code.",
  standardHeaders: true,
  legacyHeaders: false,
});

export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === "test" ? 1000 : 10,
  message: "Too many refresh attempts please try again later",
  standardHeaders: true,
  legacyHeaders: true,
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
 * Validate projectParticipant role for a particular project
 */
export function requireProjectRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId;
      const userId = req.user.sub;

      const project = await ProjectModel.findById(projectId);
      if (!project) throw new ProjectError("Project Does not Exist");

      const participant = await ProjectParticipantModel.findOne({
        projectId,
        userId,
        status: "Accepted",
      });
      if (!participant) throw new AuthError("User not part of project");

      if (!allowedRoles.includes(participant.role as string)) {
        throw new AuthError("Unauthorised");
      }

      req.projectParticipant = participant;
      next();
    } catch (err) {
      next(err);
    }
  };
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
