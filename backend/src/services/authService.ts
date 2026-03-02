import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config";
import { User, UserModel } from "../models/userModel";
import { RefreshTokenModel } from "../models/refreshTokenModel";
import { EventModel } from "../models/eventModel";

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

interface LoginInput {
  email: string;
  password: string;
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: User;
}

function createAccessToken(user: User): string {
  const payload = {
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    verticalGroup: user.verticalGroup,
    horizontalAttribute: user.horizontalAttribute,
    licenceNumber: user.licenceNumber,
    status: user.status,
  };

  return jwt.sign(payload, config.jwtAccessSecret, {
    expiresIn: `${config.accessTokenTtlMinutes}m`,
  });
}

async function createRefreshToken(user: User): Promise<string> {
  const token = crypto.randomBytes(64).toString("hex");

  const expiresAt = new Date(
    Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000,
  );

  await RefreshTokenModel.create({
    user: user._id,
    token,
    expiresAt,
  });

  return token;
}

export async function loginUser(input: LoginInput): Promise<LoginResult> {
  const email = input.email?.toLowerCase().trim();
  const password = input.password;

  if (!email || !password) {
    throw new AuthError("Email and password are required", 400);
  }

  const user = await UserModel.findOne({ email });

  if (!user) {
    throw new AuthError("Invalid credentials", 400);
  }

  if (user.status !== "Active") {
    throw new AuthError("User email is not verified", 400);
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    throw new AuthError("Invalid credentials", 400);
  }

  const accessToken = createAccessToken(user);
  const refreshToken = await createRefreshToken(user);

  await EventModel.create({
    type: "UserLoggedIn",
    aggregateType: "User",
    aggregateId: user.id,
    userId: user._id,
    payload: { email: user.email },
  });

  return { accessToken, refreshToken, user };
}

