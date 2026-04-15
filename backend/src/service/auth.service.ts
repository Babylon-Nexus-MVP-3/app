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
  validateEmailFormat,
  generateCode,
  hashCode,
  hashPassword,
} from "../utils/authHelper";
import {
  sendForgotPasswordEmail,
  sendOnboardingEmail,
  sendResendResetCodeEmail,
  sendResendVerificationEmail,
} from "./email.service";
import { JwtPayload } from "../middleware";

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

interface RegisterResponse {
  userId: string;
  code?: string;
}

export async function registerUser(input: RegisterInput): Promise<RegisterResponse> {
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
  } catch (err) {
    throw new AuthError(
      err instanceof Error
        ? err.message
        : "Registration failed. Please check your information and try again."
    );
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
    verificationCode: hashCode(code),
    verificationCodeExpiry: expiry,
    emailVerified: false,
    status: "Pending",
    accountExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Auto-delete after 24h if unverified
  });

  await newUser.save();

  // Prevent emails being sent during tests
  if (process.env.NODE_ENV !== "test") {
    await sendOnboardingEmail(normalisedEmail, code).catch((err) => {
      console.error(`Failed to send invite email to ${normalisedEmail}:`, err);
    });
  }

  return process.env.NODE_ENV === "test"
    ? { userId: newUser._id.toString(), code }
    : { userId: newUser._id.toString() };
}

interface LoginInput {
  email: string;
  password: string;
}

// Prevent sending meta fields including codes or account information after login
interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  user: SafeUser;
}

function createAccessToken(user: User): string {
  const payload = {
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    status: user.status,
  } satisfies JwtPayload;

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
  const email = validateEmailFormat(input.email);
  const password = input.password;

  const user = await UserModel.findOne({ email });
  if (!user) {
    throw new AuthError("Invalid credentials", 400);
  }

  if (user.deletedAt) {
    const daysRemaining = Math.ceil(
      (user.deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const err = new AuthError("Account is deactivated", 403) as any;
    err.code = "ACCOUNT_DEACTIVATED";
    err.daysRemaining = Math.max(daysRemaining, 0);
    throw err;
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

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    } satisfies SafeUser,
  };
}

/*
[Auth Refresh - Generate new tokens upon accessToken expiry]
*/
export async function authRefresh(token: string) {
  const refreshToken = await RefreshTokenModel.findOne({ token, revokedAt: null });

  if (!refreshToken) {
    // Token not found OR already revoked — possible reuse attack
    // Revoke all sessions for this user as a precaution
    const compromised = await RefreshTokenModel.findOne({ token });
    if (compromised) {
      await RefreshTokenModel.updateMany(
        { user: compromised.user },
        { $set: { revokedAt: new Date() } }
      );
    }
    throw new AuthError("Refresh Token is Invalid");
  }

  // If refresh Token is expired user must login again
  if (refreshToken.expiresAt < new Date()) {
    throw new AuthError("Refresh Token has expired");
  }

  // Revoke current refreshToken before reissuing a new one.
  await RefreshTokenModel.findOneAndUpdate({ token }, { $set: { revokedAt: new Date() } });

  const user = await UserModel.findById(refreshToken.user);
  if (!user) throw new AuthError("User not found", 401);
  if (user.status !== "Active") throw new AuthError("Account is not active", 401);

  const accessToken = createAccessToken(user);
  const newRefreshToken = await createRefreshToken(user);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function forgotPassword(email: string) {
  const normalisedEmail = validateEmailFormat(email);
  const { code, expiry } = generateCode();
  const hashedCode = hashCode(code);

  const user = await UserModel.findOne({ email: normalisedEmail });
  // Silently return success if user not found — prevents user enumeration
  if (!user) {
    return { success: true };
  }

  user.resetCode = hashedCode;
  user.resetCodeExpiry = expiry;
  await user.save();

  if (process.env.NODE_ENV !== "test") {
    await sendForgotPasswordEmail(normalisedEmail, code).catch((err) => {
      console.error(`Failed to send password reset email to ${normalisedEmail}:`, err);
    });
  }

  return process.env.NODE_ENV === "test" ? { success: true, code } : { success: true };
}

export async function verifyResetCodeService(resetCode: string) {
  const hashedCode = hashCode(resetCode);
  const user = await UserModel.findOne({
    resetCode: hashedCode,
    resetCodeExpiry: { $gt: new Date() }, // Check expiry in one query
  });

  if (!user) {
    throw new AuthError("Invalid or expired reset code");
  }

  return { success: true };
}

export async function resendResetCodeService(email: string) {
  const normalisedEmail = validateEmailFormat(email);
  const { code, expiry } = generateCode();
  const hashedCode = hashCode(code);

  const user = await UserModel.findOne({ email: normalisedEmail });
  // Silently return success if user not found — prevents user enumeration
  if (!user) {
    return { success: true };
  }

  await UserModel.findOneAndUpdate(
    { _id: user._id },
    { $set: { resetCode: hashedCode, resetCodeExpiry: expiry } }
  );

  if (process.env.NODE_ENV !== "test") {
    await sendResendResetCodeEmail(normalisedEmail, code).catch((err) => {
      console.error(`Failed to resend reset code email to ${email}:`, err);
    });
  }

  return process.env.NODE_ENV === "test" ? { success: true, code } : { success: true };
}

export async function resetPassword(resetCode: string, newPassword: string) {
  if (newPassword.length < 12) {
    throw new AuthError("Password must be at least 12 characters");
  }

  const hashedCode = hashCode(resetCode);
  const user = await UserModel.findOne({
    resetCode: hashedCode,
    resetCodeExpiry: { $gt: new Date() },
  });

  if (!user) {
    throw new AuthError("Invalid or expired reset code");
  }

  // Check if new password is same as current
  if (await bcrypt.compare(newPassword, user.password)) {
    throw new AuthError("New password must be different from your current password");
  }

  try {
    checkPassword(newPassword);
  } catch (error) {
    throw new AuthError(error instanceof Error ? error.message : String(error));
  }

  const hashedPassword = await hashPassword(newPassword);
  user.password = hashedPassword;
  user.resetCode = undefined;
  user.resetCodeExpiry = undefined;
  user.updatedAt = new Date();

  await user.save();

  // Revoke all existing sessions with old password
  await RefreshTokenModel.updateMany(
    { user: user._id.toString() },
    { $set: { revokedAt: new Date() } }
  );

  // Return accessToken and refreshToken so user is immediately logged in by the frontend
  const accessToken = createAccessToken(user);
  const refreshToken = await createRefreshToken(user);

  return {
    success: true,
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    } satisfies SafeUser,
  };
}

export async function userVerifyEmail(verificationCode: string) {
  const hashedCode = hashCode(verificationCode);
  const user = await UserModel.findOne({ verificationCode: hashedCode });
  if (!user) {
    throw new AuthError("Invalid Verification Code");
  }

  if (user.verificationCodeExpiry && user.verificationCodeExpiry < new Date()) {
    throw new AuthError("Verification code has expired");
  }

  user.verificationCode = undefined;
  user.verificationCodeExpiry = undefined;
  user.accountExpiresAt = null;
  user.emailVerified = true;
  user.status = "Active";
  user.updatedAt = new Date();

  await user.save();

  // Return accessToken and refreshToken so user is immediately logged in by the frontend
  const accessToken = createAccessToken(user);
  const refreshToken = await createRefreshToken(user);

  return {
    success: true,
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    } satisfies SafeUser,
  };
}

