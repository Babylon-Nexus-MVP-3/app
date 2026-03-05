import validator from "validator";
import bcrypt from "bcrypt";
import { UserModel } from "../models/userModel";
import crypto from "crypto";

/*
  Validates a user's name against length and character rules.
  Allows Unicode letters, spaces, hyphens, and apostrophes (e.g. for international names).
  Rejects numbers, most special characters, and consecutive spaces/symbols.
*/
export function checkName(name: string): void {
  if (typeof name !== "string") {
    throw new Error("Invalid name format");
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 2 || trimmedName.length > 50) {
    throw new Error("Name must be between 2 and 50 characters.");
  }

  // Allow letters, spaces, hyphens, apostrophes, and Unicode letters
  // Block numbers and most special characters
  if (!/^[\p{L}\p{M}\s'-]+$/u.test(trimmedName)) {
    throw new Error("Name contains invalid characters");
  }

  // Prevent excessive spaces or special characters
  if (/\s{2,}|'{2,}|-{2,}/.test(trimmedName)) {
    throw new Error("Name format is invalid");
  }
}

/*
  Validates password strength.
  Requires 12–50 characters and at least 3 of: uppercase, lowercase, numbers, special characters.
*/
export function checkPassword(password: string): void {
  if (typeof password !== "string") {
    throw new Error("Invalid password format");
  }

  if (password.length < 12) {
    throw new Error("password must be at least 12 characters long");
  }

  if (password.length > 50) {
    throw new Error("password is too long cannot exceed 50 characters");
  }

  // Check which complexity requirements are met
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  const complexityCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

  if (complexityCount < 3) {
    throw new Error(
      "Password must contain at least 3 of: uppercase, lowercase, numbers, special characters"
    );
  }
}

/*
  Validates email format and checks it isn't already registered.
  Uses a generic error message on duplicate to avoid exposing whether an email exists.
*/
export async function checkEmail(normalisedEmail: string): Promise<void> {
  if (typeof normalisedEmail !== "string") {
    throw new Error("invalid email format");
  }

  if (!validator.isEmail(normalisedEmail)) {
    throw new Error("invalid email");
  }

  // Intentionally vague error to prevent email enumeration attacks
  const existingEmail = await UserModel.findOne({ email: normalisedEmail });
  if (existingEmail) {
    throw new Error("Unable to complete sign up");
  }
}

/*
  Hashes a plaintext password using bcrypt.
  Uses 14 salt rounds for a strong security/performance balance.
*/
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 14;
  const salt = await bcrypt.genSalt(saltRounds);
  const hash = await bcrypt.hash(password, salt);
  return hash;
}

/*
  Generates a cryptographically secure 6-digit verification code with a 15-minute expiry.
  Used for email verification and similar flows.
*/
export function generateCode() {
  const code = crypto.randomInt(100000, 1000000).toString();
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
  return { code, expiry };
}
