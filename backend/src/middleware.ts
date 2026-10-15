import { Request, Response, NextFunction } from "express";
import rateLimit, { ipKeyGenerator, Options, RateLimitRequestHandler } from "express-rate-limit";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { config } from "./config";
import { ProjectModel } from "./models/projectModel";
import { ProjectError } from "./service/project.service";
import { ProjectParticipant, ProjectParticipantModel } from "./models/projectParticipantModel";
import { AuthError } from "./service/auth.service";
import { UserModel, UserRole } from "./models/userModel";

export interface JwtPayload {
  sub: string;
  role: string;
  email: string;
  name: string;
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

/*
  Builds a rate limiter with the settings every limiter here shares: standard
  RateLimit headers, no legacy X-RateLimit headers, and a ceiling high enough
  that the test suite never trips it. `message` becomes the JSON { error } body.
*/
const IS_TEST = process.env.NODE_ENV === "test";

function makeLimiter(
  windowMs: number,
  max: number,
  message?: string,
  options: Partial<Options> = {}
): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max: IS_TEST ? 1000 : max,
    ...(message ? { message: { error: message } } : {}),
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
  });
}

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;

// Limits registration attempts to 5 per IP every 15 minutes to prevent abuse.
export const registrationLimiter = makeLimiter(
  FIFTEEN_MINUTES,
  5,
  "Too many registration attempts. Please try again later."
);

export const loginLimiter = makeLimiter(
  FIFTEEN_MINUTES,
  5,
  "Too many login attempts, please try again later.",
  { skipSuccessfulRequests: true }
);

// No custom message: this one has always answered with the library's default
// plain-text body rather than JSON. Left as-is so the app's handling doesn't change.
export const resendVerifLimiter = makeLimiter(FIFTEEN_MINUTES, 3, undefined, {
  skipFailedRequests: false,
});

export const verifyEmailLimiter = makeLimiter(
  FIFTEEN_MINUTES,
  10,
  "Too many verification attempts. Please request a new code."
);

export const refreshLimiter = makeLimiter(
  FIFTEEN_MINUTES,
  10,
  "Too many refresh attempts. Please try again later."
);

export const forgotPasswordLimiter = makeLimiter(
  ONE_HOUR,
  5,
  "Too many password reset attempts. Please try again later."
);

export const resetCodeLimiter = makeLimiter(
  FIFTEEN_MINUTES,
  5,
  "Too many attempts. Please request a new reset code."
);

export const otpRequestLimiter = makeLimiter(
  FIFTEEN_MINUTES,
  5,
  "Too many OTP requests. Please try again later."
);

export const otpVerifyLimiter = makeLimiter(
  FIFTEEN_MINUTES,
  10,
  "Too many verification attempts. Please request a new code."
);

// Keyed by user, not IP — the wizard saves on every step and whole worksites
// share one IP, so an IP-keyed limit locks out unrelated users mid-signup.
// Must run after requireAuth so req.user is populated.
export const vouchProfileLimiter = makeLimiter(
  ONE_HOUR,
  60,
  "Too many profile submissions. Please try again later.",
  { keyGenerator: (req: Request) => req.user?.sub ?? ipKeyGenerator(req.ip ?? "") }
);

// ABR lookup/search are unauthenticated (the signup form needs them before an
// account exists), so cap them per IP to stop bulk scraping through our key.
export const abrLookupLimiter = makeLimiter(
  FIFTEEN_MINUTES,
  60,
  "Too many ABN lookups. Please try again later."
);

export const vouchGiveLimiter = makeLimiter(
  FIFTEEN_MINUTES,
  20,
  "Too many vouch attempts. Please try again later."
);

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
export function requireProjectRole(...allowedRoles: UserRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.projectId;
      const userId = req.user!.sub;

      if (!mongoose.isValidObjectId(projectId)) {
        throw new ProjectError("Invalid project id", 400);
      }

      const project = await ProjectModel.findById(projectId);
      if (!project) throw new ProjectError("Project Does not Exist");

      const participant = await ProjectParticipantModel.findOne({
        projectId,
        userId,
        status: "Accepted",
      });
      if (!participant) throw new AuthError("User not part of project");

      if (!allowedRoles.includes(participant.role)) {
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
 *
 * Also re-checks the role against the database, not just the JWT payload — the
 * token is only refreshed periodically, so without this a demoted admin would
 * keep admin access for up to the token's remaining TTL after being demoted.
 */
export function requireRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication Required" });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    const currentUser = await UserModel.findById(req.user.sub).select("role").lean();
    if (!currentUser || !allowedRoles.includes(currentUser.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