export async function resendVerificationCode(email: string) {
  const normalisedEmail = validateEmailFormat(email);
  const { code, expiry } = generateCode();
  const hashedCode = hashCode(code);

  const user = await UserModel.findOne({ email: normalisedEmail });
  // Silently return success if user not found — prevents user enumeration
  if (!user) {
    return { success: true };
  }

  if (user.emailVerified) {
    throw new AuthError("Email is already verified");
  }

  await UserModel.findOneAndUpdate(
    { _id: user._id },
    { $set: { verificationCode: hashedCode, verificationCodeExpiry: expiry } }
  );

  // Prevent emails being sent from tests
  if (process.env.NODE_ENV !== "test") {
    await sendResendVerificationEmail(email, code).catch((err) => {
      console.error(`Failed to send invite email to ${email}:`, err);
    });
  }

  return process.env.NODE_ENV === "test" ? { success: true, code } : { success: true };
}

export async function userChangePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
) {
  if (newPassword.length < 12) {
    throw new AuthError("Password must be at least 12 characters");
  }

  const user = await UserModel.findById(userId);

  if (!user) {
    throw new AuthError("User doesnt exist");
  }

  // Verify current password is valid
  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentPasswordValid) {
    throw new AuthError("Current password is incorrect");
  }

  // Check if new password is same as current
  if (await bcrypt.compare(newPassword, user.password)) {
    throw new AuthError("New password must be different from your current password");
  }

  try {
    checkPassword(newPassword);
  } catch {
    throw new AuthError("Invalid password, please follow password rules");
  }

  const hashedPassword = await hashPassword(newPassword);
  user.password = hashedPassword;
  user.updatedAt = new Date();

  await user.save();

  // Revoke all existing sessions with old password
  await RefreshTokenModel.updateMany(
    { user: user._id.toString() },
    { $set: { revokedAt: new Date() } }
  );

  // Make user relogin with new password
  return { success: true };
}

export async function userLogout(userId: string) {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AuthError("User not found");
  }

  // Inactivate all refresh Tokens
  // Client side must delete the access token
  // Access token expires eventually and cannot regenerate as refreshtokens have been revoked
  await RefreshTokenModel.updateMany({ user: userId }, { $set: { revokedAt: new Date() } });

  return { success: true };
}

export async function deleteAccount(userId: string) {
  // Soft-delete: mark the account as deactivated.
  // MongoDB TTL index will permanently purge the record after 30 days.
  const result = await UserModel.updateOne(
    { _id: userId, deletedAt: null },
    {
      $set: {
        deletedAt: new Date(),
      },
    }
  );

  if (result.matchedCount === 0) {
    throw new AuthError("User not found", 404);
  }

  // Revoke all refresh tokens so no further API calls can be made
  await RefreshTokenModel.deleteMany({ user: userId });

  return { success: true };
}

export async function reactivateAccount(email: string, password: string) {
  const normalisedEmail = validateEmailFormat(email);

  const user = await UserModel.findOne({ email: normalisedEmail });
  if (!user || !user.deletedAt) {
    throw new AuthError("Invalid credentials", 400);
  }

  const passwordMatches = await bcrypt.compare(password, user.password);
  if (!passwordMatches) {
    throw new AuthError("Invalid credentials", 400);
  }

  // Restore the account
  user.deletedAt = null;
  await user.save();

  const accessToken = createAccessToken(user);
  const refreshToken = await createRefreshToken(user);

  await EventModel.create({
    type: "UserReactivated",
    aggregateType: "User",
    aggregateId: user.id,
    userId: user._id.toString(),
    payload: { email: user.email },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
    } satisfies SafeUser,
  };
}

export async function savePushToken(userId: string, pushToken: string) {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new AuthError("User not found", 404);
  }

  user.pushToken = pushToken;
  await user.save();

  return { success: true };
}
