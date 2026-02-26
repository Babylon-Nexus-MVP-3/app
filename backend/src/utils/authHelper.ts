import validator from "validator";
import bcrypt from "bcrypt";
import { UserModel } from "../models/userModel";
import crypto from "crypto";

export function checkName(name: string): void {
  if (typeof name !== "string") {
    throw new Error("Invalid name format");
  }

  const trimmedName = name.trim();

  if (trimmedName.length < 2 || trimmedName.length > 20) {
    throw new Error("Name must be between 2 and 20 characters.");
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

export async function checkEmail(normalisedEmail: string): Promise<void> {
  if (typeof normalisedEmail !== "string") {
    throw new Error("invalid email format");
  }

  if (!validator.isEmail(normalisedEmail)) {
    throw new Error("invalid email");
  }

  const existingEmail = await UserModel.findOne({ email: normalisedEmail });
  if (existingEmail) {
    throw new Error("Unable to complete sign up");
  }
}

export async function checkNewPasswd(
  previousPasswds: string[],
  newPassword: string,
  confirmNewPasswd: string
): Promise<void> {
  try {
    checkPassword(newPassword);
    for (const passwd of previousPasswds) {
      if (await bcrypt.compare(newPassword, passwd)) {
        throw new Error("Password has been used before, try a new password");
      }
    }
  } catch (error) {
    throw new Error(error.message, { cause: error });
  }

  if (confirmNewPasswd !== newPassword) {
    throw new Error("Passwords do not match");
  }
}

export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 14;
  const salt = await bcrypt.genSalt(saltRounds);
  const hash = await bcrypt.hash(password, salt);
  return hash;
}

export function generateCode() {
  const code = crypto.randomInt(100000, 1000000).toString();
  const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
  return { code, expiry };
}
