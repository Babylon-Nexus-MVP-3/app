// Business Logic for Endpoints Involving Authentication
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { config } from "../config";
import { User, UserModel } from "../models/userModel";
import { RefreshTokenModel } from "../models/refreshTokenModel";
import { EventModel } from "../models/eventModel";
import {
  checkName,
  checkEmail,
  checkPassword,
  generateCode,
  hashPassword,
} from "../utils/authHelper";

export class AuthError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

/*
  [1] - Register User
  Creates a new user account after validating and sanitizing inputs.
  Returns the new user's ID on success.
*/

interface RegisterInput {
  firstName: string;
  lastName: string;
  password: string;
  email: string;
}

export async function registerUser(input: RegisterInput): Promise<string> {
  // Trim whitespace and normalise email to lowercase for consistency
  const sanitizedFirstName = input.firstName.trim();
  const sanitizedLastName = input.lastName.trim();
  const normalisedEmail = input.email.toLowerCase().trim();
  const name = `${sanitizedFirstName} ${sanitizedLastName}`;

  // Validate name, email uniqueness, and password strength before proceeding
  try {
    checkName(name);
    await checkEmail(normalisedEmail);
    checkPassword(input.password);
  } catch {
    throw new AuthError("Registration failed. Please check your information and try again.");
  }
  const { code, expiry } = generateCode();
  const hashedPassword = await hashPassword(input.password);
  // Build new user document with default security state (locked: false, no tokens, unverified)
  const newUser = new UserModel({
    name: name,
    email: normalisedEmail,
    password: hashedPassword,
    loginAttempts: 0,
    accountLocked: false,
    verificationCode: code, // TODO: Hash verification code before storing in production
    verificationCodeExpiry: expiry,
    emailVerified: false,
  });

  await newUser.save();
  return newUser._id.toString();
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

  const expiresAt = new Date(Date.now() + config.refreshTokenTtlDays * 24 * 60 * 60 * 1000);

  await RefreshTokenModel.create({
    user: user._id.toString(),
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
    userId: user._id.toString(),
    payload: { email: user.email },
  });

  return { accessToken, refreshToken, user };
}
